import { Dialog, showMessage } from "siyuan";
import type PluginSample from "../index";
import type { MomentMetadata } from "../types";
import { stripExistingFrontmatter } from "../utils/metadata";
import { extractTagsFromContent } from "../utils/tags";
import { buildMomentSlug, ensureIsoString, parseListInput, slugifyMoment, toDateTimeLocalValue } from "../utils/moments";

function ensureContentPreview(content: string, fallback: string): string {
    const trimmed = content.trim();
    return trimmed.length > 0 ? trimmed : fallback;
}

export async function openMomentDialog(plugin: PluginSample): Promise<void> {
    if (!plugin.isMomentConfigValid()) {
        showMessage(plugin.i18n.momentConfigRequired || plugin.i18n.configRequired);
        return;
    }

    const editor = plugin.getEditor();
    if (!editor) {
        showMessage(plugin.i18n.selectDocument);
        return;
    }

    const docId = editor.protyle.block.rootID;
    const docTitle = plugin.getDocumentTitle(editor) || "moment";

    let documentContent = "";
    let extractedTags: string[] = [];
    try {
        const content = await plugin.getDocumentContent(docId);
        documentContent = stripExistingFrontmatter(content).trim();
        extractedTags = extractTagsFromContent(content);
    } catch (error) {
        console.warn("Failed to prepare document content for moments:", error);
    }

    const nowIso = new Date().toISOString();
    const initialCreatedAt = toDateTimeLocalValue(new Date(nowIso));
    const defaultSlug = buildMomentSlug(docTitle, nowIso, docId.slice(0, 6));

    const dialog = new Dialog({
        title: plugin.i18n.publishMoment || "发布朋友圈",
        content: `<div class="b3-dialog__content astro-publisher__publish-dialog">
    <div class="fn__flex-column" style="gap: 12px;">
        <label class="fn__flex b3-label">
            <div class="fn__flex-center fn__size200">${plugin.i18n.momentSlug}</div>
            <div class="fn__flex-1 fn__flex" style="gap: 6px;">
                <input class="b3-text-field fn__flex-1" id="momentSlug" value="${defaultSlug}" placeholder="2024-05-18-tea-terrace" />
                <button class="b3-button b3-button--outline fn__size120" id="momentSlugRefresh">${plugin.i18n.momentRegenerateSlug}</button>
            </div>
        </label>
        <div class="fn__flex b3-label">
            <div class="fn__flex-center fn__size200">${plugin.i18n.momentCreatedAt}</div>
            <div class="fn__flex-1">
                <input type="datetime-local" class="b3-text-field fn__flex-1" id="momentCreatedAt" value="${initialCreatedAt}" />
            </div>
        </div>
        <label class="fn__flex b3-label">
            <div class="fn__flex-center fn__size200">${plugin.i18n.momentContent}</div>
            <div class="fn__flex-1">
                <textarea class="b3-text-field fn__flex-1" id="momentContent" rows="5" placeholder="${plugin.i18n.momentContentPlaceholder}">${ensureContentPreview(documentContent, docTitle)}</textarea>
            </div>
        </label>
        <label class="fn__flex b3-label">
            <div class="fn__flex-center fn__size200">${plugin.i18n.momentImages}</div>
            <div class="fn__flex-1">
                <textarea class="b3-text-field fn__flex-1" id="momentImages" rows="3" placeholder="${plugin.i18n.momentImagesDesc}"></textarea>
            </div>
        </label>
        <label class="fn__flex b3-label">
            <div class="fn__flex-center fn__size200">${plugin.i18n.momentLocation}</div>
            <div class="fn__flex-1">
                <input class="b3-text-field fn__flex-1" id="momentLocation" placeholder="杭州 · 龙井村" />
            </div>
        </label>
        <label class="fn__flex b3-label">
            <div class="fn__flex-center fn__size200">${plugin.i18n.momentWeather}</div>
            <div class="fn__flex-1">
                <input class="b3-text-field fn__flex-1" id="momentWeather" placeholder="☀️ 26℃" />
            </div>
        </label>
        <label class="fn__flex b3-label">
            <div class="fn__flex-center fn__size200">${plugin.i18n.momentMood}</div>
            <div class="fn__flex-1">
                <input class="b3-text-field fn__flex-1" id="momentMood" placeholder="慢慢来" />
            </div>
        </label>
        <label class="fn__flex b3-label">
            <div class="fn__flex-center fn__size200">${plugin.i18n.momentLink}</div>
            <div class="fn__flex-1">
                <input class="b3-text-field fn__flex-1" id="momentLink" placeholder="https://example.com/" />
            </div>
        </label>
        <label class="fn__flex b3-label">
            <div class="fn__flex-center fn__size200">${plugin.i18n.momentTags}</div>
            <div class="fn__flex-1">
                <input class="b3-text-field fn__flex-1" id="momentTags" placeholder="${plugin.i18n.momentTagsPlaceholder}" />
            </div>
        </label>
    </div>
</div>
<div class="b3-dialog__action">
    <button class="b3-button b3-button--cancel">${plugin.i18n.cancel}</button><div class="fn__space"></div>
    <button class="b3-button b3-button--text" id="publishMomentBtn">${plugin.i18n.momentPublish}</button>
</div>`,
        width: plugin.isMobile ? "92vw" : "520px"
    });

    const slugInput = dialog.element.querySelector("#momentSlug") as HTMLInputElement;
    const createdAtInput = dialog.element.querySelector("#momentCreatedAt") as HTMLInputElement;
    const contentInput = dialog.element.querySelector("#momentContent") as HTMLTextAreaElement;
    const imagesInput = dialog.element.querySelector("#momentImages") as HTMLTextAreaElement;
    const locationInput = dialog.element.querySelector("#momentLocation") as HTMLInputElement;
    const weatherInput = dialog.element.querySelector("#momentWeather") as HTMLInputElement;
    const moodInput = dialog.element.querySelector("#momentMood") as HTMLInputElement;
    const linkInput = dialog.element.querySelector("#momentLink") as HTMLInputElement;
    const tagsInput = dialog.element.querySelector("#momentTags") as HTMLInputElement;
    const publishBtn = dialog.element.querySelector("#publishMomentBtn") as HTMLButtonElement;
    const cancelBtn = dialog.element.querySelector(".b3-button--cancel") as HTMLButtonElement;
    const refreshBtn = dialog.element.querySelector("#momentSlugRefresh") as HTMLButtonElement;

    let autoSlugValue = defaultSlug;
    let userEditedSlug = false;

    const updateSlug = () => {
        const createdAtIso = ensureIsoString(createdAtInput.value);
        autoSlugValue = buildMomentSlug(docTitle, createdAtIso, docId.slice(0, 6));
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

    if (extractedTags.length > 0) {
        tagsInput.value = extractedTags.join(", ");
    }

    const closeDialog = () => {
        dialog.destroy();
    };

    cancelBtn.addEventListener("click", closeDialog);

    const handlePublish = async () => {
        const slug = slugifyMoment(slugInput.value.replace(/\.json$/i, "").trim());
        if (!slug) {
            showMessage(plugin.i18n.momentSlugRequired || "Slug is required", 3000, "error");
            return;
        }

        const content = contentInput.value.trim();
        if (!content) {
            showMessage(plugin.i18n.momentContentRequired || "Content is required", 3000, "error");
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
        publishBtn.textContent = plugin.i18n.momentPublishing;

        try {
            await plugin.publishMoment(metadata);
            showMessage(plugin.i18n.momentPublishSuccess, 4000);
            closeDialog();
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error("Failed to publish moment:", error);
            showMessage((plugin.i18n.momentPublishFailed || plugin.i18n.publishFailed).replace("${error}", message), 5000, "error");
        } finally {
            publishBtn.disabled = false;
            publishBtn.textContent = originalText;
        }
    };

    publishBtn.addEventListener("click", () => {
        handlePublish();
    });
}
