import { describe, expect, it } from 'vitest'
import {
  getBufferedWindow,
  getResourceTaskInterval,
} from '../../../src/utils/resourceViewportUtils'
import type { Task } from '../../../src/models/classes/Task'

describe('resource viewport buffer', () => {
  it('prepares two screens on each side and reuses the window during small scrolls', () => {
    const initial = getBufferedWindow(3000, 1000, 2)
    expect(initial).toMatchObject({ start: 1000, end: 6000 })
    expect(getBufferedWindow(4000, 1000, 2, initial)).toBe(initial)
    const advanced = getBufferedWindow(4600, 1000, 2, initial)
    expect(advanced).not.toBe(initial)
    expect(advanced).toMatchObject({ start: 2600, end: 7600 })
  })

  it('covers a large jump immediately without growing the retained window', () => {
    const initial = getBufferedWindow(3000, 1000, 2)
    const jumped = getBufferedWindow(100000, 1000, 2, initial)
    expect(jumped).toMatchObject({ start: 98000, end: 103000 })
    expect(jumped.end - jumped.start).toBe(5000)
    expect(getBufferedWindow(0, 1000, 2, jumped).start).toBe(0)
  })

  it('recalculates after resize or changing the buffer setting', () => {
    const initial = getBufferedWindow(3000, 1000, 2)
    expect(getBufferedWindow(3000, 1500, 2, initial)).toMatchObject({ start: 0, end: 7500 })
    expect(getBufferedWindow(3000, 1000, 0, initial)).toMatchObject({ start: 3000, end: 4000 })
  })
})

describe('resource task render intervals', () => {
  const task = { id: 1, startDate: '2026-11-19 16:24:00', endDate: '2026-11-21 14:06:00' } as Task
  it('retains exact cross-midnight times for hourly navigation', () => {
    expect(getResourceTaskInterval(task, true)).toEqual([
      Date.parse(task.startDate!),
      Date.parse(task.endDate!),
    ])
  })
  it('includes the full rendered cells at day scale', () => {
    expect(getResourceTaskInterval(task, false)).toEqual([
      new Date(2026, 10, 19).getTime(),
      new Date(2026, 10, 22).getTime(),
    ])
  })
  it('does not add a phantom day for a task ending at midnight', () => {
    expect(getResourceTaskInterval({ ...task, endDate: '2026-11-21 00:00' }, false)?.[1]).toBe(
      new Date(2026, 10, 21).getTime()
    )
  })
  it('ignores invalid dates', () => {
    expect(getResourceTaskInterval({ ...task, startDate: 'invalid' }, true)).toBeNull()
  })
})
