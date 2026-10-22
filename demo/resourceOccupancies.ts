import { format, parseISO } from 'date-fns'
import type { Task } from '../src/models/classes/Task'

export interface ScheduleUnit {
  unitBusinessId: string
  unitCode: string
  unitName: string
}

export interface OccupancyTask extends Task {
  unitBusinessId: string
  actualBusinessId: string
  planBusinessId: string
  operationBusinessId: string
  qty: number
  status: string
  startDate: string
  endDate: string
}

export function dateText(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

export function timeText(value: string) {
  return format(parseISO(value.replace(' ', 'T')), 'yyyy-MM-dd HH:mm')
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

// Keep business IDs as strings: they are identifiers, not task-array indices.
export function normalizeOccupancies(payload: unknown) {
  if (!record(payload) || !Array.isArray(payload.units) || !Array.isArray(payload.occupancies)) {
    throw new Error('接口数据格式不正确：缺少资源或占用记录。')
  }
  const units: ScheduleUnit[] = []
  const knownUnits = new Set<string>()
  for (const unit of payload.units) {
    if (
      !record(unit) ||
      typeof unit.unitBusinessId !== 'string' ||
      typeof unit.unitName !== 'string'
    ) {
      throw new Error('接口中的资源信息不完整。')
    }
    if (knownUnits.has(unit.unitBusinessId)) continue
    knownUnits.add(unit.unitBusinessId)
    units.push({
      unitBusinessId: unit.unitBusinessId,
      unitName: unit.unitName,
      unitCode: String(unit.unitCode ?? ''),
    })
  }
  let skipped = 0
  const tasks: OccupancyTask[] = []
  for (const [index, item] of payload.occupancies.entries()) {
    if (
      !record(item) ||
      typeof item.unitBusinessId !== 'string' ||
      !knownUnits.has(item.unitBusinessId) ||
      typeof item.startTime !== 'string' ||
      typeof item.endTime !== 'string' ||
      !Number.isFinite(Date.parse(item.startTime)) ||
      !Number.isFinite(Date.parse(item.endTime)) ||
      Date.parse(item.endTime) <= Date.parse(item.startTime)
    ) {
      skipped++
      continue
    }
    const qty = Number(item.qty)
    const status = String(item.status ?? '未标注')
    tasks.push({
      id: index + 1,
      unitBusinessId: item.unitBusinessId,
      actualBusinessId: String(item.actualBusinessId ?? ''),
      planBusinessId: String(item.planBusinessId ?? ''),
      operationBusinessId: String(item.operationBusinessId ?? ''),
      qty: Number.isFinite(qty) ? qty : 0,
      status,
      name: `${status} · ${Number.isFinite(qty) ? qty : 0} 件`,
      // Jordium's hour-scale drag logic recognizes a space-separated time component.
      startDate: format(parseISO(item.startTime), 'yyyy-MM-dd HH:mm:ss'),
      endDate: format(parseISO(item.endTime), 'yyyy-MM-dd HH:mm:ss'),
      barColor: status === '加工中' ? '#208777' : '#537eb4',
      isEditable: true,
    })
  }
  return { units, tasks, skipped }
}

export function overlaps(task: OccupancyTask, start: Date, end: Date) {
  return Date.parse(task.startDate) < end.getTime() && Date.parse(task.endDate) > start.getTime()
}

// 跨月记录计入每个相交月份；结束于月初零点的记录不计入下月。
export function summarizeOccupanciesByMonth(tasks: OccupancyTask[], year: number) {
  const boundaries = Array.from({ length: 13 }, (_, month) => new Date(year, month, 1).getTime())
  const counts = new Map<string, number[]>()
  for (const task of tasks) {
    const start = Date.parse(task.startDate)
    const end = Date.parse(task.endDate)
    if (!(start < boundaries[12] && end > boundaries[0])) continue
    const months = counts.get(task.unitBusinessId) ?? Array<number>(12).fill(0)
    for (let month = 0; month < 12; month++) {
      if (start < boundaries[month + 1] && end > boundaries[month]) months[month]++
    }
    counts.set(task.unitBusinessId, months)
  }
  return counts
}

// Day-scale drag/resize events contain dates only. Preserve each endpoint's clock
// time, so moving a 09:00–17:00 occupancy by a day never turns it into a zero-length task.
export function adjustmentTime(value: string, previous: string, preserveClock: boolean) {
  if (!preserveClock) return value.replace('T', ' ')
  return `${value.slice(0, 10)} ${format(parseISO(previous.replace(' ', 'T')), 'HH:mm:ss')}`
}
