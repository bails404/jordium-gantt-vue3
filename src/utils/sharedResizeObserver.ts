type SizeListener = (entries: ResizeObserverEntry[]) => void

const listeners = new Map<Element, Set<SizeListener>>()
let observer: ResizeObserver | undefined

// A single delivery batches all task-bar measurements before Vue flushes updates.
// Separate native observers allow Vue to patch styles between measurement callbacks.
export function observeElementSizes(elements: Element[], listener: SizeListener) {
  observer ??= new ResizeObserver(entries => {
    const deliveries = new Map<SizeListener, ResizeObserverEntry[]>()
    for (const entry of entries) {
      for (const callback of listeners.get(entry.target) ?? []) {
        const group = deliveries.get(callback) ?? []
        group.push(entry)
        deliveries.set(callback, group)
      }
    }
    for (const [callback, group] of deliveries) callback(group)
  })
  for (const element of elements) {
    let callbacks = listeners.get(element)
    if (!callbacks) {
      callbacks = new Set()
      listeners.set(element, callbacks)
      observer.observe(element)
    }
    callbacks.add(listener)
  }
  let active = true
  return () => {
    if (!active) return
    active = false
    for (const element of elements) {
      const callbacks = listeners.get(element)
      if (!callbacks?.delete(listener) || callbacks.size) continue
      listeners.delete(element)
      observer?.unobserve(element)
    }
    if (!listeners.size) {
      observer?.disconnect()
      observer = undefined
    }
  }
}
