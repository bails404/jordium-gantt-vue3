<script setup lang="ts">
import { computed, type Ref } from 'vue'
import { useI18n } from '../../composables/useI18n'
import {
  getResourceNavigationTargets,
  type ResourceNavigationItem,
} from '../../utils/resourceNavigationUtils'

const props = defineProps<{
  items: {
    id: string | number
    name: string
    top: number
    height: number
    items: ResourceNavigationItem[]
  }[]
  viewport: { top: Ref<number>; left: Ref<number>; width: Ref<number>; height: Ref<number> }
}>()
const emit = defineEmits<{ navigate: [date: Date] }>()
const { getTranslation: t } = useI18n()
// Horizontal target lookup is independent of vertical scrolling.
const targets = computed(() =>
  props.items.map(row => ({
    ...row,
    ...getResourceNavigationTargets(
      row.items,
      props.viewport.left.value,
      props.viewport.left.value + props.viewport.width.value
    ),
  }))
)
const rows = computed(() => {
  const top = props.viewport.top.value
  const bottom = top + props.viewport.height.value
  if (props.viewport.width.value <= 0 || bottom <= top) return []
  return targets.value.flatMap(row => {
    const rowBottom = row.top + row.height
    if (rowBottom <= top || row.top >= bottom || (!row.left && !row.right)) return []
    return [{ ...row, top: (Math.max(row.top, top) + Math.min(rowBottom, bottom)) / 2 - top }]
  })
})
</script>

<template>
  <div
    class="resource-task-navigation"
    :style="{
      left: `${viewport.left.value}px`,
      top: `${viewport.top.value}px`,
      width: `${viewport.width.value}px`,
      height: `${viewport.height.value}px`,
    }"
  >
    <template v-for="row in rows" :key="row.id">
      <button
        v-for="direction in ['left', 'right'] as const"
        v-show="row[direction]"
        :key="direction"
        type="button"
        class="resource-task-navigation-button"
        :class="`resource-task-navigation-${direction}`"
        :data-resource-id="row.id"
        :style="{ top: `${row.top}px` }"
        :title="`${row.name}: ${t(direction === 'left' ? 'previousResourceTask' : 'nextResourceTask')} ${row[direction]?.task.name ?? ''} (${row[direction]?.task.startDate ?? ''})`"
        :aria-label="`${row.name}: ${t(direction === 'left' ? 'previousResourceTask' : 'nextResourceTask')} ${row[direction]?.task.name ?? ''} (${row[direction]?.task.startDate ?? ''})`"
        @pointerdown.stop
        @mousedown.stop
        @dblclick.stop
        @click.stop="emit('navigate', new Date(row[direction]!.start))"
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          aria-hidden="true"
          :style="{ transform: direction === 'right' ? 'rotate(180deg)' : undefined }"
        >
          <path
            d="M14 6l-6 6 6 6M8 12h12"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </template>
  </div>
</template>

<style scoped>
.resource-task-navigation {
  position: absolute;
  z-index: var(--gantt-z-bar-bubble, 18);
  overflow: hidden;
  pointer-events: none;
}
.resource-task-navigation-button {
  position: absolute;
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--gantt-border-color, #dcdfe6);
  border-radius: 4px;
  color: var(--gantt-primary, #409eff);
  background: var(--gantt-bg-primary, #fff);
  box-shadow: 0 1px 4px #0002;
  cursor: pointer;
  pointer-events: auto;
}
.resource-task-navigation-button:hover,
.resource-task-navigation-button:focus-visible {
  border-color: var(--gantt-primary, #409eff);
  outline: 2px solid var(--gantt-primary, #409eff);
  outline-offset: -2px;
}
.resource-task-navigation-left {
  left: 4px;
}
.resource-task-navigation-right {
  right: 4px;
}
</style>
