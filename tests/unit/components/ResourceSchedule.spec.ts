import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import ResourceSchedule from '../../../demo/ResourceSchedule.vue'

const Chart = defineComponent({
  props: ['resources', 'focusDate', 'timeScale', 'scaleConfigs'],
  emits: ['viewport-date-change', 'focus-date-settled', 'taskbar-drag-end'],
  template: '<div class="test-chart" />',
})
const unit = { unitBusinessId: 'r1', unitCode: 'DJQG003-01', unitName: '大件钳工（宜万斌）' }
const records = [
  ['2026-11-19T16:24:00', '2026-11-21T14:06:00'],
  ['2026-11-21T14:06:00', '2026-11-23T13:12:00'],
].map(([startTime, endTime]) => ({
  unitBusinessId: unit.unitBusinessId,
  startTime,
  endTime,
  status: '已派工',
  qty: 1,
}))

let wrapper: ReturnType<typeof mount>
beforeEach(async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ units: [unit], occupancies: records }),
    })
  )
  wrapper = mount(ResourceSchedule, {
    global: { stubs: { GanttChart: Chart, TaskListColumn: true } },
  })
  await flushPromises()
  await wrapper
    .findAll('button')
    .find(button => button.text() === '日视图')!
    .trigger('click')
  await wrapper.get('input[type="date"]').setValue('2026-11-22')
  const chart = wrapper.getComponent(Chart)
  chart.vm.$emit('focus-date-settled', chart.props('focusDate'))
  await nextTick()
})
afterEach(() => {
  wrapper.unmount()
  vi.unstubAllGlobals()
})

