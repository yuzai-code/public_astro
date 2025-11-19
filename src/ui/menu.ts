import { Menu, openTab, platformUtils } from "siyuan";
import type PluginSample from "../index";
import { STORAGE_NAME, TAB_TYPE } from "../constants";

export function openPluginMenu(plugin: PluginSample, rect?: DOMRect): void {
    const menu = new Menu("topBarSample", () => {
        console.log(plugin.translate("byeMenu", "再见，菜单！"));
    });
    const publishLabel = plugin.translate("publishToAstro", "发布到 Astro");
    const momentLabel = plugin.translate("publishMoment", "发布到 Moments");
    const albumLabel = plugin.translate("publishAlbum", "发布相册");
    const statsLabel = plugin.translate("publishStats", "发布统计");
    menu.addItem({
        icon: "iconAstro",
        label: publishLabel,
        accelerator: "⇧⌘P",
        click: () => {
            setTimeout(() => {
                plugin.showPublishDialog();
            }, 50);
        }
    });
    menu.addItem({
        icon: "iconFace",
        label: momentLabel,
        click: () => {
            setTimeout(() => {
                plugin.showMomentDialog();
            }, 50);
        }
    });
    menu.addItem({
        icon: "iconImage",
        label: albumLabel,
        click: () => {
            setTimeout(() => {
                plugin.showAlbumDialog();
            }, 50);
        }
    });
    menu.addItem({
        icon: "iconSparkles",
        label: statsLabel,
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
