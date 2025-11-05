# 使用指南

## 快速开始

### 1. 安装插件

1. 将插件文件夹复制到思源笔记的插件目录：`{workspace}/data/plugins/plublic_astro`
2. 重启思源笔记或在设置中重新加载插件
3. 在插件市场中启用 "Publish to Astro Blog" 插件

### 2. 配置 GitHub

#### 创建 Personal Access Token

1. 登录 GitHub，进入 Settings > Developer settings > Personal access tokens
2. 点击 "Generate new token (classic)"
3. 设置 token 名称，如 "SiYuan Astro Publisher"
4. 选择过期时间（建议选择较长时间或无过期）
5. 勾选以下权限：
   - `repo` (完整的仓库访问权限)
6. 点击 "Generate token" 并保存生成的 token

#### 配置插件

1. 在思源笔记中打开设置 (Ctrl/Cmd + ,)
2. 找到 "Publish to Astro Blog" 插件设置
3. 填写以下信息：
   - **GitHub Token**: 刚才创建的 Personal Access Token
   - **GitHub Owner**: 你的 GitHub 用户名
   - **GitHub Repository**: Astro 博客的仓库名
   - **Astro Content Path**: 内容文件路径（默认：`src/content/posts`）
4. 点击保存

### 3. 发布文章

#### 方法一：使用顶栏按钮

1. 在思源笔记中打开要发布的文档
2. 点击顶栏的 Astro 图标（🚀）
3. 在弹出的对话框中填写文章信息
4. 点击"发布到 Astro 博客"

#### 方法二：使用快捷键

1. 在思源笔记中打开要发布的文档
2. 按下 `Shift + Cmd + P` (Mac) 或 `Shift + Ctrl + P` (Windows/Linux)
3. 在弹出的对话框中填写文章信息
4. 点击"发布到 Astro 博客"

#### 方法三：使用右键菜单

1. 在思源笔记中打开要发布的文档
2. 点击顶栏的插件图标，选择"发布到 Astro 博客"
3. 在弹出的对话框中填写文章信息
4. 点击"发布到 Astro 博客"

## 发布选项说明

### 文章元数据

- **标题**: 文章标题，默认使用文档标题
- **描述**: 文章描述，用于 SEO 和摘要
- **标签**: 文章标签，用逗号分隔多个标签
- **分类**: 文章分类
- **草稿**: 是否标记为草稿状态

### 生成的文件格式

插件会自动生成符合 Astro 标准的 Markdown 文件：

```markdown
---
title: "文章标题"
description: "文章描述"
publishDate: 2024-01-01T00:00:00.000Z
tags: ["标签1", "标签2"]
category: "分类"
draft: false
---

# 文章内容

这里是从思源笔记导出的 Markdown 内容...
```

### 文件命名规则

生成的文件名格式为：`YYYY-MM-DD-标题.md`

例如：`2024-01-01-我的第一篇博客.md`

## 常见问题

### Q: 发布失败，提示权限错误

A: 检查以下几点：
1. GitHub Token 是否正确
2. Token 是否有 `repo` 权限
3. 仓库名和用户名是否正确
4. 仓库是否存在且可访问

### Q: 发布成功但文件没有出现在仓库中

A: 检查以下几点：
1. 内容路径是否正确（默认：`src/content/posts`）
2. 仓库的默认分支是否为 `main`
3. 检查 GitHub 仓库的 Actions 是否有错误

### Q: 中文标题生成的文件名有问题

A: 插件会自动处理中文标题，将其转换为合适的文件名格式。如果有问题，可以手动修改标题字段。

### Q: 如何更新已发布的文章

A: 插件会自动检测同名文件，如果文件已存在，会更新现有文件而不是创建新文件。

### Q: 支持哪些 Markdown 格式

A: 插件使用思源笔记的导出功能，支持所有思源笔记支持的 Markdown 格式，包括：
- 标题、段落、列表
- 代码块、引用
- 表格、链接、图片
- 数学公式（如果 Astro 配置支持）

## 高级配置

### 自定义内容路径

如果你的 Astro 博客使用不同的内容结构，可以修改"Astro Content Path"设置：

- 默认：`src/content/posts`
- 其他示例：
  - `content/blog`
  - `src/pages/blog`
  - `posts`

### 批量发布

目前插件不支持批量发布，需要逐个文档进行发布。未来版本可能会添加此功能。

### 自动化发布

可以结合 GitHub Actions 实现自动化部署：

1. 插件发布文章到 GitHub 仓库
2. GitHub Actions 自动构建和部署 Astro 站点
3. 文章自动出现在博客上

## 故障排除

### 启用调试模式

1. 打开浏览器开发者工具 (F12)
2. 查看 Console 标签页
3. 重现问题并查看错误信息

### 常见错误代码

- `401 Unauthorized`: Token 无效或过期
- `403 Forbidden`: 权限不足
- `404 Not Found`: 仓库或路径不存在
- `422 Unprocessable Entity`: 请求格式错误

### 重置配置

如果配置出现问题，可以：

1. 打开插件设置
2. 清空所有配置字段
3. 重新填写正确的配置信息
4. 保存设置

## 技术支持

如果遇到问题，可以：

1. 查看插件的 GitHub 仓库 Issues
2. 提交新的 Issue 描述问题
3. 在思源笔记社区寻求帮助

## 更新日志

### v1.0.0
- 初始版本发布
- 支持基本的文章发布功能
- 支持 GitHub API 集成
- 支持 Astro frontmatter 格式
