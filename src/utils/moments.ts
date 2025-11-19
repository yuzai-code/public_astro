import type { MomentMetadata } from "../types";

const MAX_SLUG_LENGTH = 80;

function pad(num: number): string {
    return num < 10 ? `0${num}` : `${num}`;
}

export function toDateTimeLocalValue(date: Date): string {
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function formatDateForSlug(value?: string): string {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) {
        return formatDateForSlug();
    }
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    return `${year}-${month}-${day}`;
}

export function slugifyMoment(text: string): string {
    if (!text) {
        return "";
    }
    let normalized = text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    if (!normalized) {
        return "";
    }
    if (normalized.length > MAX_SLUG_LENGTH) {
        normalized = normalized.substring(0, MAX_SLUG_LENGTH).replace(/-+$/g, "");
    }
    return normalized;
}

export function buildMomentSlug(title: string, createdAt?: string, fallback?: string): string {
    const base = slugifyMoment(title) || fallback || "moment";
    return `${formatDateForSlug(createdAt)}-${base}`;
}

export function ensureIsoString(value?: string): string {
    if (!value || value.trim().length === 0) {
        return new Date().toISOString();
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return new Date().toISOString();
    }
    return parsed.toISOString();
}

export function parseListInput(value: string): string[] {
    if (!value) {
        return [];
    }
    return value
        .split(/\r?\n|[,，、]/)
        .map(item => item.trim())
        .filter(item => item.length > 0);
}

export function buildMomentPayload(metadata: MomentMetadata): Record<string, unknown> {
    const payload: Record<string, unknown> = {
        content: metadata.content,
        createdAt: metadata.createdAt,
        images: metadata.images,
        tags: metadata.tags
    };

    if (!metadata.images || metadata.images.length === 0) {
        delete payload.images;
    }
    if (!metadata.tags || metadata.tags.length === 0) {
        delete payload.tags;
    }

    if (metadata.location) {
        payload.location = metadata.location;
    }
    if (metadata.weather) {
        payload.weather = metadata.weather;
    }
    if (metadata.link) {
        payload.link = metadata.link;
    }
    if (metadata.mood) {
        payload.mood = metadata.mood;
    }

    return payload;
}
