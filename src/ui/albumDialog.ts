import { Dialog, showMessage } from "siyuan";
import type PluginSample from "../index";
import type { AlbumMetadata, AlbumPhoto, AlbumRecord } from "../types";
import { stripExistingFrontmatter } from "../utils/metadata";
import { extractTagsFromContent } from "../utils/tags";
import { buildAlbumSlug } from "../utils/albums";
import { ensureIsoString, parseListInput, toDateTimeLocalValue } from "../utils/moments";

function deriveDescription(content: string, fallback: string): string {
    const cleaned = content
        .replace(/```[\s\S]*?```/g, "")
        .replace(/\s+/g, " ")
        .trim();
    if (cleaned.length === 0) {
        return fallback;
    }
    return cleaned.length > 160 ? `${cleaned.slice(0, 160)}...` : cleaned;
}

function collectPhotoData(container: HTMLElement): AlbumPhoto[] {
    const rows = Array.from(container.querySelectorAll<HTMLElement>(".astro-album__photo"));
    return rows.map(row => {
        const src = (row.querySelector<HTMLInputElement>(".album-photo-src")?.value || "").trim();
        const caption = (row.querySelector<HTMLInputElement>(".album-photo-caption")?.value || "").trim();
        const takenAtRaw = (row.querySelector<HTMLInputElement>(".album-photo-takenAt")?.value || "").trim();
        const location = (row.querySelector<HTMLInputElement>(".album-photo-location")?.value || "").trim();
        const tagsRaw = (row.querySelector<HTMLInputElement>(".album-photo-tags")?.value || "").trim();
        const aiNote = (row.querySelector<HTMLInputElement>(".album-photo-ainote")?.value || "").trim();
        const tags = parseListInput(tagsRaw);
        const takenAt = takenAtRaw ? ensureIsoString(takenAtRaw) : "";
        return {
            src,
            caption,
            takenAt,
            location,
            tags,
            aiNote
        } as AlbumPhoto;
    }).filter(photo => photo.src.length > 0);
}

function refreshPhotoTitles(container: HTMLElement, label: string): void {
    const rows = Array.from(container.querySelectorAll<HTMLElement>(".astro-album__photo"));
    rows.forEach((row, index) => {
        const titleElement = row.querySelector<HTMLElement>(".astro-album__photo-title");
        if (titleElement) {
            titleElement.textContent = `${label} #${index + 1}`;
        }
    });
}

