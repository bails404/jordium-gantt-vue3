import { it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import TaskBar from '../../../src/components/TaskBar.vue'
import { PositionCache } from '../../../src/utils/positionCache'
import { assignTaskRows } from '../../../src/utils/taskLayoutUtils'
import type { Task } from '../../../src/models/classes/Task'

it('repositions existing resource bars when the same day scale changes width', async () => {
  const data = [
    {
      startDate: new Date(2026, 10, 1),
      endDate: new Date(2026, 10, 30),
      days: Array.from({ length: 30 }, (_, day) => ({ date: new Date(2026, 10, day + 1) })),
    },
  ] as Parameters<PositionCache['buildCache']>[0]
  const cache = new PositionCache()
  cache.buildCache(data, 'day', { day: 120 })
  const wrapper = mount(TaskBar, {
    props: {
      task: {
        id: 1,
        name: '占用',
        startDate: '2026-11-19 16:24:00',
        endDate: '2026-11-21 14:06:00',
      },
      rowHeight: 60,
      dayWidth: 120,
      startDate: new Date(2026, 10, 1),
      currentTimeScale: 'day',
      timelineData: data,
      taskBarConfig: { showTitle: true, showProgress: false, showAvatar: false },
    },
    global: {
      provide: {
        positionCache: cache,
        'gantt-view-mode': ref('resource'),
        'gantt-show-taskbar-tab': ref(false),
      },
    },
  })
  try {
    const bar = () => wrapper.get('.task-bar').element as HTMLElement
    expect(parseFloat(bar().style.left)).toBeCloseTo(2242)
    expect(parseFloat(bar().style.width)).toBeCloseTo(228.5)
    cache.buildCache(data, 'day', { day: 32 })
    await wrapper.setProps({ dayWidth: 32 })
    expect(parseFloat(bar().style.left)).toBeCloseTo(597.8666667)
    expect(parseFloat(bar().style.width)).toBeCloseTo(60.9333333)
    cache.buildCache(data, 'day', { day: 120 })
    await wrapper.setProps({ dayWidth: 120 })
    expect(parseFloat(bar().style.left)).toBeCloseTo(2242)
    expect(parseFloat(bar().style.width)).toBeCloseTo(228.5)
  } finally {
    wrapper.unmount()
  }
})

it.each([
  ['day view', 'hour', 64 * 24],
  ['week view', 'day', 120],
  ['month view', 'day', 32],
] as const)(
  '%s renders adjacent intervals edge-to-edge and overlaps in different lanes',
  async (_, scale, dayWidth) => {
    const tasks: Task[] = [
      { id: 1, name: 'A', startDate: '2026-10-25 10:24:00', endDate: '2026-10-25 11:25:00' },
      { id: 2, name: 'B', startDate: '2026-10-25 11:25:00', endDate: '2026-10-25 11:48:00' },
      { id: 3, name: 'overlap', startDate: '2026-10-25 11:24:59', endDate: '2026-10-25 11:30:00' },
    ]
    const layout = assignTaskRows(tasks, 60, scale)
    const wrappers = tasks.map(task =>
      mount(TaskBar, {
        props: {
          task,
          rowHeight: 60,
          dayWidth,
          startDate: new Date(2026, 9, 25),
          currentTimeScale: scale,
          taskSubRow: layout.taskRowMap.get(task.id),
          rowHeights: layout.rowHeights,
          taskBarConfig: { showTitle: true, showProgress: false, showAvatar: false },
        },
        global: {
          provide: {
            'gantt-view-mode': ref('resource'),
            'gantt-show-taskbar-tab': ref(false),
            'gantt-theme': ref('light'),
          },
        },
      })
    )
    try {
      const styles = wrappers.map(
        wrapper => (wrapper.get('.task-bar').element as HTMLElement).style
      )
      expect(styles[0].top).toBe(styles[1].top)
      expect(styles[2].top).not.toBe(styles[0].top)
      expect(parseFloat(styles[0].left) + parseFloat(styles[0].width)).toBeCloseTo(
        parseFloat(styles[1].left),
        5
      )
      expect(parseFloat(styles[1].width)).toBeCloseTo((23 / 1440) * dayWidth, 5)
      expect(parseFloat(styles[2].left)).toBeCloseTo(
        ((11 * 3600 + 24 * 60 + 59) / 86400) * dayWidth,
        5
      )
      await wrappers[1].get('.task-bar').trigger('click')
      await vi.waitFor(() => expect(wrappers[1].emitted('click')?.[0]?.[0]).toEqual(tasks[1]))
      await wrappers[1].setProps({ task: { ...tasks[1], endDate: tasks[1].startDate } })
      expect(styles[1].width).toBe('4px')
    } finally {
      wrappers.forEach(wrapper => wrapper.unmount())
    }
  }
)
