import { Dialog, Protyle, confirm, showMessage } from "siyuan";
import type { CustomField, PublishMetadata } from "../types";
import { generateFrontmatter, normalizeMetadata } from "../utils/metadata";
import type PluginSample from "../index";

function extractTagsFromContent(content: string): string[] {
    const tags = new Set<string>();

    const lines = content.split(/\r?\n/);
    for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith("#") && !trimmedLine.startsWith("##") && !trimmedLine.startsWith("###")) {
            const match = trimmedLine.match(/^#\s*(.+)$/);
            if (match && match[1]) {
                const afterHash = match[1].trim();
                if (afterHash && !afterHash.startsWith("#") && !afterHash.startsWith("[")) {
                    const tagPart = afterHash.split(/\s+/)[0];
                    const cleanTag = tagPart.replace(/[\[\]#]/g, "").trim();
                    if (cleanTag && !cleanTag.match(/^\d+\./)) {
                        tags.add(cleanTag);
                    }
                }
            }
        }

        if (trimmedLine.startsWith("tags:") || trimmedLine.startsWith("- 标签") || trimmedLine.startsWith("标签:")) {
            const afterColon = trimmedLine.split(":")[1];
            if (afterColon) {
                const tagStrings = afterColon.split(/[,\|、]/);
                tagStrings.forEach(tag => {
                    const cleanTag = tag.trim().replace(/^#/, "").replace(/[\[\]]/g, "");
                    if (cleanTag && cleanTag.length > 0) {
                        tags.add(cleanTag);
                    }
                });
            }
        }

        if (trimmedLine.includes("[") && trimmedLine.includes("]")) {
            const match = trimmedLine.match(/\[([^\]]+)\]/g);
            if (match) {
                match.forEach(bracket => {
                    const inside = bracket.replace(/[\[\]]/g, "");
                    const tagParts = inside.split(/[,\|、]/);
                    tagParts.forEach(part => {
                        const cleanTag = part.trim().replace(/^#/, "");
                        if (cleanTag && !cleanTag.match(/^\d+\./)) {
                            tags.add(cleanTag);
                        }
                    });
                });
            }
        }
    }

    return Array.from(tags).filter(tag => tag.length > 0);
}

export async function openPublishDialog(plugin: PluginSample): Promise<void> {
    const editor = plugin.getEditor();
    if (!editor) {
        showMessage(plugin.i18n.selectDocument);
        return;
    }

    if (!plugin.isConfigValid()) {
        showMessage(plugin.i18n.configRequired);
        return;
    }

    const docId = editor.protyle.block.rootID;
    let extractedTags: string[] = [];
    try {
        const content = await plugin.getDocumentContent(docId);
        extractedTags = extractTagsFromContent(content);
        console.log("Extracted tags from document:", extractedTags);
    } catch (error) {
        console.warn("Failed to extract tags from document:", error);
    }

    const dialog = new Dialog({
        title: plugin.i18n.publishToAstro,
        content: `<div class="b3-dialog__content astro-publisher__publish-dialog">
    <div class="fn__flex">
        <div class="fn__flex-1">
            <label class="fn__flex b3-label">
                <div class="fn__flex-center fn__size200">${plugin.i18n.documentTitle}</div>
                <div class="fn__flex-1">
                    <input class="b3-text-field fn__flex-1" id="title" value="${plugin.getDocumentTitle(editor)}" />
                </div>
            </label>
            <div class="fn__hr"></div>
            <label class="fn__flex b3-label">
                <div class="fn__flex-center fn__size200">${plugin.i18n.description}</div>
                <div class="fn__flex-1">
                    <textarea class="b3-text-field fn__flex-1" id="description" placeholder="文章描述"></textarea>
                </div>
            </label>
            <div class="fn__hr"></div>
            <label class="fn__flex b3-label">
                <div class="fn__flex-center fn__size200">${plugin.i18n.tags}</div>
                <div class="fn__flex-1">
                    <input class="b3-text-field fn__flex-1" id="tags" placeholder="tag1, tag2, tag3" />
                </div>
            </label>
            <div class="fn__hr"></div>
            <label class="fn__flex b3-label">
                <div class="fn__flex-center fn__size200">${plugin.i18n.category} <span style="color: var(--b3-theme-error);">*</span></div>
                <div class="fn__flex-1">
                    <select class="b3-select fn__flex-1" id="category">
                        <option value="">${plugin.i18n.selectCategory}</option>
                    </select>
                </div>
            </label>
            <div class="fn__hr"></div>
            <label class="fn__flex b3-label">
                <div class="fn__flex-center fn__size200">${plugin.i18n.draft}</div>
                <div class="fn__flex-1">
                    <input type="checkbox" id="draft" class="b3-switch fn__flex-center">
                </div>
            </label>
            <div class="fn__hr"></div>
            <div class="fn__flex b3-label">
                <div class="fn__flex-center fn__size200">${plugin.i18n.customFields}</div>
                <div class="fn__flex-1">
                    <div id="customFieldsContainer" class="fn__flex-column"></div>
                    <button type="button" class="b3-button b3-button--outline fn__size200" id="addCustomField" style="margin-top: 8px;">
                        ${plugin.i18n.addCustomField}
                    </button>
                </div>
            </div>
            <div class="fn__hr"></div>
            <div class="fn__flex b3-label">
                <div class="fn__flex-center fn__size200">${plugin.i18n.yamlPreview}</div>
                <div class="fn__flex-1">
                    <textarea class="b3-text-field fn__flex-1" id="yamlPreview" readonly style="height: 150px; font-family: monospace; background-color: var(--b3-theme-surface-lighter);"></textarea>
                </div>
            </div>
        </div>
    </div>
</div>
<div class="b3-dialog__action">
    <button class="b3-button b3-button--cancel">${plugin.i18n.cancel}</button><div class="fn__space"></div>
    <button class="b3-button b3-button--outline" id="testBtn">${plugin.i18n.testConnection}</button><div class="fn__space"></div>
    <button class="b3-button b3-button--text" id="publishBtn">${plugin.i18n.publishToAstro}</button>
</div>`,
        width: plugin.isMobile ? "92vw" : "520px"
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

    const customFields: Record<string, unknown> = {};
    const customFieldsSection = customFieldsContainer.closest(".fn__flex.b3-label") as HTMLDivElement;

    const configuredFieldsContainer = document.createElement("div");
    configuredFieldsContainer.className = "astro-configured-fields";
    if (customFieldsSection?.parentElement) {
        customFieldsSection.parentElement.insertBefore(configuredFieldsContainer, customFieldsSection);
    }

    if (extractedTags.length > 0) {
        tagsInput.value = extractedTags.join(", ");
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

        inputElement.dataset.fieldName = field.name;

        if (inputElement instanceof HTMLInputElement && inputElement.type !== "checkbox") {
            inputElement.placeholder = field.placeholder || "";
        }
        if (inputElement instanceof HTMLTextAreaElement) {
            inputElement.placeholder = field.placeholder || "";
        }

        if (field.required && !(inputElement instanceof HTMLInputElement && inputElement.type === "checkbox")) {
            inputElement.required = true;
        }

        const setInitial = (value: unknown) => {
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
            let finalValue: unknown;
            if (inputElement instanceof HTMLInputElement) {
                if (inputElement.type === "checkbox") {
                    finalValue = inputElement.checked;
                } else if (type === "number") {
                    finalValue = inputElement.value ? Number(inputElement.value) : 0;
                } else if (type === "array") {
                    finalValue = inputElement.value
                        ? inputElement.value.split(",").map(v => v.trim()).filter(v => v.length > 0)
                        : [];
                } else {
                    finalValue = inputElement.value;
                }
            } else if (type === "array") {
                finalValue = inputElement.value
                    ? inputElement.value.split(",").map(v => v.trim()).filter(v => v.length > 0)
                    : [];
            } else {
                finalValue = inputElement.value;
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

    const addCustomField = (initial?: {
        name?: string;
        label?: string;
        placeholder?: string;
        value?: unknown;
        defaultValue?: unknown;
        type?: CustomField["type"];
        required?: boolean;
        locked?: boolean;
    }) => {
        const options = initial || {};
        const fieldWrapper = document.createElement("div");
        fieldWrapper.className = "astro-custom-field";
        fieldWrapper.style.marginBottom = "12px";

        const labelRow = document.createElement("div");
        labelRow.className = "astro-custom-field__label";
        labelRow.textContent = options.label || options.name || plugin.i18n.fieldName;
        if (options.required) {
            labelRow.textContent += " *";
        }

        const fieldContainer = document.createElement("div");
        fieldContainer.className = "fn__flex fn__flex-wrap";
        fieldContainer.style.gap = "8px";

        const nameInput = document.createElement("input");
        nameInput.className = "b3-text-field";
        nameInput.placeholder = plugin.i18n.fieldName;
        nameInput.style.width = "140px";
        nameInput.value = options.name || "";
        nameInput.dataset.oldName = options.name || "";
        if (options.locked) {
            nameInput.readOnly = true;
            nameInput.classList.add("is-readonly");
            nameInput.title = plugin.i18n.lockedFieldHint || "Field name is locked";
        }

        const valueInput = document.createElement("input");
        valueInput.className = "b3-text-field fn__flex-1";
        valueInput.placeholder = options.placeholder || plugin.i18n.fieldValue;

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

            let rawValue: unknown = valueInput.value;
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

        const initialValue = options.value !== undefined ? options.value : options.defaultValue;
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

    const updatePreview = () => {
        const metadata: PublishMetadata = {
            title: titleInput.value || plugin.getDocumentTitle(editor) || "Untitled",
            description: descriptionInput.value || "",
            publishDate: new Date().toISOString(),
            tags: tagsInput.value.split(",").map(tag => tag.trim()).filter(tag => tag),
            category: categorySelect.value || "",
            draft: draftInput.checked,
            customFields
        };

        const preview = generateFrontmatter(plugin.astroConfig, metadata);
        yamlPreview.value = preview;
    };

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
    if (Array.isArray(plugin.astroConfig.customFields)) {
        plugin.astroConfig.customFields.forEach(field => {
            if (!field?.name) {
                return;
            }
            addConfiguredField(field, false);
            addedFieldNames.add(field.name);
        });
    }

    const builtinPlaceholders = new Set(["title", "description", "date", "publishDate", "pubDate", "tags", "category", "draft"]);
    const placeholderRegex = /\{([a-zA-Z0-9_]+)\}/g;
    const currentTemplate = plugin.astroConfig.yamlTemplate || "";
    let placeholderMatch: RegExpExecArray | null;
    while ((placeholderMatch = placeholderRegex.exec(currentTemplate)) !== null) {
        const key = placeholderMatch[1];
        if (!builtinPlaceholders.has(key) && !addedFieldNames.has(key)) {
            addConfiguredField({ name: key, label: key, type: "string", required: false }, true);
            addedFieldNames.add(key);
        }
    }

    plugin.loadCategories()
        .then(() => {
            plugin.populateCategorySelect(categorySelect);
        })
        .catch(error => {
            console.error("Failed to load categories:", error);
        });

    updatePreview();

    cancelBtn.addEventListener("click", () => {
        dialog.destroy();
    });

    testBtn.addEventListener("click", async () => {
        await plugin.testGitHubConnection(testBtn);
    });

    publishBtn.addEventListener("click", async () => {
        publishBtn.textContent = plugin.i18n.publishing;
        publishBtn.disabled = true;

        try {
            const metadata: PublishMetadata = {
                title: titleInput.value || plugin.getDocumentTitle(editor) || "Untitled",
                description: descriptionInput.value || "",
                publishDate: new Date().toISOString(),
                tags: tagsInput.value.split(",").map(tag => tag.trim()).filter(tag => tag),
                category: categorySelect.value || "",
                draft: draftInput.checked,
                customFields
            };

            const validationErrors: string[] = [];

            if (!metadata.category || metadata.category.trim() === "") {
                validationErrors.push("分类不能为空");
            }

            if (Array.isArray(plugin.astroConfig.customFields)) {
                for (const field of plugin.astroConfig.customFields) {
                    if (field.required) {
                        const value = customFields[field.name];
                        if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
                            const fieldLabel = field.label || field.name;
                            validationErrors.push(`"${fieldLabel}" 不能为空`);
                        }
                    }
                }
            }

            if (validationErrors.length > 0) {
                throw new Error(validationErrors.join("\n"));
            }

            const normalized = normalizeMetadata(metadata);
            const filePath = await plugin.publishToGitHub(editor.protyle.block.rootID, normalized);
            plugin.recordPublishStats(editor, normalized, filePath);
            showMessage(plugin.i18n.publishSuccess);
            dialog.destroy();
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            showMessage(plugin.i18n.publishFailed.replace("${error}", message));
            publishBtn.textContent = plugin.i18n.publishToAstro;
            publishBtn.disabled = false;
        }
    });
}
