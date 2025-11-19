import type { AstroConfig } from "../types";

interface UploadResult {
    key: string;
    url: string;
}

type KeyInput = ArrayBuffer | Uint8Array | string;

const encoder = new TextEncoder();
const SLASHES_REGEX = /[\/\\]+/g;

function bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}

function normalizeBasePath(value?: string): string {
    if (!value) {
        return "";
    }
    return value.trim().replace(/^\/+|\/+$/g, "");
}

async function sha256Hex(data: ArrayBuffer | string): Promise<string> {
    const buffer = typeof data === "string" ? encoder.encode(data) : data;
    const hash = await crypto.subtle.digest("SHA-256", buffer);
    return bufferToHex(hash);
}

async function hmac(key: KeyInput, data: string): Promise<ArrayBuffer> {
    let keyBuffer: ArrayBuffer;
    if (typeof key === "string") {
        keyBuffer = encoder.encode(key);
    } else if (key instanceof Uint8Array) {
        keyBuffer = key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength);
    } else {
        keyBuffer = key;
    }

    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyBuffer,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
}

async function hmacHex(key: KeyInput, data: string): Promise<string> {
    const signature = await hmac(key, data);
    return bufferToHex(signature);
}

async function getSignatureKey(secret: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
    const kDate = await hmac(`AWS4${secret}`, dateStamp);
    const kRegion = await hmac(kDate, region);
    const kService = await hmac(kRegion, service);
    return hmac(kService, "aws4_request");
}

function formatAmzDate(date: Date): { amzDate: string; dateStamp: string } {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    const seconds = String(date.getUTCSeconds()).padStart(2, "0");
    return {
        amzDate: `${year}${month}${day}T${hours}${minutes}${seconds}Z`,
        dateStamp: `${year}${month}${day}`
    };
}

function sanitizeFileName(name: string): string {
    const trimmed = name.trim().toLowerCase();
    const replaced = trimmed.replace(/[^a-z0-9._-]+/g, "-");
    return replaced.replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function buildObjectKey(fileName: string, rootPath?: string): string {
    const safeName = sanitizeFileName(fileName || "image");
    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "");
    const random = Math.random().toString(36).substring(2, 8);
    const [year, month, day] = new Date().toISOString().split("T")[0].split("-");
    const basePath = normalizeBasePath(rootPath);
    const folder = [basePath, year, month, day]
        .filter(segment => segment && segment.length > 0)
        .join("/")
        .replace(SLASHES_REGEX, "/")
        .replace(/^\/+|\/+$/g, "");
    const rawKey = `${folder}/${timestamp}-${random}-${safeName}`
        .replace(SLASHES_REGEX, "/");
    return rawKey.replace(/^\/+/, "");
}

function resolveEndpoint(config: AstroConfig): URL {
    const provided = config.s3Endpoint?.trim();
    if (provided) {
        const normalized = provided.match(/^https?:\/\//) ? provided : `https://${provided}`;
        return new URL(normalized.replace(/\/+$/, ""));
    }
    if (!config.s3Bucket || !config.s3Region) {
        throw new Error("Missing bucket or region");
    }
    return new URL(`https://${config.s3Bucket}.cos.${config.s3Region}.myqcloud.com`);
}

function resolvePublicBase(config: AstroConfig): string | undefined {
    const custom = config.s3PublicBaseUrl?.trim();
    if (!custom) {
        return undefined;
    }
    const normalized = custom.match(/^https?:\/\//) ? custom : `https://${custom}`;
    return normalized.replace(/\/+$/, "");
}

export async function uploadFileToS3(config: AstroConfig, file: File): Promise<UploadResult> {
    if (!config.s3AccessKeyId || !config.s3SecretAccessKey || !config.s3Bucket || !config.s3Region) {
        throw new Error("Missing S3 credentials");
    }
    const endpoint = resolveEndpoint(config);
    const basePath = endpoint.pathname.replace(/\/+$/, "");
    const objectKey = buildObjectKey(file.name, config.s3RootPath);
    const canonicalUri = `${basePath}/${objectKey}`
        .replace(SLASHES_REGEX, "/")
        .replace(/^\/+/, "/");
    const normalizedUri = canonicalUri.startsWith("/") ? canonicalUri : `/${canonicalUri}`;
    const requestUrl = `${endpoint.origin}${normalizedUri}`;
    const fileBuffer = await file.arrayBuffer();
    const payloadHash = await sha256Hex(fileBuffer);
    const now = new Date();
    const { amzDate, dateStamp } = formatAmzDate(now);
    const hostHeader = endpoint.host;
    const canonicalHeaders = `host:${hostHeader}\n` +
        `x-amz-acl:public-read\n` +
        `x-amz-content-sha256:${payloadHash}\n` +
        `x-amz-date:${amzDate}\n`;
    const signedHeaders = "host;x-amz-acl;x-amz-content-sha256;x-amz-date";
    const canonicalRequest = [
        "PUT",
        normalizedUri,
        "",
        canonicalHeaders,
        signedHeaders,
        payloadHash
    ].join("\n");
    const hashedCanonicalRequest = await sha256Hex(canonicalRequest);
    const credentialScope = `${dateStamp}/${config.s3Region}/s3/aws4_request`;
    const stringToSign = [
        "AWS4-HMAC-SHA256",
        amzDate,
        credentialScope,
        hashedCanonicalRequest
    ].join("\n");
    const signingKey = await getSignatureKey(config.s3SecretAccessKey, dateStamp, config.s3Region, "s3");
    const signature = await hmacHex(signingKey, stringToSign);
    const authorization = `AWS4-HMAC-SHA256 Credential=${config.s3AccessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(requestUrl, {
        method: "PUT",
        headers: {
            Authorization: authorization,
            "x-amz-date": amzDate,
            "x-amz-content-sha256": payloadHash,
            "x-amz-acl": "public-read",
            "Content-Type": file.type || "application/octet-stream",
            "Content-Length": String(file.size)
        },
        body: file
    });

    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`S3 upload failed (${response.status}): ${text || response.statusText}`);
    }

    const publicBase = resolvePublicBase(config);
    const publicUrl = publicBase ? `${publicBase}${normalizedUri}` : requestUrl;

    return { key: objectKey, url: publicUrl };
}
