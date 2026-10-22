// scrollTop 写入产生的 scroll 事件会延后到渲染帧；不能用微任务清除保护标记。
export function createScrollSyncGuard() {
  let pendingTop: number | undefined
  return {
    write(target: { scrollTop: number }, top: number) {
      if (Math.abs(target.scrollTop - top) <= 1) return
      const previous = target.scrollTop
      target.scrollTop = top
      // 使用浏览器实际接受的位置，兼容边界钳制和亚像素取整。
      if (target.scrollTop !== previous) pendingTop = target.scrollTop
    },
    isEcho(top: number) {
      const echoed = pendingTop !== undefined && Math.abs(top - pendingTop) <= 1
      pendingTop = undefined
      return echoed
    },
  }
}
