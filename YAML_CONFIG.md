# YAML 配置功能说明

## 功能概述

YAML 配置功能允许你自定义 Astro 博客文章的 frontmatter 格式，包括：

1. **自定义 YAML 模板** - 定义 frontmatter 的整体结构和格式
2. **动态字段替换** - 使用变量占位符自动填充内容
3. **自定义字段** - 在发布时添加额外的元数据字段
4. **实时预览** - 在发布前查看生成的 YAML 内容

## YAML 模板配置

### 默认模板

插件提供的默认 YAML 模板：

```yaml
---
title: "{title}"
description: "{description}"
publishDate: {date}
tags: {tags}
category: "{category}"
draft: {draft}
---
```

### 支持的变量

模板中可以使用以下变量占位符：

- `{title}` - 文章标题
- `{description}` - 文章描述
- `{date}` - 发布日期（ISO 格式）
- `{tags}` - 标签数组
- `{category}` - 文章分类
- `{draft}` - 草稿状态（true/false）

### 自定义模板示例

#### 基础博客模板
```yaml
---
title: "{title}"
description: "{description}"
publishDate: {date}
tags: {tags}
category: "{category}"
draft: {draft}
author: "Your Name"
layout: "../../layouts/BlogPost.astro"
---
```

#### 技术博客模板
```yaml
---
title: "{title}"
description: "{description}"
publishDate: {date}
updatedDate: {date}
tags: {tags}
category: "{category}"
draft: {draft}
author: "Your Name"
heroImage: "/images/default-hero.jpg"
difficulty: "beginner"
readingTime: "5 min"
---
```

#### 多语言博客模板
```yaml
---
title: "{title}"
description: "{description}"
publishDate: {date}
tags: {tags}
category: "{category}"
draft: {draft}
lang: "zh-CN"
locale: "zh"
translationKey: "post-{date}"
---
```

## 自定义字段

### 字段类型

支持以下字段类型：

1. **String（字符串）** - 文本内容
2. **Number（数字）** - 数值
3. **Boolean（布尔值）** - true/false
4. **Array（数组）** - 逗号分隔的列表

### 使用方法

1. 在发布对话框中点击"添加自定义字段"
2. 输入字段名称（如：`author`）
3. 输入字段值（如：`张三`）
4. 选择字段类型
5. 查看右侧的 YAML 预览

### 自定义字段示例

#### 作者信息
- 字段名：`author`
- 字段值：`张三`
- 类型：`String`
- 结果：`author: "张三"`

#### 阅读时间
- 字段名：`readingTime`
- 字段值：`5`
- 类型：`Number`
- 结果：`readingTime: 5`

#### 是否置顶
- 字段名：`pinned`
- 字段值：`true`
- 类型：`Boolean`
- 结果：`pinned: true`

#### 相关标签
- 字段名：`relatedTags`
- 字段值：`前端, React, TypeScript`
- 类型：`Array`
- 结果：`relatedTags: ["前端", "React", "TypeScript"]`

## 配置步骤

### 1. 设置 YAML 模板

1. 打开思源笔记设置
2. 找到 "Publish to Astro Blog" 插件设置
3. 在 "YAML 模板" 区域编辑模板
4. 使用变量占位符 `{title}`, `{description}` 等
5. 点击"重置为默认模板"可恢复默认设置
6. 保存设置

### 2. 发布时配置

1. 打开发布对话框
2. 填写基本信息（标题、描述、标签等）
3. 添加自定义字段：
   - 点击"添加自定义字段"
   - 输入字段名和值
   - 选择合适的类型
4. 查看 YAML 预览确认格式
5. 点击发布

## 高级用法

### 条件字段

可以在模板中添加条件字段，只有在自定义字段中提供时才会出现：

```yaml
---
title: "{title}"
description: "{description}"
publishDate: {date}
tags: {tags}
category: "{category}"
draft: {draft}
# 以下字段只有在自定义字段中添加时才会出现
# author: "作者名"
# heroImage: "/path/to/image.jpg"
# difficulty: "beginner"
---
```

### 嵌套对象

对于复杂的元数据结构，可以使用自定义字段创建嵌套对象：

```yaml
---
title: "{title}"
description: "{description}"
publishDate: {date}
tags: {tags}
category: "{category}"
draft: {draft}
seo:
  title: "SEO 标题"
  description: "SEO 描述"
  keywords: ["关键词1", "关键词2"]
---
```

### 多作者支持

```yaml
---
title: "{title}"
description: "{description}"
publishDate: {date}
tags: {tags}
category: "{category}"
draft: {draft}
authors:
  - name: "作者1"
    avatar: "/avatars/author1.jpg"
  - name: "作者2"
    avatar: "/avatars/author2.jpg"
---
```

## 常见问题

### Q: 如何在模板中添加固定值？

A: 直接在模板中写入固定内容，不使用变量占位符：

```yaml
---
title: "{title}"
description: "{description}"
publishDate: {date}
author: "固定作者名"
layout: "../../layouts/BlogPost.astro"
---
```

### Q: 自定义字段会覆盖模板中的字段吗？

A: 是的，如果自定义字段与模板中的字段同名，自定义字段会被添加到 frontmatter 中。

### Q: 如何处理特殊字符？

A: 插件会自动处理 YAML 特殊字符的转义，包括引号、冒号等。

### Q: 可以保存自定义字段模板吗？

A: 目前自定义字段需要每次手动添加，未来版本可能会支持保存常用字段模板。

### Q: 如何验证 YAML 格式？

A: 使用发布对话框中的 YAML 预览功能，可以实时查看生成的 YAML 格式是否正确。

## 最佳实践

1. **保持模板简洁** - 只包含必要的字段
2. **使用描述性字段名** - 便于理解和维护
3. **统一命名规范** - 使用 camelCase 或 snake_case
4. **测试模板** - 发布前检查 YAML 预览
5. **备份模板** - 保存自定义模板到外部文件

## 示例配置

### 个人博客配置

```yaml
---
title: "{title}"
description: "{description}"
publishDate: {date}
tags: {tags}
category: "{category}"
draft: {draft}
author: "你的名字"
layout: "../../layouts/BlogPost.astro"
heroImage: "/images/blog-placeholder.jpg"
---
```

### 技术文档配置

```yaml
---
title: "{title}"
description: "{description}"
publishDate: {date}
updatedDate: {date}
tags: {tags}
category: "{category}"
draft: {draft}
type: "documentation"
difficulty: "intermediate"
prerequisites: []
relatedDocs: []
---
```

### 多语言站点配置

```yaml
---
title: "{title}"
description: "{description}"
publishDate: {date}
tags: {tags}
category: "{category}"
draft: {draft}
lang: "zh-CN"
locale: "zh"
dir: "ltr"
translationKey: "post-{title}"
---
```
