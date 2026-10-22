import { createApp } from 'vue'

async function bootstrap() {
  const path = window.location.pathname.replace(/\/$/, '')
  if (path === '/original') {
    const [{ default: App }, { default: JordiumGantt }] = await Promise.all([
      import('./App.vue'),
      import('../src/index'),
      import('./style.css'),
    ])
    document.title = '完整示例 · Jordium Gantt'
    createApp(App).use(JordiumGantt).mount('#app')
    return
  }

  await import('./workspace.css')
  document.documentElement.lang = 'zh-CN'
  const { default: Page } =
    path === '/resources'
      ? await import('./ResourceSchedule.vue')
      : await import('./NavigationPage.vue')
  document.title = path === '/resources' ? '资源排程 · Jordium Gantt' : '示例导航 · Jordium Gantt'
  createApp(Page).mount('#app')
}

bootstrap()
