import type { Task } from '../models/classes/Task'
import { parseTaskDate } from './taskPositionUtils'

export interface VisibleRange {
  startIndex: number
  endIndex: number
}

export function reuseVisibleRange(startIndex: number, endIndex: number, previous?: VisibleRange) {
  return previous?.startIndex === startIndex && previous.endIndex === endIndex
    ? previous
    : { startIndex, endIndex }
}

// Half-open lane range. Whole lanes (including above titles) stay mounted, with overscan.
export function getVisibleLaneRange(
  offsets: number[],
  top: number,
  bottom: number,
  previous?: VisibleRange
): VisibleRange {
  const count = offsets.length - 1
  let low = 0
  let high = count
  while (low < high) {
    const mid = (low + high) >>> 1
    if (offsets[mid + 1] < top) low = mid + 1
    else high = mid
  }
  const start = low
  high = count
  while (low < high) {
    const mid = (low + high) >>> 1
    if (offsets[mid] <= bottom) low = mid + 1
    else high = mid
  }
  return reuseVisibleRange(start, low, previous)
}

export interface BufferedWindow {
  start: number
  end: number
  width: number
  screens: number
}

// Retain mounted lanes until the viewport approaches their edge, then refill overscan.
// The bound also releases stale lanes after a resize or a large reverse scroll.
export function getBufferedLaneRange(
  offsets: number[],
  top: number,
  bottom: number,
  padding: number,
  previous?: VisibleRange
): VisibleRange {
  if (previous && previous.startIndex < previous.endIndex && previous.endIndex < offsets.length) {
    const start = offsets[previous.startIndex]
    const end = offsets[previous.endIndex]
    const guard = padding / 4
    if (
      (previous.startIndex === 0 || start <= top - guard) &&
      (previous.endIndex === offsets.length - 1 || end >= bottom + guard) &&
      start >= top - padding * 2 &&
      end <= bottom + padding * 2
    )
      return previous
  }
  return getVisibleLaneRange(offsets, top - padding, bottom + padding, previous)
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

// 所有刻度使用真实的左闭右开区间；只有纯日期结束值包含当天。
// 保留 hourly 参数兼容已有调用，刻度不再改变资源占用语义。
export function getResourceTaskInterval(task: Task, _hourly?: boolean): [number, number] | null {
  const rawStart = task.startDate || task.endDate
  const rawEnd = task.endDate || task.startDate
  const start = parseTaskDate(rawStart)
  const parsedEnd = parseTaskDate(rawEnd)
  if (!start || !parsedEnd) return null
  const end = new Date(parsedEnd)
  if (typeof rawEnd === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawEnd.trim())) {
    end.setDate(end.getDate() + 1)
  }
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start)
    return null
  return [start.getTime(), end.getTime()]
}

// 非小时刻度在相邻日期坐标间插值，让绘制和视野外任务定位保留时分秒。
export function projectResourceTime(timestamp: number, projectDay: (date: Date) => number): number {
  const date = new Date(timestamp)
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const next = new Date(day)
  next.setDate(next.getDate() + 1)
  const start = projectDay(day)
  const end = projectDay(next)
  return start + ((timestamp - day.getTime()) / (next.getTime() - day.getTime())) * (end - start)
}
