# 贡献指南 - jordium-gantt-vue3

> 本仓库为 `bails404/jordium-gantt-vue3` 的定制 Fork。定制功能的 PR 以本仓库 `codex/resource-schedule` 为目标；提交给原项目的通用修复应另行整理。下方保留上游社区规范与联系方式，Fork 的启动、API 和同步方式以[定制指南](docs/CUSTOMIZATION.md)为准。

感谢您对 jordium-gantt-vue3 项目的关注！我们欢迎社区的贡献，很高兴您能加入我们。

## 🌍 多语言版本

本文档提供多种语言版本：
- [中文版](./CONTRIBUTING.md)
- [English](./CONTRIBUTING-EN.md)

## 📋 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发环境搭建](#开发环境搭建)
- [项目结构](#项目结构)
- [编码规范](#编码规范)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)
- [Issue 指南](#issue-指南)
- [测试](#测试)
- [文档](#文档)

## 📜 行为准则

本项目及其参与者均受我们的行为准则约束。通过参与，您需要遵守此准则。如发现不当行为，请报告至 [ning.li@jordium.com](mailto:ning.li@jordium.com) / [nelson820125@gmail.com](mailto:nelson820125@gmail.com)。

### 我们的标准

- **相互尊重**，包容多元化
- **协作建设**，提供建设性意见
- **耐心待人**，特别是对新手
- **考虑周全**，理解不同观点
- **关注大局**，以社区利益为重

## 🤝 如何贡献

您可以通过多种方式为 jordium-gantt-vue3 做贡献：

### 🐛 错误报告
- 首先搜索已有问题
- 使用我们的错误报告模板
- 提供清晰的重现步骤
- 包含环境详细信息

### 💡 功能建议
- 检查功能是否已存在
- 说明使用场景和好处
- 如可能提供原型图或示例

### 🔧 代码贡献
- 错误修复
- 新功能开发
- 性能优化
- 文档更新

### 📚 文档贡献
- 修复错别字或不清楚的内容
- 添加示例和教程
- 翻译文档
- 改进 API 文档

## 🛠️ 开发环境搭建

### 前置要求

- **Node.js**: >= 20.0.0（开发与构建）
- **npm**: >= 8.0.0（或 yarn >= 1.22.0）
- **Git**: 最新版本

### 克隆和设置

```bash
# 克隆仓库
git clone --branch codex/resource-schedule https://github.com/bails404/jordium-gantt-vue3.git
cd jordium-gantt-vue3

# 安装依赖
npm ci

# 启动开发服务器
npm run dev -- --host 127.0.0.1 --port 13000 --strictPort
```

### 可用脚本

```bash
# 开发
npm run dev              # 启动开发服务器
npm run dev:demo         # 启动演示开发服务器

# 构建
npm run build            # 生产环境构建
npm run build:lib        # 构建 npm 包

# 质量保证
npm run lint:check       # 运行 ESLint，只检查
npm run lint             # 运行 ESLint 并自动修复
npm run type-check       # TypeScript 类型检查
npm run format           # 使用 Prettier 格式化代码
npm run format:check     # 检查代码格式

# 测试
npm run test:run         # 单次运行全部测试
npm run test             # 监视模式运行测试
npm run test:coverage    # 运行测试并生成覆盖率报告
```

## 📁 项目结构

```
jordium-gantt-vue3/
├── src/                     # 主要源代码
│   ├── components/          # Vue 组件
│   │   ├── GanttChart.vue   # 主甘特图组件
│   │   ├── Timeline.vue     # 时间轴组件
│   │   ├── TaskList.vue     # 任务列表组件
│   │   └── ...
│   ├── composables/         # Vue 组合式函数
│   │   ├── useI18n.ts       # 国际化
│   │   └── useMessage.ts    # 消息系统
│   ├── models/              # TypeScript 模型
│   │   ├── classes/         # 数据类
│   │   └── configs/         # 配置类型
│   └── styles/              # 全局样式
├── demo/                    # 演示应用
├── packageDemo/             # 包演示用于测试
├── docs/                    # 文档
├── tests/                   # 测试文件
└── ...
```

## 🎨 编码规范

### 代码风格

我们使用 ESLint 和 Prettier 来保持一致的代码风格：

- **缩进**: 2 个空格
- **引号**: 字符串使用单引号
- **分号**: 不要求分号
- **行长度**: 最大 100 字符
- **尾随逗号**: ES5 风格

### Vue.js 指南

```vue
<script setup lang="ts">
// 1. 导入放在最前面
import { ref, computed, onMounted } from 'vue'
import type { Task } from '../models/classes/Task'

// 2. Props 定义
interface Props {
  tasks: Task[]
  showToolbar?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  showToolbar: true
})

// 3. Emits 定义
const emit = defineEmits<{
  taskUpdated: [task: Task]
}>()

// 4. 响应式数据
const isLoading = ref(false)

// 5. 计算属性
const taskCount = computed(() => props.tasks.length)

// 6. 方法
const handleTaskUpdate = (task: Task) => {
  emit('taskUpdated', task)
}

// 7. 生命周期钩子
onMounted(() => {
  // 初始化组件
})
</script>

<template>
  <!-- 使用语义化 HTML 和可访问性属性 -->
  <div class="gantt-container" role="application" aria-label="甘特图">
    <!-- 组件内容 -->
  </div>
</template>

<style scoped>
/* 使用 CSS 自定义属性进行主题化 */
.gantt-container {
  background: var(--gantt-bg-primary, #ffffff);
  color: var(--gantt-text-primary, #303133);
}
</style>
```

### TypeScript 指南

- **严格模式**: 启用严格的 TypeScript 检查
- **显式类型**: 公共 API 优先使用显式类型注解
- **接口**: 对象形状使用接口
- **枚举**: 使用常量断言或联合类型代替枚举

```typescript
// 好的做法
interface TaskOptions {
  id: number
  name: string
  assignee?: string
}

// 简单情况下更好的做法
type TaskStatus = 'pending' | 'in-progress' | 'completed'

// 使用泛型约束
function updateTask<T extends Task>(task: T): T {
  return { ...task, updatedAt: new Date() }
}
```

## 📝 提交规范

我们遵循 [约定式提交](https://www.conventionalcommits.org/zh-hans/) 规范：

### 提交消息格式

```
<类型>[可选 范围]: <描述>

[可选 正文]

[可选 脚注]
```

### 类型

- **feat**: 新功能
- **fix**: 错误修复
- **docs**: 文档变更
- **style**: 代码风格变更（格式化等）
- **refactor**: 代码重构
- **perf**: 性能优化
- **test**: 添加或更新测试
- **chore**: 维护任务

### 示例

```bash
feat(timeline): 添加缩放功能
fix(taskbar): 修复拖拽位置计算问题
docs(api): 更新 GanttChart 属性文档
style(components): 使用 prettier 格式化代码
refactor(composables): 提取公共逻辑到 useGantt
perf(timeline): 优化虚拟滚动
test(timeline): 为缩放功能添加单元测试
chore(deps): 更新 vue 到 3.4.0
```

### 范围指南

- **components**: Vue 组件
- **composables**: Vue 组合式函数
- **models**: TypeScript 模型
- **styles**: CSS/样式变更
- **timeline**: 时间轴相关变更
- **taskbar**: 任务条相关变更
- **i18n**: 国际化
- **demo**: 演示应用
- **build**: 构建系统
- **ci**: CI/CD 变更

## 🔄 Pull Request 流程

### 提交前

1. **Fork** 仓库
2. 从 `codex/resource-schedule` **创建** 功能分支，并以本 Fork 的该分支为 PR 目标
3. **进行** 变更
4. 为新功能 **添加** 测试
5. **更新** 文档
6. **运行** 代码检查和测试
7. 使用约定式提交格式 **提交**

### PR 检查清单

- [ ] 代码遵循风格指南
- [ ] 完成代码自查
- [ ] 为新功能添加测试
- [ ] 测试没有新增失败，并记录[已知上游基线失败](tests/README.md)
- [ ] 文档已更新
- [ ] 无合并冲突
- [ ] 使用约定式提交格式

### PR 模板

```markdown
## 描述
变更的简要描述

## 变更类型
- [ ] 错误修复
- [ ] 新功能
- [ ] 破坏性变更
- [ ] 文档更新

## 测试
- [ ] 单元测试通过
- [ ] 手动测试完成
- [ ] 演示应用正常工作

## 截图（如适用）
在此添加截图

## 检查清单
- [ ] 代码遵循风格指南
- [ ] 完成自查
- [ ] 测试已添加/更新
- [ ] 文档已更新
```

## 🐛 Issue 指南

### 错误报告

使用错误报告模板并包含：

1. **环境**: 操作系统、浏览器、Node.js 版本
2. **重现步骤**: 清晰的编号步骤
3. **预期行为**: 应该发生什么
4. **实际行为**: 实际发生了什么
5. **截图**: 如适用
6. **额外上下文**: 其他相关信息

### 功能建议

使用功能建议模板并包含：

1. **问题描述**: 这解决了什么问题？
2. **建议解决方案**: 应该如何工作？
3. **考虑的替代方案**: 考虑过的其他方法
4. **额外上下文**: 原型图、示例等

## 🧪 测试

### 编写测试

```typescript
// 单元测试示例
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GanttChart from '../src/components/GanttChart.vue'

describe('GanttChart', () => {
  it('正确渲染任务', () => {
    const tasks = [
      { id: 1, name: '任务 1', startDate: '2025-01-01', endDate: '2025-01-05' }
    ]
    
    const wrapper = mount(GanttChart, {
      props: { tasks }
    })
    
    expect(wrapper.text()).toContain('任务 1')
  })
})
```

### 测试覆盖率

- 目标 **80%+ 代码覆盖率**
- 彻底测试 **关键功能**
- 包含 **边界情况** 和 **错误场景**
- 测试 **可访问性** 功能

## 📚 文档

### 代码文档

```typescript
/**
 * 计算任务在时间轴上的位置
 * @param task - 包含日期信息的任务对象
 * @param startDate - 时间轴开始日期
 * @param dayWidth - 一天的像素宽度
 * @returns 包含左侧位置和宽度的对象
 */
function calculateTaskPosition(
  task: Task,
  startDate: Date,
  dayWidth: number
): { left: number; width: number } {
  // 实现
}
```

### README 更新

添加新功能时：

1. 更新功能列表
2. 添加使用示例
3. 更新 API 文档
4. 如有 UI 变更包含截图

## 🌍 国际化

### 添加新语言

1. 在 `src/composables/useI18n.ts` 中创建语言文件
2. 为所有键添加翻译
3. 使用新语言测试
4. 更新文档

```typescript
// 添加语言示例
const messages = {
  'zh-CN': { /* 中文翻译 */ },
  'en-US': { /* 英文翻译 */ },
  'fr-FR': { /* 法文翻译 */ }, // 新语言
}
```

## 🏷️ 发布流程

### 版本升级

我们使用 [语义化版本](https://semver.org/lang/zh-CN/)：

- **主版本**: 破坏性变更
- **次版本**: 新功能（向后兼容）
- **修订版本**: 错误修复（向后兼容）

### 发布检查清单

- [ ] 所有测试通过
- [ ] 文档已更新
- [ ] CHANGELOG.md 已更新
- [ ] package.json 中版本已升级
- [ ] Git 标签已创建
- [ ] NPM 包已发布
- [ ] GitHub 发布已创建

## 📞 获取帮助

### 社区支持

- **GitHub Discussions**: 一般问题和想法
- **GitHub Issues**: 错误报告和功能请求
- **邮箱**: [ning.li@jordium.com](mailto:ning.li@jordium.com) / [nelson820125@gmail.com](mailto:nelson820125@gmail.com)

### 维护者响应时间

- **严重错误**: 24 小时内
- **常规问题**: 7 天内
- **功能请求**: 14 天内
- **Pull Request**: 7 天内

## 🙏 致谢

贡献者将会：
- 添加到 [贡献者](./CONTRIBUTORS.md) 列表
- 在发布说明中提及
- 在文档中给予荣誉

## 📄 许可证

通过为 jordium-gantt-vue3 做贡献，您同意您的贡献将在 MIT 许可证下授权。

---

**感谢您为 jordium-gantt-vue3 做贡献！🎉**

您的贡献让这个项目对每个人都变得更好。