describe('resource schedule date navigation', () => {
  it('shows annual counts, navigates years, and drills into a month while retaining filters', async () => {
    await wrapper.get('input[type="search"]').setValue('宜万斌')
    await wrapper
      .findAll('button')
      .find(button => button.text() === '年视图')!
      .trigger('click')
    expect(wrapper.findComponent(Chart).exists()).toBe(false)
    expect(wrapper.findAll('.annual-cell')).toHaveLength(12)
    expect(wrapper.get('.annual-cell[data-month="11"]').text()).toBe('2')
    expect(wrapper.get('.range-label').text()).toBe('2026年')
    expect(wrapper.get('.board-summary').text()).toContain('2 条占用')
    await wrapper.get('[aria-label="下一时段"]').trigger('click')
    expect(wrapper.get('.range-label').text()).toBe('2027年')
    expect(wrapper.get('.board-summary').text()).toContain('0 条占用')
    expect(wrapper.get('.annual-cell[data-month="11"]').text()).toBe('—')
    await wrapper.get('[aria-label="上一时段"]').trigger('click')
    expect(wrapper.get('.board-summary').text()).toContain('2 条占用')
    await wrapper.get('.annual-cell[data-month="11"]').trigger('click')
    expect(wrapper.get('.range-label').text()).toBe('2026年 11月')
    expect(wrapper.getComponent(Chart).props('timeScale')).toBe('day')
    expect(wrapper.getComponent(Chart).props('scaleConfigs').day.cellWidth).toBe(32)
    expect((wrapper.get('input[type="search"]').element as HTMLInputElement).value).toBe('宜万斌')
    expect(wrapper.getComponent(Chart).props('resources')[0].tasks).toHaveLength(2)
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
  })

  it('handles leap years and month ends and preserves clock times for month-view adjustments', async () => {
    await wrapper
      .findAll('button')
      .find(button => button.text() === '年视图')!
      .trigger('click')
    await wrapper.get('input[type="date"]').setValue('2024-02-29')
    await wrapper.get('[aria-label="下一时段"]').trigger('click')
    expect((wrapper.get('input[type="date"]').element as HTMLInputElement).value).toBe('2025-02-28')
    await wrapper
      .findAll('button')
      .find(button => button.text() === '月视图')!
      .trigger('click')
    await wrapper.get('input[type="date"]').setValue('2024-01-31')
    await wrapper.get('[aria-label="下一时段"]').trigger('click')
    expect((wrapper.get('input[type="date"]').element as HTMLInputElement).value).toBe('2024-02-29')
    const chart = wrapper.getComponent(Chart)
    const task = chart.props('resources')[0].tasks[0]
    chart.vm.$emit('taskbar-drag-end', task, unit.unitBusinessId, '2026-12-01', '2026-12-03')
    await nextTick()
    const adjusted = chart.props('resources')[0].tasks[0]
    expect(adjusted.startDate).toBe('2026-12-01 16:24:00')
    expect(adjusted.endDate).toBe('2026-12-03 14:06:00')
    await wrapper
      .findAll('button')
      .find(button => button.text() === '撤销全部调整')!
      .trigger('click')
    expect(chart.props('resources')[0].tasks[0].startDate).toBe(task.startDate)
  })

  it('updates annual counts after local edits and respects empty and status filters', async () => {
    const chart = wrapper.getComponent(Chart)
    const task = chart.props('resources')[0].tasks[0]
    chart.vm.$emit('taskbar-drag-end', task, unit.unitBusinessId, '2026-12-01', '2026-12-03')
    await nextTick()
    await wrapper
      .findAll('button')
      .find(button => button.text() === '年视图')!
      .trigger('click')
    expect(wrapper.get('.annual-cell[data-month="11"]').text()).toBe('1')
    expect(wrapper.get('.annual-cell[data-month="12"]').text()).toBe('1')
    await wrapper.get('input[type="date"]').setValue('2027-01-01')
    await wrapper.get('input[type="checkbox"]').setValue(true)
    expect(wrapper.findAll('.annual-cell')).toHaveLength(0)
    expect(wrapper.find('.annual-empty').exists()).toBe(true)
    await wrapper.get('input[type="date"]').setValue('2026-01-01')
    await wrapper.get('select').setValue('已派工')
    expect(wrapper.get('.annual-cell[data-month="11"]').text()).toBe('1')
    await wrapper
      .findAll('button')
      .find(button => button.text() === '撤销全部调整')!
      .trigger('click')
    expect(wrapper.get('.annual-cell[data-month="11"]').text()).toBe('2')
    expect(wrapper.get('.annual-cell[data-month="12"]').text()).toBe('—')
  })

  it('retains the full task data while scrolling and buttons change only focus and statistics', async () => {
    const chart = wrapper.getComponent(Chart)
    const requestedFocus = chart.props('focusDate')
    const fullResources = chart.props('resources')
    expect(fullResources[0].tasks).toHaveLength(2)
    expect(wrapper.get('.board-summary').text()).toContain('1 条占用')
    chart.vm.$emit('viewport-date-change', new Date('2026-11-21T00:00:00'))
    await nextTick()
    expect((wrapper.get('input[type="date"]').element as HTMLInputElement).value).toBe('2026-11-21')
    expect(chart.props('resources')[0].tasks).toHaveLength(2)
    expect(wrapper.get('.board-summary').text()).toContain('2 条占用')
    expect(chart.props('focusDate')).toBe(requestedFocus)
    expect(chart.props('resources')).toBe(fullResources)

    await wrapper.get('[aria-label="下一时段"]').trigger('click')
    expect(chart.props('focusDate')).not.toBe(requestedFocus)
    expect(chart.props('focusDate').getDate()).toBe(22)
    chart.vm.$emit('focus-date-settled', chart.props('focusDate'))
    await nextTick()
    expect(chart.props('resources')).toBe(fullResources)
    expect(wrapper.get('.board-summary').text()).toContain('1 条占用')
  })

  it('keeps the same timeline mounted through an empty date and restores resources on scroll back', async () => {
    const chart = wrapper.getComponent(Chart)
    chart.vm.$emit('viewport-date-change', new Date('2026-11-24T00:00:00'))
    await nextTick()
    expect(chart.props('resources')).toHaveLength(1)
    expect(chart.props('resources')[0].tasks).toHaveLength(2)
    expect(wrapper.get('.board-summary').text()).toContain('0 条占用')
    expect((wrapper.get('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(false)
    await wrapper.get('input[type="checkbox"]').setValue(true)
    expect(chart.props('resources')).toHaveLength(0)
    expect(wrapper.getComponent(Chart).vm).toBe(chart.vm)
    expect(wrapper.find('.chart-empty-message').exists()).toBe(true)
    chart.vm.$emit('viewport-date-change', new Date('2026-11-21T00:00:00'))
    await nextTick()
    expect(chart.props('resources')[0].tasks).toHaveLength(2)
    expect(wrapper.find('.chart-empty-message').exists()).toBe(false)
  })

  it('preserves the resource search when the scrolled date changes', async () => {
    await wrapper.get('input[type="search"]').setValue('不存在的设备')
    const chart = wrapper.getComponent(Chart)
    chart.vm.$emit('viewport-date-change', new Date('2026-11-21T00:00:00'))
    await nextTick()
    expect(chart.props('resources')).toHaveLength(0)
    await wrapper.get('input[type="search"]').setValue('宜万斌')
    expect(chart.props('resources')[0].tasks).toHaveLength(2)
  })

  it('does not replace or duplicate tasks during rapid navigation and a manual interruption', async () => {
    const chart = wrapper.getComponent(Chart)
    const originalResources = chart.props('resources')
    await wrapper.get('[aria-label="上一时段"]').trigger('click')
    await wrapper.get('[aria-label="下一时段"]').trigger('click')
    expect(chart.props('resources')[0].tasks).toHaveLength(2)
    chart.vm.$emit('viewport-date-change', new Date('2026-11-22T00:00:00'))
    await nextTick()
    expect(chart.props('resources')).toBe(originalResources)
    expect(chart.props('resources')[0].tasks).toHaveLength(2)
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
  })
})
