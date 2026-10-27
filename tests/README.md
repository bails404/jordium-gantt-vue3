# 测试文档

## Fork 定制回归

2026-10-27 资源时间边界修复：全量261通过、3跳过，仅1项既有上游“应该处理没有资源的任务”失败。覆盖各刻度分钟/秒级首尾衔接、空隙、真实重叠与嵌套、跨午夜和ISO时间、纯日期、零时长、无效时间及行复用；组件挂载测试验证日/周/月真实条形位置与宽度、换行、格宽切换和点击事件。源码 `vue-tsc --noEmit -p tsconfig.build.json --incremental false`、库构建、消费项目类型检查与生产构建通过。安装 `1.14.5-resource.time.1` 后，在隔离Chrome页面使用内存验证数据实际挂载排产项目的 `ResourceGantt` 和 `TrialGantt`，两者日/周/月六组检查均确认相接同一行、重叠一秒分行、间隔一秒同一行，窄条边框未撑宽；详情事件、悬停原时间和试排片段显示通过，无页面运行错误。未连接真实业务数据、未写数据库；临时验证页面用后移除。

2026-10-24 密集资源滚动回归：新增任务索引移动后的缓存复用、纵向滚动不重复解析日期且原地日期修改仍生效、子行缓冲跳滚/反向/缩放及共享尺寸观察器清理测试。全量 209 通过、3 跳过，仍仅有 1 项已知上游空资源冲突失败；37 项针对性回归、类型检查、库构建和消费项目构建通过。Chrome 独立无头会话、1440×1000 窗口，读取本地占用数据并定位 2026 年 7 月，筛选为 54 个资源/1618 条安排；同一段 180 帧纵向往返滚动（含 CPU 采样）中，旧包/安装后的新包帧间隔中位数约 33.3/25.3ms，P95 约 56.3/43.8ms，超过 50ms 的帧为 18/6；总高度均为 14185px，两侧结束位置一致。该数据是本地快速滚动对照，不代表所有设备的帧率保证。

消费项目使用 `1.14.5-resource.scroll.1` 本地组件包，并以 `--force` 重启 Vite 确认新组件实际加载。左右面板分别执行 60 次原生滚轮（120px、正反各半、间隔 40ms），超过 50ms 的帧为 0/1；原生滚动条拖动及 0/25%/75%/100%/50%/0 跳滚通过，抽查当前视口任务无遗漏，底部沿用原容器边界钳制。日/周/月切换、资源编码搜索和真实详情点击通过，无页面运行错误；未写业务数据，未另行进入试排历史业务页。

2026-10-23 原生滚轮回归：新增 `ResourceTaskBars.spec.ts`，覆盖跨资源缓存隔离、属性变化、原地修改任务、自定义插槽响应式更新/替换、列表变动和原始点击参数。5173 以 admin 身份读取 100 资源/3281 任务，Chrome 1707×923、定位 2026-06-15 月视图，连续 30 次原生滚轮（120px，间隔 100ms），不录制性能追踪的三轮对照：较慢 5% 帧从 33～36ms 降为 17～21ms，超过 50ms 的主线程任务从每轮 7～9 次降为 0；初始挂载任务条的更新从 1152～1175 次降为 152 次。左右列表快速正反滚动同步、跳滚无可见任务缺失、总高 18705px、日/周/月零时长双向定位及真实详情点击通过。未调试试排历史、未写业务数据。类型检查与构建通过；全量运行仍只有已知上游空资源冲突测试失败。

2026-10-23 首次加载优化：全量 202 通过、3 跳过、1 项已知上游空资源冲突失败；库与消费项目类型检查/构建通过。新增 `GanttConflictToggle.spec.ts` 覆盖关闭时跳过计算、动态开启/关闭与数据更新、默认开启及左侧复用结果；`taskLayoutUtils.spec.ts` 覆盖各刻度分行一致性、零时长、独立行、空/无效日期与任务更新。5173 同批 3281 任务三次进入，遮罩消失从 1773～2135 ms 降为 627～874 ms，最长主线程任务从 1148～1423 ms 降为 121～141 ms。完整布局快照一致，零时长双向定位、跳滚和详情通过。本轮环境下补做旧/新包滚动对照为 70.4/67.3 ms，与上一轮环境记录不混用；任务挂载峰值均为 249。未调试试排历史、未写业务数据。

