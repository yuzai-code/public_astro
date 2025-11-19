import { confirm, showMessage, getFrontend, getBackend } from "siyuan";
import { STORAGE_NAME, ASTRO_CONFIG_NAME, ASTRO_STATS_NAME } from "../constants";
import { createDefaultAstroConfig } from "../utils/metadata";
import type PluginSample from "../index";

export function handleLayoutReady(plugin: PluginSample): void {
    const t = (key: string, fallback: string) => plugin.translate(key, fallback);

    const topBarElement = plugin.addTopBar({
        icon: "iconFace",
        title: plugin.translate("addTopBarIcon", "发布"),
        position: "right",
        callback: () => {
            if (plugin.isMobile) {
                plugin.addMenu();
            } else {
                let rect = topBarElement.getBoundingClientRect();
                if (rect.width === 0) {
                    rect = document.querySelector("#barMore")?.getBoundingClientRect() || rect;
                }
                if (rect.width === 0) {
                    rect = document.querySelector("#barPlugins")?.getBoundingClientRect() || rect;
                }
                plugin.addMenu(rect);
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
        confirm("⚠️", t("confirmRemove", "确认删除 ${name} 中的数据？").replace("${name}", plugin.name), () => {
            plugin.removeData(STORAGE_NAME).then(() => {
                plugin.data[STORAGE_NAME] = {readonlyText: "Readonly"};
                showMessage(`[${plugin.name}]: ${t("removedData", "数据已删除")}`);
            });
        });
    });
    plugin.addStatusBar({
        element: statusIconTemp.content.firstElementChild as HTMLElement
    });

    plugin.loadData(STORAGE_NAME);
    plugin.loadData(ASTRO_CONFIG_NAME).then(config => {
        if (config) {
            plugin.astroConfig = {
                ...createDefaultAstroConfig(),
                ...config,
                customFields: Array.isArray(config.customFields) ? config.customFields : []
            };
        }
    });
    plugin.loadData(ASTRO_STATS_NAME).then(stats => {
        if (stats) {
            plugin.publishStats = stats;
        }
    });

    plugin.loadCategories()
        .catch(error => {
            console.error("Failed to load categories on layout ready:", error);
        });

    console.log(`frontend: ${getFrontend()}; backend: ${getBackend()}`);
}
