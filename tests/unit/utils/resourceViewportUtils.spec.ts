import { describe, expect, it } from 'vitest'
import {
  getBufferedWindow,
  getBufferedLaneRange,
  getResourceTaskInterval,
  getVisibleLaneRange,
  reuseVisibleRange,
} from '../../../src/utils/resourceViewportUtils'
import { assignTaskRows } from '../../../src/utils/taskLayoutUtils'
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
  it('retains exact timestamps at day scale too', () => {
    expect(getResourceTaskInterval(task, false)).toEqual([
      Date.parse(task.startDate!),
      Date.parse(task.endDate!),
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
  it('retains date-only whole days in local time at either scale', () => {
    for (const hourly of [true, false]) {
      expect(
        getResourceTaskInterval({ ...task, startDate: '2026-10-25', endDate: '2026-10-25' }, hourly)
      ).toEqual([new Date(2026, 9, 25).getTime(), new Date(2026, 9, 26).getTime()])
    }
  })
})

describe('vertical resource lanes', () => {
  it('reuses overscan during small scrolls and refills before visible lanes are lost', () => {
    const lanes = Array.from({ length: 101 }, (_, i) => i * 60)
    const first = getBufferedLaneRange(lanes, 1000, 1600, 120)
    expect(getBufferedLaneRange(lanes, 1040, 1640, 120, first)).toBe(first)
    const next = getBufferedLaneRange(lanes, 1120, 1720, 120, first)
    expect(next).not.toBe(first)
    expect(lanes[next.startIndex]).toBeLessThanOrEqual(1120)
    expect(lanes[next.endIndex]).toBeGreaterThanOrEqual(1720)
    for (const [top, bottom] of [
      [4000, 4600],
      [0, 600],
      [1120, 2500],
      [1120, 1200],
    ]) {
      const range = getBufferedLaneRange(lanes, top, bottom, 120, next)
      expect(lanes[range.startIndex]).toBeLessThanOrEqual(top)
      expect(lanes[range.endIndex]).toBeGreaterThanOrEqual(bottom)
      expect(range.endIndex - range.startIndex).toBeLessThanOrEqual(
        Math.ceil((bottom - top + 480) / 60)
      )
    }
    expect(getBufferedLaneRange([0], 0, 600, 120, first)).toEqual({ startIndex: 0, endIndex: 0 })
  })

  const offsets = [0, 60, 115, 188, 243]
  it('keeps partial lanes and their titles, including exact boundaries', () => {
    expect(getVisibleLaneRange(offsets, 61, 120)).toEqual({ startIndex: 1, endIndex: 3 })
    expect(getVisibleLaneRange(offsets, 60, 115)).toEqual({ startIndex: 0, endIndex: 3 })
  })
  it('reuses unchanged ranges and updates immediately on jumps, reverse scroll and resize', () => {
    const first = getVisibleLaneRange(offsets, 62, 120)
    expect(getVisibleLaneRange(offsets, 65, 125, first)).toBe(first)
    expect(getVisibleLaneRange(offsets, 200, 250, first)).toEqual({ startIndex: 3, endIndex: 4 })
    expect(getVisibleLaneRange(offsets, -100, 20, first)).toEqual({ startIndex: 0, endIndex: 1 })
    expect(getVisibleLaneRange(offsets, 65, 250, first)).toEqual({ startIndex: 1, endIndex: 4 })
    expect(reuseVisibleRange(1, 3, first)).toBe(first)
  })
  it('handles empty and entirely offscreen resources without changing their layout', () => {
    expect(getVisibleLaneRange([0], 0, 600)).toEqual({ startIndex: 0, endIndex: 0 })
    expect(getVisibleLaneRange(offsets, 300, 900)).toEqual({ startIndex: 4, endIndex: 4 })
    expect(getVisibleLaneRange(offsets, -900, -300)).toEqual({ startIndex: 0, endIndex: 0 })
    expect(offsets).toEqual([0, 60, 115, 188, 243])
  })
  it('retains zero-duration tasks in independently stacked lanes', () => {
    const tasks = Array.from({ length: 100 }, (_, id) => ({
      id,
      startDate: '2026-03-24 11:46:31',
      endDate: '2026-03-24 11:46:31',
    })) as Task[]
    const layout = assignTaskRows(tasks, 60, 'hour', false)
    const positions = [0]
    for (const height of layout.rowHeights) positions.push(positions.at(-1)! + height)
    const range = getVisibleLaneRange(positions, 2000, 2600)
    const rendered = tasks.filter(task => {
      const lane = layout.taskRowMap.get(task.id)!
      return lane >= range.startIndex && lane < range.endIndex
    })
    expect(rendered.length).toBeGreaterThan(0)
    expect(rendered.length).toBeLessThan(15)
    expect(rendered.every(task => task.startDate === task.endDate)).toBe(true)
    expect(layout.totalHeight).toBe(5505)
    expect(layout.taskRowMap.size).toBe(100)
  })
})
