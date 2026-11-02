<!-- src/components/NowPlaying.vue -->
<template>
  <section class="now-playing" :aria-label="$t('streamBrowser.onAirNow')">
    <div class="d-flex ga-4 align-start">
      <v-avatar size="56" rounded="lg" color="surface-light" class="border flex-shrink-0 d-none d-sm-flex">
        <v-img v-if="channel.logo" :src="channel.logo" />
        <v-icon v-else color="medium-emphasis">mdi-television-classic</v-icon>
      </v-avatar>

      <div class="flex-grow-1 min-w-0 d-flex flex-column ga-2">
        <div class="meta-line">
          <span class="text-high-emphasis font-weight-semibold text-truncate">{{ channel.name }}</span>
          <template v-if="categoryLabel"><span>·</span><span class="text-truncate">{{ categoryLabel }}</span></template>
          <template v-if="channel.year"><span>·</span><span>{{ channel.year }}</span></template>
          <template v-if="channel.rating"><span>·</span><span>★ {{ channel.rating }}</span></template>
        </div>

        <h1 class="np-title">{{ epg?.current?.title || channel.name }}</h1>

        <div v-if="epg?.current" class="time-line">
          <span>{{ formatTime(epg.current.start) }}</span>
          <v-progress-linear :model-value="progress" height="4" bg-color="surface-bright" bg-opacity="1" class="time-bar" />
          <span>{{ formatTime(epg.current.stop) }}</span>
          <span v-if="minutesLeft > 0">· {{ $t('stage.minutesLeft', { n: minutesLeft }) }}</span>
        </div>

        <p v-if="description" class="np-desc">{{ description }}</p>
      </div>

      <v-btn
        v-if="channel.type === 'live'"
        variant="outlined"
        prepend-icon="mdi-calendar-blank-outline"
        class="d-none d-md-flex"
        height="44"
        @click="$emit('open-guide')"
      >
        {{ $t('stage.channelGuide') }}
      </v-btn>
    </div>

    <div v-if="epg?.next" class="mt-6">
      <h2 class="section-label mb-3">{{ $t('stage.upNext') }}</h2>
      <v-card class="pa-4 next-card" rounded="lg">
        <div class="text-body-2 text-medium-emphasis tabular">
          {{ formatTime(epg.next.start) }} – {{ formatTime(epg.next.stop) }}
        </div>
        <div class="font-weight-semibold text-truncate">{{ epg.next.title }}</div>
      </v-card>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import type { IPTVChannel } from '@/services/db';

const { t } = useI18n();

const props = defineProps<{
  channel: IPTVChannel;
  epg?: { current?: any; next?: any };
}>();

defineEmits<{ (e: 'open-guide'): void }>();

// Re-render progress once a minute
const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => { timer = setInterval(() => (now.value = Date.now()), 60000); });
onUnmounted(() => clearInterval(timer));

const categoryLabel = computed(() =>
  props.channel.category === 'Sem Categoria' ? t('common.noCategory') : props.channel.category
);

const description = computed(() => props.epg?.current?.desc || props.channel.plot || '');

const progress = computed(() => {
  const cur = props.epg?.current;
  if (!cur || cur.stop <= cur.start) return 0;
  return Math.min(100, Math.max(0, ((now.value - cur.start) / (cur.stop - cur.start)) * 100));
});

const minutesLeft = computed(() => {
  const cur = props.epg?.current;
  return cur ? Math.max(0, Math.round((cur.stop - now.value) / 60000)) : 0;
});

const formatTime = (timestamp: number) =>
  timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
</script>

<style scoped>
.meta-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.np-title {
  margin: 0;
  font-size: 28px;
  line-height: 34px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.time-line {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.time-line span {
  white-space: nowrap;
}

.time-bar {
  flex: 0 1 240px;
}

.np-desc {
  margin: 0;
  max-width: 720px;
  line-height: 22px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.next-card {
  max-width: 360px;
}

@media (max-width: 600px) {
  .np-title {
    font-size: 20px;
    line-height: 26px;
  }
}
</style>
