import type { Task } from '../models/classes/Task'
import { getEffectiveEndDateOnly } from './dateBoundaryUtils'

export interface BufferedWindow {
  start: number
  end: number
  width: number
  screens: number
}

// 接近缓冲区边缘才更新窗口，避免每个滚动像素都重新筛选任务。
export function getBufferedWindow(
  left: number,
  width: number,
  screens: number,
  previous?: BufferedWindow
): BufferedWindow {
  const guard = Math.min(0.5, screens) * width
  if (
    previous &&
    previous.width === width &&
    previous.screens === screens &&
    (previous.start === 0 || left >= previous.start + guard) &&
    left + width <= previous.end - guard
  )
    return previous
  return {
    start: Math.max(0, left - width * screens),
    end: left + width * (1 + screens),
    width,
    screens,
  }
}

// 与任务条的显示范围一致：小时刻度保留时分，日刻度覆盖整个日期单元格。
export function getResourceTaskInterval(task: Task, hourly: boolean): [number, number] | null {
  const start = new Date(task.startDate || task.endDate || '')
  const end = new Date(task.endDate || task.startDate || '')
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return null
  if (hourly) return [start.getTime(), end.getTime()]
  start.setHours(0, 0, 0, 0)
  const endDay = getEffectiveEndDateOnly(task.endDate || task.startDate, end)
  endDay.setDate(endDay.getDate() + 1)
  return [start.getTime(), endDay.getTime()]
}
