# 开发文档

## 项目结构

```
plublic_astro/
├── src/
│   ├── index.ts          # 主插件文件
│   └── index.scss        # 样式文件
├── i18n/
│   ├── en_US.json        # 英文语言包
│   └── zh_CN.json        # 中文语言包
├── test/
│   └── test-basic.js     # 基础测试文件
├── icon.png              # 插件图标
├── preview.png           # 预览图
├── plugin.json           # 插件配置
├── package.json          # 项目配置
├── webpack.config.js     # 构建配置
├── tsconfig.json         # TypeScript 配置
├── eslint.config.mjs     # ESLint 配置
├── README.md             # 英文说明
├── README_zh_CN.md       # 中文说明
├── USAGE.md              # 使用指南
└── DEVELOPMENT.md        # 开发文档
```

## 核心功能

### 1. 插件主类 (PluginSample)

主要功能模块：

- **配置管理**: 管理 GitHub 连接配置
- **UI 集成**: 顶栏按钮、菜单项、快捷键
- **发布对话框**: 文章元数据编辑界面
- **GitHub API**: 文件上传和更新
- **Markdown 导出**: 从思源笔记导出内容
- **Frontmatter 生成**: 生成 Astro 兼容的元数据

### 2. 配置接口

```typescript
interface AstroConfig {
    githubToken: string;      // GitHub Personal Access Token
    githubOwner: string;      // 仓库所有者
    githubRepo: string;       // 仓库名称
    astroContentPath: string; // 内容路径
}

interface PublishMetadata {
    title: string;        // 文章标题
    description: string;  // 文章描述
    publishDate: string;  // 发布日期
    tags: string[];       // 标签数组
    category: string;     // 分类
    draft: boolean;       // 草稿状态
}
```

### 3. 核心方法

#### showPublishDialog()
显示发布对话框，收集文章元数据

#### publishToGitHub(blockId, metadata)
执行发布流程：
1. 获取文档内容
2. 生成 frontmatter
3. 组合完整内容
4. 上传到 GitHub

#### getDocumentContent(blockId)
使用思源 API 导出 Markdown 内容

#### generateFrontmatter(metadata)
生成 Astro 兼容的 YAML frontmatter

#### uploadToGitHub(path, content, sha?)
使用 GitHub API 上传或更新文件

## 开发环境设置

### 1. 安装依赖

```bash
pnpm install
```

### 2. 开发模式

```bash
pnpm run dev
```

这会启动 webpack 监听模式，自动编译 TypeScript 和 SCSS 文件。

### 3. 生产构建

```bash
pnpm run build
```

生成 `package.zip` 文件，包含所有必要的插件文件。

### 4. 代码检查

```bash
pnpm run lint
```

## API 集成

### 思源笔记 API

插件使用以下思源 API：

- `/api/export/exportMdContent`: 导出文档为 Markdown
- 插件系统 API: 设置、对话框、菜单等

### GitHub API

使用 GitHub REST API v3：

- `GET /repos/{owner}/{repo}/contents/{path}`: 检查文件是否存在
- `PUT /repos/{owner}/{repo}/contents/{path}`: 创建或更新文件

## 错误处理

### 1. 配置验证

```typescript
private isConfigValid(): boolean {
    return !!(this.astroConfig.githubToken && 
             this.astroConfig.githubOwner && 
             this.astroConfig.githubRepo && 
             this.astroConfig.astroContentPath);
}
```

### 2. GitHub API 错误

- 401: Token 无效
- 403: 权限不足
- 404: 仓库或文件不存在
- 422: 请求格式错误

### 3. 用户反馈

使用思源的 `showMessage()` API 显示成功或错误信息。

## 国际化

支持中英文双语：

- `i18n/en_US.json`: 英文文本
- `i18n/zh_CN.json`: 中文文本

在代码中使用：
```typescript
this.i18n.publishToAstro  // 获取本地化文本
```

## 样式

使用 SCSS 编写样式，主要用于：

- 发布对话框样式
- 按钮和表单元素
- 响应式布局

## 测试

### 单元测试

`test/test-basic.js` 包含基础功能测试：

- Frontmatter 生成测试
- 文件名生成测试
- 配置验证测试

### 手动测试

1. 配置 GitHub 信息
2. 创建测试文档
3. 执行发布流程
4. 验证 GitHub 仓库中的文件

## 部署

### 开发版本

1. 将插件文件夹复制到 `{workspace}/data/plugins/`
2. 在思源中重新加载插件

### 发布版本

1. 运行 `pnpm run build`
2. 上传 `package.zip` 到 GitHub Releases
3. 提交到思源插件市场

## 扩展功能

### 计划中的功能

- [ ] 批量发布支持
- [ ] 图片自动上传
- [ ] 自定义 frontmatter 模板
- [ ] 发布历史记录
- [ ] 自动标签提取

### 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 创建 Pull Request

## 故障排除

### 常见问题

1. **编译错误**: 检查 TypeScript 类型定义
2. **运行时错误**: 查看浏览器控制台
3. **API 错误**: 验证 GitHub 配置
4. **样式问题**: 检查 SCSS 编译

### 调试技巧

1. 使用 `console.log()` 输出调试信息
2. 检查网络请求（开发者工具 Network 标签）
3. 验证 JSON 格式
4. 测试 GitHub API 权限

## 版本历史

### v1.0.0 (当前版本)
- 基础发布功能
- GitHub API 集成
- 中英文支持
- 配置管理界面

## 许可证

MIT License - 详见 LICENSE 文件
