import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import TaskBar from '../../../src/components/TaskBar.vue'

const observers: TestResizeObserver[] = []
class TestResizeObserver {
  targets = new Set<Element>()
  disconnect = vi.fn(() => this.targets.clear())
  constructor(public callback: ResizeObserverCallback) {
    observers.push(this)
  }
  observe(target: Element) {
    this.targets.add(target)
  }
  unobserve(target: Element) {
    this.targets.delete(target)
  }
}

beforeEach(() => {
  observers.length = 0
  vi.stubGlobal('ResizeObserver', TestResizeObserver)
})
afterEach(() => vi.unstubAllGlobals())

function createBar(hideTitleOnOverflow = true) {
  return mount(TaskBar, {
    attachTo: document.body,
    props: {
      task: { id: 1, name: '已派工 · 12 件', startDate: '2026-11-01', endDate: '2026-11-02' },
      rowHeight: 60,
      dayWidth: 120,
      startDate: new Date(2026, 10, 1),
      currentTimeScale: 'day',
      taskBarConfig: {
        showTitle: true,
        showProgress: false,
        showAvatar: false,
        hideTitleOnOverflow,
      },
    },
    global: {
      provide: {
        'gantt-view-mode': ref('resource'),
        'gantt-show-taskbar-tab': ref(false),
        'gantt-theme': ref('light'),
      },
    },
  })
}

async function measure(wrapper: ReturnType<typeof createBar>, box: number, text: number) {
  await nextTick()
  const content = wrapper.get('.task-bar-content').element as HTMLElement
  content.style.paddingLeft = '8px'
  content.style.paddingRight = '8px'
  const label = wrapper.get('.task-title-measure').element
  const observer = observers.find(item => item.targets.has(label))!
  observer.callback(
    [
      { target: content, contentRect: { width: box - 16 } },
      { target: label, contentRect: { width: text } },
    ] as ResizeObserverEntry[],
    observer as unknown as ResizeObserver
  )
  await nextTick()
  return observer
}

it('hides the whole title when narrow and restores it after resizing or changing text', async () => {
  const wrapper = createBar()
  try {
    const title = () => wrapper.get('.task-title-fit').element as HTMLElement
    const observer = await measure(wrapper, 76, 80)
    expect(title().style.visibility).toBe('hidden')
    expect(title().getAttribute('aria-hidden')).toBe('true')
    await measure(wrapper, 116, 80)
    expect(title().style.visibility).toBe('visible')
    expect(title().hasAttribute('aria-hidden')).toBe(false)
    await wrapper.setProps({ task: { ...wrapper.props('task'), name: '更长的任务标题' } })
    await measure(wrapper, 116, 140)
    expect(title().style.visibility).toBe('hidden')
    await measure(wrapper, 116, 60)
    expect(title().style.visibility).toBe('visible')
    wrapper.unmount()
    expect(observer.disconnect).toHaveBeenCalled()
  } finally {
    if (wrapper.exists()) wrapper.unmount()
  }
})

it('uses the visible portion when a bar crosses either viewport edge', async () => {
  const wrapper = createBar()
  try {
    await measure(wrapper, 240, 80)
    const title = () => wrapper.get('.task-title-fit').element as HTMLElement
    const left = parseFloat((wrapper.get('.task-bar').element as HTMLElement).style.left)
    await wrapper.setProps({ containerWidth: 100, scrollLeft: left })
    expect(title().style.visibility).toBe('visible')
    await wrapper.setProps({ containerWidth: 90 })
    expect(title().style.visibility).toBe('hidden')
    await wrapper.setProps({ containerWidth: 200, scrollLeft: left + 150 })
    expect(title().style.visibility).toBe('hidden')
    await wrapper.setProps({ scrollLeft: left + 140 })
    expect(title().style.visibility).toBe('visible')
  } finally {
    wrapper.unmount()
  }
})

it('keeps the existing title behavior when the option is disabled', () => {
  const wrapper = createBar(false)
  try {
    expect(wrapper.find('.task-title-fit').exists()).toBe(false)
    expect(wrapper.find('.task-title-measure').exists()).toBe(false)
    expect(wrapper.get('.task-name').text()).toBe('已派工 · 12 件')
  } finally {
    wrapper.unmount()
  }
})