2026-10-23 滚动优化验证：全量 194 通过、3 跳过，1 项已知上游空资源冲突测试失败；组件类型检查与库构建、消费项目类型检查与构建通过。5173 上同一批 100 资源/3281 任务、1707×923 视口、每次 180 帧拖动：纵向平均 27.5～28.5 ms 降到 17.3～18.9 ms，任务条挂载峰值 409 降到 249；横向平均 30.2 ms 降到 22.2 ms。实测跳滚/反向滚动无可见任务缺失且两侧对齐；日/周/月零时长双向定位正常。历史业务页实测按用户要求取消，历史共用组件以浏览器内存数据补充检查过零时长、虚拟分组和片段展示；未写业务数据。

下方保留原有测试说明。本节对应 `codex/resource-schedule` 的资源排程扩展；功能范围见[定制指南](../docs/CUSTOMIZATION.md)。

| 文件 | 主要覆盖内容 |
| --- | --- |
| `unit/utils/resourceNavigationUtils.spec.ts` | 最近任务方向、零时长最小显示宽度、远于渲染缓冲的任务、部分可见边界、日刻度显示范围及无效日期 |
| `unit/components/ResourceTaskNavigation.spec.ts` | 零时长双向定位、空方向隐藏、纵向按钮更新不触发父组件重绘 |
| `unit/components/ResourceTaskBars.spec.ts` | 按资源隔离任务条缓存；属性、任务、插槽变化仍更新，事件参数正确 |
| `unit/components/ResourceScrollRendering.spec.ts` | 纵向窗口切换复用日期解析结果，原地日期修改仍使缓存失效 |
| `unit/utils/sharedResizeObserver.spec.ts` | 多任务合并尺寸交付，共享订阅和卸载清理 |
| `unit/components/ResourceSchedule.spec.ts` | 日期导航与手动滚动反馈、完整任务保留、筛选、本地调整、月视图和年度下钻 |
| `unit/components/TaskBarScale.spec.ts` | 同为 day 刻度时，周/月格宽切换后任务条重新定位 |
| `unit/components/TaskBarTitleFit.spec.ts` | 标题宽度变化、视口两端裁切、关闭选项时的兼容行为及观察器清理 |
| `unit/utils/resourceOccupancies.spec.ts` | 数据适配、时间处理、年度跨月/跨年计数与零点边界 |
| `unit/utils/resourceViewportUtils.spec.ts` | 横向缓冲窗口复用与任务时间范围；变高子行裁剪、范围复用、跳滚/反向/尺寸变化及零时长独立车道 |
| `unit/utils/scrollSync.spec.ts` | 纵向滚动同步回传识别 |

```bash
# 定制功能的针对性回归
npx vitest run tests/unit/components tests/unit/utils/resourceOccupancies.spec.ts tests/unit/utils/resourceViewportUtils.spec.ts tests/unit/utils/scrollSync.spec.ts

# 全量测试与生产构建
npm run test:run
npm run build:demo
```

最近代码验证记录（2026-10-22）：188 项测试，184 通过、3 跳过、1 失败；生产构建通过。失败项为上游已有的 `unit/utils/conflictUtils.spec.ts` → `detectConflicts` → “应该处理没有资源的任务”（预期 0 个冲突，实际 1 个）。全量测试因此仍返回非零退出码；此记录不能替代后续重新验证，也不能用来忽略新增失败。

任务提示外观修复验证（2026-10-23）：组件库和 demo 构建通过；独立 Chrome 页面仅加载库产物及库 CSS，验证了无业务样式的自定义内容、`tooltipUnstyled` 开关、无插槽时忽略该开关、默认内容和关闭提示，长文本不横向溢出，外宽为定位使用的 250px，层级为 9999。全量测试为 183 通过、3 跳过、2 失败：除上述空资源冲突外，`useTaskRowState.spec.ts` 的逾期天数测试在本次运行中预期 3、实际 4（测试将本地日期转为 UTC 日期字符串后再比较本地日期，凌晨存在时区偏差）；两个失败对应的源码及测试均未改动。

涉及真实交互的改动还需在 `/resources` 手工检查：日期按钮与手动滚动是否一致；左右滚轮是否回抖；周/月缩放和拖动是否流畅；短标题、贴边标题及拉伸后的显隐是否正确；悬停、详情、年度下钻和撤销是否正常。检查 `/original` 的基础操作，确认组件修复没有破坏原版演示。

## 📁 测试结构

```
tests/
├── setup.ts                           # 测试环境初始化
├── helpers/                           # 测试工具函数
│   └── mount.ts                       # Vue组件挂载辅助函数
├── fixtures/                          # 测试数据工厂
│   ├── tasks.ts                       # 任务数据生成器
│   └── columns.ts                     # 列配置生成器
├── unit/                              # 单元测试
│   └── composables/
│       └── taskRow/
│           ├── useTaskRowState.spec.ts
│           ├── useTaskRowEventHandlers.spec.ts
│           └── useTaskRowContextMenu.spec.ts
└── component/                         # 组件测试
    └── TaskRow.spec.ts
```

