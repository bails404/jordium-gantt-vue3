import { describe, expect, it } from 'vitest'
import {
  adjustmentTime,
  normalizeOccupancies,
  overlaps,
  summarizeOccupanciesByMonth,
} from '../../../demo/resourceOccupancies'

const unit = { unitBusinessId: '9007199254740993123', unitCode: 'M-01', unitName: '测试设备' }
const occupancy = {
  unitBusinessId: unit.unitBusinessId,
  actualBusinessId: '9007199254740993124',
  planBusinessId: '9007199254740993125',
  operationBusinessId: '9007199254740993126',
  qty: 2,
  status: '加工中',
  startTime: '2026-10-21T23:00:00',
  endTime: '2026-10-22T01:00:00',
}

describe('resource occupancy adapter', () => {
  it('counts cross-month records once per intersecting month, respecting year and midnight boundaries', () => {
    const intervals = [
      ['2023-12-31T23:00:00', '2024-01-01T01:00:00'],
      ['2024-01-31T20:00:00', '2024-02-01T00:00:00'],
      ['2024-02-29T10:00:00', '2024-03-01T10:00:00'],
      ['2024-12-31T20:00:00', '2025-01-02T00:00:00'],
      ['2025-01-01T00:00:00', '2025-01-02T00:00:00'],
    ]
    const { tasks } = normalizeOccupancies({
      units: [unit],
      occupancies: intervals.map(([startTime, endTime]) => ({ ...occupancy, startTime, endTime })),
    })
    expect(summarizeOccupanciesByMonth(tasks, 2024).get(unit.unitBusinessId)).toEqual([
      2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1,
    ])
    expect(summarizeOccupanciesByMonth([], 2024).size).toBe(0)
  })
  it('preserves business IDs and hourly intervals without numeric precision loss', () => {
    const { tasks } = normalizeOccupancies({ units: [unit], occupancies: [occupancy] })
    expect(tasks[0]).toMatchObject({
      id: 1,
      actualBusinessId: occupancy.actualBusinessId,
      unitBusinessId: unit.unitBusinessId,
      startDate: '2026-10-21 23:00:00',
      endDate: '2026-10-22 01:00:00',
      qty: 2,
      status: '加工中',
    })
  })

  it('includes cross-midnight occupancies and excludes intervals touching only a boundary', () => {
    const { tasks } = normalizeOccupancies({ units: [unit], occupancies: [occupancy] })
    expect(
      overlaps(tasks[0], new Date('2026-10-22T00:00:00'), new Date('2026-10-23T00:00:00'))
    ).toBe(true)
    expect(
      overlaps(tasks[0], new Date('2026-10-22T01:00:00'), new Date('2026-10-23T00:00:00'))
    ).toBe(false)
    expect(
      overlaps(tasks[0], new Date('2026-10-21T00:00:00'), new Date('2026-10-21T23:00:00'))
    ).toBe(false)
  })

  it('skips invalid times, reversed intervals and unknown resources without hiding valid rows', () => {
    const result = normalizeOccupancies({
      units: [unit],
      occupancies: [
        { ...occupancy, startTime: 'invalid' },
        { ...occupancy, endTime: '2026-10-21T22:00:00' },
        { ...occupancy, unitBusinessId: 'unknown' },
        occupancy,
      ],
    })
    expect(result.skipped).toBe(3)
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0].id).toBe(4)
  })

  it('distinguishes a valid empty response from an unexpected API response', () => {
    expect(normalizeOccupancies({ units: [], occupancies: [] }).tasks).toEqual([])
    expect(() => normalizeOccupancies({ message: 'unauthorized' })).toThrow('接口数据格式')
  })

  it('preserves hourly duration when the week view emits date-only drag events', () => {
    const start = adjustmentTime('2026-10-23', '2026-10-22 08:00:00', true)
    const end = adjustmentTime('2026-10-23', '2026-10-22 17:00:00', true)
    expect(start).toBe('2026-10-23 08:00:00')
    expect(Date.parse(end) - Date.parse(start)).toBe(9 * 3600000)
    expect(adjustmentTime('2026-10-22 08:15', '2026-10-22 08:00', false)).toBe('2026-10-22 08:15')
  })
})
