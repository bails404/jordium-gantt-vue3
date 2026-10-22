# 资源排程定制指南

本指南描述 `bails404/jordium-gantt-vue3` 的 `codex/resource-schedule` 分支。上游基线为 Jordium Gantt Vue3 1.14.5，提交 `b46bec1`。组件完整 API 见[中文 README](../README-zh-CN.md)，改动记录见 [CHANGELOG](../CHANGELOG.md#fork-unreleased)。

## 页面与视图

在仓库根目录执行 `npm ci`，再执行 `npm run dev -- --host 127.0.0.1 --port 13000 --strictPort`。开发/构建需要 Node.js 20 或以上。

| 路径 | 内容 |
| --- | --- |
| `/` | 示例导航 |
| `/original` | 保留原版完整演示页面；使用当前分支的组件源码 |
| `/resources` | 接口驱动的精简资源排程 |

资源页默认月视图。页面上的“日/周/月”是业务展示模式，与组件的 `timeScale` 名称并非一一对应：

| 页面视图 | 实现 | 前后按钮与统计范围 |
| --- | --- | --- |
| 日 | `timeScale='hour'`，64px/小时 | 前后一天 / 当天 |
| 周 | `timeScale='day'`，120px/天 | 前后一周 / 周一至周日 |
| 月 | `timeScale='day'`，32px/天 | 前后一月 / 当月 |
| 年 | 独立的 `ResourceYearOverview.vue` 汇总表 | 前后一年 / 当年 |

日/周/月时间轴可以滚动到相邻时段，任务绘制并不截断在统计范围内。月视图复用了按天刻度；年度汇总不是给底层 `timeScale` 新增的模式。

## 筛选与统计口径

- 默认显示全部资源，包括当前时段没有任务的资源。搜索按资源名称或编号匹配；状态筛选针对任务。
- 开启“仅看有占用”后，只显示当前日/周/月/年中有符合条件任务的资源。因此滚动跨越时段后，资源行可能变化。
- 顶部统计依次为“筛选后的资源数 / 接口资源总数”“当前时段占用记录数”“当前时段有安排的资源数”，不是工时、产量或利用率。
- 手动横向滚动停稳后，以视口中央日期同步顶部日期和统计；拖动时间轴或任务期间延后同步。默认全部资源模式不会因日期变化增删资源行。
- 相交规则为 `任务开始 < 时段结束 && 任务结束 > 时段开始`。跨月任务计入每个相交月份；结束于下月 1 日零点，不计入下月。全年记录数按记录计数，可能小于 12 个月计数之和。
- 年度表中点击月份标题或色块进入对应月份，保留搜索、状态和“仅看有占用”条件。

## 颜色、标题和交互

| 显示元素 | 含义 |
| --- | --- |
| 蓝色任务条 | 已派工；当前适配器也将其他非“加工中”状态映射为蓝色，以文字和详情为准 |
| 绿色任务条 | 加工中 |
| 日视图浅蓝色竖向背景 | 当前小时 |
| 日视图浅灰背景 | 非工作时段，包含周末 |
| 日视图白色背景 | 示例工作时段 |
| 年度色块 | 记录数分档：0、1–5、6–15、16–30、31 及以上，越深记录越多 |

日视图示例工作时间为周一至周五 08:00–12:00、13:00–18:00，并非真实车间班次。背景颜色不表示资源是否空闲，资源占用以任务条为准。

任务条标题采用“状态 · 数量 件”。只有当前可见空间能完整容纳文字时才显示；空间不足就整体隐藏，不显示省略号。切换视图、拉伸、窗口变化及横向滚动都会更新显隐。悬停仍显示完整提示，点击或双击可查看业务 ID 等详情。

日/周/月视图支持拖动时间、跨行调整资源、拖动边缘调整时长。周/月按天展示，适配器保留原记录起止时分；日视图保留小时刻度的时间调整。当前没有后端保存调用：

- 修改只在当前页面内存生效，统计和年度汇总随之更新。
- “撤销全部调整”恢复本次获取的原始数据，不重新请求接口。
- 刷新数据或刷新页面会重新获取接口数据，丢弃本地调整。

## 接口与数据适配

浏览器只发送 `GET /api/resource-occupancies`。开发环境由 [vite.config.ts](../vite.config.ts) 代理到 `http://192.168.0.101:5173`；换环境时修改该代理目标并重启开发服务器。

接口需要返回顶层 `units`、`occupancies` 数组。以下为虚构示例：

```json
{
  "units": [
    { "unitBusinessId": "resource-1", "unitCode": "EQ-001", "unitName": "示例设备" }
  ],
  "occupancies": [
    {
      "unitBusinessId": "resource-1",
      "actualBusinessId": "actual-1",
      "planBusinessId": "plan-1",
      "operationBusinessId": "operation-1",
      "startTime": "2026-10-22T08:00:00",
      "endTime": "2026-10-22T17:00:00",
      "status": "已派工",
      "qty": 1
    }
  ]
}
```

[resourceOccupancies.ts](../demo/resourceOccupancies.ts) 按 `unitBusinessId` 关联资源。业务 ID 应以字符串返回，避免长数字精度损失；组件内部数字任务 ID 由数组序号生成，不作为后端持久标识。当前示例按本地时间显示，接口应采用一致的时间约定。

未知资源、无效时间、结束不晚于开始的占用记录会被跳过并计数；资源 ID 和名称不完整会报错。接口超时为 15 秒，页面提供错误提示和重试。

数据在加载或刷新时整体获取，未实现服务端日期分页、后台预取或定时刷新。左右缓冲是**前端绘制策略**，不会请求相邻日期的接口。日期变化主要更新定位和统计，传给组件的资源中保留完整任务数据；搜索、状态筛选及本地编辑仍会影响传入内容。

<a id="api"></a>

## Fork 新增 API

| 配置 | 类型 / 默认值 | 行为与适用范围 |
| --- | --- | --- |
| `focusDate` | `Date \| string` / `undefined` | 请求将日期居中，等待时间轴布局就绪后统一定位。不传保留上游自动定位。首次定位及切换刻度/格宽直接定位，同刻度、同格宽的后续日期导航平滑滚动。 |
| `resourceTaskBufferScreens` | `number` / `undefined` | 有限非负数；资源视图的 hour/day/month 刻度下，左右各增加指定屏数的绘制缓冲。`2` 约为当前一屏加左右各两屏；`0` 不加外围缓冲；不传、负数或非有限值使用上游策略。 |
| `taskBarConfig.hideTitleOnOverflow` | `boolean` / `false` | 开启 `showTitle` 时，普通任务条内标题完整显示或整体隐藏；按可见区域扣除内边距、手柄等空间判断。不处理父任务、条外标题、自定义内容插槽，也不自动开启提示。 |

缓冲区接近边缘才重算，并与现有纵向虚拟化配合；不代表一次性渲染全部任务。屏数越大通常越占用 DOM 和内存，应结合数据量选择。

| 事件 | 参数 | 时机 |
| --- | --- | --- |
| `viewport-date-change` | `Date` | 提供 `focusDate` 且处于 hour/day/month 刻度时，横向滚动停稳约 100ms 后报告视口中央日期；主动定位期间抑制，拖拽期间延后。 |
| `focus-date-settled` | `Date` | 主动定位结束后报告请求的目标日期，包括原有 `scrollToDate` 方法调用。边界处可能无法实际居中；用户打断受控导航时不保证发出。 |

`focusDate` 是主动定位请求，`viewport-date-change` 是用户滚动后的反馈。不要让二者直接互相回写，否则会重新居中。需要重复定位到同一天时，可以传新的 `Date` 对象或使用原有 `scrollToDate` 方法。

下面的例子可用于仓库 `demo/` 下的 Vue 文件，直接导入定制源码；正式资源页更完整的日期联动见 [ResourceSchedule.vue](../demo/ResourceSchedule.vue)。

```vue
<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { GanttChart } from '../src/index'
import type { Resource, TaskBarConfig } from '../src/index'

const focusDate = shallowRef(new Date(2026, 9, 22, 12))
const visibleDate = ref(focusDate.value.toLocaleDateString('zh-CN'))
const resources = ref<Resource[]>([
  {
    id: 'resource-1',
    name: '示例设备',
    type: 'Device',
    tasks: [{ id: 1, name: '已派工 · 1 件', startDate: '2026-10-22 08:00:00', endDate: '2026-10-22 17:00:00' }],
  },
])
const taskBarConfig: TaskBarConfig = {
  showTitle: true,
  showAvatar: false,
  showProgress: false,
  hideTitleOnOverflow: true,
}

function showToday() {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  visibleDate.value = date.toLocaleDateString('zh-CN')
  focusDate.value = date
}

function syncVisibleDate(date: Date) {
  visibleDate.value = date.toLocaleDateString('zh-CN')
  // 只同步显示/统计日期，不回写 focusDate。
}
</script>

<template>
  <button @click="showToday">今天</button>
  <span>{{ visibleDate }}</span>
  <div style="height: 600px">
    <GanttChart
      view-mode="resource"
      time-scale="hour"
      :show-toolbar="false"
      :resources="resources"
      :focus-date="focusDate"
      :resource-task-buffer-screens="2"
      :task-bar-config="taskBarConfig"
      :enable-task-bar-tooltip="true"
      @viewport-date-change="syncVisibleDate"
    />
  </div>
</template>
```

示例展示新增配置及日期反馈，不包含接口保存功能。新增配置均可选；滚动同步、提示层级等内部修复直接作用于当前源码组件。

<a id="reuse"></a>

## 构建、复用与部署

- `npm run build:demo` 构建页面到仓库内 `dist/`；不会部署或发布。`npm run preview` 可用于检查构建产物。
- `npm run build:lib` 构建组件库。当前继承的配置和脚本将库产物写到**仓库父目录的 `npm-package/dist/`**，而 `package.json` 引用仓库内的 `npm-package/dist/`。发布或打包前需另行统一输出和包入口，并验证样式与类型声明；本次文档更新不改变构建配置。
- 官方 npm 包不含定制改动，直接从 Git 地址安装也不等于自动构建这些修改。当前可靠的演示方式是克隆定制分支并运行源码。
- 复用组件改进需携带修改后的 `src/`；复用完整排程体验还需要 `demo/ResourceSchedule.vue`、`ResourceYearOverview.vue`、`resourceOccupancies.ts`、相关样式和服务端代理。
- `server.proxy` 是开发服务器配置，静态生产产物不会自带该代理。部署需为 `/api/resource-occupancies` 配置能够访问业务服务的服务端转发。
- 当前入口按根路径 `/original`、`/resources` 判断页面；生产服务器应提供对应的单页入口回退。GitHub Pages 项目子路径部署还需要调整路径识别、导航和刷新回退，不能直接当作已支持，详见[部署说明](GITHUB-PAGES.md)。

<a id="maintenance"></a>

## Git 维护方式

当前仓库约定：`origin` 指向自有 Fork，`upstream` 指向原作者；定制开发在 `codex/resource-schedule` 上，`master` 保留上游基线。已有本地目录已配置好远程，新克隆的目录可按需执行：

```bash
git remote add upstream https://github.com/nelson820125/jordium-gantt-vue3.git
git config remote.pushDefault origin
```

添加前用 `git remote -v` 检查，已有同名远程时不要重复添加。日常修改按文件审查、提交、推送；提交到当前分支跟踪的自有仓库，不向原作者仓库直接推送。

合并上游前保存当前工作，并确认 `git status` 干净：

```bash
git switch codex/resource-schedule
git fetch upstream
git log --oneline HEAD..upstream/master
git diff HEAD...upstream/master -- src
```

查看更新内容后，再决定执行 `git merge upstream/master`。如有冲突，逐个解决并提交；放弃本次合并可使用 `git merge --abort`。测试、构建和必要的浏览器回归完成后执行 `git push`。

`fetch` 只更新远程引用，`merge` 才修改当前分支。不要用硬重置到上游的方式“同步”定制分支。优先检查 `Timeline.vue`、`TaskBar.vue`、`GanttChart.vue` 和列表滚动同步相关文件的冲突。

## 验证与已知限制

- 已完成的功能验证记录：日/周/月导航、手动滚动联动、资源筛选、年度汇总下钻、本地编辑、滚动同步，以及标题显隐、提示和详情。
- 最近代码验证为 2026-10-22：188 项测试中 184 通过、3 跳过、1 项上游基线失败；`npm run build:demo` 通过。这是当时结果，不代表后续改动自动通过。
- 基线失败为 `tests/unit/utils/conflictUtils.spec.ts` 的“应该处理没有资源的任务”：预期 0 个冲突，实际 1 个。遇到其他失败须单独排查，不能一律归为基线问题。
- 回归命令、测试文件和手工检查清单见[测试文档](../tests/README.md)。日/周/月显示和浏览器滚动行为仍需真实浏览器验证，单元测试不等于流畅度保证。
- 本 Fork 尚未接入后端保存、实际车间班次或服务端日期分页；年度色块统计记录数，不能作为设备利用率报表。

上游作者、许可证和历史更新记录继续保留；Fork 的新增内容在文档与变更记录中单独标识。
