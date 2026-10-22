<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import {
  addDays,
  addMonths,
  addYears,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns'
import GanttChart from '../src/components/GanttChart.vue'
import ResourceYearOverview from './ResourceYearOverview.vue'
import TaskListColumn from '../src/components/TaskList/TaskListColumn.vue'
import type { Resource } from '../src/models/classes/Resource'
import type { Task } from '../src/models/classes/Task'
import {
  adjustmentTime,
  dateText,
  normalizeOccupancies,
  overlaps,
  timeText,
  type OccupancyTask,
  type ScheduleUnit,
} from './resourceOccupancies'

const units = ref<ScheduleUnit[]>([])
const tasks = ref<OccupancyTask[]>([])
let originalTasks: OccupancyTask[] = []
const loading = ref(true)
const error = ref('')
const skipped = ref(0)
const updatedAt = ref('')
const query = ref('')
const status = ref('')
const occupiedOnly = ref(false)
const selectedDate = ref(dateText(new Date()))
const view = ref<'day' | 'week' | 'month' | 'year'>('month')
const changedIds = ref(new Set<number>())
const notice = ref('')
const gantt = ref<InstanceType<typeof GanttChart> | null>(null)
const detailDialog = ref<HTMLDialogElement | null>(null)
const selectedId = ref<number | null>(null)
let controller: AbortController | undefined

const selectedDay = computed(() => new Date(`${selectedDate.value}T00:00:00`))
const rangeStart = computed(() =>
  view.value === 'year'
    ? startOfYear(selectedDay.value)
    : view.value === 'month'
      ? startOfMonth(selectedDay.value)
      : view.value === 'week'
        ? startOfWeek(selectedDay.value, { weekStartsOn: 1 })
        : selectedDay.value
)
const rangeEnd = computed(() =>
  view.value === 'year'
    ? addYears(rangeStart.value, 1)
    : view.value === 'month'
      ? addMonths(rangeStart.value, 1)
      : addDays(rangeStart.value, view.value === 'week' ? 7 : 1)
)
const timeScale = computed(() => (view.value === 'day' ? 'hour' : 'day'))
const selectedFocusDate = computed(() => {
  if (view.value === 'month') {
    return new Date((rangeStart.value.getTime() + rangeEnd.value.getTime()) / 2)
  }
  const center = addDays(rangeStart.value, view.value === 'week' ? 3 : 0)
  center.setHours(12)
  return center
})
// 筛选日期与主动定位请求分开：手动滚动更新筛选，但不能再次触发居中。
const focusDate = shallowRef(selectedFocusDate.value)
let viewportDateUpdate: string | undefined
watch([selectedDate, view], () => {
  if (viewportDateUpdate !== selectedDate.value) focusDate.value = selectedFocusDate.value
  viewportDateUpdate = undefined
})

function syncViewportDate(date: Date) {
  const next = dateText(date)
  if (next === selectedDate.value) return
  viewportDateUpdate = next
  selectedDate.value = next
}
const rangeLabel = computed(() =>
  view.value === 'year'
    ? format(rangeStart.value, 'yyyy年')
    : view.value === 'month'
      ? format(rangeStart.value, 'yyyy年 M月')
      : view.value === 'day'
        ? format(rangeStart.value, 'yyyy年 M月 d日')
        : `${format(rangeStart.value, 'yyyy年 M月 d日')} — ${format(addDays(rangeEnd.value, -1), 'M月 d日')}`
)
const statuses = computed(() => [...new Set(tasks.value.map(task => task.status))])
const statusTasks = computed(() =>
  tasks.value.filter(task => !status.value || task.status === status.value)
)
const matchingTasks = computed(() =>
  statusTasks.value.filter(task => overlaps(task, rangeStart.value, rangeEnd.value))
)
const tasksByUnit = computed(() => {
  const grouped = new Map<string, OccupancyTask[]>()
  for (const task of matchingTasks.value) {
    const list = grouped.get(task.unitBusinessId) ?? []
    list.push(task)
    grouped.set(task.unitBusinessId, list)
  }
  return grouped
})
const visibleUnits = computed(() => {
  const keyword = query.value.trim().toLocaleLowerCase()
  return units.value.filter(
    unit =>
      (!keyword || `${unit.unitName} ${unit.unitCode}`.toLocaleLowerCase().includes(keyword)) &&
      (!occupiedOnly.value || tasksByUnit.value.has(unit.unitBusinessId))
  )
})
const visibleTasks = computed(() =>
  visibleUnits.value.flatMap(unit => tasksByUnit.value.get(unit.unitBusinessId) ?? [])
)
const occupiedCount = computed(
  () => visibleUnits.value.filter(unit => tasksByUnit.value.has(unit.unitBusinessId)).length
)
// 完整任务数据只随数据加载、编辑或状态筛选改变；日期仅用于定位和统计。
const allResources = computed<Resource[]>(() => {
  const grouped = new Map<string, OccupancyTask[]>()
  for (const task of statusTasks.value) {
    const list = grouped.get(task.unitBusinessId) ?? []
    list.push({ ...task })
    grouped.set(task.unitBusinessId, list)
  }
  return units.value.map(unit => ({
    id: unit.unitBusinessId,
    name: unit.unitName,
    code: unit.unitCode,
    type: 'Device',
    color: '#dce8e5',
    // The component mutates its input while dragging. Keep presentation copies separate
    // from the canonical local records, and reconcile through its drag/resize events.
    tasks: grouped.get(unit.unitBusinessId) ?? [],
  }))
})
const resources = computed(() => {
  const ids = new Set(visibleUnits.value.map(unit => unit.unitBusinessId))
  return allResources.value.filter(resource => ids.has(String(resource.id)))
})
const selectedTask = computed(() => tasks.value.find(task => task.id === selectedId.value))
const selectedUnit = computed(() =>
  units.value.find(unit => unit.unitBusinessId === selectedTask.value?.unitBusinessId)
)
const scaleConfigs = computed(() => ({
  hour: { cellWidth: 64, preBuffer: 1, sufBuffer: 1 },
  day: { cellWidth: view.value === 'month' ? 32 : 120, preBuffer: 1, sufBuffer: 1 },
}))
const resourceListConfig = { columns: [], defaultWidth: 280, minWidth: 220, maxWidth: 400 }
const taskBarConfig = {
  showAvatar: false,
  showProgress: false,
  showTitle: true,
  hideTitleOnOverflow: true,
}

async function loadData() {
  controller?.abort()
  const request = new AbortController()
  controller = request
  const timeout = window.setTimeout(() => request.abort(), 15000)
  loading.value = true
  error.value = ''
  try {
    const response = await fetch('/api/resource-occupancies', {
      signal: request.signal,
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(`资源数据请求失败（HTTP ${response.status}）。`)
    const result = normalizeOccupancies(await response.json())
    units.value = result.units
    tasks.value = result.tasks
    originalTasks = result.tasks.map(task => ({ ...task }))
    skipped.value = result.skipped
    changedIds.value = new Set()
    updatedAt.value = format(new Date(), 'HH:mm:ss')
    notice.value = ''
    detailDialog.value?.close()
  } catch (cause) {
    if (controller !== request) return
    error.value = request.signal.aborted
      ? '连接超时，请检查接口服务与局域网连接后重试。'
      : cause instanceof Error
        ? cause.message
        : '暂时无法获取资源数据，请重试。'
  } finally {
    window.clearTimeout(timeout)
    if (controller === request) {
      loading.value = false
    }
  }
}

function locateToday() {
  const today = dateText(new Date())
  if (selectedDate.value === today) {
    // 已选今天时也支持从手动滚动的位置返回；日期不变，不会触发第二次定位。
    gantt.value?.scrollToDate(selectedFocusDate.value)
  } else {
    selectedDate.value = today
  }
}

function moveDate(direction: number) {
  selectedDate.value = dateText(
    view.value === 'year'
      ? addYears(selectedDay.value, direction)
      : view.value === 'month'
        ? addMonths(selectedDay.value, direction)
        : addDays(selectedDay.value, direction * (view.value === 'week' ? 7 : 1))
  )
}

function openMonth(month: number) {
  selectedDate.value = dateText(new Date(selectedDay.value.getFullYear(), month, 1))
  view.value = 'month'
}

function changeDate(event: Event) {
  const value = (event.target as HTMLInputElement).value
  if (/^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)))
    selectedDate.value = value
}

function applyAdjustment(task: Task, unitBusinessId?: string, start?: string, end?: string) {
  const current = tasks.value.find(item => item.id === task.id)
  if (!current) return
  const startDate = adjustmentTime(
    start ?? task.startDate ?? current.startDate,
    current.startDate,
    view.value !== 'day'
  )
  const endDate = adjustmentTime(
    end ?? task.endDate ?? current.endDate,
    current.endDate,
    view.value !== 'day'
  )
  if (
    !Number.isFinite(Date.parse(startDate)) ||
    !Number.isFinite(Date.parse(endDate)) ||
    Date.parse(endDate) <= Date.parse(startDate)
  ) {
    notice.value = '调整未生效：结束时间必须晚于开始时间。'
    tasks.value = tasks.value.map(item => ({ ...item }))
    return
  }
  const targetUnit = unitBusinessId ?? current.unitBusinessId
  if (!units.value.some(unit => unit.unitBusinessId === targetUnit)) return
  tasks.value = tasks.value.map(item =>
    item.id === task.id ? { ...item, startDate, endDate, unitBusinessId: targetUnit } : item
  )
  changedIds.value = new Set([...changedIds.value, task.id])
  notice.value = '排程已在本页调整，刷新数据后将恢复。'
}

function moveResource(event: {
  task: Task
  targetResource: Resource
  newStartDate?: string
  newEndDate?: string
}) {
  applyAdjustment(event.task, String(event.targetResource.id), event.newStartDate, event.newEndDate)
}

function resetAdjustments() {
  tasks.value = originalTasks.map(task => ({ ...task }))
  changedIds.value = new Set()
  notice.value = '已恢复本次加载的原始排程。'
}

function openDetails(task: Task) {
  if (!tasks.value.some(item => item.id === task.id)) return
  selectedId.value = task.id
  detailDialog.value?.showModal()
}

function clearFilters() {
  query.value = ''
  status.value = ''
  occupiedOnly.value = false
}

onMounted(loadData)
onBeforeUnmount(() => {
  controller?.abort()
})
</script>

<template>
  <div class="schedule-page">
    <header class="workspace-header">
      <a href="/" class="workspace-brand"
        ><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span> Jordium</a
      >
      <nav aria-label="页面导航">
        <a href="/">示例导航</a><a href="/original">完整示例</a
        ><a href="/resources" aria-current="page">资源排程</a>
      </nav>
    </header>
    <main>
      <section class="page-heading">
        <div>
          <div class="eyebrow">车间计划 / RESOURCE SCHEDULE</div>
          <h1>
            资源排程<span class="live-tag"><i></i>实时数据</span>
          </h1>
          <p>让设备占用与加工安排，一目了然。</p>
        </div>
        <div class="heading-actions">
          <span v-if="updatedAt">最近获取 {{ updatedAt }}</span
          ><button class="workspace-button primary" :disabled="loading" @click="loadData">
            {{ loading ? '正在获取…' : '↻ 刷新数据' }}
          </button>
        </div>
      </section>

      <section class="schedule-board" aria-label="资源占用时间轴" :aria-busy="loading">
        <div class="board-toolbar">
          <div class="date-navigation">
            <div class="arrow-buttons">
              <button aria-label="上一时段" @click="moveDate(-1)">‹</button
              ><button aria-label="下一时段" @click="moveDate(1)">›</button>
            </div>
            <button class="workspace-button" @click="locateToday">今天</button>
            <label class="date-picker"
              ><span class="sr-only">选择日期</span
              ><input type="date" :value="selectedDate" @change="changeDate"
            /></label>
            <span class="range-label">{{ rangeLabel }}</span>
          </div>
          <div class="view-switch" role="group" aria-label="时间视图">
            <button :aria-pressed="view === 'day'" @click="view = 'day'">日视图</button
            ><button :aria-pressed="view === 'week'" @click="view = 'week'">周视图</button
            ><button :aria-pressed="view === 'month'" @click="view = 'month'">月视图</button
            ><button :aria-pressed="view === 'year'" @click="view = 'year'">年视图</button>
          </div>
        </div>
        <div class="filter-toolbar">
          <div class="filters">
            <label class="search-field"
              ><span aria-hidden="true">⌕</span
              ><input
                v-model="query"
                type="search"
                placeholder="搜索设备名称或编号"
                aria-label="搜索设备名称或编号"
            /></label>
            <select v-model="status" aria-label="占用状态">
              <option value="">全部状态</option>
              <option v-for="item in statuses" :key="item" :value="item">{{ item }}</option>
            </select>
            <label class="occupied-filter"
              ><input v-model="occupiedOnly" type="checkbox" />仅看有占用</label
            >
          </div>
          <div v-if="view !== 'year'" class="legend">
            <span class="legend-label">任务条</span>
            <span><i class="planned"></i>已派工</span><span><i class="processing"></i>加工中</span>
          </div>
        </div>
        <div class="board-summary">
          <span
            ><strong>{{ visibleUnits.length }}</strong> / {{ units.length }} 个资源<span
              class="summary-divider"
              >/</span
            ><strong>{{ visibleTasks.length }}</strong> 条占用<span class="summary-divider">/</span
            ><strong>{{ occupiedCount }}</strong> 个资源有安排</span
          ><span class="local-hint">{{
            view === 'year'
              ? '点击月份或色块查看当月排程'
              : '拖动调整时间 / 跨行调整资源 / 拖动边缘调整时长'
          }}</span>
        </div>

        <div v-if="view === 'day'" class="time-background-guide" aria-label="时间轴背景说明">
          <div class="legend">
            <span class="legend-label">时间背景</span>
            <span><i class="time-current"></i>当前小时</span>
            <span><i class="time-rest"></i>非工作时段（含周末）</span>
            <span><i class="time-work"></i>工作时段</span>
          </div>
          <p>
            示例工作时间：周一至周五
            08:00–12:00、13:00–18:00，并非实际车间班次。资源占用以任务条为准。
          </p>
        </div>

        <div v-if="error" class="error-state" role="alert">
          <strong>数据加载失败</strong>
          <p>{{ error }}</p>
          <p v-if="updatedAt">下方保留上次获取的数据。</p>
          <button class="workspace-button" @click="loadData">重新加载</button>
        </div>
        <div v-if="loading" class="loading-state" role="status">
          <span class="spinner"></span><strong>正在读取资源排程</strong
          ><span>加载设备和占用时间…</span>
        </div>
        <template v-else>
          <div v-if="skipped" class="data-warning" role="status">
            {{ skipped }} 条记录的时间或资源信息不完整，已跳过。
          </div>
          <ResourceYearOverview
            v-if="units.length && view === 'year'"
            :units="visibleUnits"
            :tasks="statusTasks"
            :year="selectedDay.getFullYear()"
            @select-month="openMonth"
          />
          <div v-else-if="units.length" class="chart-area">
            <GanttChart
              ref="gantt"
              :focus-date="focusDate"
              @viewport-date-change="syncViewportDate"
              :resources="resources"
              :resource-task-buffer-screens="2"
              view-mode="resource"
              :show-toolbar="false"
              :time-scale="timeScale"
              :scale-configs="scaleConfigs"
              :resource-list-config="resourceListConfig"
              :task-bar-config="taskBarConfig"
              task-list-column-render-mode="declarative"
              :row-height="64"
              :allow-drag-and-resize="true"
              :use-default-drawer="false"
              :use-default-milestone-dialog="false"
              :enable-task-list-context-menu="false"
              :enable-task-bar-context-menu="false"
              :enable-link-anchor="false"
              :show-taskbar-tab="false"
              :show-conflicts="false"
              :enable-task-bar-tooltip="true"
              theme="light"
              locale="zh-CN"
              @task-click="openDetails"
              @task-double-click="openDetails"
              @taskbar-drag-end="applyAdjustment"
              @taskbar-resize-end="applyAdjustment"
              @resource-drag-end="moveResource"
            >
              <TaskListColumn prop="name" label="设备 / 资源" :width="278">
                <template #default="{ row }"
                  ><div class="resource-label">
                    <span class="resource-symbol" aria-hidden="true">{{
                      String(row.code || row.name).slice(0, 2)
                    }}</span
                    ><span
                      ><strong :title="row.name">{{ row.name }}</strong
                      ><small>{{ row.code }}</small></span
                    >
                  </div></template
                >
              </TaskListColumn>
              <template #taskbar-tooltip="{ task }"
                ><div class="occupancy-tooltip">
                  <strong>{{ task.name }}</strong
                  ><span>开始：{{ timeText(task.startDate) }}</span
                  ><span>结束：{{ timeText(task.endDate) }}</span
                  ><small>点击查看详情 · 拖动可调整</small>
                </div></template
              >
            </GanttChart>
            <p v-if="!resources.length && !error" class="chart-empty-message" role="status">
              当前条件下没有资源安排，可继续横向滚动或调整筛选。
            </p>
          </div>
          <div v-else-if="!error" class="empty-state">
            <span class="empty-symbol" aria-hidden="true">▤</span>
            <h2>{{ units.length ? '当前条件下没有资源安排' : '暂无资源数据' }}</h2>
            <p>试试其他日期、设备名称，或显示全部资源。</p>
            <button class="workspace-button" @click="clearFilters">清除筛选，显示全部资源</button>
          </div>
        </template>
        <footer class="board-footer">
          <span><i class="local-dot"></i>本地演示 · 调整仅在本页生效，刷新数据或页面后恢复</span>
          <div v-if="changedIds.size" class="adjustment-status">
            <strong>{{ changedIds.size }} 条已调整</strong
            ><button @click="resetAdjustments">撤销全部调整</button>
          </div>
          <span v-else>{{
            view === 'year' ? '年度汇总随本页调整同步更新' : '横向滚动查看完整时间轴'
          }}</span>
        </footer>
      </section>
      <p class="notice" role="status" aria-live="polite">{{ notice }}</p>
      <div class="page-footer">
        <span>资源占用 · 车间排程工作台</span><span>Jordium Gantt Vue3</span>
      </div>
    </main>

    <dialog
      ref="detailDialog"
      class="detail-dialog"
      aria-labelledby="detail-title"
      @click="
        event => {
          if (event.target === detailDialog) detailDialog?.close()
        }
      "
    >
      <template v-if="selectedTask"
        ><div class="detail-heading">
          <div>
            <div class="eyebrow">OCCUPANCY DETAILS</div>
            <h2 id="detail-title">占用详情</h2>
          </div>
          <button class="close-dialog" aria-label="关闭详情" @click="detailDialog?.close()">
            ×
          </button>
        </div>
        <div class="detail-resource">
          <span class="status-badge" :class="{ processing: selectedTask.status === '加工中' }">{{
            selectedTask.status
          }}</span>
          <h3>{{ selectedUnit?.unitName }}</h3>
          <p>{{ selectedUnit?.unitCode }}</p>
        </div>
        <dl>
          <div>
            <dt>开始时间</dt>
            <dd>{{ timeText(selectedTask.startDate) }}</dd>
          </div>
          <div>
            <dt>结束时间</dt>
            <dd>{{ timeText(selectedTask.endDate) }}</dd>
          </div>
          <div>
            <dt>数量</dt>
            <dd>{{ selectedTask.qty }} 件</dd>
          </div>
          <div>
            <dt>实际业务 ID</dt>
            <dd>{{ selectedTask.actualBusinessId || '—' }}</dd>
          </div>
          <div>
            <dt>计划业务 ID</dt>
            <dd>{{ selectedTask.planBusinessId || '—' }}</dd>
          </div>
          <div>
            <dt>工序业务 ID</dt>
            <dd>{{ selectedTask.operationBusinessId || '—' }}</dd>
          </div>
          <div>
            <dt>资源业务 ID</dt>
            <dd>{{ selectedTask.unitBusinessId }}</dd>
          </div>
        </dl>
        <p class="detail-note">
          {{
            changedIds.has(selectedTask.id)
              ? '这条排程已在本页调整，尚未保存到后端。'
              : '数据来自资源占用接口。'
          }}
        </p>
        <button class="workspace-button primary dialog-done" @click="detailDialog?.close()">
          完成
        </button>
      </template>
    </dialog>
  </div>
</template>

<style scoped>
main {
  max-width: 1920px;
  margin: auto;
  padding: 30px 36px 18px;
}
.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 25px;
}
.eyebrow {
  font-size: 10px;
  letter-spacing: 1.4px;
  color: #8996a3;
}
h1 {
  display: flex;
  align-items: center;
  gap: 15px;
  margin: 10px 0;
  font-size: 27px;
  font-weight: 600;
  letter-spacing: -0.8px;
}
.page-heading p {
  font-size: 13px;
  color: #82909d;
  margin: 0;
}
.live-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #e6f3ec;
  color: #278269;
  border-radius: 4px;
  padding: 4px 7px;
  font-size: 10px;
  font-weight: 400;
  letter-spacing: 0;
}
.live-tag i {
  height: 5px;
  width: 5px;
  background: #278269;
  border-radius: 50%;
}
.heading-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 11px;
  color: #8e99a4;
}
.schedule-board {
  background: white;
  border: 1px solid #dfe5ea;
  border-radius: 10px;
  box-shadow: 0 3px 12px #21344704;
  overflow: hidden;
}
.board-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 17px 20px;
  border-bottom: 1px solid #e9edf1;
  flex-wrap: wrap;
}
.date-navigation {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.arrow-buttons {
  display: flex;
  border: 1px solid #dce2e8;
  border-radius: 6px;
  overflow: hidden;
}
.arrow-buttons button {
  border: 0;
  background: white;
  color: #53657a;
  font-size: 23px;
  height: 34px;
  width: 32px;
}
.arrow-buttons button + button {
  border-left: 1px solid #e1e6eb;
}
.arrow-buttons button:hover {
  background: #f2f6f7;
}
.date-picker input {
  border: 1px solid #dce2e8;
  border-radius: 6px;
  height: 36px;
  color: #4a5b6e;
  padding: 0 8px;
  background: white;
  font-size: 12px;
}
.range-label {
  font-size: 13px;
  font-weight: 600;
  margin-left: 4px;
}
.view-switch {
  display: flex;
  background: #f0f3f5;
  border-radius: 6px;
  padding: 3px;
}
.view-switch button {
  border: 0;
  padding: 6px 15px;
  background: transparent;
  color: #7d8996;
  border-radius: 4px;
  font-size: 12px;
}
.view-switch button[aria-pressed='true'] {
  background: white;
  color: #1c7664;
  box-shadow: 0 1px 4px #23364712;
  font-weight: 600;
}
.filter-toolbar {
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.filters {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.search-field {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f7f9fa;
  border: 1px solid #e1e6eb;
  border-radius: 6px;
  padding: 0 10px;
}
.search-field > span {
  color: #71859b;
  font-size: 23px;
}
.search-field input {
  height: 34px;
  width: 194px;
  border: 0;
  background: transparent;
  color: #34465c;
  font-size: 12px;
}
.search-field input::placeholder {
  color: #9aa5b0;
}
select {
  height: 36px;
  min-width: 112px;
  padding: 0 10px;
  border: 1px solid #e1e6eb;
  background: white;
  border-radius: 6px;
  color: #5c6c7e;
  font-size: 12px;
}
.occupied-filter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6a7a8b;
}
input[type='checkbox'] {
  accent-color: #168470;
}
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  font-size: 11px;
  color: #738293;
}
.legend span {
  display: flex;
  align-items: center;
  gap: 6px;
}
.legend i {
  height: 7px;
  width: 7px;
  border-radius: 2px;
}
.legend-label {
  color: #526477;
  font-weight: 600;
}
.time-background-guide {
  padding: 10px 20px;
  border-bottom: 1px solid #e6ebef;
}
.time-background-guide p {
  margin: 7px 0 0;
  color: #738293;
  font-size: 11px;
  line-height: 1.6;
}
.time-background-guide .legend i {
  width: 12px;
  height: 12px;
  border: 1px solid #dce4ec;
}
.time-current {
  background: #d9ecff;
}
.time-rest {
  background: #f8fafc;
}
.time-work {
  background: #fff;
}
.planned {
  background: #537eb4;
}
.processing {
  background: #208777;
}
.board-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  background: #fcfdfd;
  padding: 11px 20px;
  border-top: 1px solid #edf0f3;
  border-bottom: 1px solid #e6ebef;
  color: #8a96a3;
  font-size: 11px;
}
.board-summary strong {
  color: #45596f;
  font-weight: 600;
}
.summary-divider {
  margin: 0 13px;
  color: #d4dbe1;
}
.local-hint {
  font-size: 10px;
}
.chart-area {
  position: relative;
  height: max(430px, calc(100dvh - 405px));
  min-width: 0;
}
.chart-empty-message {
  position: absolute;
  top: 130px;
  left: 300px;
  right: 20px;
  color: #75857f;
  text-align: center;
  pointer-events: none;
}
.chart-area :deep(.gantt-root) {
  border: 0;
  border-radius: 0;
  box-shadow: none;
  --gantt-text-primary: #405268;
  --gantt-bg-secondary: #f7f9fb;
  --gantt-border-light: #eaf0f3;
  --gantt-primary: #168470;
}
.chart-area :deep(.gantt-splitter) {
  width: 4px;
  background: #edf1f4;
}
.chart-area :deep(.task-list-header),
.chart-area :deep(.timeline-header) {
  font-size: 11px;
  font-weight: 500;
}
.chart-area :deep(.task-bar) {
  border-radius: 5px;
  box-shadow: none !important;
  font-size: 11px;
  z-index: 10;
}
.chart-area :deep(.task-bar.resource-view) {
  background: color-mix(in srgb, currentColor 12%, white) !important;
  border: 1px solid color-mix(in srgb, currentColor 24%, white) !important;
  border-left: 3px solid currentColor !important;
}
.chart-area :deep(.task-bar.resource-view::after),
.chart-area :deep(.task-bar.resource-view::before) {
  display: none;
}
.chart-area :deep(.task-bar .resize-handle) {
  background: transparent;
}
.chart-area :deep(.task-bar:hover .resize-handle) {
  background: color-mix(in srgb, currentColor 15%, transparent);
}
.chart-area :deep(.year-month-label) {
  position: sticky;
  left: 16px;
  width: max-content;
  padding: 0 16px;
}
.chart-area :deep(.timeline-day.today) {
  background: #e8f4ef;
  color: #168470;
}
.chart-area :deep(.task-bar .task-name) {
  font-weight: 500;
}
.chart-area :deep(.task-type-resource) {
  border-left: 0;
}
.chart-area :deep(.task-list-container) {
  border-radius: 0;
}
.resource-label {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
  padding: 5px 10px;
}
.resource-symbol {
  flex: 0 0 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e2e9ef;
  background: #f5f8fa;
  color: #8095a9;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
}
.resource-label > span:last-child {
  min-width: 0;
}
.resource-label strong {
  display: block;
  font-size: 12px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.resource-label small {
  display: block;
  color: #98a4af;
  font-size: 10px;
  margin-top: 5px;
}
.board-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 13px 20px;
  font-size: 10px;
  color: #95a1ac;
  border-top: 1px solid #e5ebef;
}
.local-dot {
  display: inline-block;
  height: 5px;
  width: 5px;
  background: #d6a351;
  border-radius: 50%;
  margin-right: 5px;
  vertical-align: middle;
}
.adjustment-status {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #a47129;
}
.adjustment-status button {
  border: 0;
  background: none;
  color: #168470;
  font-size: 11px;
  padding: 0;
  text-decoration: underline;
}
.loading-state,
.empty-state {
  min-height: 430px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #92a0ad;
  font-size: 13px;
}
.loading-state strong {
  font-weight: 500;
  color: #4c6073;
}
.spinner {
  width: 25px;
  height: 25px;
  border: 2px solid #dcece7;
  border-top-color: #168470;
  border-radius: 50%;
  animation: rotate 1s linear infinite;
}
@keyframes rotate {
  to {
    transform: rotate(360deg);
  }
}
.empty-symbol {
  color: #a8bdb8;
  font-size: 35px;
}
.empty-state h2 {
  color: #4d6276;
  margin: 0;
  font-size: 17px;
  font-weight: 500;
}
.empty-state p {
  margin: 0;
}
.error-state {
  padding: 24px;
  background: #fff5f1;
  border-bottom: 1px solid #f0ddd3;
  color: #945d43;
  font-size: 13px;
}
.data-warning {
  padding: 10px 20px;
  font-size: 12px;
  background: #fff8e9;
  color: #956f2d;
}
.notice {
  min-height: 18px;
  margin: 10px 0 2px;
  font-size: 12px;
  color: #258371;
}
.page-footer {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #a2adb7;
}
.occupancy-tooltip {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #dce4ec;
  border-top: 3px solid var(--tt-color, #537eb4);
  border-radius: 8px;
  background: #fff;
  color: #223247;
  box-shadow: 0 6px 24px rgb(34 50 71 / 16%);
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.occupancy-tooltip small {
  color: #617285;
}
.detail-dialog {
  width: min(470px, calc(100vw - 32px));
  max-height: 90dvh;
  overflow: auto;
  border: 1px solid #e0e6eb;
  border-radius: 14px;
  padding: 28px;
  color: #34465c;
  box-shadow: 0 20px 80px #132c4530;
}
.detail-dialog::backdrop {
  background: #142b4055;
}
.detail-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.detail-heading h2 {
  margin: 8px 0 0;
  font-size: 22px;
  font-weight: 600;
}
.close-dialog {
  border: 0;
  background: #f3f6f8;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  color: #758491;
  font-size: 23px;
}
.detail-resource {
  margin-top: 26px;
  border-bottom: 1px solid #e8edf0;
  padding-bottom: 18px;
}
.status-badge {
  display: inline-block;
  background: #eaf0f9;
  color: #537eb4;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
}
.status-badge.processing {
  color: #208777;
  background: #e4f3ed;
}
.detail-resource h3 {
  font-size: 16px;
  margin: 12px 0 6px;
}
.detail-resource p {
  margin: 0;
  color: #97a3ae;
  font-size: 12px;
}
dl {
  margin: 20px 0;
}
dl > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
  font-size: 12px;
}
dt {
  color: #8b99a6;
  flex-shrink: 0;
}
dd {
  margin: 0;
  overflow-wrap: anywhere;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.detail-note {
  background: #f6f8fa;
  padding: 12px;
  font-size: 11px;
  line-height: 1.6;
  color: #81909f;
  border-radius: 6px;
}
.dialog-done {
  width: 100%;
  margin-top: 12px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@media (max-width: 1100px) {
  .local-hint,
  .range-label {
    display: none;
  }
}
@media (max-width: 700px) {
  main {
    padding: 22px 12px 16px;
  }
  .heading-actions > span {
    display: none;
  }
  .page-heading {
    gap: 8px;
  }
  .page-heading p {
    font-size: 11px;
  }
  h1 {
    font-size: 23px;
  }
  .board-toolbar,
  .filter-toolbar {
    padding: 12px;
  }
  .date-navigation {
    gap: 7px;
  }
  .date-picker input {
    width: 125px;
  }
  .board-summary {
    padding: 10px 12px;
  }
  .summary-divider {
    margin: 0 7px;
  }
  .board-footer {
    align-items: flex-start;
    flex-direction: column;
    padding: 12px;
    gap: 8px;
  }
  .search-field input {
    width: 170px;
  }
  .legend {
    margin-left: auto;
  }
  .live-tag {
    display: none;
  }
  .chart-area {
    height: 510px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}
</style>