## 🎯 测试覆盖范围

### 单元测试 (Unit Tests)

#### useTaskRowState.spec.ts
测试任务行状态管理逻辑：
- ✅ 缩进计算（基于层级）
- ✅ 任务类型判断（普通/父任务/Story/里程碑）
- ✅ 进度状态（warning/success/danger）
- ✅ 超时判断（实际工时 vs 预计工时）
- ✅ 逾期天数计算
- ✅ 自定义行类名（字符串/函数）
- ✅ 自定义行样式（对象/函数）

#### useTaskRowEventHandlers.spec.ts
测试事件处理逻辑：
- ✅ 折叠/展开事件
- ✅ 行点击事件（父任务自动折叠）
- ✅ 双击事件
- ✅ 鼠标悬停事件（进入/离开）
- ✅ Splitter拖拽状态管理
- ✅ 任务行拖拽（enableDrag控制）

#### useTaskRowContextMenu.spec.ts
测试右键菜单和计时器：
- ✅ 右键菜单显示/隐藏
- ✅ 菜单位置计算
- ✅ 删除任务事件
- ✅ 计时器格式化（HH:MM:SS）
- ✅ 计时器实时更新（运行中）
- ✅ 计时器停止后显示累计时间
- ✅ 组件卸载时清理资源

### 组件测试 (Component Tests)

#### TaskRow.spec.ts
测试 TaskRow 组件：
- ✅ 基础渲染（任务名称、进度）
- ✅ 缩进应用（根据层级）
- ✅ 折叠按钮显示/隐藏
- ✅ 悬停高亮效果
- ✅ 双击事件触发
- ✅ 右键菜单功能
- ✅ 自定义样式（类名/样式对象/函数）
- ✅ 列渲染（可见性控制）
- ✅ 自定义插槽内容
- ✅ 声明式列渲染模式

## 🚀 运行测试

### 基本命令

```bash
# 运行所有测试（watch 模式）
npm run test

# 运行所有测试（单次运行）
npm run test:run

# 打开测试 UI 界面
npm run test:ui

# 生成覆盖率报告
npm run test:coverage
```

### 运行特定测试

```bash
# 运行单个测试文件
npx vitest tests/unit/composables/taskRow/useTaskRowState.spec.ts

# 运行匹配模式的测试
npx vitest --grep "计时器"

# 运行特定目录的测试
npx vitest tests/unit/
```

## 📊 覆盖率目标

| 指标 | 目标 | 说明 |
|------|------|------|
| Statements | ≥ 80% | 语句覆盖率 |
| Branches | ≥ 75% | 分支覆盖率 |
| Functions | ≥ 80% | 函数覆盖率 |
| Lines | ≥ 80% | 行覆盖率 |

查看覆盖率报告：
```bash
npm run test:coverage
# 报告生成在 coverage/ 目录
# 打开 coverage/index.html 查看详细报告
```

## 🔧 测试工具

### Fixtures (测试数据工厂)

#### tasks.ts
提供10种预配置的任务数据生成器：
- `createTask()` - 基础任务
- `createParentTask()` - 父任务（带子任务）
- `createChildTask()` - 子任务
- `createMilestone()` - 里程碑任务
- `createTaskWithPredecessor()` - 带前置任务
- `createTimerTask()` - 正在计时的任务
- `createOvertimeTask()` - 超时任务
- `createOverdueTask()` - 逾期任务
- `createReadonlyTask()` - 只读任务
- `createCustomTask()` - 自定义属性任务

示例：
```typescript
import { createTask, createParentTask } from 'tests/fixtures/tasks'

const task = createTask({ name: 'My Task', progress: 50 })
const parent = createParentTask({ id: 1, children: [task] })
```

#### columns.ts
提供列配置生成器：
- `createNameColumn()` - 名称列
- `createPredecessorColumn()` - 前置任务列
- `createAssigneeColumn()` - 负责人列
- `createStartDateColumn()` - 开始日期列
- `createEndDateColumn()` - 结束日期列
- `createProgressColumn()` - 进度列
- `createDefaultColumns()` - 默认列配置列表

### Helpers (测试工具函数)

#### mount.ts
- `mountComponent()` - 挂载 Vue 组件
- `flushPromises()` - 等待所有 Promise 完成
- `sleep(ms)` - 延迟执行
- `triggerMouseEvent()` - 触发鼠标事件
- `getComputed()` - 获取组件 computed 值
- `hasClass()` - 检查元素类名
- `getStyle()` - 获取元素样式

## 📝 编写测试指南

### 1. 单元测试示例

