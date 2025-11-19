import type { AlbumMetadata, AlbumPhoto } from "../types";
import { ensureIsoString, formatDateForSlug, slugifyMoment } from "./moments";

function trimOrUndefined(value?: string): string | undefined {
    if (typeof value !== "string") {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeTags(tags?: string[]): string[] | undefined {
    if (!tags || tags.length === 0) {
        return undefined;
    }
    const cleaned = Array.from(new Set(tags.map(tag => tag.trim()).filter(tag => tag.length > 0)));
    return cleaned.length > 0 ? cleaned : undefined;
}

export function buildAlbumSlug(title: string, createdAt?: string, fallback?: string): string {
    const base = slugifyMoment(title) || fallback || "album";
    return `${formatDateForSlug(createdAt)}-${base}`;
}

export function normalizeAlbumPhotos(photos: AlbumPhoto[]): AlbumPhoto[] {
    return photos
        .map(photo => {
            const normalized: AlbumPhoto = {
                src: photo.src?.trim() || "",
                caption: trimOrUndefined(photo.caption),
                takenAt: trimOrUndefined(photo.takenAt) ? ensureIsoString(photo.takenAt) : undefined,
                location: trimOrUndefined(photo.location),
                tags: normalizeTags(photo.tags),
                aiNote: trimOrUndefined(photo.aiNote)
            };
            return normalized;
        })
        .filter(photo => photo.src.length > 0)
        .map(photo => {
            const cleaned: AlbumPhoto = { src: photo.src };
            if (photo.caption) {
                cleaned.caption = photo.caption;
            }
            if (photo.takenAt) {
                cleaned.takenAt = photo.takenAt;
            }
            if (photo.location) {
                cleaned.location = photo.location;
            }
            if (photo.tags && photo.tags.length > 0) {
                cleaned.tags = photo.tags;
            }
            if (photo.aiNote) {
                cleaned.aiNote = photo.aiNote;
            }
            return cleaned;
        });
}

export function buildAlbumPayload(metadata: AlbumMetadata): Record<string, unknown> {
    const payload: Record<string, unknown> = {
        title: metadata.title,
        description: metadata.description,
        createdAt: metadata.createdAt,
        cover: metadata.cover,
        photos: normalizeAlbumPhotos(metadata.photos)
    };

    const tags = normalizeTags(metadata.tags);
    if (tags) {
        payload.tags = tags;
    }

    const location = trimOrUndefined(metadata.location);
    if (location) {
        payload.location = location;
    }

    const summary = trimOrUndefined(metadata.aiSummary);
    if (summary) {
        payload.aiSummary = summary;
    }

    return payload;
}
