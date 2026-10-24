<script setup lang="ts">
import type { Slots } from 'vue'
import type TaskBar from '../TaskBar.vue'
import ResourceTaskBar from './ResourceTaskBar.vue'

type TaskBarHandler = (...args: never[]) => void

defineProps<{
  entries: { bindings: InstanceType<typeof TaskBar>['$props'] }[]
  renderKey: number
  handlers: Record<string, TaskBarHandler>
  // Compare the caller's slots, not the freshly created forwarding closures.
  sourceSlots: Slots
}>()
</script>

<template>
  <ResourceTaskBar
    v-for="{ bindings } in entries"
    :key="`taskbar-${bindings.task.id}-${renderKey}`"
    :bindings="bindings"
    :render-key="renderKey"
    :handlers="handlers"
    :source-slots="sourceSlots"
  >
    <template v-if="$slots['custom-task-content']" #custom-task-content="barScope">
      <slot name="custom-task-content" v-bind="barScope" />
    </template>
    <template v-if="$slots['task-bar-context-menu']" #task-bar-context-menu="contextMenuScope">
      <slot name="task-bar-context-menu" v-bind="contextMenuScope" />
    </template>
  </ResourceTaskBar>
</template>
