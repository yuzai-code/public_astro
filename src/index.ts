import {
    Plugin,
    showMessage,
    confirm,
    Dialog,
    fetchPost,
    Protyle,
    IOperation,
    Constants,
    ICard,
    ICardData,
    Custom,
    getAllEditor
} from "siyuan";
import "./index.scss";
import {IMenuItem} from "siyuan/types";

import {STORAGE_NAME, ASTRO_CONFIG_NAME, ASTRO_STATS_NAME, TAB_TYPE} from "./constants";
import type {AstroConfig, Category, PublishMetadata, PublishStat} from "./types";
import {
    generateFrontmatter,
    getPostFilePath,
    normalizeMetadata,
    stripExistingFrontmatter
} from "./utils/metadata";
import {initializePlugin} from "./lifecycle/onload";
import {handleLayoutReady} from "./lifecycle/onLayoutReady";
import {openPublishDialog} from "./ui/publishDialog";
import {openPublishStatsDialog} from "./ui/publishStats";
import {openPluginMenu} from "./ui/menu";
import {openCategoryDialog} from "./ui/categoryDialog";
import {
    deleteCategory as serviceDeleteCategory,
    deletePublishedFile as serviceDeletePublishedFile,
    getFileFromGitHub,
    loadCategories as serviceLoadCategories,
    saveCategory as serviceSaveCategory,
    testGitHubConnection as serviceTestGitHubConnection,
    uploadToGitHub
} from "./services/githubService";

export default class PluginSample extends Plugin {

    public custom: () => Custom;
    public isMobile = false;
    public astroConfig!: AstroConfig;
    public categories: Category[] = [];
    public publishStats: Record<string, PublishStat> = {};
    private setting!: any;
    public protyleSlash: any;
    public protyleOptions: any;

    private translate(key: string, fallback: string): string {
        const dict = this.i18n as Record<string, unknown>;
        const value = dict?.[key];
        return typeof value === "string" && value.trim().length > 0 ? value : fallback;
    }

    updateProtyleToolbar(toolbar: Array<string | IMenuItem>) {
        toolbar.push("|");
        toolbar.push({
            name: "insert-smail-emoji",
            icon: "iconEmoji",
            hotkey: "⇧⌘I",
            tipPosition: "n",
            tip: this.i18n.insertEmoji,
            click(protyle: Protyle) {
                protyle.insert("😊");
            }
        });
        return toolbar;
    }

    onload() {
        initializePlugin(this);
    }

    onLayoutReady() {
        handleLayoutReady(this);
    }

    onunload() {
        console.log(this.i18n.byePlugin);
    }

    uninstall() {
        console.log("uninstall");
    }

    async updateCards(options: ICardData) {
        options.cards.sort((a: ICard, b: ICard) => {
            if (a.blockID < b.blockID) {
                return -1;
            }
            if (a.blockID > b.blockID) {
                return 1;
            }
            return 0;
        });
        return options;
    }

    private eventBusPaste(event: any) {
        event.preventDefault();
        event.detail.resolve({
            textPlain: event.detail.textPlain.trim()
        });
    }

    private eventBusLog({detail}: any) {
        console.log(detail);
    }

    private blockIconEvent({detail}: any) {
        detail.menu.addItem({
            id: "pluginSample_removeSpace",
            iconHTML: "",
            label: this.i18n.removeSpace,
            click: () => {
                const doOperations: IOperation[] = [];
                detail.blockElements.forEach((item: HTMLElement) => {
                    const editElement = item.querySelector('[contenteditable="true"]');
                    if (editElement) {
                        editElement.textContent = editElement.textContent.replace(/ /g, "");
                        doOperations.push({
                            id: item.dataset.nodeId,
                            data: item.outerHTML,
                            action: "update"
                        });
                    }
                });
                detail.protyle.getInstance().transaction(doOperations);
            }
        });
    }

    showDialog() {
        const dialog = new Dialog({
            title: `SiYuan ${Constants.SIYUAN_VERSION}`,
            content: `<div class="b3-dialog__content">
    <div>appId:</div>
    <div class="fn__hr"></div>
    <div class="plugin-sample__time">${this.app.appId}</div>
    <div class="fn__hr"></div>
    <div class="fn__hr"></div>
    <div>API demo:</div>
    <div class="fn__hr"></div>
    <div class="plugin-sample__time">System current time: <span id="time"></span></div>
    <div class="fn__hr"></div>
    <div class="fn__hr"></div>
    <div>Protyle demo:</div>
    <div class="fn__hr"></div>
    <div id="protyle" style="height: 360px;"></div>
</div>`,
            width: this.isMobile ? "92vw" : "560px",
            height: "540px"
        });
        const editor = this.getEditor();
        const blockId = editor?.protyle?.block?.rootID;
        if (blockId) {
            new Protyle(this.app, dialog.element.querySelector("#protyle"), {
                blockId
            });
        }
        fetchPost("/api/system/currentTime", {}, (response) => {
            dialog.element.querySelector("#time").innerHTML = new Date(response.data).toString();
        });
    }

