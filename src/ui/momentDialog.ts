import { Dialog, showMessage } from "siyuan";
import type PluginSample from "../index";
import type { MomentMetadata, MomentRecord } from "../types";
import { stripExistingFrontmatter } from "../utils/metadata";
import { extractTagsFromContent } from "../utils/tags";
import { buildMomentSlug, ensureIsoString, parseListInput, slugifyMoment, toDateTimeLocalValue } from "../utils/moments";

function ensureContentPreview(content: string, fallback: string): string {
    const trimmed = content.trim();
    return trimmed.length > 0 ? trimmed : fallback;
}

export async function openMomentDialog(
    plugin: PluginSample,
    existingRecord?: MomentRecord,
    onPublished?: () => void
): Promise<void> {
    const t = (key: string, fallback: string) => plugin.translate(key, fallback);

    if (!plugin.isMomentConfigValid()) {
        showMessage(t("momentConfigRequired", t("configRequired", "请先在设置中配置 GitHub 信息")));
        return;
    }

    const isEditing = Boolean(existingRecord);

    let docId = "";
    let docTitle = "moment";
    let documentContent = "";
    let extractedTags: string[] = [];

    if (isEditing && existingRecord) {
        docId = existingRecord.slug || existingRecord.metadata.slug || "moment";
        docTitle = existingRecord.slug || "moment";
        documentContent = existingRecord.metadata.content || "";
        extractedTags = existingRecord.metadata.tags || [];
    } else {
        const editor = plugin.getEditor();
        if (!editor) {
            showMessage(t("selectDocument", "请先打开一个文档"));
            return;
        }
        docId = editor.protyle.block.rootID;
        docTitle = plugin.getDocumentTitle(editor) || "moment";
        try {
            const content = await plugin.getDocumentContent(docId);
            documentContent = stripExistingFrontmatter(content).trim();
            extractedTags = extractTagsFromContent(content);
        } catch (error) {
            console.warn("Failed to prepare document content for moments:", error);
        }
    }

    const initialMetadata = existingRecord?.metadata;
    const createdAtIso = initialMetadata?.createdAt || new Date().toISOString();
    const createdAtDate = new Date(createdAtIso);
    const safeDate = Number.isNaN(createdAtDate.getTime()) ? new Date() : createdAtDate;
    const initialCreatedAt = toDateTimeLocalValue(safeDate);
    const defaultSlug = existingRecord?.slug || buildMomentSlug(docTitle, createdAtIso, docId.slice(0, 6));

    const slugLabel = t("momentSlug", "文件名");
    const regenerateLabel = t("momentRegenerateSlug", "重新生成");
    const createdAtLabel = t("momentCreatedAt", "创建时间");
    const contentLabel = t("momentContent", "内容");
    const contentPlaceholder = t("momentContentPlaceholder", "记录一下此刻的心情...");
    const imagesLabel = t("momentImages", "图片");
    const imagesPlaceholder = t("momentImagesDesc", "支持换行或逗号分隔多个链接");
    const uploadLabel = t("momentUploadFiles", "上传本地图片");
    const uploadButtonLabel = t("momentUploadBtn", "上传到对象存储");
    const uploadHint = plugin.isS3UploadEnabled()
        ? t("momentUploadHint", "选择本地图片后上传，成功会自动填入链接")
        : t("momentUploadDisabled", "可直接粘贴图片链接，或在设置中配置对象存储以启用上传");
    const uploadDisabled = plugin.isS3UploadEnabled() ? "" : "disabled";
    const locationLabel = t("momentLocation", "位置");
    const weatherLabel = t("momentWeather", "天气");
    const moodLabel = t("momentMood", "心情");
    const linkLabel = t("momentLink", "链接");
    const tagsLabel = t("momentTags", "标签");
    const tagsPlaceholder = t("momentTagsPlaceholder", "旅行, 生活");
    const cancelLabel = t("cancel", "取消");
    const publishLabel = isEditing ? t("momentUpdate", "保存修改") : t("momentPublish", "发布朋友圈");
    const dialogTitle = isEditing ? t("editMoment", "编辑朋友圈") : t("publishMoment", "发布朋友圈");
    const successMessage = isEditing ? t("momentUpdateSuccess", "动态已更新") : t("momentPublishSuccess", "动态发布成功");

    const dialog = new Dialog({
        title: dialogTitle,
        content: `<div class="b3-dialog__content astro-publisher__publish-dialog">
    <div class="astro-publisher__dialog-body">
        <div class="fn__flex-column" style="gap: 12px;">
        <label class="fn__flex b3-label">
            <div class="fn__flex-center fn__size200">${slugLabel}</div>
            <div class="fn__flex-1 fn__flex" style="gap: 6px;">
                <input class="b3-text-field fn__flex-1" id="momentSlug" value="${defaultSlug}" placeholder="2024-05-18-tea-terrace" />
                <button class="b3-button b3-button--outline fn__size120" id="momentSlugRefresh">${regenerateLabel}</button>
            </div>
        </label>
        <div class="fn__flex b3-label">
            <div class="fn__flex-center fn__size200">${createdAtLabel}</div>
            <div class="fn__flex-1">
                <input type="datetime-local" class="b3-text-field fn__flex-1" id="momentCreatedAt" value="${initialCreatedAt}" />
            </div>
        </div>
        <label class="fn__flex b3-label">
            <div class="fn__flex-center fn__size200">${contentLabel}</div>
            <div class="fn__flex-1">
                <textarea class="b3-text-field fn__flex-1" id="momentContent" rows="5" placeholder="${contentPlaceholder}"></textarea>
            </div>
        </label>
        <label class="fn__flex b3-label">
            <div class="fn__flex-center fn__size200">${imagesLabel}</div>
            <div class="fn__flex-1">
                <textarea class="b3-text-field fn__flex-1" id="momentImages" rows="3" placeholder="${imagesPlaceholder}"></textarea>
            </div>
        </label>
        <label class="fn__flex b3-label">
            <div class="fn__flex-center fn__size200">${uploadLabel}</div>
            <div class="fn__flex-1 fn__flex-column" style="gap: 6px;">
                <input type="file" class="b3-text-field" id="momentImageFiles" accept="image/*" multiple ${uploadDisabled} />
                <div class="fn__flex fn__flex-wrap" style="gap: 6px; align-items: center;">
                    <button class="b3-button b3-button--outline fn__size160" id="momentUploadBtn" ${uploadDisabled}>${uploadButtonLabel}</button>
                    <small style="opacity: 0.8;">${uploadHint}</small>
                </div>
            </div>
        </label>
        <label class="fn__flex b3-label">
            <div class="fn__flex-center fn__size200">${locationLabel}</div>
            <div class="fn__flex-1">
                <input class="b3-text-field fn__flex-1" id="momentLocation" placeholder="杭州 · 龙井村" />
            </div>
        </label>
        <label class="fn__flex b3-label">
            <div class="fn__flex-center fn__size200">${weatherLabel}</div>
            <div class="fn__flex-1">
                <input class="b3-text-field fn__flex-1" id="momentWeather" placeholder="☀️ 26℃" />
            </div>
        </label>
        <label class="fn__flex b3-label">
            <div class="fn__flex-center fn__size200">${moodLabel}</div>
            <div class="fn__flex-1">
                <input class="b3-text-field fn__flex-1" id="momentMood" placeholder="慢慢来" />
            </div>
        </label>
        <label class="fn__flex b3-label">
            <div class="fn__flex-center fn__size200">${linkLabel}</div>
            <div class="fn__flex-1">
                <input class="b3-text-field fn__flex-1" id="momentLink" placeholder="https://example.com/" />
            </div>
        </label>
        <label class="fn__flex b3-label">
            <div class="fn__flex-center fn__size200">${tagsLabel}</div>
            <div class="fn__flex-1">
                <input class="b3-text-field fn__flex-1" id="momentTags" placeholder="${tagsPlaceholder}" />
            </div>
        </label>
    </div>
</div>
</div>
<div class="b3-dialog__action">
    <button class="b3-button b3-button--cancel">${cancelLabel}</button><div class="fn__space"></div>
    <button class="b3-button b3-button--text" id="publishMomentBtn">${publishLabel}</button>
</div>`,
        width: plugin.isMobile ? "92vw" : "520px"
    });

    const slugInput = dialog.element.querySelector("#momentSlug") as HTMLInputElement;
    const createdAtInput = dialog.element.querySelector("#momentCreatedAt") as HTMLInputElement;
    const contentInput = dialog.element.querySelector("#momentContent") as HTMLTextAreaElement;
    const imagesInput = dialog.element.querySelector("#momentImages") as HTMLTextAreaElement;
    const fileInput = dialog.element.querySelector("#momentImageFiles") as HTMLInputElement | null;
    const uploadBtn = dialog.element.querySelector("#momentUploadBtn") as HTMLButtonElement | null;
    const locationInput = dialog.element.querySelector("#momentLocation") as HTMLInputElement;
    const weatherInput = dialog.element.querySelector("#momentWeather") as HTMLInputElement;
    const moodInput = dialog.element.querySelector("#momentMood") as HTMLInputElement;
    const linkInput = dialog.element.querySelector("#momentLink") as HTMLInputElement;
    const tagsInput = dialog.element.querySelector("#momentTags") as HTMLInputElement;
    const publishBtn = dialog.element.querySelector("#publishMomentBtn") as HTMLButtonElement;
    const cancelBtn = dialog.element.querySelector(".b3-button--cancel") as HTMLButtonElement;
    const refreshBtn = dialog.element.querySelector("#momentSlugRefresh") as HTMLButtonElement;

    contentInput.value = isEditing ? (initialMetadata?.content || "") : ensureContentPreview(documentContent, docTitle);
    imagesInput.value = (initialMetadata?.images || []).join("\n");
    locationInput.value = initialMetadata?.location || "";
    weatherInput.value = initialMetadata?.weather || "";
    moodInput.value = initialMetadata?.mood || "";
    linkInput.value = initialMetadata?.link || "";
    tagsInput.value = ((initialMetadata?.tags && initialMetadata.tags.length > 0) ? initialMetadata.tags : extractedTags).join(", ");

    let autoSlugValue = defaultSlug;
    let userEditedSlug = Boolean(existingRecord);

    const updateSlug = () => {
        const createdAtIsoValue = ensureIsoString(createdAtInput.value);
        autoSlugValue = buildMomentSlug(docTitle, createdAtIsoValue, docId.slice(0, 6));
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

    refreshBtn.addEventListener("click", () => {
        updateSlug();
    });

    const closeDialog = () => {
        dialog.destroy();
    };

    cancelBtn.addEventListener("click", closeDialog);

    if (uploadBtn) {
        uploadBtn.addEventListener("click", async () => {
            if (!plugin.isS3UploadEnabled()) {
                showMessage(t("s3ConfigRequired", "请先配置对象存储"), 4000, "error");
                return;
            }
            if (!fileInput?.files || fileInput.files.length === 0) {
                showMessage(t("momentUploadNoFiles", "请先选择要上传的图片"), 3000, "error");
                return;
            }

            const originalText = uploadBtn.textContent || "";
            uploadBtn.disabled = true;
            uploadBtn.textContent = t("momentUploadProgress", "上传中...");

            try {
                const urls = await plugin.uploadImagesToS3(Array.from(fileInput.files));
                const existing = parseListInput(imagesInput.value);
                const merged = Array.from(new Set([...existing, ...urls]));
                imagesInput.value = merged.join("\n");
                showMessage(t("momentUploadSuccess", "图片上传成功"), 4000);
                fileInput.value = "";
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                const template = t("momentUploadFailed", "上传失败：${error}");
                showMessage(template.replace("${error}", message), 5000, "error");
            } finally {
                uploadBtn.disabled = false;
                uploadBtn.textContent = originalText || uploadButtonLabel;
            }
        });
    }

    const handlePublish = async () => {
        const slug = slugifyMoment(slugInput.value.replace(/\.json$/i, "").trim());
        if (!slug) {
            showMessage(t("momentSlugRequired", "请填写文件名"), 3000, "error");
            return;
        }

        const content = contentInput.value.trim();
        if (!content) {
            showMessage(t("momentContentRequired", "请填写动态内容"), 3000, "error");
            return;
        }

        const metadata: MomentMetadata = {
            slug,
            content,
            createdAt: ensureIsoString(createdAtInput.value),
            images: parseListInput(imagesInput.value),
            location: locationInput.value.trim(),
            weather: weatherInput.value.trim(),
            link: linkInput.value.trim(),
            mood: moodInput.value.trim(),
            tags: parseListInput(tagsInput.value || extractedTags.join(","))
        };

        const originalText = publishBtn.textContent;
        publishBtn.disabled = true;
        publishBtn.textContent = t("momentPublishing", "发布中...");

        try {
            await plugin.publishMoment(metadata, existingRecord?.slug);
            showMessage(successMessage, 4000);
            onPublished?.();
            closeDialog();
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error("Failed to publish moment:", error);
            const failedTemplate = t("momentPublishFailed", "发布动态失败：${error}");
            showMessage(failedTemplate.replace("${error}", message), 5000, "error");
        } finally {
            publishBtn.disabled = false;
            publishBtn.textContent = originalText;
        }
    };

    publishBtn.addEventListener("click", () => {
        handlePublish();
    });
}
