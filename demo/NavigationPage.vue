<template>
  <div>
    <header class="workspace-header">
      <a class="workspace-brand" href="/" aria-label="Jordium 示例导航">
        <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
        Jordium <span class="brand-sub">/ 工作空间</span>
      </a>
      <span class="version">Vue 3 · 资源与时间</span>
    </header>
    <main class="navigation-main">
      <div class="eyebrow">JORDIUM GANTT / EXAMPLES</div>
      <h1>让每一份资源，<br />都有清晰的时间安排。</h1>
      <p class="intro">从完整的功能探索，到专注的车间资源排程。选择一个视图开始。</p>
      <nav class="destinations" aria-label="示例页面">
        <a href="/original" class="destination">
          <span class="number">01</span>
          <div class="destination-copy">
            <h2>完整功能示例</h2>
            <p>原版演示页面，探索甘特图、日历、资源利用率及全部配置。</p>
            <div class="tags"><span>原版 Demo</span><span>全部功能</span></div>
          </div>
          <span class="destination-arrow" aria-hidden="true">↗</span>
        </a>
        <a href="/resources" class="destination featured">
          <span class="number">02</span>
          <div class="destination-copy">
            <h2>车间资源排程 <span class="new-badge">精简视图</span></h2>
            <p>查看设备占用与加工安排，在时间轴上直观调整排程。</p>
            <div class="tags">
              <span>实时接口数据</span><span>资源时间轴</span><span>本地拖拽调整</span>
            </div>
          </div>
          <span class="destination-arrow" aria-hidden="true">↗</span>
        </a>
      </nav>
      <footer><span>专注安排，清晰协作。</span><span>Powered by Jordium Gantt Vue3</span></footer>
    </main>
  </div>
</template>

<style scoped>
.brand-sub {
  color: #89949f;
  font-size: 13px;
  font-weight: 400;
}
.version {
  color: #82909e;
  font-size: 12px;
}
.navigation-main {
  max-width: 1040px;
  margin: 0 auto;
  padding: 82px 32px 30px;
}
.eyebrow {
  font-size: 11px;
  letter-spacing: 2px;
  font-weight: 600;
  color: #14806c;
}
h1 {
  margin: 22px 0;
  font-size: clamp(30px, 4vw, 46px);
  line-height: 1.45;
  font-weight: 600;
  letter-spacing: -1.6px;
}
.intro {
  color: #788593;
  font-size: 14px;
  line-height: 1.8;
  margin-bottom: 44px;
}
.destinations {
  border: 1px solid #dee5e8;
  border-radius: 12px;
  overflow: hidden;
  background: white;
}
.destination {
  display: flex;
  align-items: flex-start;
  padding: 32px;
  gap: 28px;
  transition: background 0.18s;
}
.destination + .destination {
  border-top: 1px solid #e6ebee;
}
.destination:hover {
  background: #f9fbfc;
}
.destination.featured {
  background: #f3faf7;
}
.destination.featured:hover {
  background: #eaf5f0;
}
.number {
  color: #94a3ad;
  font-size: 14px;
  padding-top: 5px;
  font-variant-numeric: tabular-nums;
}
.destination-copy {
  flex: 1;
}
h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 12px;
}
.destination-copy p {
  font-size: 13px;
  color: #6f7d8c;
  line-height: 1.8;
  margin: 0 0 20px;
}
.new-badge {
  display: inline-block;
  font-size: 10px;
  vertical-align: middle;
  padding: 4px 7px;
  border-radius: 4px;
  color: #187963;
  background: #dfefe7;
  margin-left: 8px;
}
.tags {
  display: flex;
  gap: 18px;
  color: #7b8a97;
  font-size: 11px;
}
.destination-arrow {
  font-size: 24px;
  color: #67877c;
  align-self: center;
}
footer {
  display: flex;
  justify-content: space-between;
  color: #99a3ad;
  font-size: 11px;
  padding: 28px 0;
  gap: 16px;
}
@media (max-width: 640px) {
  .navigation-main {
    padding: 45px 20px 20px;
  }
  .destination {
    padding: 24px 18px;
    gap: 14px;
  }
  .tags {
    flex-wrap: wrap;
    gap: 10px;
  }
  .version,
  .brand-sub {
    display: none;
  }
  h2 {
    font-size: 18px;
  }
}
</style>
