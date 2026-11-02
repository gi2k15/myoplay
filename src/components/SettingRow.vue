<!-- src/components/SettingRow.vue -->
<template>
  <div class="setting-row">
    <div class="setting-text">
      <div class="setting-label">{{ label }}</div>
      <div v-if="hint" class="setting-hint">{{ hint }}</div>
    </div>
    <div class="setting-control">
      <slot />
    </div>
  </div>
</template>

<script lang="ts" setup>
defineProps<{ label: string; hint?: string }>();
</script>

<style scoped>
.setting-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 24px;
  padding: 16px 24px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.setting-text {
  flex: 1 1 260px;
  min-width: 0;
}

.setting-label {
  font-weight: 600;
}

.setting-hint {
  margin-top: 2px;
  font-size: 13px;
  line-height: 18px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.setting-control {
  flex: 0 1 320px;
  min-width: 0;
  display: flex;
  justify-content: flex-end;
}

.setting-control > :deep(*) {
  flex: 1 1 auto;
}

.setting-control > :deep(.v-switch) {
  flex: 0 0 auto;
}
</style>
