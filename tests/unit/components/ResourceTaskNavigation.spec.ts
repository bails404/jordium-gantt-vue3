import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, onUpdated, ref } from 'vue'
import ResourceTaskNavigation from '../../../src/components/Timeline/ResourceTaskNavigation.vue'
import { getResourceNavigationItems } from '../../../src/utils/resourceNavigationUtils'
import type { Task } from '../../../src/models/classes/Task'

describe('resource navigation overlay', () => {
  it('locates zero-duration tasks on both sides and updates independently of its parent', async () => {
    const origin = new Date('2026-03-24 00:00:00').getTime()
    const tasks = [1, 3].map(hour => ({
      id: hour,
      name: `task ${hour}`,
      startDate: `2026-03-24 0${hour}:00:00`,
      endDate: `2026-03-24 0${hour}:00:00`,
    })) as Task[]
    const viewport = { top: ref(0), left: ref(150), width: ref(100), height: ref(200) }
    const items = [
      {
        id: 'unit',
        name: 'unit',
        top: 0,
        height: 1000,
        items: getResourceNavigationItems(tasks, true, date => (date.getTime() - origin) / 36000),
      },
    ]
    let parentUpdates = 0
    const host = mount(
      defineComponent({
        setup() {
          onUpdated(() => parentUpdates++)
          return () => h(ResourceTaskNavigation, { items, viewport })
        },
      })
    )
    const overlay = host.findComponent(ResourceTaskNavigation)
    await overlay.get('.resource-task-navigation-left').trigger('click')
    await overlay.get('.resource-task-navigation-right').trigger('click')
    expect(overlay.emitted('navigate')?.map(args => (args[0] as Date).getHours())).toEqual([1, 3])
    viewport.top.value = 500
    await nextTick()
    expect(parentUpdates).toBe(0)
    expect(overlay.attributes('style')).toContain('top: 500px')
    viewport.left.value = 0
    await nextTick()
    expect(overlay.get('.resource-task-navigation-left').attributes('style')).toContain(
      'display: none'
    )
    viewport.top.value = 1100
    await nextTick()
    expect(overlay.findAll('button')).toHaveLength(0)
    host.unmount()
  })
})
