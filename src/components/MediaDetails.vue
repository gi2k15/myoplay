<!-- src/components/MediaDetails.vue -->
<template>
  <v-dialog :model-value="modelValue" max-width="880" @update:model-value="$emit('update:modelValue', $event)">
    <v-card v-if="item" class="details">
      <v-btn
        icon="mdi-close"
        variant="text"
        size="small"
        class="close-btn"
        :aria-label="$t('common.close')"
        @click="$emit('update:modelValue', false)"
      />

      <div class="details-top">
        <div class="poster">
          <v-img v-if="item.logo" :src="item.logo" cover aspect-ratio="0.667" />
          <div v-else class="poster-placeholder">
            <v-icon size="40" color="medium-emphasis">{{ kind === 'movie' ? 'mdi-movie-open-outline' : 'mdi-layers-outline' }}</v-icon>
          </div>
        </div>

        <div class="info">
          <h2 class="title">{{ item.name }}</h2>
          <div class="meta">
            <span v-for="(m, i) in metaParts" :key="i">{{ m }}</span>
          </div>

          <p v-if="item.plot" class="plot">{{ item.plot }}</p>
          <p v-else-if="loadingInfo" class="plot d-flex align-center ga-2">
            <v-progress-circular size="16" width="2" indeterminate />
            {{ $t('streamBrowser.movieDetails.loadingOnline') }}
          </p>
          <p v-else-if="kind === 'movie'" class="plot">{{ $t('streamBrowser.movieDetails.noSynopsis') }}</p>

          <div v-if="item.director" class="credit">
            {{ $t('streamBrowser.movieDetails.directorLabel') }} {{ item.director }}
          </div>

          <v-alert v-if="errorMsg" type="warning" density="compact" class="mt-3">{{ errorMsg }}</v-alert>

          <div class="actions">
            <v-btn v-if="kind === 'movie'" color="primary" prepend-icon="mdi-play" height="44" @click="$emit('play')">
              {{ $t('streamBrowser.movieDetails.watchBtn') }}
            </v-btn>
            <v-btn
              variant="outlined"
              height="44"
              :prepend-icon="favorite ? 'mdi-star' : 'mdi-star-outline'"
              :class="{ 'fav-on': favorite }"
              @click="$emit('toggle-favorite')"
            >
              {{ favorite ? $t('streamBrowser.movieDetails.favorited') : $t('streamBrowser.movieDetails.favorite') }}
            </v-btn>
          </div>
        </div>
      </div>

      <!-- Series: seasons and episodes -->
      <section v-if="kind === 'series'" class="episodes">
        <div v-if="loadingEpisodes" class="state">
          <v-progress-circular indeterminate size="32" />
          <span>{{ $t('streamBrowser.seriesDetails.loadingEpisodes') }}</span>
        </div>
        <div v-else-if="seasonKeys.length === 0" class="state">
          {{ $t('streamBrowser.seriesDetails.noEpisodes') }}
        </div>
        <template v-else>
          <v-tabs v-model="activeSeason" density="comfortable" class="season-tabs">
            <v-tab v-for="season in seasonKeys" :key="season" :value="season">
              {{ $t('streamBrowser.seriesDetails.seasonLabel', { season }) }}
            </v-tab>
          </v-tabs>
          <v-list class="episode-list" density="comfortable">
            <v-list-item
              v-for="ep in seasons?.[activeSeason] || []"
              :key="ep.id"
              class="episode"
              @click="$emit('play-episode', ep)"
            >
              <template v-slot:prepend>
                <span class="ep-num tabular">{{ ep.episodeNum }}</span>
              </template>
              <v-list-item-title class="font-weight-semibold">{{ ep.title }}</v-list-item-title>
              <v-list-item-subtitle v-if="ep.plot">{{ ep.plot }}</v-list-item-subtitle>
              <template v-slot:append>
                <span v-if="ep.duration" class="ep-duration tabular">{{ ep.duration }}</span>
                <v-icon class="ep-play" size="20">mdi-play</v-icon>
              </template>
            </v-list-item>
          </v-list>
        </template>
      </section>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { IPTVChannel } from '@/services/db';
import type { XtreamEpisode } from '@/services/xtreamClient';

const { t } = useI18n();

const props = defineProps<{
  modelValue: boolean;
  item: IPTVChannel | null;
  kind: 'movie' | 'series';
  favorite: boolean;
  loadingInfo?: boolean;
  errorMsg?: string;
  loadingEpisodes?: boolean;
  seasons?: Record<number, XtreamEpisode[]>;
}>();

defineEmits<{
  (e: 'update:modelValue', open: boolean): void;
  (e: 'play'): void;
  (e: 'play-episode', ep: XtreamEpisode): void;
  (e: 'toggle-favorite'): void;
}>();

const seasonKeys = computed(() => Object.keys(props.seasons || {}).map(Number).sort((a, b) => a - b));
const activeSeason = ref(1);
watch(seasonKeys, (keys) => { if (keys.length) activeSeason.value = keys[0]; }, { immediate: true });

const metaParts = computed(() => {
  const it = props.item;
  if (!it) return [];
  const parts: string[] = [];
  if (it.year) parts.push(it.year);
  // Xtream gives minutes as a bare number; anything else is shown as-is
  if (it.duration) parts.push(/^\d+$/.test(it.duration) ? `${it.duration} min` : it.duration);
  parts.push(it.genre || (it.category === 'Sem Categoria' ? t('common.noCategory') : it.category));
  if (Number(it.rating) > 0) parts.push(`★ ${it.rating}`);
  return parts;
});
</script>

<style scoped>
.details {
  position: relative;
}

.close-btn {
  position: absolute !important;
  top: 12px;
  right: 12px;
  z-index: 1;
}

.details-top {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  padding: 24px;
}

.poster {
  flex: 0 0 180px;
  border-radius: 12px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface-light));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  align-self: flex-start;
}

.poster-placeholder {
  aspect-ratio: 0.667;
  display: flex;
  align-items: center;
  justify-content: center;
}

.info {
  flex: 1 1 320px;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.title {
  margin: 0 40px 8px 0;
  font-size: 24px;
  line-height: 30px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0 8px;
  font-size: 14px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.meta span + span::before {
  content: '·';
  margin-right: 8px;
}

.plot {
  margin: 16px 0 0;
  line-height: 22px;
  max-height: 176px;
  overflow-y: auto;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.credit {
  margin-top: 12px;
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
  padding-top: 20px;
}

.fav-on :deep(.v-icon) {
  color: rgb(var(--v-theme-warning));
}

.episodes {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.season-tabs {
  padding: 0 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.episode-list {
  max-height: 360px;
  overflow-y: auto;
  padding: 8px 12px 12px;
}

.episode {
  border-radius: 12px !important;
}

.episode :deep(.v-list-item-subtitle) {
  -webkit-line-clamp: 1;
}

.ep-num {
  width: 32px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.ep-duration {
  margin-right: 12px;
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.ep-play {
  opacity: 0;
  transition: opacity 0.15s ease;
}

.episode:hover .ep-play,
.episode:focus-visible .ep-play {
  opacity: 1;
}

.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 24px;
  text-align: center;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

@media (max-width: 600px) {
  .poster {
    flex-basis: 120px;
  }
}
</style>