export async function openAlbumDialog(plugin: PluginSample, existingRecord?: AlbumRecord, onPublished?: () => void): Promise<void> {
    const t = (key: string, fallback: string) => plugin.translate(key, fallback);

    if (!plugin.isAlbumConfigValid()) {
        showMessage(t("albumConfigRequired", t("configRequired", "请先配置 GitHub 信息")));
        return;
    }

    const isEditing = Boolean(existingRecord);
    let docId = "";
    let docTitle = "album";
    let documentContent = "";
    let extractedTags: string[] = [];

    if (isEditing && existingRecord) {
        docId = existingRecord.slug || existingRecord.metadata.slug || "album";
        docTitle = existingRecord.metadata.title || existingRecord.slug || "album";
        documentContent = existingRecord.metadata.description || existingRecord.metadata.title || "";
        extractedTags = existingRecord.metadata.tags || [];
    } else {
        const editor = plugin.getEditor();
        if (!editor) {
            showMessage(t("selectDocument", "请先打开一个文档"));
            return;
        }
        docId = editor.protyle.block.rootID;
        docTitle = plugin.getDocumentTitle(editor) || "album";
        try {
            const content = await plugin.getDocumentContent(docId);
            documentContent = stripExistingFrontmatter(content).trim();
            extractedTags = extractTagsFromContent(content);
        } catch (error) {
            console.warn("Failed to prepare album document content:", error);
        }
    }

    const initialMetadata = existingRecord?.metadata;
    const createdAtIso = initialMetadata?.createdAt || new Date().toISOString();
    const createdAtDate = new Date(createdAtIso);
    const safeCreatedAt = Number.isNaN(createdAtDate.getTime()) ? new Date() : createdAtDate;
    const initialCreatedAt = toDateTimeLocalValue(safeCreatedAt);
    const defaultSlug = existingRecord?.slug || buildAlbumSlug(docTitle, createdAtIso, docId.slice(0, 6));
    const defaultDescription = initialMetadata?.description || deriveDescription(documentContent, docTitle);

    const slugLabel = t("albumSlug", "文件名");
    const regenerateLabel = t("albumRegenerateSlug", "重新生成");
    const createdAtLabel = t("albumCreatedAt", "创建时间");
    const titleLabel = t("albumTitle", "标题");
    const descriptionLabel = t("albumDescription", "描述");
    const descriptionPlaceholder = t("albumDescriptionPlaceholder", "用几句话介绍这个相册");
    const coverLabel = t("albumCover", "封面图");
    const coverPlaceholder = t("albumCoverPlaceholder", "https://example.com/cover.jpg");
    const uploadCoverLabel = t("albumUploadCover", "上传封面");
    const coverUploadDisabled = plugin.isS3UploadEnabled() ? "" : "disabled";
    const uploadPhotosLabel = t("albumUploadPhotos", "上传照片");
    const uploadButtonLabel = t("albumUploadBtn", "上传到对象存储");
    const uploadHint = plugin.isS3UploadEnabled()
        ? t("albumUploadHint", "选择本地文件上传，生成的链接会自动添加")
        : t("albumUploadDisabled", "可直接粘贴图片链接，或在设置中启用对象存储上传");
    const locationLabel = t("albumLocation", "拍摄地点");
    const aiSummaryLabel = t("albumAiSummary", "AI 总结");
    const aiSummaryPlaceholder = t("albumAiSummaryPlaceholder", "AI 归纳、系列说明等");
    const tagsLabel = t("albumTags", "标签");
    const tagsPlaceholder = t("albumTagsPlaceholder", "旅行, 胶片");
    const photosLabel = t("albumPhotos", "照片列表");
    const photoLabel = t("albumPhoto", "照片");
    const photoUrlLabel = t("albumPhotoUrl", "图片链接");
    const photoUrlPlaceholder = t("albumPhotoUrlPlaceholder", "https://example.com/photo.jpg");
    const photoCaptionLabel = t("albumPhotoCaption", "描述");
    const photoTakenAtLabel = t("albumPhotoTakenAt", "拍摄时间");
    const photoLocationLabel = t("albumPhotoLocation", "拍摄地点");
    const photoTagsLabel = t("albumPhotoTags", "标签");
    const photoTagsPlaceholder = t("albumPhotoTagsPlaceholder", "夜景, 胶片");
    const photoAiNoteLabel = t("albumPhotoAiNote", "AI 提示");
    const addPhotoLabel = t("albumAddPhoto", "添加照片");
    const removePhotoLabel = t("albumRemovePhoto", "删除");
    const cancelLabel = t("cancel", "取消");
    const publishLabel = isEditing ? t("albumUpdate", "保存相册") : t("albumPublish", "发布相册");
    const publishingLabel = t("albumPublishing", "发布中...");
    const dialogTitle = isEditing ? t("editAlbum", "编辑相册") : t("publishAlbum", "发布相册");
    const successMessage = isEditing ? t("albumUpdateSuccess", "相册已更新") : t("albumPublishSuccess", "相册发布成功");

    const dialog = new Dialog({
        title: dialogTitle,
        content: `<div class="b3-dialog__content astro-publisher__publish-dialog">
    <div class="astro-publisher__dialog-body">
        <div class="fn__flex-column" style="gap: 12px;">
        <label class="fn__flex b3-label">
            <div class="fn__flex-center fn__size200">${slugLabel}</div>
            <div class="fn__flex-1 fn__flex" style="gap: 6px;">
                <input class="b3-text-field fn__flex-1" id="albumSlug" value="${defaultSlug}" placeholder="2023-08-12-summer-album" />
                <button class="b3-button b3-button--outline fn__size120" id="albumSlugRefresh">${regenerateLabel}</button>
            </div>
        </label>
        <div class="fn__flex b3-label">
            <div class="fn__flex-center fn__size200">${createdAtLabel}</div>
            <div class="fn__flex-1">
                <input type="datetime-local" class="b3-text-field fn__flex-1" id="albumCreatedAt" value="${initialCreatedAt}" />
            </div>
        </div>
        <label class="fn__flex b3-label">
            <div class="fn__flex-center fn__size200">${titleLabel}</div>
            <div class="fn__flex-1">
                <input class="b3-text-field fn__flex-1" id="albumTitle" value="${docTitle}" placeholder="${docTitle}" />
            </div>
        </label>
        <label class="fn__flex b3-label">
            <div class="fn__flex-center fn__size200">${descriptionLabel}</div>
            <div class="fn__flex-1">
                <textarea class="b3-text-field fn__flex-1" id="albumDescription" rows="3" placeholder="${descriptionPlaceholder}">${defaultDescription}</textarea>
            </div>
        </label>
        <label class="fn__flex b3-label">
            <div class="fn__flex-center fn__size200">${coverLabel}</div>
            <div class="fn__flex-1 fn__flex-column" style="gap: 6px;">
                <input class="b3-text-field fn__flex-1" id="albumCover" placeholder="${coverPlaceholder}" />
                <div class="fn__flex fn__flex-wrap" style="gap: 6px; align-items: center;">
                    <input type="file" class="b3-text-field" id="albumCoverFile" accept="image/*" ${coverUploadDisabled} />
                    <button class="b3-button b3-button--outline fn__size160" id="albumUploadCoverBtn" ${coverUploadDisabled}>${uploadCoverLabel}</button>
                    <small style="opacity: 0.8;">${uploadHint}</small>
                </div>
            </div>
        </label>
        <label class="fn__flex b3-label">
            <div class="fn__flex-center fn__size200">${locationLabel}</div>
            <div class="fn__flex-1">
                <input class="b3-text-field fn__flex-1" id="albumLocation" placeholder="杭州 · 龙井村" />
            </div>
        </label>
        <label class="fn__flex b3-label">
            <div class="fn__flex-center fn__size200">${aiSummaryLabel}</div>
            <div class="fn__flex-1">
                <textarea class="b3-text-field fn__flex-1" id="albumAiSummary" rows="2" placeholder="${aiSummaryPlaceholder}"></textarea>
            </div>
        </label>
        <label class="fn__flex b3-label">
            <div class="fn__flex-center fn__size200">${tagsLabel}</div>
            <div class="fn__flex-1">
                <input class="b3-text-field fn__flex-1" id="albumTags" placeholder="${tagsPlaceholder}" />
            </div>
        </label>
        <div class="b3-label fn__flex-column">
            <div class="fn__flex fn__flex-between" style="gap: 6px; align-items: center;">
                <div class="fn__flex-center fn__size200">${photosLabel}</div>
                <button class="b3-button b3-button--outline fn__size120" id="albumAddPhoto">${addPhotoLabel}</button>
            </div>
            <div id="albumPhotos" class="astro-album__photos"></div>
        </div>
        <label class="fn__flex b3-label">
            <div class="fn__flex-center fn__size200">${uploadPhotosLabel}</div>
            <div class="fn__flex-1 fn__flex-column" style="gap: 6px;">
                <input type="file" class="b3-text-field" id="albumPhotoFiles" accept="image/*" multiple ${coverUploadDisabled} />
                <div class="fn__flex fn__flex-wrap" style="gap: 6px; align-items: center;">
                    <button class="b3-button b3-button--outline fn__size160" id="albumUploadPhotosBtn" ${coverUploadDisabled}>${uploadButtonLabel}</button>
                    <small style="opacity: 0.8;">${uploadHint}</small>
                </div>
            </div>
        </label>
    </div>
</div>
</div>
<div class="b3-dialog__action">
    <button class="b3-button b3-button--cancel">${cancelLabel}</button><div class="fn__space"></div>
    <button class="b3-button b3-button--text" id="publishAlbumBtn">${publishLabel}</button>
</div>`,
        width: plugin.isMobile ? "92vw" : "620px"
    });

    const slugInput = dialog.element.querySelector("#albumSlug") as HTMLInputElement;
    const createdAtInput = dialog.element.querySelector("#albumCreatedAt") as HTMLInputElement;
    const titleInput = dialog.element.querySelector("#albumTitle") as HTMLInputElement;
    const descriptionInput = dialog.element.querySelector("#albumDescription") as HTMLTextAreaElement;
    const coverInput = dialog.element.querySelector("#albumCover") as HTMLInputElement;
    const locationInput = dialog.element.querySelector("#albumLocation") as HTMLInputElement;
    const aiSummaryInput = dialog.element.querySelector("#albumAiSummary") as HTMLTextAreaElement;
    const tagsInput = dialog.element.querySelector("#albumTags") as HTMLInputElement;
    const photosContainer = dialog.element.querySelector("#albumPhotos") as HTMLElement;
    const addPhotoBtn = dialog.element.querySelector("#albumAddPhoto") as HTMLButtonElement;
    const coverFileInput = dialog.element.querySelector("#albumCoverFile") as HTMLInputElement | null;
    const uploadCoverBtn = dialog.element.querySelector("#albumUploadCoverBtn") as HTMLButtonElement | null;
    const photoFileInput = dialog.element.querySelector("#albumPhotoFiles") as HTMLInputElement | null;
    const uploadPhotosBtn = dialog.element.querySelector("#albumUploadPhotosBtn") as HTMLButtonElement | null;
    const publishBtn = dialog.element.querySelector("#publishAlbumBtn") as HTMLButtonElement;
    const cancelBtn = dialog.element.querySelector(".b3-button--cancel") as HTMLButtonElement;
    const refreshBtn = dialog.element.querySelector("#albumSlugRefresh") as HTMLButtonElement;

    slugInput.value = defaultSlug;
    createdAtInput.value = initialCreatedAt;
    titleInput.value = initialMetadata?.title || docTitle;
    descriptionInput.value = initialMetadata?.description || defaultDescription;
    coverInput.value = initialMetadata?.cover || "";
    locationInput.value = initialMetadata?.location || "";
    aiSummaryInput.value = initialMetadata?.aiSummary || "";
    tagsInput.value = ((initialMetadata?.tags && initialMetadata.tags.length > 0) ? initialMetadata.tags : extractedTags).join(", ");

    const addPhotoRow = (initial?: Partial<AlbumPhoto>) => {
        const wrapper = document.createElement("div");
        wrapper.className = "astro-album__photo";
        wrapper.innerHTML = `
            <div class="astro-album__photo-header">
                <div class="astro-album__photo-title">${photoLabel}</div>
                <button type="button" class="b3-button b3-button--cancel astro-album__photo-remove">${removePhotoLabel}</button>
            </div>
            <div class="astro-album__photo-grid">
                <label class="b3-label">
                    <div>${photoUrlLabel}</div>
                    <input class="b3-text-field album-photo-src" placeholder="${photoUrlPlaceholder}" />
                </label>
                <label class="b3-label">
                    <div>${photoCaptionLabel}</div>
                    <input class="b3-text-field album-photo-caption" placeholder="${photoCaptionLabel}" />
                </label>
                <label class="b3-label">
                    <div>${photoTakenAtLabel}</div>
                    <input type="datetime-local" class="b3-text-field album-photo-takenAt" />
                </label>
                <label class="b3-label">
                    <div>${photoLocationLabel}</div>
                    <input class="b3-text-field album-photo-location" placeholder="${photoLocationLabel}" />
                </label>
                <label class="b3-label">
                    <div>${photoTagsLabel}</div>
                    <input class="b3-text-field album-photo-tags" placeholder="${photoTagsPlaceholder}" />
                </label>
                <label class="b3-label">
                    <div>${photoAiNoteLabel}</div>
                    <input class="b3-text-field album-photo-ainote" placeholder="${photoAiNoteLabel}" />
                </label>
            </div>
        `;
        photosContainer.appendChild(wrapper);

        const removeBtn = wrapper.querySelector<HTMLButtonElement>(".astro-album__photo-remove");
        removeBtn?.addEventListener("click", () => {
            wrapper.remove();
            refreshPhotoTitles(photosContainer, photoLabel);
        });

        if (initial?.src) {
            (wrapper.querySelector(".album-photo-src") as HTMLInputElement).value = initial.src;
        }
        if (initial?.caption) {
            (wrapper.querySelector(".album-photo-caption") as HTMLInputElement).value = initial.caption;
        }
        if (initial?.takenAt) {
            const takenAtInput = wrapper.querySelector<HTMLInputElement>(".album-photo-takenAt");
            if (takenAtInput) {
                const date = new Date(initial.takenAt);
                if (!Number.isNaN(date.getTime())) {
                    takenAtInput.value = toDateTimeLocalValue(date);
                }
            }
        }
        if (initial?.location) {
            (wrapper.querySelector(".album-photo-location") as HTMLInputElement).value = initial.location;
        }
        if (initial?.tags && initial.tags.length > 0) {
            (wrapper.querySelector(".album-photo-tags") as HTMLInputElement).value = initial.tags.join(", ");
        }
        if (initial?.aiNote) {
            (wrapper.querySelector(".album-photo-ainote") as HTMLInputElement).value = initial.aiNote;
        }

        refreshPhotoTitles(photosContainer, photoLabel);
    };

    const initialPhotos = initialMetadata?.photos || [];
    if (initialPhotos.length > 0) {
        initialPhotos.forEach(photo => addPhotoRow(photo));
    } else {
        addPhotoRow();
    }

    addPhotoBtn.addEventListener("click", () => {
        addPhotoRow();
    });

    let autoSlugValue = defaultSlug;
    let userEditedSlug = Boolean(existingRecord);

    const updateSlug = () => {
        const createdAtIso = ensureIsoString(createdAtInput.value);
        autoSlugValue = buildAlbumSlug(titleInput.value || docTitle, createdAtIso, docId.slice(0, 6));
        slugInput.value = autoSlugValue;
        userEditedSlug = false;
    };

    slugInput.addEventListener("input", () => {
        userEditedSlug = slugInput.value.trim() !== autoSlugValue;
    });

    createdAtInput.addEventListener("change", () => {
        if (!userEditedSlug || slugInput.value.trim().length === 0) {
            updateSlug();
        }
    });

    titleInput.addEventListener("input", () => {
        if (!userEditedSlug) {
            updateSlug();
        }
    });

    refreshBtn.addEventListener("click", () => {
        updateSlug();
    });

    cancelBtn.addEventListener("click", () => {
        dialog.destroy();
    });

    if (uploadCoverBtn) {
        uploadCoverBtn.addEventListener("click", async () => {
            if (!plugin.isS3UploadEnabled()) {
                showMessage(t("s3ConfigRequired", "请先配置对象存储"), 4000, "error");
                return;
            }
            if (!coverFileInput?.files || coverFileInput.files.length === 0) {
                showMessage(t("albumUploadNoFiles", "请先选择要上传的文件"), 3000, "error");
                return;
            }
            uploadCoverBtn.disabled = true;
            uploadCoverBtn.textContent = t("albumUploadProgress", "上传中...");
            try {
                const [url] = await plugin.uploadImagesToS3([coverFileInput.files[0]]);
                if (url) {
                    coverInput.value = url;
                }
                showMessage(t("albumUploadSuccess", "上传成功"));
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                showMessage(t("albumUploadFailed", "上传失败: ${error}").replace("${error}", message), 4000, "error");
            } finally {
                uploadCoverBtn.disabled = false;
                uploadCoverBtn.textContent = uploadCoverLabel;
            }
        });
    }

    if (uploadPhotosBtn) {
        uploadPhotosBtn.addEventListener("click", async () => {
            if (!plugin.isS3UploadEnabled()) {
                showMessage(t("s3ConfigRequired", "请先配置对象存储"), 4000, "error");
                return;
            }
            if (!photoFileInput?.files || photoFileInput.files.length === 0) {
                showMessage(t("albumUploadNoFiles", "请先选择要上传的文件"), 3000, "error");
                return;
            }
            uploadPhotosBtn.disabled = true;
            uploadPhotosBtn.textContent = t("albumUploadProgress", "上传中...");
            try {
                const urls = await plugin.uploadImagesToS3(Array.from(photoFileInput.files));
                urls.forEach(url => addPhotoRow({ src: url }));
                if (urls.length > 0) {
                    showMessage(t("albumUploadSuccess", "上传成功"));
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                showMessage(t("albumUploadFailed", "上传失败: ${error}").replace("${error}", message), 4000, "error");
            } finally {
                uploadPhotosBtn.disabled = false;
                uploadPhotosBtn.textContent = uploadButtonLabel;
            }
        });
    }

    publishBtn.addEventListener("click", async () => {
        const tags = parseListInput(tagsInput.value);
        const photos = collectPhotoData(photosContainer);
        const metadata: AlbumMetadata = {
            slug: slugInput.value.trim(),
            title: titleInput.value.trim(),
            description: descriptionInput.value.trim(),
            createdAt: ensureIsoString(createdAtInput.value),
            cover: coverInput.value.trim(),
            location: locationInput.value.trim(),
            aiSummary: aiSummaryInput.value.trim(),
            tags,
            photos
        };

        publishBtn.disabled = true;
        publishBtn.textContent = publishingLabel;
        try {
            const filePath = await plugin.publishAlbum(metadata, existingRecord?.slug);
            showMessage(`${successMessage}: ${filePath}`);
            onPublished?.();
            dialog.destroy();
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            showMessage(t("albumPublishFailed", "发布相册失败: ${error}").replace("${error}", message), 5000, "error");
        } finally {
            publishBtn.disabled = false;
            publishBtn.textContent = publishLabel;
        }
    });
}
