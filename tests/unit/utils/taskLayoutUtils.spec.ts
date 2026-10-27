/**
 * taskLayoutUtils.spec.ts - 资源视图任务换行布局单元测试
 *
 * 重点覆盖 v1.13.5 修复：hasTimeOverlap 对"endDate 显式带 time 部分"的
 * 场景需要先经 getEffectiveEndDateOnly 修正，避免本不重叠的任务被错误换行
 * （详见 .ai/.claude/requirments/v1.13.5.md 第9节）
 */

import { describe, it, expect } from 'vitest'
import { assignTaskRows, hasTimeOverlap } from '../../../src/utils/taskLayoutUtils'
import type { Task } from '../../../src/models/classes/Task'
import { parseTaskDate } from '../../../src/utils/taskPositionUtils'

describe('taskLayoutUtils', () => {
  describe('cached layout intervals', () => {
    const tasks = [
      ['2026-03-24 11:46:31', '2026-03-24 11:46:31'],
      ['2026-03-24 11:46:31', '2026-03-24 11:46:31'],
      ['2026-03-24 08:00', '2026-03-25 00:00'],
      ['2026-03-25 00:00', '2026-03-25 12:00'],
      ['2026-03-24', '2026-03-25'],
      [undefined, undefined],
      ['invalid', 'invalid'],
    ].map(([startDate, endDate], id) => ({ id, name: `task ${id}`, startDate, endDate }))

    it.each(['hour', 'day', 'week', 'month'])(
      'preserves greedy lane assignment at %s scale',
      scale => {
        // Reference pairwise packing used before pre-parsing, including malformed dates.
        const lanes: Task[][] = []
        const expected = new Map<number, number>()
        const sorted = [...tasks].sort(
          (a, b) =>
            (parseTaskDate(a.startDate)?.getTime() ?? 0) -
            (parseTaskDate(b.startDate)?.getTime() ?? 0)
        )
        for (const task of sorted) {
          let lane = lanes.findIndex(items =>
            items.every(other => !hasTimeOverlap(task, other, scale))
          )
          if (lane < 0) {
            lane = lanes.length
            lanes.push([])
          }
          lanes[lane].push(task)
          expected.set(task.id, lane)
        }
        const actual = assignTaskRows(tasks, 60, scale)
        expect(actual.taskRowMap).toEqual(expected)
        expect(actual.rowHeights).toEqual(lanes.map((_, i) => (i === 0 ? 60 : 55)))
        expect(actual.taskRowMap.size).toBe(tasks.length)
      }
    )

    it('keeps independent rows, empty input and task updates correct', () => {
      expect(assignTaskRows([], 60).totalHeight).toBe(60)
      expect(assignTaskRows(tasks, 60, 'hour', false).rowHeights).toHaveLength(tasks.length)
      const pair = tasks.slice(0, 2).map(task => ({ ...task }))
      expect(assignTaskRows(pair, 60, 'hour').taskRowMap.get(1)).toBe(0)
      pair[1].startDate = pair[1].endDate = '2026-03-26 11:46:31'
      expect(assignTaskRows(pair, 60, 'hour').taskRowMap.get(1)).toBe(0)
    })
  })
  describe('hasTimeOverlap', () => {
    it('纯日期任务：结束日与另一任务开始日相同应视为重叠（endDate 含当天）', () => {
      const taskA: Task = {
        id: 1,
        name: 'A',
        startDate: '2025-01-28',
        endDate: '2025-01-29',
      } as Task
      const taskB: Task = {
        id: 2,
        name: 'B',
        startDate: '2025-01-29',
        endDate: '2025-01-30',
      } as Task

      expect(hasTimeOverlap(taskA, taskB)).toBe(true)
    })

    it('v1.13.5：TaskA.endDate=次日00:00（TaskDrawer 编辑保存后写入），TaskB 同日开始，不应判定为重叠', () => {
      // 对应用户反馈场景：TaskA endDate='2025-08-01 00:00'（语义上是7月31日结束），
      // TaskB startDate='2025-08-01 00:00' 或 '2025-08-01'，二者不应换行
      const taskA: Task = {
        id: 1,
        name: 'A',
        startDate: '2025-07-25',
        endDate: '2025-08-01 00:00',
      } as Task
      const taskB1: Task = {
        id: 2,
        name: 'B1',
        startDate: '2025-08-01 00:00',
        endDate: '2025-08-05',
      } as Task
      const taskB2: Task = {
        id: 3,
        name: 'B2',
        startDate: '2025-08-01',
        endDate: '2025-08-05',
      } as Task

      expect(hasTimeOverlap(taskA, taskB1)).toBe(false)
      expect(hasTimeOverlap(taskA, taskB2)).toBe(false)
    })

    it('endDate 带非00:00的显式时间部分，仍应视为占用当天', () => {
      const taskA: Task = {
        id: 1,
        name: 'A',
        startDate: '2025-01-28',
        endDate: '2025-01-29 14:30',
      } as Task
      const taskB: Task = {
        id: 2,
        name: 'B',
        startDate: '2025-01-29',
        endDate: '2025-01-30',
      } as Task

      expect(hasTimeOverlap(taskA, taskB)).toBe(true)
    })

    it('小时视图：首尾相接不重叠', () => {
      const taskA: Task = {
        id: 1,
        name: 'A',
        startDate: '2025-01-29 08:00',
        endDate: '2025-01-29 10:00',
      } as Task
      const taskB: Task = {
        id: 2,
        name: 'B',
        startDate: '2025-01-29 10:00',
        endDate: '2025-01-29 12:00',
      } as Task

      expect(hasTimeOverlap(taskA, taskB, 'hour')).toBe(false)
    })

    it('缺少日期信息应返回 false', () => {
      const taskA: Task = { id: 1, name: 'A' } as Task
      const taskB: Task = {
        id: 2,
        name: 'B',
        startDate: '2025-01-01',
        endDate: '2025-01-05',
      } as Task

      expect(hasTimeOverlap(taskA, taskB)).toBe(false)
    })
  })

  describe.each(['hour', 'day', 'week', 'month', 'quarter', 'year'])(
    'exact intervals at %s scale',
    scale => {
      const task = (id: number, startDate: string, endDate: string): Task => ({
        id,
        name: String(id),
        startDate,
        endDate,
      })
      const first = task(1, '2026-10-25 10:24:00', '2026-10-25 11:25:00')
      it.each(['11:25:00', '11:25:01', '11:26:00'])(
        'keeps a task starting at %s in the same lane',
        start => {
          const second = task(2, `2026-10-25 ${start}`, '2026-10-25 11:48:00')
          expect(hasTimeOverlap(first, second, scale)).toBe(false)
          expect([...assignTaskRows([second, first], 60, scale).taskRowMap.values()]).toEqual([
            0, 0,
          ])
        }
      )
      it('splits a one-second overlap and nested tasks, then reuses the first free lane', () => {
        const second = task(2, '2026-10-25 11:24:59', '2026-10-25 11:48:00')
        const nested = task(3, '2026-10-25 11:24:59', '2026-10-25 11:25:00')
        const following = task(4, '2026-10-25 11:25:00', '2026-10-25 11:30:00')
        expect(hasTimeOverlap(first, second, scale)).toBe(true)
        expect([
          ...assignTaskRows([first, second, nested, following], 60, scale).taskRowMap.values(),
        ]).toEqual([0, 1, 2, 0])
      })
      it.each(['2026-10-26 00:00:00', '2026-10-26T00:00:00', '2026-10-26 00:00:01'])(
        'keeps a cross-midnight boundary at %s exact',
        boundary => {
          const pair = [
            task(1, '2026-10-25 23:50:00', boundary),
            task(2, boundary, '2026-10-26 00:10:00'),
          ]
          expect([...assignTaskRows(pair, 60, scale).taskRowMap.values()]).toEqual([0, 0])
        }
      )
      it('preserves inclusive date-only ends and treats zero duration as an empty interval', () => {
        const allDay = task(2, '2026-10-25', '2026-10-25')
        const point = task(3, '2026-10-25 11:00:00', '2026-10-25 11:00:00')
        expect(hasTimeOverlap(first, allDay, scale)).toBe(true)
        expect(hasTimeOverlap(first, point, scale)).toBe(false)
        expect(hasTimeOverlap(allDay, task(4, '2026-10-26', '2026-10-26'), scale)).toBe(false)
      })
    }
  )
})
