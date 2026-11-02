<!-- src/components/TVGuide.vue -->
<template>
  <v-card class="guide" :aria-label="$t('tvGuide.title')">
    <div class="guide-head">
      <h2 class="guide-title">{{ $t('nav.guide') }}</h2>
      <div class="d-flex ga-1">
        <v-btn icon="mdi-chevron-left" variant="text" size="small" :aria-label="$t('tvGuide.earlier')" @click="offsetHours -= 3" />
        <v-btn :variant="offsetHours === 0 ? 'flat' : 'outlined'" :color="offsetHours === 0 ? 'primary' : undefined" size="small" height="32" @click="offsetHours = 0">
          {{ $t('tvGuide.now') }}
        </v-btn>
        <v-btn icon="mdi-chevron-right" variant="text" size="small" :aria-label="$t('tvGuide.later')" @click="offsetHours += 3" />
      </div>
      <v-spacer />
      <v-text-field
        v-model="searchQuery"
        :placeholder="$t('tvGuide.searchPlaceholder')"
        :aria-label="$t('tvGuide.searchPlaceholder')"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        hide-details
        clearable
        max-width="280"
        class="guide-search"
      />
    </div>

    <div v-if="loadingChannels" class="text-center py-12">
      <v-progress-circular indeterminate />
    </div>

    <div v-else-if="filteredChannels.length === 0" class="text-center py-12 text-medium-emphasis">
      {{ $t('tvGuide.noChannels') }}
    </div>

    <div v-else class="grid-scroller" @scroll="onScroll">
      <div class="grid" :style="{ width: `${CHANNEL_COL + windowWidth}px` }">
        <div class="grid-row grid-header">
          <div class="ch-cell ch-cell--head" />
          <div class="track">
            <span v-for="tick in ticks" :key="tick.time" class="tick tabular" :style="{ left: `${tick.left}px` }">
              {{ formatTime(tick.time) }}
            </span>
          </div>
        </div>

        <div v-for="ch in visibleChannels" :key="ch.id" class="grid-row">
          <button class="ch-cell" :title="$t('tvGuide.watchBtn')" @click="emit('play-stream', ch)">
            <v-avatar size="28" rounded="lg" color="surface-light" class="flex-shrink-0">
              <v-img v-if="ch.logo" :src="ch.logo" />
              <v-icon v-else size="16" color="medium-emphasis">mdi-television-classic</v-icon>
            </v-avatar>
            <span class="text-truncate">{{ ch.name }}</span>
          </button>
          <div class="track">
            <button
              v-for="b in rowBlocks(ch)"
              :key="b.prog.id"
              class="prog"
              :class="{ 'prog--live': b.live, 'prog--selected': b.prog.id === selectedId }"
              :style="{ left: `${b.left}px`, width: `${b.width - 2}px` }"
              :title="`${formatTime(b.prog.start)} – ${formatTime(b.prog.stop)} · ${b.prog.title}`"
              @click="select(ch, b.prog)"
              @dblclick="emit('play-stream', ch)"
            >
              {{ b.prog.title }}
            </button>
            <span v-if="schedules[ch.tvgId!] && rowBlocks(ch).length === 0" class="no-guide">
              {{ $t('tvGuide.noGuide') }}
            </span>
          </div>
        </div>

        <div v-if="nowX !== null" class="now-line" :style="{ left: `${CHANNEL_COL + nowX}px` }" aria-hidden="true" />
      </div>
    </div>
  </v-card>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { db, type IPTVChannel, type EPGProgram } from '@/services/db';
import { guideBlock } from '@/utils/epgGrid';

const props = defineProps<{
  playlistId: number;
}>();

const emit = defineEmits<{
  (e: 'play-stream', ch: IPTVChannel): void;
  (e: 'select-programme', sel: { channel: IPTVChannel; programme: EPGProgram }): void;
}>();

const CHANNEL_COL = 200;
const PX_PER_MIN = 4;
const WINDOW_HOURS = 6;
const HALF_HOUR = 30 * 60 * 1000;
const ROWS_STEP = 40;

const searchQuery = ref('');
const loadingChannels = ref(false);
const allChannelsWithEpg = ref<IPTVChannel[]>([]);
const schedules = ref<Record<string, EPGProgram[]>>({});
const selectedId = ref<string | number | null>(null);
const rowLimit = ref(ROWS_STEP);
const offsetHours = ref(0);

const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | undefined;

onMounted(async () => {
  timer = setInterval(() => (now.value = Date.now()), 60000);
  await loadGuideData();
});
onUnmounted(() => clearInterval(timer));

watch(() => props.playlistId, async () => {
  selectedId.value = null;
  schedules.value = {};
  await loadGuideData();
});

// Window starts half an hour before now, on a half-hour boundary
const winStart = computed(() =>
  Math.floor(now.value / HALF_HOUR) * HALF_HOUR - HALF_HOUR + offsetHours.value * 3600000
);
const winEnd = computed(() => winStart.value + WINDOW_HOURS * 3600000);
const windowWidth = WINDOW_HOURS * 60 * PX_PER_MIN;

