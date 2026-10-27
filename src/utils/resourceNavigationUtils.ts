import type { Task } from '../models/classes/Task'
import { getResourceTaskInterval, projectResourceTime } from './resourceViewportUtils'

export interface ResourceNavigationItem {
  task: Task
  start: number
  end: number
  left: number
  right: number
}

// Cache date parsing and projection independently of the horizontal viewport.
export function getResourceNavigationItems(
  tasks: Task[],
  hourly: boolean,
  project: (date: Date) => number
): ResourceNavigationItem[] {
  const items: ResourceNavigationItem[] = []
  for (const task of tasks) {
    const start = new Date(task.startDate || task.endDate || '').getTime()
    const end = new Date(task.endDate || task.startDate || '').getTime()
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) continue
    const interval = getResourceTaskInterval(task, hourly)
    if (!interval) continue
    const projectTime = (time: number) =>
      hourly ? project(new Date(time)) : projectResourceTime(time, project)
    const left = projectTime(interval[0])
    const right = interval[0] === interval[1] ? left + 4 : projectTime(interval[1])
    items.push({ task, start, end, left, right })
  }
  return items
}

export function getResourceNavigationTargets(
  items: ResourceNavigationItem[],
  viewportLeft: number,
  viewportRight: number
) {
  let left: ResourceNavigationItem | undefined
  let right: ResourceNavigationItem | undefined
  for (const item of items) {
    if (item.right <= viewportLeft && (!left || item.end > left.end)) left = item
    if (item.left >= viewportRight && (!right || item.start < right.start)) right = item
  }
  return { left, right }
}
