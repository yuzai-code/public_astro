import { Dialog, openTab, showMessage, confirm } from "siyuan";
import type { PublishStat } from "../types";
import type PluginSample from "../index";
import { formatDateTime } from "../utils/metadata";
import { ASTRO_STATS_NAME } from "../constants";

export function openPublishStatsDialog(plugin: PluginSample): void {
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

    const quickLabel = plugin.translate("quickPublish", "快速发布");
    const draftBadgeLabel = plugin.translate("draft", "草稿");
    const emptyLabel = plugin.translate("noStats", "暂无发布记录");
    const openLabel = plugin.translate("openDocument", "打开文档");
    const copyLabel = plugin.translate("copyTitle", "复制标题");
    const removeLabel = plugin.translate("removeRecord", "移除发布");

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
                    <div class="astro-stats__title">${stat.title}${draftBadge}</div>
                    <div class="astro-stats__meta">
                        ${categoryBadge}
                        ${tagsHtml}
                    </div>
                    <div class="astro-stats__doc-id">${stat.docId}</div>
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
        title: `📈 ${plugin.i18n.publishStats}`,
        content: `<div class="b3-dialog__content astro-stats">
    <div class="astro-stats__header">
        <input id="astroStatsSearch" class="b3-text-field astro-stats__search" type="search" placeholder="${plugin.i18n.searchPlaceholder || "搜索标题、分类或标签"}" />
        <label class="astro-stats__checkbox">
            <input type="checkbox" id="astroStatsDraftOnly" />
            <span>${plugin.i18n.draftOnly || "仅草稿"}</span>
        </label>
        <div class="astro-stats__summary" id="astroStatsSummary"></div>
    </div>
    <div class="astro-stats__table-wrapper">
        <table class="astro-stats__table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>${plugin.i18n.documentTitle}</th>
                    <th>${plugin.i18n.description}</th>
                    <th>${plugin.i18n.lastPublishedAt || "最后发布时间"}</th>
                    <th>${plugin.i18n.publishCountLabel || "发布次数"}</th>
                    <th>${plugin.i18n.actions || "操作"}</th>
                </tr>
            </thead>
            <tbody id="astroStatsBody">
                ${rowsHtml}
            </tbody>
        </table>
    </div>
</div>
<div class="b3-dialog__action">
    <button class="b3-button b3-button--cancel">${plugin.i18n.close || "关闭"}</button>
</div>`,
        width: plugin.isMobile ? "96vw" : "820px",
        height: plugin.isMobile ? "82vh" : "560px"
    });

    const closeBtn = dialog.element.querySelector(".b3-button--cancel") as HTMLButtonElement;
    closeBtn.addEventListener("click", () => dialog.destroy());

    const summaryElement = dialog.element.querySelector("#astroStatsSummary") as HTMLElement;
    const searchInput = dialog.element.querySelector("#astroStatsSearch") as HTMLInputElement;
    const draftCheckbox = dialog.element.querySelector("#astroStatsDraftOnly") as HTMLInputElement;
    const tbody = dialog.element.querySelector("#astroStatsBody") as HTMLTableSectionElement;
    const rows = Array.from(tbody.querySelectorAll<HTMLTableRowElement>("tr"));

    const updateSummary = (visible: number) => {
        const total = Object.keys(plugin.publishStats).length;
        const summaryTpl = plugin.i18n.statsSummary || "共 ${total} 篇文章，显示 ${visible} 篇";
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
                    indexCell.textContent = visibleCount.toString();
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
                    showMessage(plugin.i18n.titleCopied || "标题已复制");
                }).catch(() => {
                    showMessage(plugin.i18n.copyFailed || "复制失败", 3000, "error");
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
                plugin.quickPublish(stat, target as HTMLButtonElement);
            }
        });
    }

    filterRows();
}
