import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, shallowMount } from '@vue/test-utils'
import { computed, defineComponent, h, inject, ref, type ComputedRef } from 'vue'
import GanttChart from '../../../src/components/GanttChart.vue'
import TaskRow from '../../../src/components/TaskList/taskRow/TaskRow.vue'
import { detectConflicts } from '../../../src/utils/conflictUtils'
import { isResourceOverloaded } from '../../../src/utils/resourceUtils'
import type { Resource } from '../../../src/models/classes/Resource'
import type { Task } from '../../../src/models/classes/Task'

vi.mock('../../../src/utils/conflictUtils', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../src/utils/conflictUtils')>()),
  detectConflicts: vi.fn(() => []),
}))
vi.mock('../../../src/utils/resourceUtils', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../src/utils/resourceUtils')>()),
  isResourceOverloaded: vi.fn(() => true),
}))
const resource = (day = '24') =>
  ({
    id: 'r1',
    name: 'unit',
    type: 'Device',
    tasks: [1, 2].map(id => ({
      id,
      name: `task ${id}`,
      startDate: `2026-03-${day}`,
      endDate: `2026-03-${day}`,
    })),
  }) as Resource
const Reader = defineComponent({
  setup(_, { expose }) {
    expose({ updateTimeScale: vi.fn(), scrollToToday: vi.fn(), getHeaderScrollWidth: () => null })
    const conflicts = inject<ComputedRef<Map<string, Set<number>>>>('resourceConflicts')!
    return () => h('div', String(conflicts.value.size))
  },
})
afterEach(() => vi.clearAllMocks())

describe('conflict display computation', () => {
  it('skips detection while disabled and rechecks current data when enabled again', async () => {
    const chart = shallowMount(GanttChart, {
      props: {
        viewMode: 'resource',
        resources: [resource()],
        showConflicts: false,
        showToolbar: false,
      },
      global: { stubs: { Timeline: Reader, TaskList: Reader } },
    })
    try {
      expect(detectConflicts).not.toHaveBeenCalled()
      await chart.setProps({ resources: [resource('25')] })
      expect(detectConflicts).not.toHaveBeenCalled()
      await chart.setProps({ showConflicts: true })
      expect(detectConflicts).toHaveBeenCalled()
      vi.mocked(detectConflicts).mockClear()
      await chart.setProps({ showConflicts: false })
      await chart.setProps({ resources: [resource('26')] })
      expect(detectConflicts).not.toHaveBeenCalled()
      await chart.setProps({ showConflicts: true })
      expect(vi.mocked(detectConflicts).mock.calls.at(-1)?.[0][0].startDate).toBe('2026-03-26')
    } finally {
      chart.unmount()
    }
  })

  it('keeps detection enabled by default', () => {
    const chart = shallowMount(GanttChart, {
      props: { viewMode: 'resource', resources: [resource()], showToolbar: false },
      global: { stubs: { Timeline: Reader, TaskList: Reader } },
    })
    try {
      expect(detectConflicts).toHaveBeenCalled()
    } finally {
      chart.unmount()
    }
  })

  it('uses shared conflict results for resource row badges without detecting again', async () => {
    const enabled = ref(false)
    const row = mount(TaskRow, {
      props: { task: resource() as unknown as Task, level: 0, columns: [] },
      global: {
        provide: {
          'gantt-view-mode': ref('resource'),
          'gantt-show-conflicts': enabled,
          resourceConflicts: computed(() => new Map([['r1', new Set([1, 2])]])),
        },
      },
    })
    try {
      expect(row.find('.resource-warning-icon').exists()).toBe(false)
      enabled.value = true
      await row.vm.$nextTick()
      expect(row.find('.resource-warning-icon').exists()).toBe(true)
      expect(isResourceOverloaded).not.toHaveBeenCalled()
      expect(detectConflicts).not.toHaveBeenCalled()
    } finally {
      row.unmount()
    }
  })
})
