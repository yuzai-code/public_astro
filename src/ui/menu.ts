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
    menu.addSeparator();
    menu.addItem({
        icon: "iconInfo",
        label: "Dialog(open doc first)",
        accelerator: plugin.commands[0]?.customHotkey,
        click: () => {
            plugin.showDialog();
        }
    });
    if (!plugin.isMobile) {
        menu.addItem({
            icon: "iconFace",
            label: "Open Custom Tab",
            click: () => {
                const tab = openTab({
                    app: plugin.app,
                    custom: {
                        icon: "iconFace",
                        title: "Custom Tab",
                        data: {
                            text: platformUtils.isHuawei() ? "Hello, Huawei!" : "This is my custom tab"
                        },
                        id: plugin.name + TAB_TYPE
                    }
                });
                console.log(tab);
            }
        });
    }
        menu.addSeparator();
        menu.addItem({
            icon: "iconSparkles",
            label: plugin.data[STORAGE_NAME]?.readonlyText || "Readonly",
            type: "readonly"
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
