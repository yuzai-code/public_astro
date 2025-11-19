import { Dialog, openTab, showMessage, confirm } from "siyuan";
import type { PublishStat } from "../types";
import type PluginSample from "../index";
import { formatDateTime } from "../utils/metadata";
import { ASTRO_STATS_NAME } from "../constants";

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function summarize(text: string, limit = 140): string {
    const cleaned = text.replace(/\s+/g, " ").trim();
    if (!cleaned) {
        return "";
    }
    return cleaned.length > limit ? `${cleaned.slice(0, limit)}…` : cleaned;
}

export function openPublishStatsDialog(plugin: PluginSample): void {
    const t = (key: string, fallback: string) => plugin.translate(key, fallback);

    const stats: PublishStat[] = Object.keys(plugin.publishStats).map(docId => {
        const stat = plugin.publishStats[docId];
        return {
            ...stat,
            tags: stat.tags || [],
            description: stat.description || "",
            draft: Boolean(stat.draft),
            filePath: stat.filePath || ""
        };
    });

    const sortedStats = stats.sort((a, b) => (b.lastPublishedAt || "").localeCompare(a.lastPublishedAt || ""));

    const quickLabel = t("quickPublish", "快速发布");
    const draftBadgeLabel = t("draft", "草稿");
    const emptyLabel = t("noStats", "暂无发布记录");
    const openLabel = t("openDocument", "打开文档");
    const copyLabel = t("copyTitle", "复制标题");
    const removeLabel = t("removeRecord", "移除发布");
    const postsTabLabel = t("statsPostsTab", "文章");
    const momentsTabLabel = t("statsMomentsTab", "朋友圈");
    const albumsTabLabel = t("statsAlbumsTab", "相册");
    const storageLabel = t("storagePathLabel", "存储路径");
    const addMomentLabel = t("addMoment", "新增朋友圈");
    const addAlbumLabel = t("addAlbum", "新增相册");
    const editMomentLabel = t("editMoment", "编辑朋友圈");
    const editAlbumLabel = t("editAlbum", "编辑相册");
    const copyPathLabel = t("copyPath", "复制路径");
    const pathCopiedLabel = t("pathCopied", "路径已复制");
    const momentsEmptyLabel = t("momentsEmpty", "还没有发布的朋友圈");
    const albumsEmptyLabel = t("albumsEmpty", "还没有发布的相册");

    const rowsHtml = sortedStats.length > 0
        ? sortedStats.map((stat, index) => {
            const searchTokens = [stat.title, stat.category, stat.description, stat.docId, ...(stat.tags || [])]
                .join(" ")
                .toLowerCase();
            const tagsHtml = (stat.tags || []).map(tag => `<span class="astro-stats__tag">${tag}</span>`).join("");
            const categoryBadge = stat.category ? `<span class="astro-stats__badge">${stat.category}</span>` : "";
            const quickDisabled = stat.lastMetadata ? "" : "disabled";
            const draftBadge = stat.draft ? `<span class="astro-stats__badge astro-stats__badge--draft">${draftBadgeLabel}</span>` : "";

            return `<tr data-search="${searchTokens}" data-draft="${stat.draft ? "1" : "0"}">
                <td class="astro-stats__index">${index + 1}</td>
                <td>
                    <div class="astro-stats__title">
                        <div class="astro-stats__title-text">${stat.title}${draftBadge}</div>
                        <div class="astro-stats__meta">
                            ${categoryBadge}
                            ${tagsHtml}
                        </div>
                        <div class="astro-stats__doc-id">${stat.docId}</div>
                    </div>
                </td>
                <td class="astro-stats__description">${stat.description || "-"}</td>
                <td>${formatDateTime(stat.lastPublishedAt)}</td>
                <td class="astro-stats__count">${stat.publishCount}</td>
                <td class="astro-stats__actions">
                    <button class="b3-button b3-button--outline b3-button--small" data-action="quick" data-doc-id="${stat.docId}" title="${quickLabel}" ${quickDisabled}>⚡</button>
                    <button class="b3-button b3-button--outline b3-button--small" data-action="open" data-doc-id="${stat.docId}" title="${openLabel}">📄</button>
                    <button class="b3-button b3-button--outline b3-button--small" data-action="copy" data-doc-id="${stat.docId}" data-title="${stat.title}" title="${copyLabel}">📋</button>
                    <button class="b3-button b3-button--cancel b3-button--small" data-action="remove" data-doc-id="${stat.docId}" data-file-path="${stat.filePath}" title="${removeLabel}">🗑️</button>
                </td>
            </tr>`;
        }).join("")
        : `<tr><td colspan="6" class="astro-stats__empty">${emptyLabel}</td></tr>`;

    const dialog = new Dialog({
        title: `📈 ${t("publishStats", "发布统计")}`,
        content: `<div class="b3-dialog__content astro-stats">
    <div class="astro-stats__tabs">
        <button class="astro-stats__tab is-active" data-target="posts">${postsTabLabel}</button>
        <button class="astro-stats__tab" data-target="moments">${momentsTabLabel}</button>
        <button class="astro-stats__tab" data-target="albums">${albumsTabLabel}</button>
    </div>
    <section class="astro-stats__panel is-active" data-panel="posts">
        <div class="astro-stats__header">
            <input id="astroStatsSearch" class="b3-text-field astro-stats__search" type="search" placeholder="${t("searchPlaceholder", "搜索标题、分类或标签")}" />
            <label class="astro-stats__checkbox">
                <input type="checkbox" id="astroStatsDraftOnly" />
                <span>${t("draftOnly", "仅草稿")}</span>
            </label>
            <div class="astro-stats__summary" id="astroStatsSummary"></div>
        </div>
        <div class="astro-stats__table-wrapper">
            <table class="astro-stats__table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>${t("documentTitle", "文档标题")}</th>
                        <th>${t("description", "描述")}</th>
                        <th>${t("lastPublishedAt", "最后发布时间")}</th>
                        <th>${t("publishCountLabel", "发布次数")}</th>
                        <th>${t("actions", "操作")}</th>
                    </tr>
                </thead>
                <tbody id="astroStatsBody">
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
    </section>
    <section class="astro-stats__panel" data-panel="moments" hidden>
        <div id="astroMomentsPanel" class="astro-collection"></div>
    </section>
    <section class="astro-stats__panel" data-panel="albums" hidden>
        <div id="astroAlbumsPanel" class="astro-collection"></div>
    </section>
</div>
<div class="b3-dialog__action">
    <button class="b3-button b3-button--cancel">${t("close", "关闭")}</button>
</div>`,
        width: plugin.isMobile ? "96vw" : "860px",
        height: plugin.isMobile ? "82vh" : "600px"
    });

    const closeBtn = dialog.element.querySelector(".b3-button--cancel") as HTMLButtonElement;
    closeBtn.addEventListener("click", () => dialog.destroy());

    const postsPanel = dialog.element.querySelector('[data-panel="posts"]') as HTMLElement;
    const summaryElement = postsPanel.querySelector("#astroStatsSummary") as HTMLElement;
    const searchInput = postsPanel.querySelector("#astroStatsSearch") as HTMLInputElement;
    const draftCheckbox = postsPanel.querySelector("#astroStatsDraftOnly") as HTMLInputElement;
    const tbody = postsPanel.querySelector("#astroStatsBody") as HTMLTableSectionElement;
    const rows = Array.from(tbody.querySelectorAll<HTMLTableRowElement>("tr"));

    const updateSummary = (visible: number) => {
        const total = Object.keys(plugin.publishStats).length;
        const summaryTpl = t("statsSummary", "共 ${total} 篇文章，显示 ${visible} 篇");
        summaryElement.textContent = summaryTpl
            .replace("${total}", total.toString())
            .replace("${visible}", visible.toString());
    };

    const filterRows = () => {
        const keyword = (searchInput.value || "").trim().toLowerCase();
        const draftOnly = draftCheckbox.checked;
        let visibleCount = 0;

        rows.forEach((row) => {
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
                    indexCell.textContent = visibleCount.toString();
                }
            }
        });

        updateSummary(visibleCount);
    };

    updateSummary(sortedStats.length);
    searchInput.addEventListener("input", filterRows);
    draftCheckbox.addEventListener("change", filterRows);

    const table = postsPanel.querySelector(".astro-stats__table") as HTMLTableElement;
    if (table) {
        table.addEventListener("click", event => {
            const target = event.target as HTMLElement;
            const action = target.dataset.action;
            const docId = target.dataset.docId;
            if (!action || !docId) {
                return;
            }

            const stat = plugin.publishStats[docId];
            if (!stat) {
                showMessage("记录不存在", 3000, "error");
                return;
            }

            if (action === "open") {
                openTab({
                    app: plugin.app,
                    doc: { id: docId }
                });
                dialog.destroy();
            } else if (action === "copy") {
                const title = target.dataset.title || stat.title;
                navigator.clipboard?.writeText(title).then(() => {
                    showMessage(t("titleCopied", "标题已复制"));
                }).catch(() => {
                    showMessage(t("copyFailed", "复制失败"), 3000, "error");
                });
            } else if (action === "remove") {
                const filePath = target.dataset.filePath || stat.filePath;
                if (!filePath) {
                    showMessage(plugin.translate("missingFilePath", "未找到发布文件路径"), 4000, "error");
                    return;
                }
                const confirmMessage = plugin.translate("confirmDeletePost", "确认删除已发布的文章并移除记录？");
                confirm("⚠️", confirmMessage, () => {
                    (async () => {
                        try {
                            await plugin.deletePublishedFile(filePath);
                            delete plugin.publishStats[docId];
                            plugin.saveData(ASTRO_STATS_NAME, plugin.publishStats);
                            const row = target.closest("tr");
                            if (row) {
                                const index = rows.indexOf(row as HTMLTableRowElement);
                                if (index >= 0) {
                                    rows.splice(index, 1);
                                }
                                row.remove();
                            }
                            filterRows();
                            showMessage(plugin.translate("deletePostSuccess", "已删除发布内容"));
                        } catch (error) {
                            const message = error instanceof Error ? error.message : String(error);
                            showMessage(plugin.translate("deletePostFailed", `删除发布内容失败：${message}`), 4000, "error");
                        }
                    })();
                });
            } else if (action === "quick") {
                const button = target as HTMLButtonElement;
                plugin.quickPublish(stat, button).catch(error => {
                    console.error("Quick publish failed:", error);
                });
            }
        });
    }

    const tabs = dialog.element.querySelectorAll<HTMLButtonElement>(".astro-stats__tab");
    const panels = dialog.element.querySelectorAll<HTMLElement>(".astro-stats__panel");

    const setActivePanel = (targetName: string) => {
        tabs.forEach(btn => {
            const isActive = btn.dataset.target === targetName;
            btn.classList.toggle("is-active", isActive);
        });
        panels.forEach(panel => {
            const isActive = panel.dataset.panel === targetName;
            panel.classList.toggle("is-active", isActive);
            if (isActive) {
                panel.removeAttribute("hidden");
            } else {
                panel.setAttribute("hidden", "true");
            }
        });
    };

    tabs.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetName = btn.dataset.target || "posts";
            setActivePanel(targetName);
        });
    });

    const handleCopyPath = (path?: string) => {
        if (!path) {
            showMessage(plugin.translate("missingFilePath", "未找到发布文件路径"), 4000, "error");
            return;
        }
        navigator.clipboard?.writeText(path).then(() => {
            showMessage(pathCopiedLabel);
        }).catch(() => {
            showMessage(t("copyFailed", "复制失败"), 3000, "error");
        });
    };

    const momentsContainer = dialog.element.querySelector("#astroMomentsPanel") as HTMLElement;
    const albumsContainer = dialog.element.querySelector("#astroAlbumsPanel") as HTMLElement;

    const renderMomentsPanel = () => {
        if (!momentsContainer) {
            return;
        }
        const records = Object.values(plugin.momentRecords || {}).sort((a, b) =>
            (b.lastPublishedAt || b.createdAt).localeCompare(a.lastPublishedAt || a.createdAt)
        );
        const basePath = plugin.astroConfig.momentsPath || "src/content/moments";
        const countLabel = t("momentsCountLabel", "共 ${count} 条动态").replace("${count}", records.length.toString());
        const cardsHtml = records.length > 0
            ? records.map(record => {
                const tagsHtml = (record.tags || []).map(tag => `<span class="astro-collection__tag">${escapeHtml(tag)}</span>`).join("");
                const locationLine = record.metadata.location
                    ? `<span>${t("momentLocation", "位置")}: ${escapeHtml(record.metadata.location)}</span>`
                    : "";
                const moodLine = record.metadata.mood ? `<span>${escapeHtml(record.metadata.mood)}</span>` : "";
                const imageCountLabel = t("momentImageCount", "${count} 张图片").replace("${count}", record.imageCount.toString());
                const preview = summarize(record.metadata.content || record.slug);
                return `<article class="astro-collection__card" data-slug="${record.slug}">
    <div class="astro-collection__card-header">
        <div>
            <div class="astro-collection__title">${escapeHtml(record.metadata.mood || record.metadata.location || record.slug)}</div>
            <div class="astro-collection__subtitle">${escapeHtml(record.filePath)}</div>
        </div>
        <div class="astro-collection__badges">
            <span>${imageCountLabel}</span>
            <span>${t("lastPublishedAt", "最后发布时间")}: ${formatDateTime(record.lastPublishedAt)}</span>
        </div>
    </div>
    <p class="astro-collection__content">${escapeHtml(preview)}</p>
    <div class="astro-collection__meta-row">
        <span>${t("momentCreatedAt", "创建时间")}: ${formatDateTime(record.createdAt)}</span>
        ${locationLine}
        ${moodLine}
    </div>
    <div class="astro-collection__tags">${tagsHtml}</div>
    <div class="astro-collection__actions">
        <button class="b3-button b3-button--outline b3-button--small" data-action="edit-moment" data-slug="${record.slug}">${editMomentLabel}</button>
        <button class="b3-button b3-button--outline b3-button--small" data-action="copy-moment-path" data-path="${record.filePath}">${copyPathLabel}</button>
    </div>
</article>`;
            }).join("")
            : `<div class="astro-collection__empty">${momentsEmptyLabel}</div>`;

        momentsContainer.innerHTML = `<div class="astro-collection__hint">
    <div>
        <div class="astro-collection__hint-label">${storageLabel}: <code>${escapeHtml(basePath)}</code></div>
        <div class="astro-collection__hint-count">${countLabel}</div>
    </div>
    <div class="astro-collection__actions">
        <button class="b3-button b3-button--outline b3-button--small" data-action="new-moment">${addMomentLabel}</button>
    </div>
</div>
<div class="astro-collection__list">${cardsHtml}</div>`;
    };

    const renderAlbumsPanel = () => {
        if (!albumsContainer) {
            return;
        }
        const records = Object.values(plugin.albumRecords || {}).sort((a, b) =>
            (b.lastPublishedAt || b.createdAt).localeCompare(a.lastPublishedAt || a.createdAt)
        );
        const basePath = plugin.astroConfig.albumsPath || "src/content/albums";
        const countLabel = t("albumsCountLabel", "共 ${count} 组相册").replace("${count}", records.length.toString());
        const cardsHtml = records.length > 0
            ? records.map(record => {
                const tagsHtml = (record.tags || []).map(tag => `<span class="astro-collection__tag">${escapeHtml(tag)}</span>`).join("");
                const photoLabel = t("albumPhotoCount", "${count} 张照片").replace("${count}", record.photoCount.toString());
                const coverUrl = record.cover || record.metadata.cover || "";
                const coverHtml = coverUrl
                    ? `<div class="astro-collection__cover"><img src="${escapeHtml(coverUrl)}" alt="${escapeHtml(record.metadata.title)}" loading="lazy" /></div>`
                    : "";
                const preview = summarize(record.metadata.description || record.metadata.title || record.slug);
                const locationLine = record.metadata.location
                    ? `<span>${t("albumLocation", "拍摄地点")}: ${escapeHtml(record.metadata.location)}</span>`
                    : "";
                return `<article class="astro-collection__card astro-collection__card--album" data-slug="${record.slug}">
    ${coverHtml}
    <div class="astro-collection__card-header">
        <div>
            <div class="astro-collection__title">${escapeHtml(record.metadata.title)}</div>
            <div class="astro-collection__subtitle">${escapeHtml(record.filePath)}</div>
        </div>
        <div class="astro-collection__badges">
            <span>${photoLabel}</span>
            <span>${t("lastPublishedAt", "最后发布时间")}: ${formatDateTime(record.lastPublishedAt)}</span>
        </div>
    </div>
    <p class="astro-collection__content">${escapeHtml(preview)}</p>
    <div class="astro-collection__meta-row">
        <span>${t("albumCreatedAt", "创建时间")}: ${formatDateTime(record.createdAt)}</span>
        ${locationLine}
    </div>
    <div class="astro-collection__tags">${tagsHtml}</div>
    <div class="astro-collection__actions">
        <button class="b3-button b3-button--outline b3-button--small" data-action="edit-album" data-slug="${record.slug}">${editAlbumLabel}</button>
        <button class="b3-button b3-button--outline b3-button--small" data-action="copy-album-path" data-path="${record.filePath}">${copyPathLabel}</button>
    </div>
</article>`;
            }).join("")
            : `<div class="astro-collection__empty">${albumsEmptyLabel}</div>`;

        albumsContainer.innerHTML = `<div class="astro-collection__hint">
    <div>
        <div class="astro-collection__hint-label">${storageLabel}: <code>${escapeHtml(basePath)}</code></div>
        <div class="astro-collection__hint-count">${countLabel}</div>
    </div>
    <div class="astro-collection__actions">
        <button class="b3-button b3-button--outline b3-button--small" data-action="new-album">${addAlbumLabel}</button>
    </div>
</div>
<div class="astro-collection__list">${cardsHtml}</div>`;
    };

    renderMomentsPanel();
    renderAlbumsPanel();

    if (momentsContainer) {
        momentsContainer.addEventListener("click", event => {
            const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-action]");
            if (!button) {
                return;
            }
            const action = button.dataset.action;
            if (action === "new-moment") {
                plugin.showMomentDialog(undefined, () => {
                    renderMomentsPanel();
                    setActivePanel("moments");
                });
            } else if (action === "edit-moment") {
                const slug = button.dataset.slug || "";
                const record = plugin.momentRecords[slug];
                if (!record) {
                    showMessage(t("momentConfigRequired", "请先配置 GitHub 信息"), 3000, "error");
                    return;
                }
                plugin.showMomentDialog(record, () => {
                    renderMomentsPanel();
                });
            } else if (action === "copy-moment-path") {
                handleCopyPath(button.dataset.path);
            }
        });
    }

    if (albumsContainer) {
        albumsContainer.addEventListener("click", event => {
            const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-action]");
            if (!button) {
                return;
            }
            const action = button.dataset.action;
            if (action === "new-album") {
                plugin.showAlbumDialog(undefined, () => {
                    renderAlbumsPanel();
                    setActivePanel("albums");
                });
            } else if (action === "edit-album") {
                const slug = button.dataset.slug || "";
                const record = plugin.albumRecords[slug];
                if (!record) {
                    showMessage(t("albumConfigRequired", t("configRequired", "请先配置 GitHub 信息")), 3000, "error");
                    return;
                }
                plugin.showAlbumDialog(record, () => {
                    renderAlbumsPanel();
                });
            } else if (action === "copy-album-path") {
                handleCopyPath(button.dataset.path);
            }
        });
    }

    setActivePanel("posts");
}
