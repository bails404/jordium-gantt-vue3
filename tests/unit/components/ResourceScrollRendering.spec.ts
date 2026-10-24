import { describe, expect, it, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import GanttChart from '../../../src/components/GanttChart.vue'
import { getResourceTaskInterval } from '../../../src/utils/resourceViewportUtils'
import type { Resource } from '../../../src/models/classes/Resource'

vi.mock('../../../src/utils/resourceViewportUtils', async importOriginal => {
  const original = await importOriginal<typeof import('../../../src/utils/resourceViewportUtils')>()
  return { ...original, getResourceTaskInterval: vi.fn(original.getResourceTaskInterval) }
})

describe('resource scroll computation', () => {
  it('reuses parsed dates across vertical windows and invalidates after in-place date edits', async () => {
    const resources = reactive(
      Array.from({ length: 30 }, (_, id) => ({
        id: `r${id}`,
        name: `resource ${id}`,
        type: 'Device',
        tasks: [{ id, name: `task ${id}`, startDate: '2026-07-15', endDate: '2026-07-16' }],
      }))
    ) as Resource[]
    const chart = shallowMount(GanttChart, {
      attachTo: document.body,
      props: {
        resources,
        viewMode: 'resource',
        timeScale: 'day',
        resourceTaskBufferScreens: 2,
        showToolbar: false,
        showConflicts: false,
        focusDate: new Date('2026-07-15'),
      },
      global: { stubs: { Timeline: false, TaskList: false } },
    })
    try {
      await nextTick()
      expect(getResourceTaskInterval).toHaveBeenCalled()
      vi.mocked(getResourceTaskInterval).mockClear()
      const body = chart.get('.timeline-body')
      for (const top of [300, 900, 1200, 0]) {
        body.element.scrollTop = top
        await body.trigger('scroll')
      }
      expect(getResourceTaskInterval).not.toHaveBeenCalled()
      resources[0].tasks[0].startDate = '2026-07-14'
      await nextTick()
      expect(getResourceTaskInterval).toHaveBeenCalled()
      expect(vi.mocked(getResourceTaskInterval).mock.calls[0][0].startDate).toBe('2026-07-14')
    } finally {
      chart.unmount()
      vi.mocked(getResourceTaskInterval).mockClear()
    }
  })
})
