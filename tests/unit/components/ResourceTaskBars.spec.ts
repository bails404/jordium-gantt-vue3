import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, onUpdated, reactive, ref } from 'vue'
import ResourceTaskBars from '../../../src/components/Timeline/ResourceTaskBars.vue'
import type { Task } from '../../../src/models/classes/Task'

const task = (id: number) =>
  reactive({
    id,
    name: `task ${id}`,
    startDate: '2026-03-24 11:46:31',
    endDate: '2026-03-24 11:46:31',
  }) as Task
const startDate = new Date('2026-03-24')
const entry = (value: Task, dayWidth = 60) => ({
  bindings: { task: value, rowHeight: 60, dayWidth, startDate },
})

function stub(updated: () => void) {
  return defineComponent({
    props: ['task', 'dayWidth', 'rowHeight', 'startDate'],
    emits: ['click'],
    setup(props, { slots, emit }) {
      onUpdated(updated)
      return () =>
        h('button', { onClick: (event: MouseEvent) => emit('click', props.task, event) }, [
          `${props.task.name}:${props.dayWidth}`,
          slots['custom-task-content']?.({ task: props.task }),
        ])
    },
  })
}

describe('resource task bar render reuse', () => {
  it('keeps retained bars cached when clipping changes their indices within one resource', async () => {
    const updated = vi.fn()
    const values = [task(1), task(2), task(3)]
    const host = mount(ResourceTaskBars, {
      props: { entries: values.map(value => entry(value)), handlers: {}, renderKey: 0, sourceSlots: {} },
      global: { stubs: { TaskBar: stub(updated) } },
    })
    try {
      await host.setProps({ entries: values.slice(1).map(value => entry(value)) })
      expect(updated).not.toHaveBeenCalled()
      expect(host.findAll('button').map(button => button.text())).toEqual(['task 2:60', 'task 3:60'])
      await host.setProps({ entries: [entry(values[2]), entry(values[1], 120)] })
      expect(updated).toHaveBeenCalledTimes(1)
      expect(host.findAll('button').map(button => button.text())).toEqual(['task 3:60', 'task 2:120'])
    } finally {
      host.unmount()
    }
  })

  it('invalidates when the caller replaces a slot function without changing task props', async () => {
    const entries = [entry(task(1))]
    const handlers = {}
    const label = ref('before')
    const host = mount(
      defineComponent({
        setup: () => () => {
          // Capture a plain value, as a new caller slot can do after a parent update.
          const value = label.value
          const slots = { 'custom-task-content': () => h('span', value) }
          return h(ResourceTaskBars, { entries, handlers, renderKey: 0, sourceSlots: slots }, slots)
        },
      }),
      { global: { stubs: { TaskBar: stub(() => {}) } } }
    )
    try {
      label.value = 'replacement'
      await nextTick()
      expect(host.text()).toContain('replacement')
      expect(host.text()).not.toContain('before')
    } finally {
      host.unmount()
    }
  })

  it('skips unchanged bars across resource lists and refreshes changed bindings', async () => {
    const updated = vi.fn()
    const entries = ref([entry(task(1)), entry(task(2))])
    const handlers = {}
    const sourceSlots = {}
    const host = mount(
      defineComponent({
        setup: () => () =>
          h(
            'div',
            entries.value.map(item =>
              h(ResourceTaskBars, {
                key: item.bindings.task.id,
                entries: [item],
                renderKey: 0,
                handlers,
                sourceSlots,
              })
            )
          ),
      }),
      { global: { stubs: { TaskBar: stub(updated) } } }
    )
    try {
      entries.value = entries.value.map(item => ({ bindings: { ...item.bindings } }))
      await nextTick()
      expect(updated).not.toHaveBeenCalled()
      entries.value = entries.value.map((item, index) =>
        index ? item : entry(item.bindings.task, 120)
      )
      await nextTick()
      expect(updated).toHaveBeenCalledTimes(1)
      expect(host.text()).toContain('task 1:120')
      entries.value[1].bindings.task.name = 'changed in place'
      await nextTick()
      expect(host.text()).toContain('changed in place:60')
    } finally {
      host.unmount()
    }
  })

  it('keeps custom slot updates reactive and forwards the original click arguments', async () => {
    const value = task(1)
    const label = ref('before')
    const click = vi.fn()
    const content = () => h('span', label.value)
    const host = mount(ResourceTaskBars, {
      props: {
        entries: [entry(value)],
        renderKey: 0,
        handlers: { click },
        sourceSlots: { 'custom-task-content': content },
      },
      slots: { 'custom-task-content': content },
      global: { stubs: { TaskBar: stub(() => {}) } },
    })
    try {
      label.value = 'after'
      await nextTick()
      expect(host.text()).toContain('after')
      await host.get('button').trigger('click')
      expect(click).toHaveBeenCalledTimes(1)
      expect(click.mock.calls[0][0]).toBe(value)
      expect(click.mock.calls[0][1]).toBeInstanceOf(MouseEvent)
      await host.setProps({ entries: [entry(task(2)), entry(value)] })
      expect(host.findAll('button').map(button => button.text())).toEqual([
        'task 2:60after',
        'task 1:60after',
      ])
    } finally {
      host.unmount()
    }
  })
})
