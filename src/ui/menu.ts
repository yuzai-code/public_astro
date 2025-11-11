import { Menu, openTab, platformUtils } from "siyuan";
import type PluginSample from "../index";
import { STORAGE_NAME, TAB_TYPE } from "../constants";

export function openPluginMenu(plugin: PluginSample, rect?: DOMRect): void {
    const menu = new Menu("topBarSample", () => {
        console.log(plugin.i18n.byeMenu);
    });
    menu.addItem({
        icon: "iconAstro",
        label: plugin.i18n.publishToAstro,
        accelerator: "⇧⌘P",
        click: () => {
            setTimeout(() => {
                plugin.showPublishDialog();
            }, 50);
        }
    });
    menu.addItem({
        icon: "iconSparkles",
        label: plugin.i18n.publishStats,
        click: () => {
            plugin.showPublishStats();
        }
    });
    if (plugin.isMobile) {
        menu.fullscreen();
    } else if (rect) {
        menu.open({
            x: rect.right,
            y: rect.bottom,
            isLeft: true
        });
    }
}
