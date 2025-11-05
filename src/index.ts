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
    value: string;
    type: 'string' | 'number' | 'boolean' | 'array';
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

export default class PluginSample extends Plugin {

    private custom: () => Custom;
    private isMobile: boolean;
    private blockIconEventBindThis = this.blockIconEvent.bind(this);
    private astroConfig: AstroConfig;
    private categories: Category[] = [];

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
publishDate: {date}
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
publishDate: {date}
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

        // 添加自定义字段
        const addCustomField = () => {
            const fieldContainer = document.createElement("div");
            fieldContainer.className = "fn__flex fn__flex-wrap";
            fieldContainer.style.marginBottom = "8px";
            
            const nameInput = document.createElement("input");
            nameInput.className = "b3-text-field";
            nameInput.placeholder = this.i18n.fieldName;
            nameInput.style.width = "120px";
            nameInput.style.marginRight = "8px";
            
            const valueInput = document.createElement("input");
            valueInput.className = "b3-text-field fn__flex-1";
            valueInput.placeholder = this.i18n.fieldValue;
            valueInput.style.marginRight = "8px";
            
            const typeSelect = document.createElement("select");
            typeSelect.className = "b3-select";
            typeSelect.style.width = "80px";
            typeSelect.style.marginRight = "8px";
            typeSelect.innerHTML = `
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="array">Array</option>
            `;
            
            const removeBtn = document.createElement("button");
            removeBtn.className = "b3-button b3-button--cancel";
            removeBtn.textContent = "×";
            removeBtn.style.width = "32px";
            removeBtn.addEventListener("click", () => {
                if (nameInput.value) {
                    delete customFields[nameInput.value];
                }
                fieldContainer.remove();
                updatePreview();
            });
            
            // 更新自定义字段数据
            const updateCustomField = () => {
                const oldName = nameInput.dataset.oldName;
                if (oldName && oldName !== nameInput.value) {
                    delete customFields[oldName];
                }
                
                if (nameInput.value) {
                    let value: any = valueInput.value;
                    switch (typeSelect.value) {
                        case 'number':
                            value = parseFloat(valueInput.value) || 0;
                            break;
                        case 'boolean':
                            value = valueInput.value.toLowerCase() === 'true';
                            break;
                        case 'array':
                            value = valueInput.value.split(',').map(v => v.trim()).filter(v => v);
                            break;
                        default:
                            // string - 保持原样
                            break;
                    }
                    customFields[nameInput.value] = value;
                    nameInput.dataset.oldName = nameInput.value;
                }
                updatePreview();
            };
            
            nameInput.addEventListener("input", updateCustomField);
            valueInput.addEventListener("input", updateCustomField);
            typeSelect.addEventListener("change", updateCustomField);
            
            fieldContainer.appendChild(nameInput);
            fieldContainer.appendChild(valueInput);
            fieldContainer.appendChild(typeSelect);
            fieldContainer.appendChild(removeBtn);
            
            customFieldsContainer.appendChild(fieldContainer);
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
        addCustomFieldBtn.addEventListener("click", addCustomField);

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

                await this.publishToGitHub(editor.protyle.block.rootID, metadata);
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
publishDate: {date}
tags: {tags}
category: "{category}"
draft: {draft}
---`;

        // 替换基本变量
        template = template
            .replace(/\{title\}/g, `"${metadata.title.replace(/"/g, '\\"')}"`)
            .replace(/\{description\}/g, `"${metadata.description.replace(/"/g, '\\"')}"`)
            .replace(/\{date\}/g, metadata.publishDate)
            .replace(/\{tags\}/g, `[${metadata.tags.map(tag => `"${tag.replace(/"/g, '\\"')}"`).join(", ")}]`)
            .replace(/\{category\}/g, `"${metadata.category.replace(/"/g, '\\"')}"`)
            .replace(/\{draft\}/g, metadata.draft.toString());

        // 添加自定义字段
        if (metadata.customFields) {
            let customYaml = "";
            for (const key in metadata.customFields) {
                if (metadata.customFields.hasOwnProperty(key)) {
                    const value = metadata.customFields[key];
                    if (value !== undefined && value !== null && value !== "") {
                        customYaml += `${key}: ${this.formatYamlValue(value)}\n`;
                    }
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

    private async publishToGitHub(blockId: string, metadata: PublishMetadata): Promise<void> {
        try {
            // 获取文档内容
            const content = await this.getDocumentContent(blockId);
            
            // 生成 frontmatter
            const frontmatter = this.generateFrontmatter(metadata);
            
            // 组合完整内容
            const fullContent = frontmatter + content;
            
            // 生成文件名
            const fileName = this.generateFileName(metadata.title);
            const filePath = `${this.astroConfig.astroContentPath}/${fileName}`;
            
            // 检查文件是否存在
            const existingFile = await this.getFileFromGitHub(filePath);
            
            // 上传到 GitHub
            await this.uploadToGitHub(filePath, fullContent, existingFile?.sha);
            
        } catch (error) {
            console.error("Publish error:", error);
            throw error;
        }
    }

    private generateFileName(title: string): string {
        const date = new Date().toISOString().split('T')[0];
        const slug = title.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
        return `${date}-${slug}.md`;
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