const ticks = computed(() =>
  Array.from({ length: WINDOW_HOURS * 2 }, (_, i) => ({
    time: winStart.value + i * HALF_HOUR,
    left: i * 30 * PX_PER_MIN,
  }))
);

const nowX = computed(() =>
  now.value >= winStart.value && now.value < winEnd.value
    ? ((now.value - winStart.value) / 60000) * PX_PER_MIN
    : null
);

// --- DATA ---
const loadGuideData = async () => {
  loadingChannels.value = true;
  allChannelsWithEpg.value = [];
  try {
    const list = await db.getChannels(props.playlistId);
    const channels = list.filter(ch => !!ch.tvgId && ch.type === 'live');
    const currentShows = await db.getCurrentProgrammes();

    // Channels with a live show first, then alphabetically
    channels.sort((a, b) => {
      const hasA = !!currentShows[a.tvgId!];
      const hasB = !!currentShows[b.tvgId!];
      if (hasA !== hasB) return hasA ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    allChannelsWithEpg.value = channels;
  } catch (err) {
    console.error(err);
  } finally {
    loadingChannels.value = false;
  }
};

const filteredChannels = computed(() => {
  if (!searchQuery.value) return allChannelsWithEpg.value;
  const q = searchQuery.value.toLowerCase().trim();
  return allChannelsWithEpg.value.filter(ch => ch.name.toLowerCase().includes(q));
});

const visibleChannels = computed(() => filteredChannels.value.slice(0, rowLimit.value));

watch(searchQuery, () => { rowLimit.value = ROWS_STEP; });

// Schedules load lazily for the rows on screen
watch(visibleChannels, (channels) => {
  for (const ch of channels) {
    const id = ch.tvgId!;
    if (schedules.value[id]) continue;
    schedules.value[id] = [];
    db.getEpgForChannel(id).then((events) => {
      schedules.value[id] = events;
      if (selectedId.value === null) {
        const live = events.find(p => now.value >= p.start && now.value <= p.stop);
        if (live) select(ch, live);
      }
    }).catch(err => console.error(`Error loading EPG for ${ch.name}:`, err));
  }
}, { immediate: true });

const onScroll = (e: Event) => {
  const el = e.target as HTMLElement;
  if (el.scrollHeight - el.scrollTop <= el.clientHeight + 200 && rowLimit.value < filteredChannels.value.length) {
    rowLimit.value += ROWS_STEP;
  }
};

const rowBlocks = (ch: IPTVChannel) => {
  const out: { prog: EPGProgram; left: number; width: number; live: boolean }[] = [];
  for (const prog of schedules.value[ch.tvgId!] || []) {
    const b = guideBlock(prog.start, prog.stop, winStart.value, winEnd.value, PX_PER_MIN);
    if (b) out.push({ prog, ...b, live: now.value >= prog.start && now.value <= prog.stop });
  }
  return out;
};

const select = (channel: IPTVChannel, programme: EPGProgram) => {
  selectedId.value = programme.id ?? null;
  emit('select-programme', { channel, programme });
};

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
</script>

<style scoped>
.guide {
  display: flex;
  flex-direction: column;
  min-height: 320px;
  overflow: hidden;
}

.guide-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.guide-title {
  font-size: 20px;
  font-weight: 700;
  margin-right: 8px;
}

.guide-search {
  min-width: 200px;
}

.grid-scroller {
  overflow: auto;
  max-height: 60vh;
}

.grid {
  position: relative;
}

.grid-row {
  display: flex;
  height: 56px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.06);
}

.grid-header {
  height: 36px;
  position: sticky;
  top: 0;
  z-index: 3;
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.ch-cell,
.prog {
  border: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
}

.ch-cell {
  flex: 0 0 200px;
  position: sticky;
  left: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  font-weight: 600;
  text-align: left;
  background: rgb(var(--v-theme-surface));
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  min-width: 0;
}

button.ch-cell:hover {
  background: rgb(var(--v-theme-surface-light));
}

.track {
  position: relative;
  flex: 1 1 auto;
}

.tick {
  position: absolute;
  top: 10px;
  padding-left: 8px;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.prog {
  position: absolute;
  top: 4px;
  bottom: 4px;
  padding: 0 10px;
  border-radius: 8px;
  font-size: 13px;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  background: rgb(var(--v-theme-surface-light));
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  transition: background-color 0.15s ease;
}

.prog:hover {
  background: rgb(var(--v-theme-surface-bright));
}

.prog--live {
  background: rgb(var(--v-theme-surface-bright));
  color: rgb(var(--v-theme-on-surface));
}

.prog--selected,
.prog--selected:hover {
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  font-weight: 600;
}

.prog:focus-visible,
.ch-cell:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}

.no-guide {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.now-line {
  position: absolute;
  top: 28px;
  bottom: 0;
  width: 2px;
  background: rgb(var(--v-theme-error));
  z-index: 1;
  pointer-events: none;
}
</style>
