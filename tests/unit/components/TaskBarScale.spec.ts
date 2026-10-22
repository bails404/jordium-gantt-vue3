import { it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import TaskBar from '../../../src/components/TaskBar.vue'
import { PositionCache } from '../../../src/utils/positionCache'

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
    expect(bar().style.left).toBe('2160px')
    expect(bar().style.width).toBe('360px')
    cache.buildCache(data, 'day', { day: 32 })
    await wrapper.setProps({ dayWidth: 32 })
    expect(bar().style.left).toBe('576px')
    expect(bar().style.width).toBe('96px')
    cache.buildCache(data, 'day', { day: 120 })
    await wrapper.setProps({ dayWidth: 120 })
    expect(bar().style.left).toBe('2160px')
    expect(bar().style.width).toBe('360px')
  } finally {
    wrapper.unmount()
  }
})
