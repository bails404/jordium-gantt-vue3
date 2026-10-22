# GitHub Pages 部署指南

仓库保留了 GitHub Pages 工作流，但当前仅支持 `workflow_dispatch` 手动触发，不会在推送时自动部署。本文描述仓库配置，不代表本 Fork 已启用或发布 Pages。

## Fork 资源页的部署限制

- 定制代码在 `codex/resource-schedule` 分支；原作者演示网址不包含本 Fork 改动。
- `demo/main.ts` 按根路径 `/original`、`/resources` 判断页面，导航也使用根路径。标准 GitHub Pages 项目网址带仓库子路径，尚需适配入口识别、链接和刷新回退；仅使用相对资源路径不能解决这些问题。
- 资源页请求 `/api/resource-occupancies`。Vite 的 `server.proxy` 只属于开发服务，静态页面不提供此转发，也不能替访问者连接开发者局域网接口。
- 当前建议先按 [README](../README.md) 在本地运行；生产资源页需要可访问业务接口的服务端代理、根路径部署及相应的单页入口回退。完成路径/API 适配前，不应把现有工作流当作资源页的一键部署方案。

## 🌐 在线访问

**上游 Demo**：[原作者 GitHub Pages](https://nelson820125.github.io/jordium-gantt-vue3/)。这不是本 Fork 的部署地址。

## 🔧 部署配置

### 现有部署工作流

项目的 GitHub Actions 工作流配置为：

- **触发条件**: `workflow_dispatch`，在 Actions 中手动运行并选择分支
- **构建命令**: `npm ci` 后执行 `npm run build:demo`；不存在 `build:pages` 脚本
- **构建环境**: 工作流使用 Node.js 22
- **部署目录**: `./dist`
- **工作流文件**: `.github/workflows/deploy-github-pages.yml`

### 手动启用 GitHub Pages

1. 进入 GitHub 仓库设置页面
2. 找到 "Pages" 设置选项
3. 选择 "Source" 为 "GitHub Actions"
4. 完成上述路径和 API 适配后，在 Actions 中打开 `Deploy GitHub Pages`，手动选择要部署的分支运行

工作流仍包含继承自上游的触发者权限条件，仓库所有者可触发；本文不修改仓库设置、工作流或实际执行部署。

## 📁 构建产物

- **开发构建**: `npm run build` → `dist/`
- **Pages 工作流构建**: `npm run build:demo` → 仓库内 `dist/`；当前生产 `base` 为 `./`，不代表页面路由已兼容子路径
- **组件库构建**: `npm run build:lib` → 仓库父目录的 `npm-package/dist/`；输出与包入口的差异见[定制指南](CUSTOMIZATION.md#reuse)

## 🛠️ 本地预览

```bash
# 安装依赖
npm ci

# 启动开发服务器
npm run dev

# 构建并预览生产版本
npm run build:demo
npm run preview
```

## 🔄 更新部署

每次手动运行工作流时，GitHub Actions 会：

1. 检出代码
2. 安装 Node.js 和依赖
3. 构建 demo 应用
4. 部署到 GitHub Pages

## 📝 注意事项

- 部署通常需要 1-5 分钟生效
- 确保 GitHub Pages 在仓库设置中已启用
- 自定义域名需要在 `demo/public/CNAME` 文件中配置
- 构建成功不等于资源页可用；需实际检查子路径导航、刷新和接口访问
