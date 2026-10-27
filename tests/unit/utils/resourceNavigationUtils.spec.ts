import { describe, expect, it } from 'vitest'
import type { Task } from '../../../src/models/classes/Task'
import {
  getResourceNavigationItems,
  getResourceNavigationTargets,
} from '../../../src/utils/resourceNavigationUtils'

const base = new Date(2026, 2, 24).getTime()
const project = (date: Date) => (date.getTime() - base) / 60000
const task = (id: number, start: number, end = start): Task => ({
  id,
  name: String(id),
  startDate: new Date(base + start * 60000).toISOString(),
  endDate: new Date(base + end * 60000).toISOString(),
})

describe('resource offscreen task navigation', () => {
  it('selects the nearest end on the left and nearest start on the right regardless of input order', () => {
    const items = getResourceNavigationItems(
      [task(1, -10000), task(2, 700), task(3, -100, 90), task(4, 600), task(5, 20, 40)],
      true,
      project
    )
    const result = getResourceNavigationTargets(items, 100, 500)
    expect(result.left?.task.id).toBe(3)
    expect(result.right?.task.id).toBe(4)
  })

  it('keeps distant zero-duration tasks eligible even beyond the rendering buffer', () => {
    const items = getResourceNavigationItems([task(1, -100000), task(2, 100000)], true, project)
    const result = getResourceNavigationTargets(items, 100, 500)
    expect(result.left?.task.id).toBe(1)
    expect(result.right?.task.id).toBe(2)
    expect(items[0].right - items[0].left).toBe(4)
  })

  it('does not offer visible or partially visible bars, including the minimum-width zero-duration bar', () => {
    const items = getResourceNavigationItems(
      [task(1, 98), task(2, 200), task(3, 499, 700), task(4, 0, 1000)],
      true,
      project
    )
    expect(getResourceNavigationTargets(items, 100, 500)).toEqual({
      left: undefined,
      right: undefined,
    })
    expect(getResourceNavigationTargets(items, 102, 500).left?.task.id).toBe(1)
  })

  it('uses the exact marker position at day scale for zero-duration tasks', () => {
    const items = getResourceNavigationItems([task(1, 706)], false, project)
    expect(getResourceNavigationTargets(items, 709, 1500).left).toBeUndefined()
    expect(getResourceNavigationTargets(items, 710, 1500).left?.task.id).toBe(1)
    expect(getResourceNavigationTargets(items, 1440, 2000).left?.task.id).toBe(1)
  })

  it('excludes invalid/reversed dates, retains zero duration, and handles empty resources', () => {
    const items = getResourceNavigationItems(
      [task(1, 0), task(2, 20, 10), { ...task(3, 1), startDate: 'invalid' }],
      true,
      project
    )
    expect(items.map(item => item.task.id)).toEqual([1])
    expect(getResourceNavigationTargets([], 0, 100)).toEqual({ left: undefined, right: undefined })
  })
})