```typescript
import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useTaskRowState } from '@/composables/...'
import { createTask } from '../../../fixtures/tasks'

describe('useTaskRowState', () => {
  it('应该正确计算缩进', () => {
    const task = ref(createTask())
    const level = ref(2)
    const { taskState } = useTaskRowState(task, level)

    expect(taskState.value.indent).toBe('50px') // 10 + 2*20
  })
})
```

### 2. 组件测试示例

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TaskRow from '@/components/TaskList/taskRow/TaskRow.vue'
import { createTask } from '../../fixtures/tasks'
import { createDefaultColumns } from '../../fixtures/columns'

describe('TaskRow', () => {
  it('应该渲染任务名称', () => {
    const wrapper = mount(TaskRow, {
      props: {
        task: createTask({ name: 'Test Task' }),
        level: 0,
        columns: createDefaultColumns(),
      },
    })

    expect(wrapper.text()).toContain('Test Task')
  })
})
```

## 🐛 调试测试

### 使用 Vitest UI

```bash
npm run test:ui
```

浏览器会自动打开，提供：
- 实时测试运行状态
- 测试代码高亮
- 错误堆栈追踪
- 覆盖率可视化

### 调试单个测试

在测试文件中添加 `.only`：
```typescript
it.only('应该测试某个功能', () => {
  // 只运行这个测试
})
```

### 查看详细输出

```bash
npx vitest --reporter=verbose
```

## ⚠️ 常见问题

### Q: 测试失败显示 "Cannot find module '@/...'"
A: 确保 `vitest.config.ts` 中配置了正确的路径别名。

### Q: 组件测试中 slot 不显示
A: 检查 slot 语法，确保使用 `slots: { 'slot-name': () => '...' }`。

### Q: 计时器测试不稳定
A: 使用 `vi.useFakeTimers()` 和 `vi.advanceTimersByTime()` 控制时间。

### Q: 覆盖率未达标
A: 运行 `npm run test:coverage`，打开 HTML 报告查看未覆盖代码。

## 📚 参考资料

- [Vitest 官方文档](https://vitest.dev/)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [Happy DOM](https://github.com/capricorn86/happy-dom)

## 🧪 性能与算法测试

### test-interval-tree.html
区间树算法可视化测试页面，用于验证 v1.9.3 中的性能优化：

**测试内容**：
- ✅ **测试1**: 算法切换验证（50/100/101/200任务）
- ✅ **测试2**: 性能对比（O(n²) vs O(n log n)）
- ✅ **测试3**: 结果正确性验证
- ✅ **测试4**: 极限场景测试（500任务）

**使用方法**：
```bash
# 直接在浏览器中打开
open tests/test-interval-tree.html
```

**验证目标**：
- 任务数 > 100 时自动切换到区间树算法
- 500任务场景性能提升 2.8-3.5 倍（120ms → 42ms）
- 算法优化不影响功能正确性

### verify-interval-tree.js
控制台验证脚本，提供4种验证方法：

**使用方法**：
```bash
# 方法1: 在项目运行时，浏览器控制台执行
node tests/verify-interval-tree.js

# 方法2: 在 Demo 中查看实时监控日志
# 1. npm run dev
# 2. 切换到资源视图
# 3. 拖拽任务条
# 4. 查看控制台输出 [Conflict Detection] 日志
```

**验证检查清单**：
- ☑️ src/utils/conflictUtils.ts 包含 IntervalTree 类
- ☑️ src/utils/conflictUtils.ts 包含 detectConflictsWithIntervalTree 函数
- ☑️ detectConflicts 函数有算法选择逻辑
- ☑️ perfMonitor.ts 包含 recordConflictDetection 方法
- ☑️ 性能目标: 500任务从120ms降至~40ms

### demo/data-resources-large.json
大数据集测试文件（由 `scripts/generate-large-data.js` 生成）：

**数据规模**：
- 100个资源
- 约2500个任务
- 任务分布：每个资源20-30个任务

**用途**：
- 测试资源视图垂直滚动性能
- 验证区间树算法在大数据量下的表现
- 测试冲突检测性能（多资源场景）

**重新生成数据**：
```bash
node scripts/generate-large-data.js
```

## 🎯 待扩展测试

以下功能建议增加测试覆盖：
- [ ] TaskRowBadges 组件（徽章显示）
- [ ] TaskRowCollapseButton 组件（折叠按钮）
- [ ] TaskRowIcon 组件（任务图标，特别是里程碑无发光效果）
- [ ] TaskRowNameContent 组件（名称内容）
- [ ] 集成测试（TaskList 整体交互）
- [ ] 快照测试（组件输出稳定性）
- [ ] GanttConflicts 组件测试（Canvas 渲染、冲突可视化）
- [ ] 区间树算法单元测试（正确性、边界条件）
