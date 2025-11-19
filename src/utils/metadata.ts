import type { AstroConfig, PublishMetadata } from "../types";

export function formatPublishDate(value?: string): string {
    const fallback = value && value.trim().length > 0 ? value.trim() : new Date().toISOString();
    const cleanedFallback = fallback.replace(/Z$/, "");
    const date = new Date(cleanedFallback);
    if (Number.isNaN(date.getTime())) {
        return fallback.replace(/\s[+-]\d{2}:?\d{2}$/, "").replace(/Z$/, "");
    }
    const pad = (num: number) => (num < 10 ? `0${num}` : `${num}`);
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function stringifyPlaceholderValue(value: unknown): string {
    if (value === null || value === undefined) {
        return "";
    }
    if (Array.isArray(value)) {
        return value.map(item => stringifyPlaceholderValue(item)).join(", ");
    }
    if (typeof value === "object") {
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }
    return String(value);
}

export function createDefaultAstroConfig(): AstroConfig {
    return {
        githubToken: "",
        githubOwner: "",
        githubRepo: "",
        astroContentPath: "src/content/posts",
        categoriesPath: "src/content/categories",
        momentsPath: "src/content/moments",
        yamlTemplate: `---
title: "{title}"
description: "{description}"
pubDate: {pubDate}
tags: {tags}
category: "{category}"
draft: {draft}
---`,
        customFields: []
    };
}

function yamlDoubleQuoted(value: string): string {
    const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `"${escaped}"`;
}

function yamlSingleQuoted(value: string): string {
    const escaped = value.replace(/'/g, "''");
    return `'${escaped}'`;
}

function yamlBareValue(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
        return yamlDoubleQuoted("");
    }
    if (/^[A-Za-z0-9_.-]+$/.test(trimmed) && !/^(true|false|null|~)$/i.test(trimmed)) {
        return trimmed;
    }
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
        return trimmed;
    }
    return yamlDoubleQuoted(trimmed);
}

function replacePlaceholder(template: string, key: string, value: string): string {
    const doubleQuotedRegex = new RegExp(`"\\{${key}\\}"`, "g");
    template = template.replace(doubleQuotedRegex, yamlDoubleQuoted(value));

    const singleQuotedRegex = new RegExp(`'\\{${key}\\}'`, "g");
    template = template.replace(singleQuotedRegex, yamlSingleQuoted(value));

    const bareRegex = new RegExp(`\\{${key}\\}`, "g");
    return template.replace(bareRegex, yamlBareValue(value));
}

export function formatYamlValue(value: unknown): string {
    if (typeof value === "string") {
        if (value.includes(":") || value.includes("#") || value.includes("[") || value.includes("]")) {
            return `"${value.replace(/"/g, '\\"')}"`;
        }
        return value;
    }
    if (typeof value === "boolean" || typeof value === "number") {
        return value.toString();
    }
    if (Array.isArray(value)) {
        return `[${value.map(v => `"${v.toString().replace(/"/g, '\\"')}"`).join(", ")}]`;
    }
    return `"${String(value).replace(/"/g, '\\"')}"`;
}

export function generateFrontmatter(config: AstroConfig, metadata: PublishMetadata): string {
    let template = config.yamlTemplate || `---
title: "{title}"
description: "{description}"
pubDate: {pubDate}
tags: {tags}
category: "{category}"
draft: {draft}
---`;

    const formattedDate = formatPublishDate(metadata.publishDate);
    template = replacePlaceholder(template, "title", metadata.title);
    template = replacePlaceholder(template, "description", metadata.description);
    template = template.replace(/\{pubDate\}/g, formattedDate);
    template = template.replace(/\{publishDate\}/g, formattedDate);
    template = template.replace(/\{date\}/g, formattedDate);
    template = template.replace(/\{tags\}/g, `[${metadata.tags.map(tag => yamlDoubleQuoted(tag)).join(", ")}]`);
    template = replacePlaceholder(template, "category", metadata.category);
    template = template.replace(/\{draft\}/g, metadata.draft.toString());

    if (metadata.customFields) {
        const consumedFields = new Set<string>();
        for (const key in metadata.customFields) {
            if (!Object.prototype.hasOwnProperty.call(metadata.customFields, key)) {
                continue;
            }
            const value = metadata.customFields[key];
            if (value === undefined || value === null || value === "") {
                continue;
            }

            const placeholderPattern = new RegExp(`("|')?\\{${key}\\}("|')?`);
            if (placeholderPattern.test(template)) {
                const stringValue = stringifyPlaceholderValue(value);
                template = replacePlaceholder(template, key, stringValue);
                consumedFields.add(key);
            }
        }

        let customYaml = "";
        for (const key in metadata.customFields) {
            if (!Object.prototype.hasOwnProperty.call(metadata.customFields, key) || consumedFields.has(key)) {
                continue;
            }
            const value = metadata.customFields[key];
            if (value !== undefined && value !== null && value !== "") {
                customYaml += `${key}: ${formatYamlValue(value)}\n`;
            }
        }

        if (customYaml) {
            template = template.replace(/^---$/m, (match, offset, string) => {
                const firstDash = string.indexOf("---");
                const secondDash = string.indexOf("---", firstDash + 3);
                if (offset === secondDash) {
                    return customYaml.trim() + "\n---";
                }
                return match;
            });
        }
    }

    return `${template}\n\n`;
}

export function stripExistingFrontmatter(content: string): string {
    if (!content) {
        return "\n";
    }

    const frontmatterRegex = /^(---|\+\+\+)\s*\r?\n[\s\S]*?\r?\n\1\s*(\r?\n)?/;
    if (frontmatterRegex.test(content)) {
        const stripped = content.replace(frontmatterRegex, "");
        return "\n" + stripped.replace(/^\s*/, "");
    }
    return "\n" + content.replace(/^\s*/, "");
}

export function normalizeMetadata(metadata: PublishMetadata): PublishMetadata {
    const tags = (metadata.tags || [])
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

    return {
        title: metadata.title?.trim() || "Untitled",
        description: metadata.description?.trim() || "",
        publishDate: metadata.publishDate || new Date().toISOString(),
        tags,
        category: metadata.category?.trim() || "",
        draft: Boolean(metadata.draft),
        customFields: metadata.customFields || {}
    };
}

export function getPostFilePath(config: AstroConfig, docId: string): string {
    const basePath = (config.astroContentPath || "").replace(/\/+$/, "");
    const normalizedId = docId.trim();
    return `${basePath}/${normalizedId}.md`;
}

export function formatDateTime(value: string): string {
    if (!value) {
        return "-";
    }
    try {
        return new Date(value).toLocaleString();
    } catch {
        return value;
    }
}
