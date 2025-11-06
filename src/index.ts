import {
    Plugin,
    showMessage,
    confirm,
    Dialog,
    Menu,
    openTab,
    adaptHotkey,
    getFrontend,
    getBackend,
    Setting,
    fetchPost,
    Protyle,
    openWindow,
    IOperation,
    Constants,
    openMobileFileById,
    lockScreen,
    ICard,
    ICardData,
    Custom,
    exitSiYuan,
    getModelByDockType,
    getAllEditor,
    Files,
    platformUtils,
    openSetting,
    openAttributePanel,
    saveLayout
} from "siyuan";
import "./index.scss";
import {IMenuItem} from "siyuan/types";

const STORAGE_NAME = "menu-config";
const ASTRO_CONFIG_NAME = "astro-config";
const ASTRO_STATS_NAME = "astro-stats";
const TAB_TYPE = "custom_tab";
const DOCK_TYPE = "dock_tab";

interface AstroConfig {
    githubToken: string;
    githubOwner: string;
    githubRepo: string;
    astroContentPath: string;
    categoriesPath: string;
    yamlTemplate: string;
    customFields: CustomField[];
}

interface CustomField {
    name: string;
    label?: string;
    type?: 'string' | 'number' | 'boolean' | 'array' | 'text';
    placeholder?: string;
    defaultValue?: string;
    required?: boolean;
    value?: string;
}

interface Category {
    name: string;
    title: string;
    description: string;
}

interface PublishMetadata {
    title: string;
    description: string;
    publishDate: string;
    tags: string[];
    category: string;
    draft: boolean;
    customFields?: { [key: string]: any };
}

interface PublishStat {
    docId: string;
    title: string;
    category: string;
    tags: string[];
    description: string;
    draft: boolean;
    filePath: string;
    lastPublishedAt: string;
    publishCount: number;
    lastMetadata: PublishMetadata | null;
}

export default class PluginSample extends Plugin {

    private custom: () => Custom;
    private isMobile: boolean;
    private blockIconEventBindThis = this.blockIconEvent.bind(this);
    private astroConfig: AstroConfig;
    private categories: Category[] = [];
    private publishStats: Record<string, PublishStat> = {};

    private translate(key: string, fallback: string): string {
        const dict = this.i18n as Record<string, unknown>;
        const value = dict?.[key];
        return typeof value === "string" && value.trim().length > 0 ? value : fallback;
    }

