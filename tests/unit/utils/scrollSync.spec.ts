import { describe, expect, it } from 'vitest'
import { createScrollSyncGuard } from '../../../src/utils/scrollSync'

describe('vertical scroll synchronization', () => {
  it('suppresses a delayed echo even after microtasks have run', async () => {
    const guard = createScrollSyncGuard()
    const target = { scrollTop: 0 }
    guard.write(target, 120)
    await Promise.resolve()
    expect(guard.isEcho(target.scrollTop)).toBe(true)
    expect(guard.isEcho(180)).toBe(false)
  })

  it('uses the latest position when the browser coalesces multiple writes', () => {
    const guard = createScrollSyncGuard()
    const target = { scrollTop: 0 }
    guard.write(target, 120)
    guard.write(target, 240)
    expect(guard.isEcho(240)).toBe(true)
  })

  it('lets a user reverse direction or scroll farther before an echo arrives', () => {
    const guard = createScrollSyncGuard()
    const target = { scrollTop: 0 }
    guard.write(target, 120)
    target.scrollTop = 60
    expect(guard.isEcho(target.scrollTop)).toBe(false)
    guard.write(target, 180)
    target.scrollTop = 240
    expect(guard.isEcho(target.scrollTop)).toBe(false)
  })

  it('handles browser clamping and does not mark a no-op write as pending', () => {
    const guard = createScrollSyncGuard()
    let top = 0
    const target = {
      get scrollTop() {
        return top
      },
      set scrollTop(value: number) {
        top = Math.min(500, Math.max(0, Math.round(value)))
      },
    }
    guard.write(target, 550)
    expect(guard.isEcho(500)).toBe(true)
    guard.write(target, 550)
    expect(guard.isEcho(500)).toBe(false)
    guard.write(target, 400.3)
    expect(guard.isEcho(400)).toBe(true)
  })
})
