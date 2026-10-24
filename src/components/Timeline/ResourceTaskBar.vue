<script setup lang="ts">
import type { Slots } from 'vue'
import TaskBar from '../TaskBar.vue'

type TaskBarHandler = (...args: never[]) => void

defineProps<{
  bindings: InstanceType<typeof TaskBar>['$props']
  renderKey: number
  handlers: Record<string, TaskBarHandler>
  sourceSlots: Slots
}>()
</script>

<template>
  <!-- The memo belongs to the task key, not its shifting index in the virtual list. -->
  <TaskBar
    v-memo="[
      ...Object.values(bindings),
      sourceSlots['custom-task-content'],
      sourceSlots['task-bar-context-menu'],
      handlers,
      renderKey,
    ]"
    v-bind="bindings"
    v-on="handlers"
  >
    <template v-if="$slots['custom-task-content']" #custom-task-content="barScope">
      <slot name="custom-task-content" v-bind="barScope" />
    </template>
    <template v-if="$slots['task-bar-context-menu']" #task-bar-context-menu="contextMenuScope">
      <slot name="task-bar-context-menu" v-bind="contextMenuScope" />
    </template>
  </TaskBar>
</template>
