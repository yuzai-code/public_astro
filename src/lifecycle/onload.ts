import {
    Setting,
    getFrontend,
    showMessage
} from "siyuan";
import { STORAGE_NAME, TAB_TYPE, ASTRO_CONFIG_NAME } from "../constants";
import { createDefaultAstroConfig } from "../utils/metadata";
import type PluginSample from "../index";

export function initializePlugin(plugin: PluginSample): void {
    plugin.data[STORAGE_NAME] = {readonlyText: "Readonly"};

    plugin.astroConfig = createDefaultAstroConfig();

    const frontEnd = getFrontend();
    plugin.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";

    plugin.addIcons(`<symbol id="iconFace" viewBox="0 0 32 32">
<path d="M13.667 17.333c0 0.92-0.747 1.667-1.667 1.667s-1.667-0.747-1.667-1.667 0.747-1.667 1.667-1.667 1.667 0.747 1.667 1.667zM20 15.667c-0.92 0-1.667 0.747-1.667 1.667s0.747 1.667 1.667 1.667 1.667-0.747 1.667-1.667-0.747-1.667-1.667-1.667zM29.333 16c0 7.36-5.973 13.333-13.333 13.333s-13.333-5.973-13.333-13.333 5.973-13.333 13.333-13.333 13.333 5.973 13.333 13.333zM14.213 5.493c1.867 3.093 5.253 5.173 9.12 5.173 0.613 0 1.213-0.067 1.787-0.16-1.867-3.093-5.253-5.173-9.12-5.173-0.613 0-1.213 0.067-1.787 0.16zM5.893 12.627c2.28-1.293 4.040-3.4 4.88-5.92-2.28 1.293-4.040 3.4-4.88 5.92zM26.667 16c0-1.040-0.16-2.040-0.44-2.987-0.933 0.2-1.893 0.32-2.893 0.32-4.173 0-7.893-1.92-10.347-4.92-1.4 3.413-4.187 6.093-7.653 7.4 0.013 0.053 0 0.12 0 0.187 0 5.88 4.787 10.667 10.667 10.667s10.667-4.787 10.667-10.667z"></path>
</symbol>
<symbol id="iconSaving" viewBox="0 0 32 32">
<path d="M20 13.333c0-0.733 0.6-1.333 1.333-1.333s1.333 0.6 1.333 1.333c0 0.733-0.6 1.333-1.333 1.333s-1.333-0.6-1.333-1.333zM10.667 12h6.667v-2.667h-6.667v2.667zM29.333 10v9.293l-3.76 1.253-2.24 7.453h-7.333v-2.667h-2.667v2.667h-7.333c0 0-3.333-11.28-3.333-15.333s3.28-7.333 7.333-7.333h6.667c1.213-1.613 3.147-2.667 5.333-2.667 1.107 0 2 0.893 2 2 0 0.28-0.053 0.533-0.16 0.773-0.187 0.453-0.347 0.973-0.427 1.533l3.027 3.027h2.893zM26.667 12.667h-1.333l-4.667-4.667c0-0.867 0.12-1.72 0.347-2.547-1.293 0.333-2.347 1.293-2.787 2.547h-8.227c-2.573 0-4.667 2.093-4.667 4.667 0 2.507 1.627 8.867 2.68 12.667h2.653v-2.667h8v2.667h2.68l2.067-6.867 3.253-1.093v-4.707z"></path>
</symbol>
<symbol id="iconAstro" viewBox="0 0 32 32">
<path d="M16 2L3 7l2 12h22l2-12L16 2zm0 4l8 3-1 6H9l-1-6 8-3zm0 2a2 2 0 100 4 2 2 0 000-4z"/>
</symbol>`);

    plugin.custom = plugin.addTab({
        type: TAB_TYPE,
        init() {
            this.element.innerHTML = `<div class="plugin-sample__custom-tab">${plugin.data.text}</div>`;
        },
        beforeDestroy() {
            console.log("before destroy tab:", TAB_TYPE);
        },
        destroy() {
            console.log("destroy tab:", TAB_TYPE);
        }
    });

    plugin.addCommand({
        langKey: "showDialog",
        hotkey: "⇧⌘O",
        callback: () => {
            plugin.showDialog();
        }
    });

    plugin.addCommand({
        langKey: "getTab",
        hotkey: "⇧⌘M",
        globalCallback: () => {
            console.log(plugin.getOpenedTab());
        }
    });

    plugin.addCommand({
        langKey: "publishToAstro",
        hotkey: "⇧⌘P",
        callback: () => {
            plugin.showPublishDialog();
        }
    });

    plugin.addCommand({
        langKey: "publishStats",
        hotkey: "",
        callback: () => {
            plugin.showPublishStats();
        }
    });

    const textareaElement = document.createElement("textarea");
    const githubTokenElement = document.createElement("input");
    const githubOwnerElement = document.createElement("input");
    const githubRepoElement = document.createElement("input");
    const astroPathElement = document.createElement("input");
    const categoriesPathElement = document.createElement("input");
    const yamlTemplateElement = document.createElement("textarea");

    plugin.setting = new Setting({
        confirmCallback: () => {
            plugin.saveData(STORAGE_NAME, {readonlyText: textareaElement.value});
            plugin.astroConfig = {
                githubToken: githubTokenElement.value,
                githubOwner: githubOwnerElement.value,
                githubRepo: githubRepoElement.value,
                astroContentPath: astroPathElement.value,
                categoriesPath: categoriesPathElement.value,
                yamlTemplate: yamlTemplateElement.value,
                customFields: plugin.astroConfig.customFields || []
            };
            plugin.saveData(ASTRO_CONFIG_NAME, plugin.astroConfig);
        }
    });

    plugin.setting.addItem({
        title: "GitHub Personal Access Token",
        description: "GitHub Personal Access Token 用于访问 GitHub API",
        createActionElement: () => {
            githubTokenElement.className = "b3-text-field fn__block";
            githubTokenElement.type = "password";
            githubTokenElement.placeholder = "ghp_xxxxxxxxxxxxxxxxxxxx";
            githubTokenElement.value = plugin.astroConfig.githubToken;
            return githubTokenElement;
        }
    });

    plugin.setting.addItem({
        title: "GitHub 仓库所有者",
        description: "GitHub 仓库所有者/用户名",
        createActionElement: () => {
            githubOwnerElement.className = "b3-text-field fn__block";
            githubOwnerElement.placeholder = "username";
            githubOwnerElement.value = plugin.astroConfig.githubOwner;
            return githubOwnerElement;
        }
    });

    plugin.setting.addItem({
        title: "GitHub 仓库名称",
        description: "GitHub 仓库名称",
        createActionElement: () => {
            githubRepoElement.className = "b3-text-field fn__block";
            githubRepoElement.placeholder = "my-astro-blog";
            githubRepoElement.value = plugin.astroConfig.githubRepo;
            return githubRepoElement;
        }
    });

    plugin.setting.addItem({
        title: "Astro 文章目录",
        description: "Astro 文章目录路径",
        createActionElement: () => {
            astroPathElement.className = "b3-text-field fn__block";
            astroPathElement.placeholder = "src/content/posts";
            astroPathElement.value = plugin.astroConfig.astroContentPath;
            return astroPathElement;
        }
    });

    plugin.setting.addItem({
        title: plugin.i18n.categoriesPath,
        description: plugin.i18n.categoriesPathDesc,
        createActionElement: () => {
            categoriesPathElement.className = "b3-text-field fn__block";
            categoriesPathElement.placeholder = "src/content/categories";
            categoriesPathElement.value = plugin.astroConfig.categoriesPath;
            return categoriesPathElement;
        }
    });

    plugin.setting.addItem({
        title: plugin.i18n.testConnection,
        description: plugin.i18n.testConnectionDesc,
        createActionElement: () => {
            const testButton = document.createElement("button");
            testButton.className = "b3-button b3-button--outline fn__flex-center astro-publisher__test-btn";
            testButton.textContent = plugin.i18n.testConnection;
            testButton.addEventListener("click", async () => {
                await plugin.testGitHubConnection(testButton);
            });
            return testButton;
        }
    });

    plugin.setting.addItem({
        title: plugin.i18n.yamlTemplate,
        description: plugin.i18n.yamlTemplateDesc,
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
            yamlTemplateElement.value = plugin.astroConfig.yamlTemplate;

            const resetButton = document.createElement("button");
            resetButton.className = "b3-button b3-button--outline fn__size200";
            resetButton.textContent = plugin.i18n.resetYamlTemplate;
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
        }
    });

    plugin.setting.addItem({
        title: plugin.i18n.customFieldConfig || "Additional Fields",
        description: plugin.i18n.customFieldConfigDesc || "Configure extra frontmatter fields shown in the publish dialog.",
        createActionElement: () => {
            const container = document.createElement("div");
            container.className = "astro-setting__custom-fields fn__flex-column";

            const list = document.createElement("div");
            list.className = "astro-setting__custom-fields-list fn__flex-column";
            list.style.gap = "8px";
            list.style.marginBottom = "8px";

            const ensureArray = () => {
                if (!Array.isArray(plugin.astroConfig.customFields)) {
                    plugin.astroConfig.customFields = [];
                }
            };

            const render = () => {
                ensureArray();
                list.innerHTML = "";

                if (plugin.astroConfig.customFields.length === 0) {
                    const empty = document.createElement("div");
                    empty.className = "b3-label fn__flex-center";
                    empty.textContent = plugin.i18n.noCustomFields || "No custom fields configured";
                    empty.style.minHeight = "36px";
                    empty.style.background = "var(--b3-theme-surface-lighter)";
                    empty.style.borderRadius = "4px";
                    list.appendChild(empty);
                    return;
                }

                plugin.astroConfig.customFields.forEach((field, index) => {
                    if (!field) {
                        plugin.astroConfig.customFields[index] = { name: "" };
                    }
                    const row = document.createElement("div");
                    row.className = "astro-setting__custom-field-row fn__flex fn__flex-wrap";
                    row.style.gap = "6px";
                    row.style.padding = "8px";
                    row.style.border = "1px solid var(--b3-border-color)";
                    row.style.borderRadius = "4px";

                    const nameInput = document.createElement("input");
                    nameInput.className = "b3-text-field";
                    nameInput.placeholder = plugin.i18n.fieldName;
                    nameInput.value = field.name || "";
                    nameInput.style.minWidth = "140px";
                    nameInput.addEventListener("input", () => {
                        plugin.astroConfig.customFields[index].name = nameInput.value.trim();
                    });

                    const labelInput = document.createElement("input");
                    labelInput.className = "b3-text-field";
                    labelInput.placeholder = plugin.i18n.fieldLabel || "Label";
                    labelInput.value = field.label || "";
                    labelInput.style.minWidth = "140px";
                    labelInput.addEventListener("input", () => {
                        plugin.astroConfig.customFields[index].label = labelInput.value;
                    });

                    const placeholderInput = document.createElement("input");
                    placeholderInput.className = "b3-text-field";
                    placeholderInput.placeholder = plugin.i18n.fieldPlaceholder || "Placeholder";
                    placeholderInput.value = field.placeholder || "";
                    placeholderInput.style.minWidth = "160px";
                    placeholderInput.addEventListener("input", () => {
                        plugin.astroConfig.customFields[index].placeholder = placeholderInput.value;
                    });

                    const defaultInput = document.createElement("input");
                    defaultInput.className = "b3-text-field";
                    defaultInput.placeholder = plugin.i18n.fieldDefaultValue || "Default";
                    defaultInput.value = field.defaultValue || "";
                    defaultInput.style.minWidth = "140px";
                    defaultInput.addEventListener("input", () => {
                        plugin.astroConfig.customFields[index].defaultValue = defaultInput.value;
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
                        plugin.astroConfig.customFields[index].type = typeSelect.value as typeof field.type;
                    });

                    const requiredWrapper = document.createElement("label");
                    requiredWrapper.className = "fn__flex fn__flex-center";
                    requiredWrapper.style.gap = "4px";
                    const requiredInput = document.createElement("input");
                    requiredInput.type = "checkbox";
                    requiredInput.checked = Boolean(field.required);
                    requiredInput.addEventListener("change", () => {
                        plugin.astroConfig.customFields[index].required = requiredInput.checked;
                    });
                    const requiredLabel = document.createElement("span");
                    requiredLabel.textContent = plugin.i18n.fieldRequired || "Required";
                    requiredWrapper.appendChild(requiredInput);
                    requiredWrapper.appendChild(requiredLabel);

                    const removeBtn = document.createElement("button");
                    removeBtn.className = "b3-button b3-button--cancel";
                    removeBtn.textContent = "×";
                    removeBtn.title = plugin.i18n.removeField;
                    removeBtn.addEventListener("click", () => {
                        plugin.astroConfig.customFields.splice(index, 1);
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
            addBtn.textContent = plugin.i18n.addField || "Add Field";
            addBtn.addEventListener("click", () => {
                ensureArray();
                plugin.astroConfig.customFields.push({
                    name: "",
                    label: "",
                    type: "string",
                    placeholder: "",
                    defaultValue: "",
                    required: false
                });
                render();
            });

            render();

            container.appendChild(list);
            container.appendChild(addBtn);
            return container;
        }
    });

    plugin.setting.addItem({
        title: plugin.i18n.categoryManagement,
        description: plugin.i18n.categoryManagementDesc,
        createActionElement: () => {
            const container = document.createElement("div");
            container.className = "fn__flex astro-publisher__category-dropdown";
            container.style.gap = "8px";
            container.style.alignItems = "center";

            const categorySelect = document.createElement("select");
            categorySelect.className = "b3-select fn__flex-1";
            categorySelect.innerHTML = `<option value="">${plugin.i18n.selectCategory}</option>`;

            const buttonsContainer = document.createElement("div");
            buttonsContainer.className = "fn__flex category-action-buttons";
            buttonsContainer.style.gap = "4px";

            const refreshBtn = document.createElement("button");
            refreshBtn.className = "b3-button b3-button--outline b3-button--small";
            refreshBtn.innerHTML = "🔄";
            refreshBtn.title = plugin.i18n.refreshCategories;

            const addBtn = document.createElement("button");
            addBtn.className = "b3-button b3-button--outline b3-button--small";
            addBtn.innerHTML = "➕";
            addBtn.title = plugin.i18n.addCategory;

            const editBtn = document.createElement("button");
            editBtn.className = "b3-button b3-button--outline b3-button--small";
            editBtn.innerHTML = "✏️";
            editBtn.title = plugin.i18n.editCategory;
            editBtn.disabled = true;

            const deleteBtn = document.createElement("button");
            deleteBtn.className = "b3-button b3-button--cancel b3-button--small";
            deleteBtn.innerHTML = "🗑️";
            deleteBtn.title = plugin.i18n.deleteCategory;
            deleteBtn.disabled = true;

            const updateCategorySelect = () => {
                const selectedValue = categorySelect.value;
                categorySelect.innerHTML = `<option value="">${plugin.i18n.selectCategory}</option>`;
                plugin.categories.forEach(category => {
                    const option = document.createElement("option");
                    option.value = category.name;
                    option.textContent = `${category.title} (${category.name})`;
                    categorySelect.appendChild(option);
                });
                if (selectedValue && plugin.categories.some(cat => cat.name === selectedValue)) {
                    categorySelect.value = selectedValue;
                }
                const hasSelection = categorySelect.value !== "";
                editBtn.disabled = !hasSelection;
                deleteBtn.disabled = !hasSelection;
            };

            const refreshCategories = async () => {
                try {
                    refreshBtn.innerHTML = "⏳";
                    refreshBtn.disabled = true;

                    await plugin.loadCategories();
                    updateCategorySelect();

                    refreshBtn.innerHTML = "🔄";
                    refreshBtn.disabled = false;

                    showMessage(`已加载 ${plugin.categories.length} 个分类`, 2000);
                    console.log("Loaded categories:", plugin.categories);
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    showMessage(plugin.i18n.categoryOperationFailed.replace("${error}", message));
                    refreshBtn.innerHTML = "🔄";
                    refreshBtn.disabled = false;
                }
            };

            const getSelectedCategory = () => {
                const selectedName = categorySelect.value;
                return plugin.categories.find(cat => cat.name === selectedName);
            };

            categorySelect.addEventListener("change", () => {
                const hasSelection = categorySelect.value !== "";
                editBtn.disabled = !hasSelection;
                deleteBtn.disabled = !hasSelection;
            });

            refreshBtn.addEventListener("click", refreshCategories);

            addBtn.addEventListener("click", () => {
                plugin.showCategoryDialog(undefined, updateCategorySelect);
            });

            editBtn.addEventListener("click", () => {
                const category = getSelectedCategory();
                if (category) {
                    plugin.showCategoryDialog(category, updateCategorySelect);
                }
            });

            deleteBtn.addEventListener("click", async () => {
                const category = getSelectedCategory();
                if (category && window.confirm(`确定要删除分类 "${category.title}" 吗？\n\n这将删除 GitHub 仓库中的分类文件。`)) {
                    try {
                        deleteBtn.innerHTML = "⏳";
                        deleteBtn.disabled = true;

                        await plugin.deleteCategory(category.name);
                        showMessage(plugin.i18n.categoryDeleted);
                        await plugin.loadCategories();
                        updateCategorySelect();

                        deleteBtn.innerHTML = "🗑️";
                    } catch (error) {
                        const message = error instanceof Error ? error.message : String(error);
                        showMessage(plugin.i18n.categoryOperationFailed.replace("${error}", message));
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

            plugin.loadCategories()
                .then(() => {
                    updateCategorySelect();
                })
                .catch(error => {
                    const message = error instanceof Error ? error.message : String(error);
                    showMessage(`加载分类失败: ${message}`);
                });

            return container;
        }
    });

    plugin.protyleSlash = [{
        filter: ["insert emoji 😊", "插入表情 😊", "crbqwx"],
        html: `<div class="b3-list-item__first"><span class="b3-list-item__text">${plugin.i18n.insertEmoji}</span><span class="b3-list-item__meta">😊</span></div>`,
        id: "insertEmoji",
        callback(protyle) {
            protyle.insert("😊");
        }
    }];

    plugin.protyleOptions = {
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
            "inline-memo"
        ]
    };

    console.log(plugin.i18n.helloPlugin);
}
