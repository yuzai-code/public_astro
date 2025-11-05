# 分类管理功能说明

## 功能概述

分类管理功能允许你直接在思源笔记插件中管理 Astro 博客的分类系统，包括：

1. **查看现有分类** - 从 GitHub 仓库加载并显示所有分类
2. **添加新分类** - 创建新的分类文件
3. **编辑分类** - 修改分类的标题和描述
4. **删除分类** - 移除不需要的分类
5. **发布时选择分类** - 在发布文章时从下拉菜单选择分类

## 配置要求

### 1. 分类目录配置

在插件设置中配置分类目录路径：
- **默认路径**: `src/content/categories`
- **自定义路径**: 根据你的 Astro 项目结构调整

### 2. GitHub 权限

确保你的 GitHub Token 具有以下权限：
- 读取仓库内容（查看分类）
- 写入仓库内容（创建/编辑分类）
- 删除仓库内容（删除分类）

## 分类文件格式

每个分类都是一个 Markdown 文件，包含 YAML frontmatter：

```markdown
---
title: 'Astro Framework 🚀'
description: 'The web framework for content-driven websites'
---
```

### 文件命名规则

- 文件名：`{分类名}.md`
- 分类名：用于 URL 和内部引用，建议使用英文小写
- 标题：用于显示的友好名称
- 描述：分类的详细说明

### 示例分类文件

#### `astro.md`
```markdown
---
title: 'Astro Framework 🚀'
description: 'The web framework for content-driven websites'
---
```

#### `javascript.md`
```markdown
---
title: 'JavaScript 💻'
description: 'Modern JavaScript development and best practices'
---
```

#### `tutorial.md`
```markdown
---
title: '教程 📚'
description: '详细的技术教程和指南'
---
```

## 使用方法

### 1. 查看分类列表

1. 打开思源笔记设置
2. 找到 "Publish to Astro Blog" 插件设置
3. 滚动到 "分类管理" 部分
4. 点击 "刷新分类" 加载最新分类列表

### 2. 添加新分类

1. 在分类管理区域点击 "添加分类"
2. 填写分类信息：
   - **分类名称**: 英文标识符（如：`javascript`）
   - **分类标题**: 显示名称（如：`JavaScript 💻`）
   - **分类描述**: 详细说明
3. 点击 "保存" 创建分类

### 3. 编辑现有分类

1. 在分类列表中找到要编辑的分类
2. 点击 "编辑分类" 按钮
3. 修改标题或描述（分类名称不可修改）
4. 点击 "保存" 更新分类

### 4. 删除分类

1. 在分类列表中找到要删除的分类
2. 点击 "删除分类" 按钮
3. 确认删除操作

⚠️ **注意**: 删除分类不会影响已发布的文章，但建议在删除前检查是否有文章使用该分类。

### 5. 发布文章时选择分类

1. 打开发布对话框
2. 在 "分类" 下拉菜单中选择合适的分类
3. 如果没有看到分类选项，请先配置分类目录并添加分类

## 最佳实践

### 1. 分类命名规范

- **分类名称**: 使用英文小写，单词间用连字符分隔
  - ✅ 好的例子: `javascript`, `web-development`, `astro-framework`
  - ❌ 避免: `JavaScript`, `Web Development`, `Astro Framework`

- **分类标题**: 可以使用中文、表情符号和大写字母
  - ✅ 好的例子: `JavaScript 💻`, `Web 开发`, `Astro Framework`

### 2. 分类层次结构

建议保持分类结构简单明了：

```
技术类分类:
- frontend (前端开发 🎨)
- backend (后端开发 ⚙️)
- database (数据库 🗄️)
- devops (运维部署 🚀)

内容类分类:
- tutorial (教程 📚)
- review (评测 📝)
- news (资讯 📰)
- thoughts (思考 💭)
```

### 3. 分类描述编写

- 简洁明了，说明分类的用途
- 包含关键词，有助于 SEO
- 保持一致的风格和语调

### 4. 定期维护

- 定期检查分类使用情况
- 合并相似或重复的分类
- 删除不再使用的分类
- 更新分类描述以保持准确性

## 故障排除

### 问题 1: 无法加载分类列表

**可能原因**:
- GitHub Token 权限不足
- 分类目录路径配置错误
- 网络连接问题

**解决方法**:
1. 检查 GitHub Token 是否有 `repo` 权限
2. 验证分类目录路径是否正确
3. 使用 "测试连接" 功能验证 GitHub 连接
4. 检查仓库中是否存在分类目录

### 问题 2: 分类创建失败

**可能原因**:
- 分类名称已存在
- 分类名称包含特殊字符
- GitHub API 限制

**解决方法**:
1. 使用唯一的分类名称
2. 分类名称只使用字母、数字和连字符
3. 检查 GitHub API 使用限制

### 问题 3: 发布时看不到分类选项

**可能原因**:
- 分类尚未加载
- 分类目录为空
- 分类文件格式错误

**解决方法**:
1. 在设置中刷新分类列表
2. 确保至少有一个有效的分类文件
3. 检查分类文件的 YAML 格式是否正确

### 问题 4: 分类删除后仍然显示

**可能原因**:
- 缓存未更新
- 删除操作未成功

**解决方法**:
1. 点击 "刷新分类" 重新加载
2. 检查 GitHub 仓库确认文件是否已删除
3. 重新打开插件设置

## 高级用法

### 1. 批量导入分类

如果你有大量分类需要创建，可以：

1. 直接在 GitHub 仓库中创建分类文件
2. 使用 Git 命令批量提交
3. 在插件中刷新分类列表

### 2. 分类模板

创建分类时可以使用模板：

```markdown
---
title: '{分类标题}'
description: '{分类描述}'
color: '#3B82F6'  # 可选：分类颜色
icon: '🏷️'        # 可选：分类图标
order: 1          # 可选：排序权重
---
```

### 3. 与 Astro 集成

确保你的 Astro 项目正确配置了分类集合：

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';

export default defineConfig({
  // ... 其他配置
});
```

```javascript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const categories = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    color: z.string().optional(),
    icon: z.string().optional(),
    order: z.number().optional(),
  }),
});

export const collections = {
  categories,
  // ... 其他集合
};
```

## 安全注意事项

1. **GitHub Token 安全**
   - 使用最小权限原则
   - 定期轮换 Token
   - 不要在公共场所暴露 Token

2. **分类内容安全**
   - 避免在分类描述中包含敏感信息
   - 注意分类名称的 URL 安全性

3. **操作确认**
   - 删除分类前确认没有文章使用
   - 重要操作前备份数据

通过合理使用分类管理功能，你可以更好地组织和管理 Astro 博客的内容结构！
