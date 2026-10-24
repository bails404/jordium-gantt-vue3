import { afterEach, describe, expect, it, vi } from 'vitest'
import { observeElementSizes } from '../../../src/utils/sharedResizeObserver'

afterEach(() => vi.unstubAllGlobals())

describe('shared task-bar size measurements', () => {
  it('delivers one batch per listener and shares observations until the last subscriber leaves', () => {
    let deliver: ResizeObserverCallback
    const observe = vi.fn(),
      unobserve = vi.fn(),
      disconnect = vi.fn()
    const created = vi.fn()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          deliver = callback
          created()
        }
        observe = observe
        unobserve = unobserve
        disconnect = disconnect
      }
    )
    const content = document.createElement('div'),
      text = document.createElement('span')
    const first = vi.fn(),
      second = vi.fn()
    const stopFirst = observeElementSizes([content, text], first)
    const stopSecond = observeElementSizes([text], second)
    const entries = [content, text].map(target => ({ target }) as ResizeObserverEntry)
    try {
      expect(created).toHaveBeenCalledTimes(1)
      expect(observe).toHaveBeenCalledTimes(2)
      deliver!(entries, {} as ResizeObserver)
      expect(first).toHaveBeenCalledExactlyOnceWith(entries)
      expect(second).toHaveBeenCalledExactlyOnceWith([entries[1]])
      stopFirst()
      expect(unobserve).toHaveBeenCalledExactlyOnceWith(content)
      expect(disconnect).not.toHaveBeenCalled()
      deliver!(entries, {} as ResizeObserver)
      expect(first).toHaveBeenCalledTimes(1)
      expect(second).toHaveBeenCalledTimes(2)
      stopSecond()
      expect(disconnect).toHaveBeenCalledTimes(1)
      const stopAgain = observeElementSizes([text], second)
      expect(created).toHaveBeenCalledTimes(2)
      stopAgain()
    } finally {
      stopFirst()
      stopSecond()
    }
  })
})