    addMenu(rect?: DOMRect) {
        openPluginMenu(this, rect);
    }

    showPublishDialog() {
        openPublishDialog(this);
    }

    showPublishStats() {
        openPublishStatsDialog(this);
    }

    showCategoryDialog(category?: Category, onSuccess?: () => void) {
        openCategoryDialog(this, category, onSuccess);
    }

    isConfigValid(): boolean {
        return Boolean(
            this.astroConfig?.githubToken &&
            this.astroConfig?.githubOwner &&
            this.astroConfig?.githubRepo &&
            this.astroConfig?.astroContentPath
        );
    }

    private async getDocumentContent(blockId: string): Promise<string> {
        return new Promise((resolve, reject) => {
            fetchPost("/api/export/exportMdContent", {
                id: blockId
            }, (response) => {
                if (response.code === 0) {
                    resolve(response.data.content);
                } else {
                    reject(new Error(response.msg));
                }
            });
        });
    }

    async publishToGitHub(blockId: string, metadata: PublishMetadata, targetPath?: string): Promise<string> {
        const content = await this.getDocumentContent(blockId);
        const bodyContent = stripExistingFrontmatter(content);
        const frontmatter = generateFrontmatter(this.astroConfig, metadata);
        const fullContent = frontmatter + bodyContent;

        let filePath: string;
        if (targetPath && targetPath.trim().length > 0) {
            const trimmedTarget = targetPath.trim().replace(/^\/+/, "");
            if (trimmedTarget.startsWith(this.astroConfig.astroContentPath)) {
                filePath = trimmedTarget;
            } else {
                const basePath = this.astroConfig.astroContentPath.replace(/\/+$/, "");
                filePath = `${basePath}/${trimmedTarget}`;
            }
        } else {
            filePath = getPostFilePath(this.astroConfig, blockId);
        }

        const existingFile = await getFileFromGitHub(this.astroConfig, filePath);
        const message = `${existingFile ? "Update" : "Add"} post: ${filePath}`;
        await uploadToGitHub(this.astroConfig, filePath, fullContent, message, existingFile?.sha);
        return filePath;
    }

