import { Dialog, showMessage } from "siyuan";
import type { Category } from "../types";
import type PluginSample from "../index";

export function openCategoryDialog(plugin: PluginSample, category?: Category, onSuccess?: () => void): void {
    const t = (key: string, fallback: string) => plugin.translate(key, fallback);

    const isEdit = !!category;
    const dialog = new Dialog({
        title: `${isEdit ? "✏️ " + t("editCategory", "编辑分类") : "➕ " + t("addCategory", "添加分类")}`,
        content: `<div class="b3-dialog__content">
    <div class="fn__flex-column" style="gap: 16px;">
        <div class="fn__flex-column">
            <label class="fn__flex b3-label">
                <div class="fn__flex-center fn__size120" style="font-weight: 500;">${t("categoryName", "分类名称")}</div>
                <div class="fn__flex-1">
                    <input class="b3-text-field fn__flex-1" id="categoryName" 
                           placeholder="astro" 
                           ${isEdit ? 'readonly style="background-color: var(--b3-theme-surface-lighter); color: var(--b3-theme-on-surface-light);"' : ''} />
                </div>
            </label>
            ${!isEdit ? '<div style="font-size: 11px; color: var(--b3-theme-on-surface-light); margin-top: 4px; margin-left: 120px;">用于 URL 和文件名，建议使用英文小写</div>' : ''}
        </div>
        
        <div class="fn__flex-column">
            <label class="fn__flex b3-label">
                <div class="fn__flex-center fn__size120" style="font-weight: 500;">${t("categoryTitle", "分类标题")}</div>
                <div class="fn__flex-1">
                    <input class="b3-text-field fn__flex-1" id="categoryTitle" placeholder="Astro Framework 🚀" />
                </div>
            </label>
            <div style="font-size: 11px; color: var(--b3-theme-on-surface-light); margin-top: 4px; margin-left: 120px;">显示给用户的友好名称，可以使用中文和表情符号</div>
        </div>
        
        <div class="fn__flex-column">
            <label class="fn__flex b3-label">
                <div class="fn__flex-center fn__size120" style="font-weight: 500; align-self: flex-start; margin-top: 8px;">${t("categoryDescription", "分类描述")}</div>
                <div class="fn__flex-1">
                    <textarea class="b3-text-field fn__flex-1" id="categoryDescription" 
                              placeholder="The web framework for content-driven websites"
                              rows="3"
                              style="resize: vertical; min-height: 60px;"></textarea>
                </div>
            </label>
            <div style="font-size: 11px; color: var(--b3-theme-on-surface-light); margin-top: 4px; margin-left: 120px;">分类的详细描述，有助于 SEO 优化</div>
        </div>
    </div>
</div>
<div class="b3-dialog__action">
    <button class="b3-button b3-button--cancel">${t("cancel", "取消")}</button><div class="fn__space"></div>
    <button class="b3-button b3-button--text" id="saveBtn">${t("save", "保存")}</button>
</div>`,
        width: plugin.isMobile ? "92vw" : "480px"
    });

    const nameInput = dialog.element.querySelector("#categoryName") as HTMLInputElement;
    const titleInput = dialog.element.querySelector("#categoryTitle") as HTMLInputElement;
    const descriptionInput = dialog.element.querySelector("#categoryDescription") as HTMLTextAreaElement;
    const saveBtn = dialog.element.querySelector("#saveBtn") as HTMLButtonElement;
    const cancelBtn = dialog.element.querySelector(".b3-button--cancel") as HTMLButtonElement;

    if (category) {
        nameInput.value = category.name;
        titleInput.value = category.title;
        descriptionInput.value = category.description;
    }

    cancelBtn.addEventListener("click", () => {
        dialog.destroy();
    });

    saveBtn.addEventListener("click", async () => {
        const name = nameInput.value.trim();
        const title = titleInput.value.trim();
        const description = descriptionInput.value.trim();

        if (!name || !title) {
            showMessage("分类名称和标题不能为空");
            return;
        }

        if (!isEdit && plugin.categories.some(cat => cat.name === name)) {
            showMessage(t("categoryExists", "分类已存在"));
            return;
        }

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = "保存中...";

            await plugin.saveCategory({ name, title, description });

            showMessage(isEdit ? t("categoryUpdated", "分类已更新") : t("categoryCreated", "分类已创建"));
            dialog.destroy();

            await plugin.loadCategories();

            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            showMessage(t("categoryOperationFailed", "分类操作失败：${error}").replace("${error}", message));
            saveBtn.disabled = false;
            saveBtn.textContent = t("save", "保存");
        }
    });
}
