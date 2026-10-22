<script setup lang="ts">
import { computed } from 'vue'
import {
  summarizeOccupanciesByMonth,
  type OccupancyTask,
  type ScheduleUnit,
} from './resourceOccupancies'

const props = defineProps<{ units: ScheduleUnit[]; tasks: OccupancyTask[]; year: number }>()
const emit = defineEmits<{ 'select-month': [month: number] }>()
const months = Array.from({ length: 12 }, (_, index) => index)
const counts = computed(() => summarizeOccupanciesByMonth(props.tasks, props.year))
const rows = computed(() =>
  props.units.map(unit => ({
    unit,
    counts: counts.value.get(unit.unitBusinessId) ?? months.map(() => 0),
  }))
)
const levels = ['无记录', '1–5 条', '6–15 条', '16–30 条', '31 条及以上']
function level(count: number) {
  return count === 0 ? 0 : count <= 5 ? 1 : count <= 15 ? 2 : count <= 30 ? 3 : 4
}
function cellLabel(name: string, month: number, count: number) {
  return `${name}，${props.year}年${month + 1}月，${count}条占用记录；点击查看当月排程`
}
</script>

<template>
  <section class="annual-overview" aria-label="年度资源占用汇总">
    <div class="annual-guide">
      <div>
        <strong>全年占用分布</strong>
        <p>每格为当月占用记录数；跨月记录会计入各月，全年统计按记录去重。</p>
      </div>
      <div class="annual-legend" aria-label="记录数颜色图例">
        <span v-for="(label, index) in levels" :key="label">
          <i :class="`level-${index}`" aria-hidden="true"></i>{{ label }}
        </span>
      </div>
    </div>
    <div class="annual-scroll" tabindex="0" aria-label="可滚动的年度资源汇总表">
      <table class="annual-table">
        <caption class="sr-only">
          {{
            year
          }}年资源月度占用记录数，颜色深浅表示记录多少，并非资源利用率
        </caption>
        <thead>
          <tr>
            <th scope="col" class="annual-resource">设备 / 资源</th>
            <th v-for="month in months" :key="month" scope="col">
              <button
                :aria-label="`查看${year}年${month + 1}月排程`"
                @click="emit('select-month', month)"
              >
                {{ month + 1 }}月
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="{ unit, counts: values } in rows"
            :key="unit.unitBusinessId"
            :data-resource-id="unit.unitBusinessId"
          >
            <th scope="row" class="annual-resource">
              <strong :title="unit.unitName">{{ unit.unitName }}</strong>
              <small>{{ unit.unitCode }}</small>
            </th>
            <td v-for="(count, month) in values" :key="month">
              <button
                class="annual-cell"
                :class="`level-${level(count)}`"
                :data-month="month + 1"
                :aria-label="cellLabel(unit.unitName, month, count)"
                :title="cellLabel(unit.unitName, month, count)"
                @click="emit('select-month', month)"
              >
                {{ count || '—' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!rows.length" class="annual-empty" role="status">
        没有符合当前筛选条件的资源，请调整搜索或筛选。
      </p>
    </div>
    <p class="annual-note">
      颜色仅表示占用记录数量，不代表工作时长或资源利用率。具体时间与状态可进入月视图查看。
    </p>
  </section>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.annual-overview {
  color: #405268;
}
.annual-guide {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 20px 24px;
  border-bottom: 1px solid #eaf0f3;
}
.annual-guide strong {
  font-size: 13px;
}
.annual-guide p,
.annual-note {
  color: #72818e;
  font-size: 11px;
  line-height: 1.7;
}
.annual-guide p {
  margin: 5px 0 0;
}
.annual-legend {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 11px;
}
.annual-legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.annual-legend i {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  border: 1px solid #dce8e5;
}
.annual-scroll {
  max-height: max(350px, calc(100dvh - 485px));
  overflow: auto;
}
.annual-table {
  width: 100%;
  min-width: 980px;
  table-layout: fixed;
  border-spacing: 0;
  font-size: 12px;
}
.annual-table th,
.annual-table td {
  border-bottom: 1px solid #edf1f4;
  padding: 7px 5px;
}
.annual-table thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  height: 44px;
  background: #f7f9fb;
}
.annual-table .annual-resource {
  position: sticky;
  left: 0;
  width: 260px;
  padding: 12px 20px;
  text-align: left;
  background: white;
  z-index: 1;
  border-right: 1px solid #edf1f4;
}
.annual-table thead .annual-resource {
  z-index: 3;
  background: #f7f9fb;
}
.annual-resource strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}
.annual-resource small {
  display: block;
  margin-top: 5px;
  color: #8997a4;
  font-weight: 400;
}
.annual-table button {
  cursor: pointer;
  font: inherit;
  border: 0;
  border-radius: 5px;
}
.annual-table thead button {
  background: transparent;
  color: #405268;
  padding: 8px 4px;
  width: 100%;
}
.annual-cell {
  width: 100%;
  min-height: 38px;
  font-variant-numeric: tabular-nums;
  font-weight: 600 !important;
}
.annual-table button:hover {
  box-shadow: inset 0 0 0 2px #168470;
}
.annual-table button:focus-visible {
  outline: 2px solid #168470;
  outline-offset: 2px;
}
.level-0 {
  background: #f4f7f8;
  color: #98a5af;
}
.level-1 {
  background: #e3f2ed;
  color: #286d5e;
}
.level-2 {
  background: #b9dfd2;
  color: #175a49;
}
.level-3 {
  background: #64b99c;
  color: #113f33;
}
.level-4 {
  background: #18775f;
  color: #fff;
}
.annual-empty {
  text-align: center;
  padding: 40px 20px;
  color: #72818e;
  font-size: 12px;
}
.annual-note {
  margin: 0;
  padding: 12px 24px;
  border-top: 1px solid #edf1f4;
}
@media (max-width: 700px) {
  .annual-table .annual-resource {
    width: 180px;
    padding: 12px;
  }
}
</style>