    async testGitHubConnection(button: HTMLButtonElement): Promise<void> {
        const originalText = button.textContent;
        try {
            button.textContent = this.i18n.testing;
            button.disabled = true;

            if (!this.isConfigValid()) {
                throw new Error(this.i18n.configRequired);
            }

            const result = await serviceTestGitHubConnection(this.astroConfig);
            let contentStatus = "";
            if (result.contentStatus === "exists") {
                contentStatus = " ✓ 内容目录存在";
            } else if (result.contentStatus === "missing") {
                contentStatus = " ⚠ 内容目录不存在，发布时将自动创建";
            } else {
                contentStatus = ` ⚠ 无法访问内容目录${result.contentError ? `：${result.contentError}` : ""}`;
            }
            showMessage(`${this.i18n.testSuccess}\n仓库: ${result.repoFullName}${contentStatus}`, 6000);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error("GitHub connection test failed:", error);
            showMessage(this.i18n.testFailed.replace("${error}", message));
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    }

    async loadCategories(): Promise<void> {
        if (!this.isConfigValid()) {
            this.categories = [];
            return;
        }
        this.categories = await serviceLoadCategories(this.astroConfig);
    }

    populateCategorySelect(selectElement: HTMLSelectElement): void {
        while (selectElement.children.length > 1) {
            selectElement.removeChild(selectElement.lastChild);
        }

        this.categories.forEach(category => {
            const option = document.createElement("option");
            option.value = category.name;
            option.textContent = category.title;
            selectElement.appendChild(option);
        });
    }

    async saveCategory(category: Category): Promise<void> {
        await serviceSaveCategory(this.astroConfig, category);
    }

    async deleteCategory(categoryName: string): Promise<void> {
        await serviceDeleteCategory(this.astroConfig, categoryName);
    }

    async deletePublishedFile(filePath: string): Promise<void> {
        await serviceDeletePublishedFile(this.astroConfig, filePath);
    }

    async quickPublish(stat: PublishStat, button: HTMLButtonElement): Promise<void> {
        if (!stat.lastMetadata) {
            showMessage(this.translate("noMetadata", "缺少发布元数据，请先通过发布对话框发布一次。"), 4000, "error");
            return;
        }

        const originalText = button.textContent;
        button.textContent = this.translate("quickPublishing", "发布中...");
        button.disabled = true;

        try {
            const metadata = normalizeMetadata({
                ...stat.lastMetadata,
                title: stat.title,
                category: stat.category,
                tags: stat.tags,
                description: stat.description,
                draft: stat.draft,
                publishDate: new Date().toISOString()
            });

            const filePath = await this.publishToGitHub(stat.docId, metadata, stat.filePath);
            this.recordPublishStats(stat.docId, metadata, filePath);
            showMessage(`${this.translate("quickPublishSuccess", "发布成功")}: ${stat.title}`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error("Quick publish failed:", error);
            showMessage(this.i18n.publishFailed.replace("${error}", message));
        } finally {
            button.textContent = originalText || this.translate("quickPublish", "快速发布");
            button.disabled = false;
        }
    }

    recordPublishStats(editorOrDocId: any, metadata: PublishMetadata, filePath?: string): void {
        let docId: string | undefined;

        if (typeof editorOrDocId === "string") {
            docId = editorOrDocId;
        } else if (editorOrDocId?.protyle?.block?.rootID) {
            docId = editorOrDocId.protyle.block.rootID;
        }

        if (!docId) {
            console.warn("Unable to record publish stats: missing document ID");
            return;
        }

        const normalized = normalizeMetadata(metadata);

        if (!normalized.title || normalized.title === "Untitled") {
            if (typeof editorOrDocId !== "string") {
                normalized.title = this.getDocumentTitle(editorOrDocId) || normalized.title;
            } else if (this.publishStats[docId]?.title) {
                normalized.title = this.publishStats[docId].title;
            }
        }

        const resolvedFilePath = (filePath && filePath.trim().length > 0)
            ? filePath.trim()
            : this.publishStats[docId]?.filePath || getPostFilePath(this.astroConfig, docId);

        const now = new Date().toISOString();
        normalized.publishDate = now;

        const existing: PublishStat = this.publishStats[docId] || {
            docId,
            title: normalized.title,
            category: normalized.category,
            tags: normalized.tags,
            description: normalized.description,
            draft: normalized.draft,
            filePath: resolvedFilePath,
            lastPublishedAt: now,
            publishCount: 0,
            lastMetadata: null
        };

        existing.title = normalized.title;
        existing.category = normalized.category;
        existing.tags = normalized.tags;
        existing.description = normalized.description;
        existing.draft = normalized.draft;
        existing.lastPublishedAt = now;
        existing.publishCount = (existing.publishCount || 0) + 1;
        existing.lastMetadata = JSON.parse(JSON.stringify(normalized));
        existing.filePath = resolvedFilePath;

        this.publishStats[docId] = existing;
        this.saveData(ASTRO_STATS_NAME, this.publishStats);
    }

    private getDocumentTitle(editor: any): string {
        try {
            if (typeof editor.protyle.title === "string") {
                return editor.protyle.title;
            }
            const titleElement = editor.protyle.title as HTMLElement;
            if (titleElement && titleElement.textContent) {
                return titleElement.textContent.trim();
            }
            if (editor.protyle.path) {
                const pathParts = editor.protyle.path.split("/");
                const fileName = pathParts[pathParts.length - 1];
                return fileName.replace(".sy", "");
            }
            return "Untitled";
        } catch (error) {
            console.warn("Failed to get document title:", error);
            return "Untitled";
        }
    }

    getEditor() {
        const editors = getAllEditor();
        if (editors.length === 0) {
            showMessage("请先打开一个文档");
            return;
        }

        const activeElement = document.activeElement;
        if (activeElement) {
            for (const editor of editors) {
                if (editor.protyle?.element?.contains(activeElement)) {
                    console.log("Found editor by active element:", editor.protyle?.block?.rootID);
                    return editor;
                }
            }
        }

        const currentTab = document.querySelector(".layout-tab-container .item--focus");
        if (currentTab) {
            const tabId = currentTab.getAttribute("data-id");
            for (const editor of editors) {
                const editorTab = editor.protyle?.element?.closest(".fn__flex-1[data-id]");
                if (editorTab && editorTab.getAttribute("data-id") === tabId) {
                    console.log("Found editor by tab:", editor.protyle?.block?.rootID);
                    return editor;
                }
            }
        }

        for (const editor of editors) {
            const element = editor.protyle?.element;
            if (element && element.offsetParent !== null) {
                const rect = element.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    if (rect.top >= 0 && rect.left >= 0 &&
                        rect.bottom <= window.innerHeight &&
                        rect.right <= window.innerWidth) {
                        console.log("Found editor by visibility:", editor.protyle?.block?.rootID);
                        return editor;
                    }
                }
            }
        }

        console.log("Using first editor as fallback:", editors[0].protyle?.block?.rootID);
        return editors[0];
    }
}
