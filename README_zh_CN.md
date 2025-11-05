[English](https://github.com/siyuan-note/plugin-sample/blob/main/README.md)

# 思源笔记 Astro 发布插件

一个允许你直接将思源笔记发布到托管在 GitHub 上的 Astro 博客的插件。

## 功能特性

- 🚀 一键发布到 Astro 博客
- 📝 自动导出 Markdown 并生成 frontmatter
- 🏷️ 支持标签、分类和元数据
- 📅 自动处理日期
- 🔄 更新已存在的文章
- ⚙️ 简单的 GitHub 配置

## 设置

### 1. GitHub 配置

1. 创建 GitHub Personal Access Token：
   - 前往 GitHub 设置 > Developer settings > Personal access tokens
   - 生成一个具有 `repo` 权限的新 token
   
2. 配置插件：
   - 打开思源笔记设置
   - 导航到 Astro Publisher 插件设置
   - 填写你的 GitHub 信息：
     - **GitHub Token**: 你的个人访问令牌
     - **GitHub Owner**: 你的 GitHub 用户名
     - **GitHub Repository**: 你的 Astro 博客仓库名称
     - **Astro Content Path**: 内容目录路径（默认：`src/content/posts`）

### 2. 使用方法

1. 在思源笔记中打开任意文档
2. 点击顶栏的 Astro 图标或使用快捷键 `Shift+Cmd+P`
3. 填写发布元数据：
   - 标题（自动从文档标题填充）
   - 描述
   - 标签（逗号分隔）
   - 分类
   - 草稿状态
4. 点击"发布到 Astro 博客"

## 安装

### 从源码安装

1. 将此仓库克隆到你的思源插件目录：
   ```bash
   cd {workspace}/data/plugins/
   git clone <repository-url> plublic_astro
   ```

2. 安装依赖并构建：
   ```bash
   cd plublic_astro
   pnpm install
   pnpm run build
   ```

3. 在思源集市中启用插件

## 开发

### 构建插件

```bash
pnpm run dev    # 开发模式
pnpm run build  # 生产构建
```

### 文件结构

- `src/index.ts` - 主插件文件
- `i18n/` - 国际化文件
- `plugin.json` - 插件配置
- `README*.md` - 文档

## 配置说明

插件需要以下 GitHub 配置：

- **GitHub Token**: 具有仓库写入权限的 Personal Access Token
- **GitHub Owner**: 仓库所有者用户名
- **GitHub Repository**: Astro 博客仓库名称
- **Astro Content Path**: 内容文件存储路径

## 支持的 Frontmatter 格式

插件会自动生成符合 Astro 标准的 frontmatter：

```yaml
---
title: "文章标题"
description: "文章描述"
publishDate: 2024-01-01T00:00:00.000Z
tags: ["标签1", "标签2"]
category: "分类"
draft: false
---
```

## 故障排除

1. **发布失败**: 检查 GitHub Token 权限和仓库设置
2. **配置无效**: 确保所有必需字段都已填写
3. **文档未选择**: 确保在思源中打开了要发布的文档

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！