    private formatPublishDate(value: string | undefined): string {
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

    private stringifyPlaceholderValue(value: any): string {
        if (value === null || value === undefined) {
            return "";
        }
        if (Array.isArray(value)) {
            return value.map(item => this.stringifyPlaceholderValue(item)).join(", ");
        }
        if (typeof value === "object") {
            try {
                return JSON.stringify(value);
            } catch (error) {
                return String(value);
            }
        }
        return String(value);
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
        this.data[STORAGE_NAME] = {readonlyText: "Readonly"};
        
        // 初始化 Astro 配置
        this.astroConfig = {
            githubToken: "",
            githubOwner: "",
            githubRepo: "",
            astroContentPath: "src/content/posts",
            categoriesPath: "src/content/categories",
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

        const frontEnd = getFrontend();
        this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";
        // 图标的制作参见帮助文档
        this.addIcons(`<symbol id="iconFace" viewBox="0 0 32 32">
<path d="M13.667 17.333c0 0.92-0.747 1.667-1.667 1.667s-1.667-0.747-1.667-1.667 0.747-1.667 1.667-1.667 1.667 0.747 1.667 1.667zM20 15.667c-0.92 0-1.667 0.747-1.667 1.667s0.747 1.667 1.667 1.667 1.667-0.747 1.667-1.667-0.747-1.667-1.667-1.667zM29.333 16c0 7.36-5.973 13.333-13.333 13.333s-13.333-5.973-13.333-13.333 5.973-13.333 13.333-13.333 13.333 5.973 13.333 13.333zM14.213 5.493c1.867 3.093 5.253 5.173 9.12 5.173 0.613 0 1.213-0.067 1.787-0.16-1.867-3.093-5.253-5.173-9.12-5.173-0.613 0-1.213 0.067-1.787 0.16zM5.893 12.627c2.28-1.293 4.040-3.4 4.88-5.92-2.28 1.293-4.040 3.4-4.88 5.92zM26.667 16c0-1.040-0.16-2.040-0.44-2.987-0.933 0.2-1.893 0.32-2.893 0.32-4.173 0-7.893-1.92-10.347-4.92-1.4 3.413-4.187 6.093-7.653 7.4 0.013 0.053 0 0.12 0 0.187 0 5.88 4.787 10.667 10.667 10.667s10.667-4.787 10.667-10.667z"></path>
</symbol>
<symbol id="iconSaving" viewBox="0 0 32 32">
<path d="M20 13.333c0-0.733 0.6-1.333 1.333-1.333s1.333 0.6 1.333 1.333c0 0.733-0.6 1.333-1.333 1.333s-1.333-0.6-1.333-1.333zM10.667 12h6.667v-2.667h-6.667v2.667zM29.333 10v9.293l-3.76 1.253-2.24 7.453h-7.333v-2.667h-2.667v2.667h-7.333c0 0-3.333-11.28-3.333-15.333s3.28-7.333 7.333-7.333h6.667c1.213-1.613 3.147-2.667 5.333-2.667 1.107 0 2 0.893 2 2 0 0.28-0.053 0.533-0.16 0.773-0.187 0.453-0.347 0.973-0.427 1.533l3.027 3.027h2.893zM26.667 12.667h-1.333l-4.667-4.667c0-0.867 0.12-1.72 0.347-2.547-1.293 0.333-2.347 1.293-2.787 2.547h-8.227c-2.573 0-4.667 2.093-4.667 4.667 0 2.507 1.627 8.867 2.68 12.667h2.653v-2.667h8v2.667h2.68l2.067-6.867 3.253-1.093v-4.707z"></path>
</symbol>
<symbol id="iconAstro" viewBox="0 0 32 32">
<path d="M16 2L3 7l2 12h22l2-12L16 2zm0 4l8 3-1 6H9l-1-6 8-3zm0 2a2 2 0 100 4 2 2 0 000-4z"/>
</symbol>`);

        this.custom = this.addTab({
            type: TAB_TYPE,
            init() {
                this.element.innerHTML = `<div class="plugin-sample__custom-tab">${this.data.text}</div>`;
            },
            beforeDestroy() {
                console.log("before destroy tab:", TAB_TYPE);
            },
            destroy() {
                console.log("destroy tab:", TAB_TYPE);
            }
        });

        this.addCommand({
            langKey: "showDialog",
            hotkey: "⇧⌘O",
            callback: () => {
                this.showDialog();
            },
        });

        this.addCommand({
            langKey: "getTab",
            hotkey: "⇧⌘M",
            globalCallback: () => {
                console.log(this.getOpenedTab());
            },
        });

        this.addCommand({
            langKey: "publishToAstro",
            hotkey: "⇧⌘P",
            callback: () => {
                this.showPublishDialog();
            },
        });

        this.addCommand({
            langKey: "publishStats",
            hotkey: "",
            callback: () => {
                this.showPublishStats();
            },
        });

        const textareaElement = document.createElement("textarea");
        const githubTokenElement = document.createElement("input");
        const githubOwnerElement = document.createElement("input");
        const githubRepoElement = document.createElement("input");
        const astroPathElement = document.createElement("input");
        const categoriesPathElement = document.createElement("input");
        const yamlTemplateElement = document.createElement("textarea");
        
        this.setting = new Setting({
            confirmCallback: () => {
                this.saveData(STORAGE_NAME, {readonlyText: textareaElement.value});
                this.astroConfig = {
                    githubToken: githubTokenElement.value,
                    githubOwner: githubOwnerElement.value,
                    githubRepo: githubRepoElement.value,
                    astroContentPath: astroPathElement.value,
                    categoriesPath: categoriesPathElement.value,
                    yamlTemplate: yamlTemplateElement.value,
                    customFields: this.astroConfig.customFields || []
                };
                this.saveData(ASTRO_CONFIG_NAME, this.astroConfig);
            }
        });
        
        this.setting.addItem({
            title: "GitHub Personal Access Token",
            description: "GitHub Personal Access Token 用于访问 GitHub API",
            createActionElement: () => {
                githubTokenElement.className = "b3-text-field fn__block";
                githubTokenElement.type = "password";
                githubTokenElement.placeholder = "ghp_xxxxxxxxxxxxxxxxxxxx";
                githubTokenElement.value = this.astroConfig.githubToken;
                return githubTokenElement;
            },
        });
        
        this.setting.addItem({
            title: "GitHub 仓库所有者",
            description: "GitHub 仓库所有者/用户名",
            createActionElement: () => {
                githubOwnerElement.className = "b3-text-field fn__block";
                githubOwnerElement.placeholder = "username";
                githubOwnerElement.value = this.astroConfig.githubOwner;
                return githubOwnerElement;
            },
        });
        
        this.setting.addItem({
            title: "GitHub 仓库名称",
            description: "GitHub 仓库名称",
            createActionElement: () => {
                githubRepoElement.className = "b3-text-field fn__block";
                githubRepoElement.placeholder = "my-astro-blog";
                githubRepoElement.value = this.astroConfig.githubRepo;
                return githubRepoElement;
            },
        });
        
        this.setting.addItem({
            title: "Astro 文章目录",
            description: "Astro 文章目录路径",
            createActionElement: () => {
                astroPathElement.className = "b3-text-field fn__block";
                astroPathElement.placeholder = "src/content/posts";
                astroPathElement.value = this.astroConfig.astroContentPath;
                return astroPathElement;
            },
        });
        
        this.setting.addItem({
            title: this.i18n.categoriesPath,
            description: this.i18n.categoriesPathDesc,
            createActionElement: () => {
                categoriesPathElement.className = "b3-text-field fn__block";
                categoriesPathElement.placeholder = "src/content/categories";
                categoriesPathElement.value = this.astroConfig.categoriesPath;
                return categoriesPathElement;
            },
        });

        // 添加测试连接按钮
        this.setting.addItem({
            title: this.i18n.testConnection,
            description: this.i18n.testConnectionDesc,
            createActionElement: () => {
                const testButton = document.createElement("button");
                testButton.className = "b3-button b3-button--outline fn__flex-center astro-publisher__test-btn";
                testButton.textContent = this.i18n.testConnection;
                testButton.addEventListener("click", async () => {
                    await this.testGitHubConnection(testButton);
                });
                return testButton;
            },
        });

        // 添加 YAML 模板配置
        this.setting.addItem({
            title: this.i18n.yamlTemplate,
            description: this.i18n.yamlTemplateDesc,
            createActionElement: () => {
                const container = document.createElement("div");
                container.className = "fn__flex-column";
                
                yamlTemplateElement.className = "b3-text-field fn__block";
                yamlTemplateElement.style.height = "200px";
                yamlTemplateElement.style.fontFamily = "monospace";
                yamlTemplateElement.placeholder = `---
title: "{title}"
description: "{description}"
publishDate: {date}
tags: {tags}
category: "{category}"
draft: {draft}
author: "Your Name"
---`;
                yamlTemplateElement.value = this.astroConfig.yamlTemplate;
                
                const resetButton = document.createElement("button");
                resetButton.className = "b3-button b3-button--outline fn__size200";
                resetButton.textContent = this.i18n.resetYamlTemplate;
                resetButton.style.marginTop = "8px";
                resetButton.addEventListener("click", () => {
                    yamlTemplateElement.value = `---
title: "{title}"
description: "{description}"
pubDate: {pubDate}
tags: {tags}
category: "{category}"
draft: {draft}
---`;
                });
                
                container.appendChild(yamlTemplateElement);
                container.appendChild(resetButton);
                return container;
            },
        });

        this.setting.addItem({
            title: this.i18n.customFieldConfig || "Additional Fields",
            description: this.i18n.customFieldConfigDesc || "Configure extra frontmatter fields shown in the publish dialog.",
            createActionElement: () => {
                const container = document.createElement("div");
                container.className = "astro-setting__custom-fields fn__flex-column";

                const list = document.createElement("div");
                list.className = "astro-setting__custom-fields-list fn__flex-column";
                list.style.gap = "8px";
                list.style.marginBottom = "8px";

                const ensureArray = () => {
                    if (!Array.isArray(this.astroConfig.customFields)) {
                        this.astroConfig.customFields = [];
                    }
                };

                const render = () => {
                    ensureArray();
                    list.innerHTML = "";

                    if (this.astroConfig.customFields.length === 0) {
                        const empty = document.createElement("div");
                        empty.className = "b3-label fn__flex-center";
                        empty.textContent = this.i18n.noCustomFields || "No custom fields configured";
                        empty.style.minHeight = "36px";
                        empty.style.background = "var(--b3-theme-surface-lighter)";
                        empty.style.borderRadius = "4px";
                        list.appendChild(empty);
                        return;
                    }

                    this.astroConfig.customFields.forEach((field, index) => {
                        if (!field) {
                            this.astroConfig.customFields[index] = { name: "" };
                        }
                        const row = document.createElement("div");
                        row.className = "astro-setting__custom-field-row fn__flex fn__flex-wrap";
                        row.style.gap = "6px";
                        row.style.padding = "8px";
                        row.style.border = "1px solid var(--b3-border-color)";
                        row.style.borderRadius = "4px";

                        const nameInput = document.createElement("input");
                        nameInput.className = "b3-text-field";
                        nameInput.placeholder = this.i18n.fieldName;
                        nameInput.value = field.name || "";
                        nameInput.style.minWidth = "140px";
                        nameInput.addEventListener("input", () => {
                            this.astroConfig.customFields[index].name = nameInput.value.trim();
                        });

                        const labelInput = document.createElement("input");
                        labelInput.className = "b3-text-field";
                        labelInput.placeholder = this.i18n.fieldLabel || "Label";
                        labelInput.value = field.label || "";
                        labelInput.style.minWidth = "140px";
                        labelInput.addEventListener("input", () => {
                            this.astroConfig.customFields[index].label = labelInput.value;
                        });

                        const placeholderInput = document.createElement("input");
                        placeholderInput.className = "b3-text-field";
                        placeholderInput.placeholder = this.i18n.fieldPlaceholder || "Placeholder";
                        placeholderInput.value = field.placeholder || "";
                        placeholderInput.style.minWidth = "160px";
                        placeholderInput.addEventListener("input", () => {
                            this.astroConfig.customFields[index].placeholder = placeholderInput.value;
                        });

                        const defaultInput = document.createElement("input");
                        defaultInput.className = "b3-text-field";
                        defaultInput.placeholder = this.i18n.fieldDefaultValue || "Default";
                        defaultInput.value = field.defaultValue || "";
                        defaultInput.style.minWidth = "140px";
                        defaultInput.addEventListener("input", () => {
                            this.astroConfig.customFields[index].defaultValue = defaultInput.value;
                        });

                        const typeSelect = document.createElement("select");
                        typeSelect.className = "b3-select";
                        typeSelect.innerHTML = `
                            <option value="string">String</option>
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="boolean">Boolean</option>
                            <option value="array">Array</option>
                        `;
                        typeSelect.value = field.type || "string";
                        typeSelect.addEventListener("change", () => {
                            this.astroConfig.customFields[index].type = typeSelect.value as CustomField['type'];
                        });

                        const requiredWrapper = document.createElement("label");
                        requiredWrapper.className = "fn__flex fn__flex-center";
                        requiredWrapper.style.gap = "4px";
                        const requiredInput = document.createElement("input");
                        requiredInput.type = "checkbox";
                        requiredInput.checked = Boolean(field.required);
                        requiredInput.addEventListener("change", () => {
                            this.astroConfig.customFields[index].required = requiredInput.checked;
                        });
                        const requiredLabel = document.createElement("span");
                        requiredLabel.textContent = this.i18n.fieldRequired || "Required";
                        requiredWrapper.appendChild(requiredInput);
                        requiredWrapper.appendChild(requiredLabel);

                        const removeBtn = document.createElement("button");
                        removeBtn.className = "b3-button b3-button--cancel";
                        removeBtn.textContent = "×";
                        removeBtn.title = this.i18n.removeField;
                        removeBtn.addEventListener("click", () => {
                            this.astroConfig.customFields.splice(index, 1);
                            render();
                        });

                        row.appendChild(nameInput);
                        row.appendChild(labelInput);
                        row.appendChild(placeholderInput);
                        row.appendChild(defaultInput);
                        row.appendChild(typeSelect);
                        row.appendChild(requiredWrapper);
                        row.appendChild(removeBtn);

                        list.appendChild(row);
                    });
                };

                const addBtn = document.createElement("button");
                addBtn.className = "b3-button b3-button--outline fn__size200";
                addBtn.textContent = this.i18n.addField || "Add Field";
                addBtn.addEventListener("click", () => {
                    ensureArray();
                    this.astroConfig.customFields.push({
                        name: "",
                        label: "",
                        type: "string",
                        placeholder: "",
                        defaultValue: "",
                        required: false,
                    });
                    render();
                });

                render();

                container.appendChild(list);
                container.appendChild(addBtn);
                return container;
            },
        });

        // 添加分类管理
        this.setting.addItem({
            title: this.i18n.categoryManagement,
            description: this.i18n.categoryManagementDesc,
            createActionElement: () => {
                const container = document.createElement("div");
                container.className = "fn__flex astro-publisher__category-dropdown";
                container.style.gap = "8px";
                container.style.alignItems = "center";
                
                // 分类选择下拉框
                const categorySelect = document.createElement("select");
                categorySelect.className = "b3-select fn__flex-1";
                categorySelect.innerHTML = `<option value="">${this.i18n.selectCategory}</option>`;
                
                // 操作按钮容器
                const buttonsContainer = document.createElement("div");
                buttonsContainer.className = "fn__flex category-action-buttons";
                buttonsContainer.style.gap = "4px";
                
                const refreshBtn = document.createElement("button");
                refreshBtn.className = "b3-button b3-button--outline b3-button--small";
                refreshBtn.innerHTML = "🔄";
                refreshBtn.title = this.i18n.refreshCategories;
                
                const addBtn = document.createElement("button");
                addBtn.className = "b3-button b3-button--outline b3-button--small";
                addBtn.innerHTML = "➕";
                addBtn.title = this.i18n.addCategory;
                
                const editBtn = document.createElement("button");
                editBtn.className = "b3-button b3-button--outline b3-button--small";
                editBtn.innerHTML = "✏️";
                editBtn.title = this.i18n.editCategory;
                editBtn.disabled = true;
                
                const deleteBtn = document.createElement("button");
                deleteBtn.className = "b3-button b3-button--cancel b3-button--small";
                deleteBtn.innerHTML = "🗑️";
                deleteBtn.title = this.i18n.deleteCategory;
                deleteBtn.disabled = true;
                
                // 更新分类选择框
                const updateCategorySelect = () => {
                    // 保存当前选中的值
                    const selectedValue = categorySelect.value;
                    
                    // 清空选项
                    categorySelect.innerHTML = `<option value="">${this.i18n.selectCategory}</option>`;
                    
                    // 添加分类选项
                    this.categories.forEach(category => {
                        const option = document.createElement("option");
                        option.value = category.name;
                        option.textContent = `${category.title} (${category.name})`;
                        categorySelect.appendChild(option);
                    });
                    
                    // 恢复选中状态
                    if (selectedValue && this.categories.some(cat => cat.name === selectedValue)) {
                        categorySelect.value = selectedValue;
                    }
                    
                    // 更新按钮状态
                    const hasSelection = categorySelect.value !== "";
                    editBtn.disabled = !hasSelection;
                    deleteBtn.disabled = !hasSelection;
                };
                
                // 刷新分类列表
                const refreshCategories = async () => {
                    try {
                        refreshBtn.innerHTML = "⏳";
                        refreshBtn.disabled = true;
                        
                        await this.loadCategories();
                        updateCategorySelect();
                        
                        refreshBtn.innerHTML = "🔄";
                        refreshBtn.disabled = false;
                        
                        showMessage(`已加载 ${this.categories.length} 个分类`, 2000);
                        
                        // 调试信息：显示加载的分类
                        console.log("Loaded categories:", this.categories);
                    } catch (error) {
                        showMessage(this.i18n.categoryOperationFailed.replace("${error}", error.message));
                        refreshBtn.innerHTML = "🔄";
                        refreshBtn.disabled = false;
                    }
                };
                
                // 获取选中的分类
                const getSelectedCategory = () => {
                    const selectedName = categorySelect.value;
                    return this.categories.find(cat => cat.name === selectedName);
                };
                
                // 事件监听器
                categorySelect.addEventListener("change", () => {
                    const hasSelection = categorySelect.value !== "";
                    editBtn.disabled = !hasSelection;
                    deleteBtn.disabled = !hasSelection;
                });
                
                refreshBtn.addEventListener("click", refreshCategories);
                
                addBtn.addEventListener("click", () => {
                    this.showCategoryDialog(undefined, updateCategorySelect);
                });
                
                editBtn.addEventListener("click", () => {
                    const category = getSelectedCategory();
                    if (category) {
                        this.showCategoryDialog(category, updateCategorySelect);
                    }
                });
                
                deleteBtn.addEventListener("click", async () => {
                    const category = getSelectedCategory();
                    if (category && window.confirm(`确定要删除分类 "${category.title}" 吗？\n\n这将删除 GitHub 仓库中的分类文件。`)) {
                        try {
                            deleteBtn.innerHTML = "⏳";
                            deleteBtn.disabled = true;
                            
                            await this.deleteCategory(category.name);
                            showMessage(this.i18n.categoryDeleted);
                            await this.loadCategories();
                            updateCategorySelect();
                            
                            deleteBtn.innerHTML = "🗑️";
                        } catch (error) {
                            showMessage(this.i18n.categoryOperationFailed.replace("${error}", error.message));
                            deleteBtn.innerHTML = "🗑️";
                            deleteBtn.disabled = false;
                        }
                    }
                });
                
                buttonsContainer.appendChild(refreshBtn);
                buttonsContainer.appendChild(addBtn);
                buttonsContainer.appendChild(editBtn);
                buttonsContainer.appendChild(deleteBtn);
                
                container.appendChild(categorySelect);
                container.appendChild(buttonsContainer);
                
                // 初始加载分类
                this.loadCategories().then(() => {
                    updateCategorySelect();
                }).catch((error) => {
                    showMessage(`加载分类失败: ${error.message}`);
                });
                
                return container;
            },
        });
        
        // this.setting.addItem({
        //     title: "Readonly text",
        //     direction: "row",
        //     description: "Open plugin url in browser",
        //     createActionElement: () => {
        //         textareaElement.className = "b3-text-field fn__block";
        //         textareaElement.placeholder = "Readonly text in the menu";
        //         textareaElement.value = this.data[STORAGE_NAME].readonlyText;
        //         return textareaElement;
        //     },
        // });
        // const btnaElement = document.createElement("button");
        // btnaElement.className = "b3-button b3-button--outline fn__flex-center fn__size200";
        // btnaElement.textContent = "Open";
        // btnaElement.addEventListener("click", () => {
        //     window.open("https://github.com/siyuan-note/plugin-sample");
        // });
        // this.setting.addItem({
        //     title: "Open plugin url",
        //     description: "Open plugin url in browser",
        //     actionElement: btnaElement,
        // });

        this.protyleSlash = [{
            filter: ["insert emoji 😊", "插入表情 😊", "crbqwx"],
            html: `<div class="b3-list-item__first"><span class="b3-list-item__text">${this.i18n.insertEmoji}</span><span class="b3-list-item__meta">😊</span></div>`,
            id: "insertEmoji",
            callback(protyle: Protyle) {
                protyle.insert("😊");
            }
        }];

        this.protyleOptions = {
            toolbar: ["block-ref",
                "a",
                "|",
                "text",
                "strong",
                "em",
                "u",
                "s",
                "mark",
                "sup",
                "sub",
                "clear",
                "|",
                "code",
                "kbd",
                "tag",
                "inline-math",
                "inline-memo",
            ],
        };

        console.log(this.i18n.helloPlugin);
    }

    onLayoutReady() {
        const topBarElement = this.addTopBar({
            icon: "iconFace",
            title: this.i18n.addTopBarIcon,
            position: "right",
            callback: () => {
                if (this.isMobile) {
                    this.addMenu();
                } else {
                    let rect = topBarElement.getBoundingClientRect();
                    // 如果被隐藏，则使用更多按钮
                    if (rect.width === 0) {
                        rect = document.querySelector("#barMore").getBoundingClientRect();
                    }
                    if (rect.width === 0) {
                        rect = document.querySelector("#barPlugins").getBoundingClientRect();
                    }
                    this.addMenu(rect);
                }
            }
        });
        const statusIconTemp = document.createElement("template");
        statusIconTemp.innerHTML = `<div class="toolbar__item ariaLabel" aria-label="Remove plugin-sample Data">
    <svg>
        <use xlink:href="#iconTrashcan"></use>
    </svg>
</div>`;
        statusIconTemp.content.firstElementChild.addEventListener("click", () => {
            confirm("⚠️", this.i18n.confirmRemove.replace("${name}", this.name), () => {
                this.removeData(STORAGE_NAME).then(() => {
                    this.data[STORAGE_NAME] = {readonlyText: "Readonly"};
                    showMessage(`[${this.name}]: ${this.i18n.removedData}`);
                });
            });
        });
        this.addStatusBar({
            element: statusIconTemp.content.firstElementChild as HTMLElement,
        });
        this.loadData(STORAGE_NAME);
        this.loadData(ASTRO_CONFIG_NAME).then((config) => {
            if (config) {
                this.astroConfig = config;
            }
        });
        this.loadData(ASTRO_STATS_NAME).then((stats) => {
            if (stats) {
                this.publishStats = stats;
            }
        });
        console.log(`frontend: ${getFrontend()}; backend: ${getBackend()}`);
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

    /* 自定义设置
    openSetting() {
        const dialog = new Dialog({
            title: this.name,
            content: `<div class="b3-dialog__content"><textarea class="b3-text-field fn__block" placeholder="readonly text in the menu"></textarea></div>
<div class="b3-dialog__action">
    <button class="b3-button b3-button--cancel">${this.i18n.cancel}</button><div class="fn__space"></div>
    <button class="b3-button b3-button--text">${this.i18n.save}</button>
</div>`,
            width: this.isMobile ? "92vw" : "520px",
        });
        const inputElement = dialog.element.querySelector("textarea");
        inputElement.value = this.data[STORAGE_NAME].readonlyText;
        const btnsElement = dialog.element.querySelectorAll(".b3-button");
        dialog.bindInput(inputElement, () => {
            (btnsElement[1] as HTMLButtonElement).click();
        });
        inputElement.focus();
        btnsElement[0].addEventListener("click", () => {
            dialog.destroy();
        });
        btnsElement[1].addEventListener("click", () => {
            this.saveData(STORAGE_NAME, {readonlyText: inputElement.value});
            dialog.destroy();
        });
    }
    */

    private eventBusPaste(event: any) {
        // 如果需异步处理请调用 preventDefault， 否则会进行默认处理
        event.preventDefault();
        // 如果使用了 preventDefault，必须调用 resolve，否则程序会卡死
        event.detail.resolve({
            textPlain: event.detail.textPlain.trim(),
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

    private showDialog() {
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
            height: "540px",
        });
        new Protyle(this.app, dialog.element.querySelector("#protyle"), {
            blockId: this.getEditor().protyle.block.rootID,
        });
        fetchPost("/api/system/currentTime", {}, (response) => {
            dialog.element.querySelector("#time").innerHTML = new Date(response.data).toString();
        });
    }

    private addMenu(rect?: DOMRect) {
        const menu = new Menu("topBarSample", () => {
            console.log(this.i18n.byeMenu);
        });
        menu.addItem({
            icon: "iconAstro",
            label: this.i18n.publishToAstro,
            accelerator: "⇧⌘P",
            click: () => {
                // 延迟一下确保能获取到正确的活动编辑器
                setTimeout(() => {
                this.showPublishDialog();
                }, 50);
            }
        });
        menu.addItem({
            icon: "iconSparkles",
            label: this.i18n.publishStats,
            click: () => {
                this.showPublishStats();
            }
        });
        menu.addSeparator();
        menu.addItem({
            icon: "iconInfo",
            label: "Dialog(open doc first)",
            accelerator: this.commands[0].customHotkey,
            click: () => {
                this.showDialog();
            }
        });
        if (!this.isMobile) {
            menu.addItem({
                icon: "iconFace",
                label: "Open Custom Tab",
                click: () => {
                    const tab = openTab({
                        app: this.app,
                        custom: {
                            icon: "iconFace",
                            title: "Custom Tab",
                            data: {
                                text: platformUtils.isHuawei() ? "Hello, Huawei!" : "This is my custom tab",
                            },
                            id: this.name + TAB_TYPE
                        },
                    });
                    console.log(tab);
                }
            });
        
            // menu.addItem({
            //     icon: "iconSearch",
            //     label: "Open Search Tab",
            //     click: () => {
            //         const tab = openTab({
            //             app: this.app,
            //             search: {
            //                 k: "SiYuan"
            //             }
            //         });
            //         console.log(tab);
            //     }
            // });
        
        }
        menu.addSeparator();
        menu.addItem({
            icon: "iconSparkles",
            label: this.data[STORAGE_NAME].readonlyText || "Readonly",
            type: "readonly",
        });
        if (this.isMobile) {
            menu.fullscreen();
        } else {
            menu.open({
                x: rect.right,
                y: rect.bottom,
                isLeft: true,
            });
        }
    }

    private async showPublishDialog() {
        const editor = this.getEditor();
        if (!editor) {
            showMessage(this.i18n.selectDocument);
            return;
        }

        // 调试信息：显示当前文档信息
        console.log("Current editor:", editor);
        console.log("Document ID:", editor.protyle?.block?.rootID);
        console.log("Document title:", this.getDocumentTitle(editor));

        if (!this.isConfigValid()) {
            showMessage(this.i18n.configRequired);
            return;
        }

        const dialog = new Dialog({
            title: this.i18n.publishToAstro,
            content: `<div class="b3-dialog__content astro-publisher__publish-dialog">
    <div class="fn__flex">
        <div class="fn__flex-1">
            <label class="fn__flex b3-label">
                <div class="fn__flex-center fn__size200">${this.i18n.documentTitle}</div>
                <div class="fn__flex-1">
                    <input class="b3-text-field fn__flex-1" id="title" value="${this.getDocumentTitle(editor)}" />
                </div>
            </label>
            <div class="fn__hr"></div>
            <label class="fn__flex b3-label">
                <div class="fn__flex-center fn__size200">${this.i18n.description}</div>
                <div class="fn__flex-1">
                    <textarea class="b3-text-field fn__flex-1" id="description" placeholder="文章描述"></textarea>
                </div>
            </label>
            <div class="fn__hr"></div>
            <label class="fn__flex b3-label">
                <div class="fn__flex-center fn__size200">${this.i18n.tags}</div>
                <div class="fn__flex-1">
                    <input class="b3-text-field fn__flex-1" id="tags" placeholder="tag1, tag2, tag3" />
                </div>
            </label>
            <div class="fn__hr"></div>
            <label class="fn__flex b3-label">
                <div class="fn__flex-center fn__size200">${this.i18n.category}</div>
                <div class="fn__flex-1">
                    <select class="b3-select fn__flex-1" id="category">
                        <option value="">${this.i18n.selectCategory}</option>
                    </select>
                </div>
            </label>
            <div class="fn__hr"></div>
            <label class="fn__flex b3-label">
                <div class="fn__flex-center fn__size200">${this.i18n.draft}</div>
                <div class="fn__flex-1">
                    <input type="checkbox" id="draft" class="b3-switch fn__flex-center">
                </div>
            </label>
            <div class="fn__hr"></div>
            <div class="fn__flex b3-label">
                <div class="fn__flex-center fn__size200">${this.i18n.customFields}</div>
                <div class="fn__flex-1">
                    <div id="customFieldsContainer" class="fn__flex-column">
                        <!-- 自定义字段将在这里动态添加 -->
                    </div>
                    <button type="button" class="b3-button b3-button--outline fn__size200" id="addCustomField" style="margin-top: 8px;">
                        ${this.i18n.addCustomField}
                    </button>
                </div>
            </div>
            <div class="fn__hr"></div>
            <div class="fn__flex b3-label">
                <div class="fn__flex-center fn__size200">${this.i18n.yamlPreview}</div>
                <div class="fn__flex-1">
                    <textarea class="b3-text-field fn__flex-1" id="yamlPreview" readonly style="height: 150px; font-family: monospace; background-color: var(--b3-theme-surface-lighter);"></textarea>
                </div>
            </div>
        </div>
    </div>
</div>
<div class="b3-dialog__action">
    <button class="b3-button b3-button--cancel">${this.i18n.cancel}</button><div class="fn__space"></div>
    <button class="b3-button b3-button--outline" id="testBtn">${this.i18n.testConnection}</button><div class="fn__space"></div>
    <button class="b3-button b3-button--text" id="publishBtn">${this.i18n.publishToAstro}</button>
</div>`,
            width: this.isMobile ? "92vw" : "520px",
        });

        const titleInput = dialog.element.querySelector("#title") as HTMLInputElement;
        const descriptionInput = dialog.element.querySelector("#description") as HTMLTextAreaElement;
        const tagsInput = dialog.element.querySelector("#tags") as HTMLInputElement;
        const categorySelect = dialog.element.querySelector("#category") as HTMLSelectElement;
        const draftInput = dialog.element.querySelector("#draft") as HTMLInputElement;
        const customFieldsContainer = dialog.element.querySelector("#customFieldsContainer") as HTMLDivElement;
        const addCustomFieldBtn = dialog.element.querySelector("#addCustomField") as HTMLButtonElement;
        const yamlPreview = dialog.element.querySelector("#yamlPreview") as HTMLTextAreaElement;
        const publishBtn = dialog.element.querySelector("#publishBtn") as HTMLButtonElement;
        const testBtn = dialog.element.querySelector("#testBtn") as HTMLButtonElement;
        const cancelBtn = dialog.element.querySelector(".b3-button--cancel") as HTMLButtonElement;

        // 自定义字段数据
        const customFields: { [key: string]: any } = {};
        const customFieldsSection = customFieldsContainer.closest(".fn__flex.b3-label") as HTMLDivElement;

        const configuredFieldsContainer = document.createElement("div");
        configuredFieldsContainer.className = "astro-configured-fields";
        if (customFieldsSection?.parentElement) {
            customFieldsSection.parentElement.insertBefore(configuredFieldsContainer, customFieldsSection);
        }

        const addConfiguredField = (field: CustomField, lockedFromTemplate = false) => {
            if (!field?.name) {
                return;
            }

            const labelRow = document.createElement("label");
            labelRow.className = "fn__flex b3-label astro-configured-field";

            const label = document.createElement("div");
            label.className = "fn__flex-center fn__size200";
            label.textContent = field.label || field.name;
            if (field.required) {
                label.textContent += " *";
            }

            const valueWrap = document.createElement("div");
            valueWrap.className = "fn__flex-1";

            const type = field.type || "string";
            let inputElement: HTMLInputElement | HTMLTextAreaElement;

            if (type === "text") {
                const textarea = document.createElement("textarea");
                textarea.className = "b3-text-field fn__flex-1";
                textarea.rows = 3;
                inputElement = textarea;
            } else if (type === "boolean") {
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.className = "b3-switch";
                inputElement = checkbox;
            } else if (type === "number") {
                const numberInput = document.createElement("input");
                numberInput.type = "number";
                numberInput.className = "b3-text-field fn__flex-1";
                inputElement = numberInput;
            } else {
                const textInput = document.createElement("input");
                textInput.type = "text";
                textInput.className = "b3-text-field fn__flex-1";
                inputElement = textInput;
            }

            if (inputElement instanceof HTMLInputElement && inputElement.type !== "checkbox") {
                inputElement.placeholder = field.placeholder || "";
            }
            if (inputElement instanceof HTMLTextAreaElement) {
                inputElement.placeholder = field.placeholder || "";
            }

            if (field.required && !(inputElement instanceof HTMLInputElement && inputElement.type === "checkbox")) {
                inputElement.required = true;
            }

            const setInitial = (value: any) => {
                if (inputElement instanceof HTMLInputElement) {
                    if (inputElement.type === "checkbox") {
                        inputElement.checked = Boolean(value);
                    } else {
                        inputElement.value = value !== undefined && value !== null ? String(value) : "";
                    }
                } else if (inputElement instanceof HTMLTextAreaElement) {
                    inputElement.value = value !== undefined && value !== null ? String(value) : "";
                }
            };

            const initialValue = field.value ?? field.defaultValue;
            if (initialValue !== undefined) {
                if (Array.isArray(initialValue)) {
                    setInitial(initialValue.join(", "));
                } else {
                    setInitial(initialValue);
                }
            } else if (lockedFromTemplate) {
                setInitial("");
            }

            const applyValueToMap = () => {
                let finalValue: any;
                if (inputElement instanceof HTMLInputElement) {
                    if (inputElement.type === "checkbox") {
                        finalValue = inputElement.checked;
                    } else if (type === "number") {
                        finalValue = inputElement.value ? Number(inputElement.value) : 0;
                    } else if (type === "array") {
                        finalValue = inputElement.value ? inputElement.value.split(",").map(v => v.trim()).filter(v => v.length > 0) : [];
                    } else {
                        finalValue = inputElement.value;
                    }
                } else {
                    if (type === "array") {
                        finalValue = inputElement.value ? inputElement.value.split(",").map(v => v.trim()).filter(v => v.length > 0) : [];
                    } else {
                        finalValue = inputElement.value;
                    }
                }

                if (finalValue === undefined || finalValue === null || (typeof finalValue === "string" && finalValue.trim() === "")) {
                    if (field.required) {
                        customFields[field.name] = "";
                    } else {
                        delete customFields[field.name];
                    }
                } else {
                    customFields[field.name] = finalValue;
                }
                updatePreview();
            };

            if (inputElement instanceof HTMLInputElement && inputElement.type === "checkbox") {
                inputElement.addEventListener("change", applyValueToMap);
            } else {
                inputElement.addEventListener("input", applyValueToMap);
            }

            applyValueToMap();

            valueWrap.appendChild(inputElement);
            labelRow.appendChild(label);
            labelRow.appendChild(valueWrap);

            configuredFieldsContainer.appendChild(labelRow);
        };

        // 添加自定义字段
        const addCustomField = (initial?: {
            name?: string;
            label?: string;
            placeholder?: string;
            value?: any;
            defaultValue?: any;
            type?: CustomField['type'];
            required?: boolean;
            locked?: boolean;
        }) => {
            const options = initial || {};
            const fieldWrapper = document.createElement("div");
            fieldWrapper.className = "astro-custom-field";
            fieldWrapper.style.marginBottom = "12px";

            const labelRow = document.createElement("div");
            labelRow.className = "astro-custom-field__label";
            labelRow.textContent = options.label || options.name || this.i18n.fieldName;
            if (options.required) {
                labelRow.textContent += " *";
            }

            const fieldContainer = document.createElement("div");
            fieldContainer.className = "fn__flex fn__flex-wrap";
            fieldContainer.style.gap = "8px";

            const nameInput = document.createElement("input");
            nameInput.className = "b3-text-field";
            nameInput.placeholder = this.i18n.fieldName;
            nameInput.style.width = "140px";
            nameInput.value = options.name || "";
            nameInput.dataset.oldName = options.name || "";
            if (options.locked) {
                nameInput.readOnly = true;
                nameInput.classList.add("is-readonly");
                nameInput.title = this.i18n.lockedFieldHint || "Field name is locked";
            }

            const valueInput = document.createElement("input");
            valueInput.className = "b3-text-field fn__flex-1";
            valueInput.placeholder = options.placeholder || this.i18n.fieldValue;

            const typeSelect = document.createElement("select");
            typeSelect.className = "b3-select";
            typeSelect.style.width = "96px";
            typeSelect.innerHTML = `
                <option value="string">String</option>
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="array">Array</option>
            `;
            typeSelect.value = options.type || "string";

            const removeBtn = document.createElement("button");
            removeBtn.className = "b3-button b3-button--cancel";
            removeBtn.textContent = "×";
            removeBtn.style.width = "32px";
            if (options.locked) {
                removeBtn.style.display = "none";
            }

            const updateCustomField = () => {
                const oldName = nameInput.dataset.oldName;
                const currentName = nameInput.value.trim();
                if (oldName && oldName !== currentName) {
                    delete customFields[oldName];
                }

                if (!currentName) {
                    updatePreview();
                    return;
                }

                let rawValue: any = valueInput.value;
                switch (typeSelect.value) {
                    case "number":
                        rawValue = rawValue ? Number(rawValue) : 0;
                        break;
                    case "boolean":
                        rawValue = typeof rawValue === "string" ? rawValue.toLowerCase() === "true" : Boolean(rawValue);
                        break;
                    case "array":
                        rawValue = typeof rawValue === "string"
                            ? rawValue.split(",").map(item => item.trim()).filter(item => item.length > 0)
                            : [];
                        break;
                    case "text":
                    case "string":
                    default:
                        rawValue = rawValue ?? "";
                        break;
                }

                customFields[currentName] = rawValue;
                nameInput.dataset.oldName = currentName;
                updatePreview();
            };

            nameInput.addEventListener("input", updateCustomField);
            valueInput.addEventListener("input", updateCustomField);
            typeSelect.addEventListener("change", updateCustomField);

            removeBtn.addEventListener("click", () => {
                const currentName = nameInput.value.trim();
                if (currentName) {
                    delete customFields[currentName];
                }
                fieldWrapper.remove();
                updatePreview();
            });

            if (!options.locked) {
                fieldContainer.appendChild(nameInput);
            } else {
                const hiddenName = document.createElement("input");
                hiddenName.type = "hidden";
                hiddenName.value = options.name || "";
                fieldContainer.appendChild(hiddenName);
            }

            fieldContainer.appendChild(valueInput);
            fieldContainer.appendChild(typeSelect);
            fieldContainer.appendChild(removeBtn);

            fieldWrapper.appendChild(labelRow);
            fieldWrapper.appendChild(fieldContainer);

            customFieldsContainer.appendChild(fieldWrapper);

            const initialValue = options.value !== undefined ? options.value : (options.defaultValue !== undefined ? options.defaultValue : "");
            if (initialValue !== undefined && initialValue !== null && initialValue !== "") {
                if (Array.isArray(initialValue)) {
                    valueInput.value = initialValue.join(", ");
                    typeSelect.value = options.type || "array";
                } else if (typeof initialValue === "boolean") {
                    valueInput.value = initialValue ? "true" : "false";
                    typeSelect.value = options.type || "boolean";
                } else if (typeof initialValue === "number") {
                    valueInput.value = String(initialValue);
                    typeSelect.value = options.type || "number";
                } else {
                    valueInput.value = String(initialValue);
                }
            }

            updateCustomField();
            return { nameInput, valueInput, typeSelect, removeBtn };
        };

        // 更新 YAML 预览
        const updatePreview = () => {
            const metadata: PublishMetadata = {
                title: titleInput.value || this.getDocumentTitle(editor) || "Untitled",
                description: descriptionInput.value || "",
                publishDate: new Date().toISOString(),
                tags: tagsInput.value.split(",").map(tag => tag.trim()).filter(tag => tag),
                category: categorySelect.value || "",
                draft: draftInput.checked,
                customFields: customFields
            };
            
            const preview = this.generateFrontmatter(metadata);
            yamlPreview.value = preview;
        };

        // 绑定事件监听器
        titleInput.addEventListener("input", updatePreview);
        descriptionInput.addEventListener("input", updatePreview);
        tagsInput.addEventListener("input", updatePreview);
        categorySelect.addEventListener("change", updatePreview);
        draftInput.addEventListener("change", updatePreview);
        if (customFieldsSection) {
            customFieldsSection.style.display = "none";
        }

        addCustomFieldBtn.addEventListener("click", () => {
            if (customFieldsSection) {
                customFieldsSection.style.display = "";
            }
            addCustomField();
        });

        const addedFieldNames = new Set<string>();
        if (Array.isArray(this.astroConfig.customFields)) {
            this.astroConfig.customFields.forEach((field) => {
                if (!field?.name) {
                    return;
                }
                addConfiguredField(field, false);
                addedFieldNames.add(field.name);
            });
        }

        const builtinPlaceholders = new Set(["title", "description", "date", "publishDate", "pubDate", "tags", "category", "draft"]);
        const placeholderRegex = /\{([a-zA-Z0-9_]+)\}/g;
        const currentTemplate = this.astroConfig.yamlTemplate || "";
        let placeholderMatch: RegExpExecArray | null;
        while ((placeholderMatch = placeholderRegex.exec(currentTemplate)) !== null) {
            const key = placeholderMatch[1];
            if (!builtinPlaceholders.has(key) && !addedFieldNames.has(key)) {
                addConfiguredField({ name: key, label: key, type: "string", required: false }, true);
                addedFieldNames.add(key);
            }
        }

        // 加载分类选项
        this.loadCategories().then(() => {
            this.populateCategorySelect(categorySelect);
        });

        // 初始化预览
        updatePreview();

        cancelBtn.addEventListener("click", () => {
            dialog.destroy();
        });

        testBtn.addEventListener("click", async () => {
            await this.testGitHubConnection(testBtn);
        });

        publishBtn.addEventListener("click", async () => {
            publishBtn.textContent = this.i18n.publishing;
            publishBtn.disabled = true;

            try {
                const metadata: PublishMetadata = {
                    title: titleInput.value || this.getDocumentTitle(editor) || "Untitled",
                    description: descriptionInput.value || "",
                    publishDate: new Date().toISOString(),
                    tags: tagsInput.value.split(",").map(tag => tag.trim()).filter(tag => tag),
                    category: categorySelect.value || "",
                    draft: draftInput.checked,
                    customFields: customFields
                };

                const normalized = this.normalizeMetadata(metadata);
                const filePath = await this.publishToGitHub(editor.protyle.block.rootID, normalized);
                this.recordPublishStats(editor, normalized, filePath);
                showMessage(this.i18n.publishSuccess);
                dialog.destroy();
            } catch (error) {
                showMessage(this.i18n.publishFailed.replace("${error}", error.message));
                publishBtn.textContent = this.i18n.publishToAstro;
                publishBtn.disabled = false;
            }
        });
    }

    private isConfigValid(): boolean {
        return !!(this.astroConfig.githubToken && 
                 this.astroConfig.githubOwner && 
                 this.astroConfig.githubRepo && 
                 this.astroConfig.astroContentPath);
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

    private generateFrontmatter(metadata: PublishMetadata): string {
        let template = this.astroConfig.yamlTemplate || `---
title: "{title}"
description: "{description}"
pubDate: {pubDate}
tags: {tags}
category: "{category}"
draft: {draft}
---`;

        // 替换基本变量
        const formattedDate = this.formatPublishDate(metadata.publishDate);
        template = this.replacePlaceholder(template, "title", metadata.title);
        template = this.replacePlaceholder(template, "description", metadata.description);
        template = template.replace(/\{pubDate\}/g, formattedDate);
        template = template.replace(/\{publishDate\}/g, formattedDate);
        template = template.replace(/\{date\}/g, formattedDate);
        template = template.replace(/\{tags\}/g, `[${metadata.tags.map(tag => this.yamlDoubleQuoted(tag)).join(", ")}]`);
        template = this.replacePlaceholder(template, "category", metadata.category);
        template = template.replace(/\{draft\}/g, metadata.draft.toString());

        // 添加自定义字段
        if (metadata.customFields) {
            const consumedFields: Set<string> = new Set();
            for (const key in metadata.customFields) {
                if (!metadata.customFields.hasOwnProperty(key)) {
                    continue;
                }
                const value = metadata.customFields[key];
                if (value === undefined || value === null || value === "") {
                    continue;
                }

                const placeholderPattern = new RegExp(`("|')?\{${key}\}("|')?`);
                if (placeholderPattern.test(template)) {
                    const stringValue = this.stringifyPlaceholderValue(value);
                    template = this.replacePlaceholder(template, key, stringValue);
                    consumedFields.add(key);
                }
            }

            let customYaml = "";
            for (const key in metadata.customFields) {
                if (!metadata.customFields.hasOwnProperty(key) || consumedFields.has(key)) {
                    continue;
                }
                const value = metadata.customFields[key];
                if (value !== undefined && value !== null && value !== "") {
                    customYaml += `${key}: ${this.formatYamlValue(value)}\n`;
                }
            }
            
            // 在 --- 结束标记前插入自定义字段
            if (customYaml) {
                template = template.replace(/^---$/m, (match, offset, string) => {
                    // 找到第二个 ---（结束标记）
                    const firstDash = string.indexOf('---');
                    const secondDash = string.indexOf('---', firstDash + 3);
                    if (offset === secondDash) {
                        return customYaml.trim() + '\n---';
                    }
                    return match;
                });
            }
        }

        return template + '\n\n';
    }

    private formatYamlValue(value: any): string {
        if (typeof value === 'string') {
            // 如果字符串包含特殊字符，需要加引号
            if (value.includes(':') || value.includes('#') || value.includes('[') || value.includes(']')) {
                return `"${value.replace(/"/g, '\\"')}"`;
            }
            return value;
        } else if (typeof value === 'boolean') {
            return value.toString();
        } else if (typeof value === 'number') {
            return value.toString();
        } else if (Array.isArray(value)) {
            return `[${value.map(v => `"${v.toString().replace(/"/g, '\\"')}"`).join(", ")}]`;
        } else {
            return `"${value.toString().replace(/"/g, '\\"')}"`;
        }
    }

    private yamlDoubleQuoted(value: string): string {
        const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        return `"${escaped}"`;
    }

    private yamlSingleQuoted(value: string): string {
        const escaped = value.replace(/'/g, "''");
        return `'${escaped}'`;
    }

    private yamlBareValue(value: string): string {
        const trimmed = value.trim();
        if (!trimmed) {
            return this.yamlDoubleQuoted("");
        }
        if (/^[A-Za-z0-9_.-]+$/.test(trimmed) && !/^(true|false|null|~)$/i.test(trimmed)) {
            return trimmed;
        }
        if (/^\d+(\.\d+)?$/.test(trimmed)) {
            return trimmed;
        }
        return this.yamlDoubleQuoted(trimmed);
    }

    private replacePlaceholder(template: string, key: string, value: string): string {
        const doubleQuotedRegex = new RegExp(`"\\{${key}\\}"`, 'g');
        template = template.replace(doubleQuotedRegex, this.yamlDoubleQuoted(value));

        const singleQuotedRegex = new RegExp(`'\\{${key}\\}'`, 'g');
        template = template.replace(singleQuotedRegex, this.yamlSingleQuoted(value));

        const bareRegex = new RegExp(`\\{${key}\\}`, 'g');
        template = template.replace(bareRegex, this.yamlBareValue(value));

        return template;
    }

    private async publishToGitHub(blockId: string, metadata: PublishMetadata, targetPath?: string): Promise<string> {
        try {
            // 获取文档内容
            const content = await this.getDocumentContent(blockId);
            const bodyContent = this.stripExistingFrontmatter(content);
            
            // 生成 frontmatter
            const frontmatter = this.generateFrontmatter(metadata);
            
            // 组合完整内容
            const fullContent = frontmatter + bodyContent;
            
            // 确定文件路径
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
                filePath = this.getPostFilePath(blockId);
            }
            
            // 检查文件是否存在
            const existingFile = await this.getFileFromGitHub(filePath);
            
            // 上传到 GitHub
            await this.uploadToGitHub(filePath, fullContent, existingFile?.sha);
            
            return filePath;
        } catch (error) {
            console.error("Publish error:", error);
            throw error;
        }
    }

    private stripExistingFrontmatter(content: string): string {
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

    private getPostFilePath(docId: string): string {
        const basePath = (this.astroConfig.astroContentPath || "").replace(/\/+$/, "");
        const normalizedId = docId.trim();
        return `${basePath}/${normalizedId}.md`;
    }

    private async getFileFromGitHub(path: string): Promise<any> {
        const url = `https://api.github.com/repos/${this.astroConfig.githubOwner}/${this.astroConfig.githubRepo}/contents/${path}`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `token ${this.astroConfig.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.status === 404) {
                return null; // 文件不存在
            }
            
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            if (error.message.includes('404')) {
                return null;
            }
            throw error;
        }
    }

    private async uploadToGitHub(path: string, content: string, sha?: string): Promise<void> {
        const url = `https://api.github.com/repos/${this.astroConfig.githubOwner}/${this.astroConfig.githubRepo}/contents/${path}`;
        
        const body: any = {
            message: `${sha ? 'Update' : 'Add'} post: ${path}`,
            content: btoa(unescape(encodeURIComponent(content))),
            branch: 'main'
        };
        
        if (sha) {
            body.sha = sha;
        }
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${this.astroConfig.githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`GitHub upload failed: ${errorData.message}`);
        }
    }

    private async testGitHubConnection(button: HTMLButtonElement): Promise<void> {
        // 保存原始文本
        const originalText = button.textContent;
        
        try {
            // 更新按钮状态
            button.textContent = this.i18n.testing;
            button.disabled = true;
            
            // 检查配置是否完整
            if (!this.astroConfig.githubToken || !this.astroConfig.githubOwner || !this.astroConfig.githubRepo) {
                throw new Error(this.i18n.configRequired);
            }
            
            // 测试 GitHub API 连接 - 获取仓库信息
            const repoUrl = `https://api.github.com/repos/${this.astroConfig.githubOwner}/${this.astroConfig.githubRepo}`;
            
            const response = await fetch(repoUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `token ${this.astroConfig.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'SiYuan-Astro-Publisher'
                }
            });
            
            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    // 忽略 JSON 解析错误，使用默认错误信息
                }
                throw new Error(errorMessage);
            }
            
            const repoData = await response.json();
            
            // 测试内容目录是否存在
            const contentUrl = `https://api.github.com/repos/${this.astroConfig.githubOwner}/${this.astroConfig.githubRepo}/contents/${this.astroConfig.astroContentPath}`;
            
            const contentResponse = await fetch(contentUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `token ${this.astroConfig.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'SiYuan-Astro-Publisher'
                }
            });
            
            let contentStatus = "";
            if (contentResponse.ok) {
                contentStatus = " ✓ 内容目录存在";
            } else if (contentResponse.status === 404) {
                contentStatus = " ⚠ 内容目录不存在，发布时将自动创建";
            } else {
                contentStatus = " ⚠ 无法访问内容目录";
            }
            
            // 显示成功信息
            showMessage(`${this.i18n.testSuccess}\n仓库: ${repoData.full_name}${contentStatus}`, 6000);
            
        } catch (error) {
            console.error("GitHub connection test failed:", error);
            showMessage(this.i18n.testFailed.replace("${error}", error.message));
        } finally {
            // 恢复按钮状态
            button.textContent = originalText;
            button.disabled = false;
        }
    }

    private async loadCategories(): Promise<void> {
        if (!this.isConfigValid()) {
            this.categories = [];
            return;
        }

        try {
            const categoriesUrl = `https://api.github.com/repos/${this.astroConfig.githubOwner}/${this.astroConfig.githubRepo}/contents/${this.astroConfig.categoriesPath}`;
            
            const response = await fetch(categoriesUrl, {
                headers: {
                    'Authorization': `token ${this.astroConfig.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'SiYuan-Astro-Publisher'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    this.categories = [];
                    return;
                }
                throw new Error(`Failed to load categories: ${response.statusText}`);
            }

            const files = await response.json();
            const categories: Category[] = [];

            for (const file of files) {
                if (file.type === 'file' && file.name.endsWith('.md')) {
                    try {
                        const categoryData = await this.getCategoryData(file.name.replace('.md', ''));
                        if (categoryData) {
                            categories.push(categoryData);
                        }
                    } catch (error) {
                        console.warn(`Failed to load category ${file.name}:`, error);
                    }
                }
            }

            this.categories = categories;
        } catch (error) {
            console.error('Failed to load categories:', error);
            this.categories = [];
        }
    }

    private async getCategoryData(categoryName: string): Promise<Category | null> {
        try {
            const categoryUrl = `https://api.github.com/repos/${this.astroConfig.githubOwner}/${this.astroConfig.githubRepo}/contents/${this.astroConfig.categoriesPath}/${categoryName}.md`;
            
            const response = await fetch(categoryUrl, {
                headers: {
                    'Authorization': `token ${this.astroConfig.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'SiYuan-Astro-Publisher'
                }
            });

            if (!response.ok) {
                return null;
            }

            const fileData = await response.json();
            // 正确解码 base64 内容，处理 UTF-8 编码
            let content: string;
            try {
                // 尝试使用 TextDecoder 来正确处理 UTF-8
                const binaryString = atob(fileData.content);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                content = new TextDecoder('utf-8').decode(bytes);
            } catch (error) {
                // 如果 TextDecoder 失败，回退到原来的方法
                console.warn("TextDecoder failed, using fallback method:", error);
                content = decodeURIComponent(escape(atob(fileData.content)));
            }
            
            // 解析 frontmatter
            const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
            if (!frontmatterMatch) {
                return null;
            }

            const frontmatter = frontmatterMatch[1];
            // 改进的正则表达式，更好地处理 YAML 格式
            const titleMatch = frontmatter.match(/title:\s*['"]([^'"]*?)['"]|title:\s*([^'"\n\r]*?)(?:\n|\r|$)/m);
            const descriptionMatch = frontmatter.match(/description:\s*['"]([^'"]*?)['"]|description:\s*([^'"\n\r]*?)(?:\n|\r|$)/m);

            return {
                name: categoryName,
                title: titleMatch ? (titleMatch[1] || titleMatch[2] || categoryName).trim() : categoryName,
                description: descriptionMatch ? (descriptionMatch[1] || descriptionMatch[2] || '').trim() : ''
            };
        } catch (error) {
            console.error(`Failed to get category data for ${categoryName}:`, error);
            return null;
        }
    }


    private populateCategorySelect(selectElement: HTMLSelectElement): void {
        // 清空现有选项（保留第一个默认选项）
        while (selectElement.children.length > 1) {
            selectElement.removeChild(selectElement.lastChild);
        }

        // 添加分类选项
        this.categories.forEach(category => {
            const option = document.createElement("option");
            option.value = category.name;
            option.textContent = category.title;
            selectElement.appendChild(option);
        });
    }

    private showCategoryDialog(category?: Category, onSuccess?: () => void): void {
        const isEdit = !!category;
        const dialog = new Dialog({
            title: `${isEdit ? '✏️ ' + this.i18n.editCategory : '➕ ' + this.i18n.addCategory}`,
            content: `<div class="b3-dialog__content">
    <div class="fn__flex-column" style="gap: 16px;">
        <div class="fn__flex-column">
            <label class="fn__flex b3-label">
                <div class="fn__flex-center fn__size120" style="font-weight: 500;">${this.i18n.categoryName}</div>
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
                <div class="fn__flex-center fn__size120" style="font-weight: 500;">${this.i18n.categoryTitle}</div>
                <div class="fn__flex-1">
                    <input class="b3-text-field fn__flex-1" id="categoryTitle" placeholder="Astro Framework 🚀" />
                </div>
            </label>
            <div style="font-size: 11px; color: var(--b3-theme-on-surface-light); margin-top: 4px; margin-left: 120px;">显示给用户的友好名称，可以使用中文和表情符号</div>
        </div>
        
        <div class="fn__flex-column">
            <label class="fn__flex b3-label">
                <div class="fn__flex-center fn__size120" style="font-weight: 500; align-self: flex-start; margin-top: 8px;">${this.i18n.categoryDescription}</div>
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
    <button class="b3-button b3-button--cancel">${this.i18n.cancel}</button><div class="fn__space"></div>
    <button class="b3-button b3-button--text" id="saveBtn">${this.i18n.save}</button>
</div>`,
            width: this.isMobile ? "92vw" : "480px",
        });

        const nameInput = dialog.element.querySelector("#categoryName") as HTMLInputElement;
        const titleInput = dialog.element.querySelector("#categoryTitle") as HTMLInputElement;
        const descriptionInput = dialog.element.querySelector("#categoryDescription") as HTMLTextAreaElement;
        const saveBtn = dialog.element.querySelector("#saveBtn") as HTMLButtonElement;
        const cancelBtn = dialog.element.querySelector(".b3-button--cancel") as HTMLButtonElement;

        // 如果是编辑模式，填充现有数据
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

            // 检查分类名是否已存在（新建时）
            if (!isEdit && this.categories.some(cat => cat.name === name)) {
                showMessage(this.i18n.categoryExists);
                return;
            }

            try {
                saveBtn.disabled = true;
                saveBtn.textContent = "保存中...";

                await this.saveCategory({ name, title, description });
                
                showMessage(isEdit ? this.i18n.categoryUpdated : this.i18n.categoryCreated);
                dialog.destroy();
                
                // 刷新分类列表
                await this.loadCategories();
                
                // 调用成功回调
                if (onSuccess) {
                    onSuccess();
                }
            } catch (error) {
                showMessage(this.i18n.categoryOperationFailed.replace("${error}", error.message));
                saveBtn.disabled = false;
                saveBtn.textContent = this.i18n.save;
            }
        });
    }

    private async saveCategory(category: Category): Promise<void> {
        const content = `---
title: '${category.title}'
description: '${category.description}'
---
`;

        const filePath = `${this.astroConfig.categoriesPath}/${category.name}.md`;
        
        // 检查文件是否存在
        const existingFile = await this.getFileFromGitHub(filePath);
        
        // 上传到 GitHub
        await this.uploadToGitHub(filePath, content, existingFile?.sha);
    }

    private async deleteCategory(categoryName: string): Promise<void> {
        const filePath = `${this.astroConfig.categoriesPath}/${categoryName}.md`;
        
        try {
            // 获取文件信息
            const fileData = await this.getFileFromGitHub(filePath);
            if (!fileData) {
                throw new Error("Category file not found");
            }

            // 删除文件
            const url = `https://api.github.com/repos/${this.astroConfig.githubOwner}/${this.astroConfig.githubRepo}/contents/${filePath}`;
            
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `token ${this.astroConfig.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Delete category: ${categoryName}`,
                    sha: fileData.sha,
                    branch: 'main'
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`GitHub delete failed: ${errorData.message}`);
            }
        } catch (error) {
            console.error("Delete category error:", error);
            throw error;
        }
    }

    private async deletePublishedFile(filePath: string): Promise<void> {
        const normalizedPath = filePath.startsWith(this.astroConfig.astroContentPath)
            ? filePath
            : `${this.astroConfig.astroContentPath}/${filePath}`;

        try {
            const fileData = await this.getFileFromGitHub(normalizedPath);
            if (!fileData) {
                throw new Error("Published file not found");
            }

            const url = `https://api.github.com/repos/${this.astroConfig.githubOwner}/${this.astroConfig.githubRepo}/contents/${normalizedPath}`;
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `token ${this.astroConfig.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Delete post: ${normalizedPath}`,
                    sha: fileData.sha,
                    branch: 'main'
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`GitHub delete failed: ${errorData.message}`);
            }
        } catch (error) {
            throw error;
        }
    }

    private async quickPublish(stat: PublishStat, button: HTMLButtonElement): Promise<void> {
        if (!stat.lastMetadata) {
            showMessage(this.translate("noMetadata", "缺少发布元数据，请先通过发布对话框发布一次。"), 4000, "error");
            return;
        }

        const originalText = button.textContent;
        button.textContent = this.translate("quickPublishing", "发布中...");
        button.disabled = true;

        try {
            const metadata = this.normalizeMetadata({
                ...stat.lastMetadata,
                title: stat.title,
                category: stat.category,
                tags: stat.tags,
                description: stat.description,
                draft: stat.draft,
                publishDate: new Date().toISOString(),
            });

            const filePath = await this.publishToGitHub(stat.docId, metadata, stat.filePath);
            this.recordPublishStats(stat.docId, metadata, filePath);
            showMessage(`${this.translate("quickPublishSuccess", "发布成功")}: ${stat.title}`);
        } catch (error) {
            console.error("Quick publish failed:", error);
            showMessage(this.i18n.publishFailed.replace("${error}", error.message));
        } finally {
            button.textContent = originalText || this.translate("quickPublish", "快速发布");
            button.disabled = false;
        }
    }

    private normalizeMetadata(metadata: PublishMetadata): PublishMetadata {
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
            customFields: metadata.customFields || {},
        };
    }

    private recordPublishStats(editorOrDocId: any, metadata: PublishMetadata, filePath?: string): void {
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

        const normalized = this.normalizeMetadata(metadata);

        if (!normalized.title || normalized.title === "Untitled") {
            if (typeof editorOrDocId !== "string") {
                normalized.title = this.getDocumentTitle(editorOrDocId) || normalized.title;
            } else if (this.publishStats[docId]?.title) {
                normalized.title = this.publishStats[docId].title;
            }
        }

        const resolvedFilePath = (filePath && filePath.trim().length > 0)
            ? filePath.trim()
            : this.publishStats[docId]?.filePath || this.getPostFilePath(docId);

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
            lastMetadata: null,
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

    private showPublishStats(): void {
        const stats: PublishStat[] = Object.keys(this.publishStats).map((docId: string) => {
            const stat = this.publishStats[docId];
            return {
                ...stat,
                tags: stat.tags || [],
                description: stat.description || "",
                draft: Boolean(stat.draft),
                filePath: stat.filePath || ""
            } as PublishStat;
        });

        const sortedStats = stats.sort((a: PublishStat, b: PublishStat) => (b.lastPublishedAt || "").localeCompare(a.lastPublishedAt || ""));
        const total = sortedStats.length;

        const quickLabel = this.translate("quickPublish", "快速发布");
        const draftBadgeLabel = this.translate("draft", "草稿");
        const emptyLabel = this.translate("noStats", "暂无发布记录");
        const openLabel = this.translate("openDocument", "打开文档");
        const copyLabel = this.translate("copyTitle", "复制标题");
        const removeLabel = this.translate("removeRecord", "移除发布");

        const rowsHtml = total > 0 ? sortedStats.map((stat: PublishStat, index: number) => {
            const searchTokens = [stat.title, stat.category, stat.description, stat.docId, ...(stat.tags || [])]
                .join(" ")
                .toLowerCase();
            const tagsHtml = (stat.tags || []).map((tag: string) => `<span class="astro-stats__tag">${tag}</span>`).join("");
            const categoryBadge = stat.category ? `<span class="astro-stats__badge">${stat.category}</span>` : "";
            const quickDisabled = stat.lastMetadata ? "" : "disabled";
            const draftBadge = stat.draft ? `<span class="astro-stats__badge astro-stats__badge--draft">${draftBadgeLabel}</span>` : "";

            return `<tr data-search="${searchTokens}" data-draft="${stat.draft ? "1" : "0"}">
                <td class="astro-stats__index">${index + 1}</td>
                <td>
                    <div class="astro-stats__title">${stat.title}${draftBadge}</div>
                    <div class="astro-stats__meta">
                        ${categoryBadge}
                        ${tagsHtml}
                    </div>
                    <div class="astro-stats__doc-id">${stat.docId}</div>
                </td>
                <td class="astro-stats__description">${stat.description || "-"}</td>
                <td>${this.formatDateTime(stat.lastPublishedAt)}</td>
                <td class="astro-stats__count">${stat.publishCount}</td>
                <td class="astro-stats__actions">
                    <button class="b3-button b3-button--outline b3-button--small" data-action="quick" data-doc-id="${stat.docId}" title="${quickLabel}" ${quickDisabled}>⚡</button>
                    <button class="b3-button b3-button--outline b3-button--small" data-action="open" data-doc-id="${stat.docId}" title="${openLabel}">📄</button>
                    <button class="b3-button b3-button--outline b3-button--small" data-action="copy" data-doc-id="${stat.docId}" data-title="${stat.title}" title="${copyLabel}">📋</button>
                    <button class="b3-button b3-button--cancel b3-button--small" data-action="remove" data-doc-id="${stat.docId}" data-file-path="${stat.filePath}" title="${removeLabel}">🗑️</button>
                </td>
            </tr>`;
        }).join("") : `<tr><td colspan="6" class="astro-stats__empty">${emptyLabel}</td></tr>`;

        const dialog = new Dialog({
            title: `📈 ${this.i18n.publishStats}`,
            content: `<div class="b3-dialog__content astro-stats">
    <div class="astro-stats__header">
        <input id="astroStatsSearch" class="b3-text-field astro-stats__search" type="search" placeholder="${this.i18n.searchPlaceholder || "搜索标题、分类或标签"}" />
        <label class="astro-stats__checkbox">
            <input type="checkbox" id="astroStatsDraftOnly" />
            <span>${this.i18n.draftOnly || "仅草稿"}</span>
        </label>
        <div class="astro-stats__summary" id="astroStatsSummary"></div>
    </div>
    <div class="astro-stats__table-wrapper">
        <table class="astro-stats__table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>${this.i18n.documentTitle}</th>
                    <th>${this.i18n.description}</th>
                    <th>${this.i18n.lastPublishedAt || "最后发布时间"}</th>
                    <th>${this.i18n.publishCountLabel || "发布次数"}</th>
                    <th>${this.i18n.actions || "操作"}</th>
                </tr>
            </thead>
            <tbody id="astroStatsBody">
                ${rowsHtml}
            </tbody>
        </table>
    </div>
</div>
<div class="b3-dialog__action">
    <button class="b3-button b3-button--cancel">${this.i18n.close || "关闭"}</button>
</div>`,
            width: this.isMobile ? "96vw" : "820px",
            height: this.isMobile ? "82vh" : "560px",
        });

        const closeBtn = dialog.element.querySelector(".b3-button--cancel") as HTMLButtonElement;
        closeBtn.addEventListener("click", () => dialog.destroy());

        const summaryElement = dialog.element.querySelector("#astroStatsSummary") as HTMLElement;
        const searchInput = dialog.element.querySelector("#astroStatsSearch") as HTMLInputElement;
        const draftCheckbox = dialog.element.querySelector("#astroStatsDraftOnly") as HTMLInputElement;
        const tbody = dialog.element.querySelector("#astroStatsBody") as HTMLTableSectionElement;
        const rows = Array.from(tbody.querySelectorAll<HTMLTableRowElement>("tr"));

        const updateSummary = (visible: number) => {
            const total = Object.keys(this.publishStats).length;
            const summaryTpl = this.i18n.statsSummary || "共 ${total} 篇文章，显示 ${visible} 篇";
            summaryElement.textContent = summaryTpl
                .replace("${total}", total.toString())
                .replace("${visible}", visible.toString());
        };

        const filterRows = () => {
            const keyword = (searchInput.value || "").trim().toLowerCase();
            const draftOnly = draftCheckbox.checked;
            let visibleCount = 0;

            rows.forEach((row, idx) => {
                const searchTokens = row.dataset.search || "";
                const isDraft = row.dataset.draft === "1";
                const matchesKeyword = !keyword || searchTokens.includes(keyword);
                const matchesDraft = !draftOnly || isDraft;
                const visible = matchesKeyword && matchesDraft;
                row.style.display = visible ? "" : "none";
                if (visible) {
                    visibleCount += 1;
                    const indexCell = row.querySelector(".astro-stats__index");
                    if (indexCell) {
                        indexCell.textContent = (visibleCount).toString();
                    }
                }
            });

            updateSummary(visibleCount);
        };

        updateSummary(sortedStats.length);
        searchInput.addEventListener("input", filterRows);
        draftCheckbox.addEventListener("change", filterRows);

        const table = dialog.element.querySelector(".astro-stats__table") as HTMLTableElement;
        if (table) {
            table.addEventListener("click", (event) => {
                const target = event.target as HTMLElement;
                const action = target.dataset.action;
                const docId = target.dataset.docId;
                if (!action || !docId) {
                    return;
                }

                const stat = this.publishStats[docId];
                if (!stat) {
                    showMessage("记录不存在", 3000, "error");
                    return;
                }

                if (action === "open") {
                    openTab({
                        app: this.app,
                        doc: { id: docId }
                    });
                    dialog.destroy();
                } else if (action === "copy") {
                    const title = target.dataset.title || stat.title;
                    navigator.clipboard?.writeText(title).then(() => {
                        showMessage(this.i18n.titleCopied || "标题已复制");
                    }).catch(() => {
                        showMessage(this.i18n.copyFailed || "复制失败", 3000, "error");
                    });
                } else if (action === "remove") {
                    const filePath = target.dataset.filePath || stat.filePath;
                    if (!filePath) {
                        showMessage(this.translate("missingFilePath", "未找到发布文件路径"), 4000, "error");
                        return;
                    }
                    const confirmMessage = this.translate("confirmDeletePost", "确认删除已发布的文章并移除记录？");
                    confirm("⚠️", confirmMessage, () => {
                        (async () => {
                            try {
                                await this.deletePublishedFile(filePath);
                                delete this.publishStats[docId];
                                this.saveData(ASTRO_STATS_NAME, this.publishStats);
                                const row = target.closest("tr");
                                if (row) {
                                    const index = rows.indexOf(row as HTMLTableRowElement);
                                    if (index >= 0) {
                                        rows.splice(index, 1);
                                    }
                                    row.remove();
                                }
                                filterRows();
                                showMessage(this.translate("deletePostSuccess", "已删除发布内容"));
                            } catch (error) {
                                console.error("Delete published file failed:", error);
                                const message = error instanceof Error ? error.message : String(error);
                                showMessage(this.translate("deletePostFailed", `删除发布内容失败：${message}`), 4000, "error");
                            }
                        })();
                    });
                } else if (action === "quick") {
                    this.quickPublish(stat, target as HTMLButtonElement);
                }
            });
        }

        // 初始过滤
        filterRows();
    }

    private formatDateTime(value: string): string {
        if (!value) {
            return "-";
        }
        try {
            return new Date(value).toLocaleString();
        } catch (error) {
            return value;
        }
    }

    private getDocumentTitle(editor: any): string {
        try {
            if (typeof editor.protyle.title === 'string') {
                return editor.protyle.title;
            }
            // 尝试从 DOM 元素获取标题
            const titleElement = editor.protyle.title as HTMLElement;
            if (titleElement && titleElement.textContent) {
                return titleElement.textContent.trim();
            }
            // 从文档路径获取标题
            if (editor.protyle.path) {
                const pathParts = editor.protyle.path.split('/');
                const fileName = pathParts[pathParts.length - 1];
                return fileName.replace('.sy', '');
            }
            return "Untitled";
        } catch (error) {
            console.warn("Failed to get document title:", error);
            return "Untitled";
        }
    }

    private getEditor() {
        const editors = getAllEditor();
        if (editors.length === 0) {
            showMessage("请先打开一个文档");
            return;
        }
        
        // 方法1: 检查当前焦点所在的编辑器
        const activeElement = document.activeElement;
        if (activeElement) {
            for (const editor of editors) {
                if (editor.protyle?.element?.contains(activeElement)) {
                    console.log("Found editor by active element:", editor.protyle?.block?.rootID);
                    return editor;
                }
            }
        }
        
        // 方法2: 检查哪个编辑器在当前可见的标签页中
        const currentTab = document.querySelector('.layout-tab-container .item--focus');
        if (currentTab) {
            const tabId = currentTab.getAttribute('data-id');
            for (const editor of editors) {
                const editorTab = editor.protyle?.element?.closest('.fn__flex-1[data-id]');
                if (editorTab && editorTab.getAttribute('data-id') === tabId) {
                    console.log("Found editor by tab:", editor.protyle?.block?.rootID);
                    return editor;
                }
            }
        }
        
        // 方法3: 检查哪个编辑器是可见的且在前台
        for (const editor of editors) {
            const element = editor.protyle?.element;
            if (element && element.offsetParent !== null) {
                const rect = element.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    // 检查是否在视口中
                    if (rect.top >= 0 && rect.left >= 0 && 
                        rect.bottom <= window.innerHeight && 
                        rect.right <= window.innerWidth) {
                        console.log("Found editor by visibility:", editor.protyle?.block?.rootID);
                        return editor;
                    }
                }
            }
        }
        
        // 方法4: 如果还是没找到，返回第一个编辑器
        console.log("Using first editor as fallback:", editors[0].protyle?.block?.rootID);
        return editors[0];
    }
}

