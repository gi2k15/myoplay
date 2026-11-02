<!-- src/components/GlobalSearchModal.vue -->
<template>
  <v-dialog
    v-model="isOpen"
    max-width="960"
    scrollable
    transition="dialog-top-transition"
    class="global-search-dialog"
  >
    <v-card class="search-modal-card">
      <!-- Search Input Header -->
      <div class="search-header px-4 pt-4 pb-2 border-bottom">
        <div class="d-flex align-center ga-3">
          <v-icon color="medium-emphasis" size="24">mdi-magnify</v-icon>
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            class="search-native-input flex-grow-1"
            :placeholder="$t('globalSearch.placeholder')"
            @keydown.down.prevent="focusNextItem"
            @keydown.up.prevent="focusPrevItem"
            @keydown.enter.prevent="handleEnterPress"
            @keydown.esc.prevent="closeModal"
          />

          <!-- Loading Indicator -->
          <v-progress-circular
            v-if="isSearching"
            indeterminate
            size="20"
            width="2"
            class="flex-shrink-0"
          />

          <!-- Clear Button -->
          <v-btn
            v-if="searchQuery"
            icon="mdi-close"
            variant="text"
            size="small"
            color="medium-emphasis"
            @click="clearSearch"
          />

          <!-- ESC Badge (Desktop) -->
          <div v-if="!$vuetify.display.mobile" class="esc-badge text-caption flex-shrink-0">
            <kbd class="kbd-key">ESC</kbd>
          </div>

          <!-- Close Icon (Mobile) -->
          <v-btn
            v-if="$vuetify.display.mobile"
            icon="mdi-close"
            variant="text"
            size="small"
            @click="closeModal"
          />
        </div>

        <!-- Filter Chips -->
        <div class="d-flex align-center ga-2 pt-3 pb-1 overflow-x-auto no-scrollbar">
          <v-chip
            v-for="f in filters"
            :key="f.value"
            :variant="activeFilter === f.value ? 'flat' : 'outlined'"
            :color="activeFilter === f.value ? 'primary' : undefined"
            @click="activeFilter = f.value"
          >
            {{ f.label }}
            <span v-if="f.count > 0" class="chip-count tabular">{{ f.count }}</span>
          </v-chip>
        </div>
      </div>

      <!-- Search Content Body -->
      <v-card-text class="search-content-body pa-4 overflow-y-auto" style="min-height: 380px; max-height: 68vh;">
        <!-- 1. EMPTY QUERY STATE: Recent searches & hint -->
        <div v-if="!searchQuery.trim()" class="py-6">
          <div v-if="recentSearches.length > 0" class="mb-6">
            <div class="d-flex align-center justify-space-between mb-3">
              <span class="section-label d-flex align-center">
                <v-icon size="16" class="mr-1">mdi-history</v-icon>
                {{ $t('globalSearch.recentSearches') }}
              </span>
              <v-btn
                variant="text"
                size="x-small"
                color="medium-emphasis"
                @click="clearRecentSearches"
              >
                {{ $t('globalSearch.clearRecent') }}
              </v-btn>
            </div>
            <div class="d-flex flex-wrap ga-2">
              <v-chip
                v-for="item in recentSearches"
                :key="item"
                variant="outlined"
                size="small"
                closable
                class="recent-chip"
                @click="applyRecentSearch(item)"
                @click:close.stop="removeRecentSearch(item)"
              >
                {{ item }}
              </v-chip>
            </div>
          </div>

          <!-- Empty search guide banner -->
          <div class="text-center py-8">
            <v-avatar size="64" color="surface-variant" class="mb-3 border-glass">
              <v-icon size="32" color="medium-emphasis">mdi-text-search</v-icon>
            </v-avatar>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ $t('globalSearch.typeToSearch') }}</h3>
            <p class="text-caption text-medium-emphasis mx-auto search-hint">
              {{ $t('globalSearch.typeToSearchDesc') }}
            </p>
          </div>
        </div>

        <!-- 2. NO RESULTS STATE -->
        <div v-else-if="!isSearching && searchResults.totalMatches === 0" class="text-center py-12">
          <v-icon size="56" color="medium-emphasis" class="mb-3">mdi-file-search-outline</v-icon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">
            {{ $t('globalSearch.noResults', { query: searchQuery }) }}
          </h3>
          <p class="text-caption text-medium-emphasis mx-auto search-hint">
            {{ $t('globalSearch.noResultsDesc') }}
          </p>
        </div>

        <!-- 3. RESULTS DISPLAY -->
        <div v-else class="d-flex flex-column ga-6">
          <!-- Live channels -->
          <section v-if="shown.live.length > 0">
            <div class="section-head">
              <h3 class="section-label">{{ $t('globalSearch.live') }} · {{ searchResults.counts.live }}</h3>
              <v-btn v-if="activeFilter === 'all' && searchResults.counts.live > shown.live.length" variant="text" size="small" @click="activeFilter = 'live'">
                {{ $t('globalSearch.viewAll', { count: searchResults.counts.live }) }}
              </v-btn>
            </div>
            <v-list class="live-grid pa-0" density="comfortable">
              <v-list-item
                v-for="ch in shown.live"
                :key="ch.id"
                class="live-row"
                :title="ch.name"
                :subtitle="ch.category"
                @click="playChannel(ch)"
              >
                <template v-slot:prepend>
                  <v-avatar size="40" rounded="lg" color="surface-light" class="border">
                    <v-img v-if="ch.logo" :src="ch.logo" />
                    <v-icon v-else size="20" color="medium-emphasis">mdi-television-classic</v-icon>
                  </v-avatar>
                </template>
              </v-list-item>
            </v-list>
          </section>

          <!-- Movies and series share the poster grid -->
          <section v-for="group in posterGroups" :key="group.type">
            <div class="section-head">
              <h3 class="section-label">{{ group.label }} · {{ group.count }}</h3>
              <v-btn v-if="activeFilter === 'all' && group.count > group.items.length" variant="text" size="small" @click="activeFilter = group.type">
                {{ $t('globalSearch.viewAll', { count: group.count }) }}
              </v-btn>
            </div>
            <div class="poster-grid">
              <div
                v-for="item in group.items"
                :key="item.id"
                class="poster"
                role="button"
                tabindex="0"
                @click="group.type === 'movie' ? openMoviePreview(item) : openSeriesHub(item)"
                @keydown.enter="group.type === 'movie' ? openMoviePreview(item) : openSeriesHub(item)"
              >
                <div class="poster-img">
                  <v-img v-if="item.logo" :src="item.logo" cover aspect-ratio="0.667" />
                  <div v-else class="poster-placeholder">
                    <v-icon size="32" color="medium-emphasis">{{ group.type === 'movie' ? 'mdi-movie-open-outline' : 'mdi-layers-outline' }}</v-icon>
                  </div>
                </div>
                <div class="poster-title" :title="item.name">{{ item.name }}</div>
                <div class="poster-meta">
                  <template v-if="item.year">{{ item.year }}</template>
                  <template v-if="item.year && Number(item.rating) > 0"> · </template>
                  <template v-if="Number(item.rating) > 0">★ {{ item.rating }}</template>
                  <template v-if="!item.year && !(Number(item.rating) > 0)">{{ item.category }}</template>
                </div>
              </div>
            </div>
          </section>
        </div>
      </v-card-text>

      <!-- Footer Info -->
      <div class="search-footer px-4 py-2 border-top d-flex align-center justify-space-between text-caption text-medium-emphasis">
        <div class="d-flex align-center ga-2">
          <span v-if="searchResults.totalMatches > 0">
            {{ $t('globalSearch.resultsCount', { count: searchResults.totalMatches }) }}
          </span>
          <span v-else>
            {{ $t('globalSearch.shortcut') }}
          </span>
        </div>
        <div class="d-flex align-center ga-3">
          <span>{{ $t('globalSearch.pressEsc') }}</span>
        </div>
      </div>
    </v-card>

    <MediaDetails
      v-model="moviePreviewDialog"
      kind="movie"
      :item="selectedMovie"
      :favorite="!!selectedMovie && isFavorite(selectedMovie.id)"
      @play="playMovie(selectedMovie!)"
      @toggle-favorite="toggleFavorite(selectedMovie!.id)"
    />

    <MediaDetails
      v-model="seriesHubDialog"
      kind="series"
      :item="selectedSeries"
      :favorite="!!selectedSeries && isFavorite(selectedSeries.id)"
      :loading-episodes="loadingEpisodes"
      :seasons="seasonsData"
      @play-episode="playEpisode"
      @toggle-favorite="toggleFavorite(selectedSeries!.id)"
    />
  </v-dialog>
</template>

<script lang="ts" setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { db, type IPTVChannel, type GlobalSearchResults } from '@/services/db';
import { XtreamClient, type XtreamEpisode } from '@/services/xtreamClient';
import { getDataProxy } from '@/utils/proxy';
import { useI18n } from 'vue-i18n';
import MediaDetails from '@/components/MediaDetails.vue';

const { t } = useI18n();


const props = defineProps<{
  modelValue: boolean;
  playlistId: number | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'play-stream', ch: IPTVChannel): void;
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const searchInputRef = ref<HTMLInputElement | null>(null);
const searchQuery = ref('');
const activeFilter = ref<'all' | 'live' | 'movie' | 'series'>('all');
const isSearching = ref(false);
const recentSearches = ref<string[]>([]);
const favoritesSet = ref<Set<string>>(new Set());

const searchResults = ref<GlobalSearchResults>({
  live: [],
  movie: [],
  series: [],
  totalMatches: 0,
  counts: { live: 0, movie: 0, series: 0 }
});

// "All" shows a preview of each group; a type filter shows its full list
const shown = computed(() => {
  const all = activeFilter.value === 'all';
  const pick = <T,>(type: 'live' | 'movie' | 'series', list: T[], preview: number) =>
    all ? list.slice(0, preview) : activeFilter.value === type ? list : [];
  const r = searchResults.value;
  return { live: pick('live', r.live, 6), movie: pick('movie', r.movie, 12), series: pick('series', r.series, 12) };
});

const posterGroups = computed(() => ([
  { type: 'movie' as const, label: t('globalSearch.movies'), count: searchResults.value.counts.movie, items: shown.value.movie },
  { type: 'series' as const, label: t('globalSearch.series'), count: searchResults.value.counts.series, items: shown.value.series },
]).filter(g => g.items.length > 0));

const filters = computed(() => [
  { value: 'all' as const, label: t('globalSearch.all'), count: searchResults.value.totalMatches },
  { value: 'live' as const, label: t('globalSearch.live'), count: searchResults.value.counts.live },
  { value: 'movie' as const, label: t('globalSearch.movies'), count: searchResults.value.counts.movie },
  { value: 'series' as const, label: t('globalSearch.series'), count: searchResults.value.counts.series },
]);

// Movie details sub-modal
const moviePreviewDialog = ref(false);
const selectedMovie = ref<IPTVChannel | null>(null);

// Series hub sub-modal
const seriesHubDialog = ref(false);
const selectedSeries = ref<IPTVChannel | null>(null);
const loadingEpisodes = ref(false);
const seasonsData = ref<Record<number, XtreamEpisode[]>>({});

let debounceTimer: any = null;

const loadRecentSearches = async () => {
  try {
    const list = await db.getSetting('global_search_recent', []);
    recentSearches.value = Array.isArray(list) ? list : [];
  } catch (err) {
    console.error('Error loading recent searches:', err);
  }
};

const saveRecentSearch = async (term: string) => {
  const trimmed = term.trim();
  if (!trimmed || trimmed.length < 2) return;
  try {
    const current = recentSearches.value.filter(t => t.toLowerCase() !== trimmed.toLowerCase());
    current.unshift(trimmed);
    const updated = current.slice(0, 8);
    recentSearches.value = updated;
    await db.setSetting('global_search_recent', updated);
  } catch (err) {
    console.error('Error saving recent search:', err);
  }
};

const removeRecentSearch = async (term: string) => {
  try {
    const updated = recentSearches.value.filter(t => t !== term);
    recentSearches.value = updated;
    await db.setSetting('global_search_recent', updated);
  } catch (err) {
    console.error('Error removing recent search:', err);
  }
};

const clearRecentSearches = async () => {
  try {
    recentSearches.value = [];
    await db.setSetting('global_search_recent', []);
  } catch (err) {
    console.error('Error clearing recent searches:', err);
  }
};

const applyRecentSearch = (item: string) => {
  searchQuery.value = item;
  triggerSearch();
};

const loadFavorites = async () => {
  if (!props.playlistId) return;
  try {
    const list = await db.getFavorites(props.playlistId);
    favoritesSet.value = new Set(list);
  } catch (err) {
    console.error(err);
  }
};

const isFavorite = (id: string) => favoritesSet.value.has(id);

const toggleFavorite = async (id: string) => {
  if (!props.playlistId) return;
  try {
    if (isFavorite(id)) {
      await db.removeFavorite(props.playlistId, id);
      favoritesSet.value.delete(id);
    } else {
      await db.addFavorite(props.playlistId, id);
      favoritesSet.value.add(id);
    }
  } catch (err) {
    console.error(err);
  }
};

// Perform search
const triggerSearch = async () => {
  if (!props.playlistId || !searchQuery.value.trim()) {
    searchResults.value = {
      live: [],
      movie: [],
      series: [],
      totalMatches: 0,
      counts: { live: 0, movie: 0, series: 0 }
    };
    isSearching.value = false;
    return;
  }

  isSearching.value = true;
  try {
    const results = await db.searchChannels(props.playlistId, searchQuery.value, 60);
    searchResults.value = results;
  } catch (err) {
    console.error('Global search error:', err);
  } finally {
    isSearching.value = false;
  }
};

watch(searchQuery, (newVal) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  if (!newVal.trim()) {
    searchResults.value = {
      live: [],
      movie: [],
      series: [],
      totalMatches: 0,
      counts: { live: 0, movie: 0, series: 0 }
    };
    return;
  }
  debounceTimer = setTimeout(() => {
    triggerSearch();
  }, 150);
});

// Watch dialog open
watch(isOpen, async (open) => {
  if (open) {
    await loadRecentSearches();
    await loadFavorites();
    nextTick(() => {
      searchInputRef.value?.focus();
      searchInputRef.value?.select();
    });
  } else {
    moviePreviewDialog.value = false;
    seriesHubDialog.value = false;
  }
});

const clearSearch = () => {
  searchQuery.value = '';
  searchResults.value = {
    live: [],
    movie: [],
    series: [],
    totalMatches: 0,
    counts: { live: 0, movie: 0, series: 0 }
  };
  searchInputRef.value?.focus();
};

const closeModal = () => {
  isOpen.value = false;
};

// Action triggers
const playChannel = (channel: IPTVChannel) => {
  saveRecentSearch(searchQuery.value || channel.name);
  emit('play-stream', channel);
  closeModal();
};

const openMoviePreview = (movie: IPTVChannel) => {
  saveRecentSearch(searchQuery.value || movie.name);
  selectedMovie.value = movie;
  moviePreviewDialog.value = true;
};

const playMovie = (movie: IPTVChannel) => {
  moviePreviewDialog.value = false;
  playChannel(movie);
};

const openSeriesHub = async (series: IPTVChannel) => {
  saveRecentSearch(searchQuery.value || series.name);
  selectedSeries.value = series;
  seriesHubDialog.value = true;
  loadingEpisodes.value = true;
  seasonsData.value = {};

  try {
    if (!props.playlistId) return;
    const pl = (await db.getPlaylists()).find(p => p.id === props.playlistId);
    if (pl && pl.type === 'xtream' && series.xtreamId) {
      const proxy = await getDataProxy();

      const client = new XtreamClient({
        url: pl.url!,
        username: pl.username!,
        password: pl.password!,
        corsProxy: proxy
      });

      const epData = await client.fetchSeriesEpisodes(series.xtreamId);
      seasonsData.value = epData;
    }
  } catch (err) {
    console.error('Error loading series episodes in search:', err);
  } finally {
    loadingEpisodes.value = false;
  }
};

const playEpisode = (ep: XtreamEpisode) => {
  if (!props.playlistId || !selectedSeries.value) return;
  const mockChannel: IPTVChannel = {
    id: `ep_${ep.id}`,
    playlistId: props.playlistId,
    name: `${selectedSeries.value.name} - S${ep.seasonNum}E${ep.episodeNum}: ${ep.title}`,
    logo: ep.logo || selectedSeries.value.logo || '',
    streamUrl: ep.streamUrl,
    category: selectedSeries.value.category || 'Série',
    type: 'series'
  };
  emit('play-stream', mockChannel);
  seriesHubDialog.value = false;
  closeModal();
};

const handleEnterPress = () => {
  if (searchResults.value.live.length > 0) {
    playChannel(searchResults.value.live[0]);
  } else if (searchResults.value.movie.length > 0) {
    playChannel(searchResults.value.movie[0]);
  } else if (searchResults.value.series.length > 0) {
    openSeriesHub(searchResults.value.series[0]);
  }
};

const focusNextItem = () => {};
const focusPrevItem = () => {};

onMounted(() => {
  loadRecentSearches();
});
</script>

<style scoped>
.search-native-input {
  background: transparent;
  border: none;
  outline: none;
  font-size: 18px;
  color: rgb(var(--v-theme-on-surface));
  font-weight: 500;
  width: 100%;
  min-width: 0;
}

.search-native-input::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.45);
}

.border-bottom {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;
}

.border-top {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;
}

.kbd-key {
  background: rgb(var(--v-theme-surface-light));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  padding: 2px 7px;
  font-size: 12px;
  font-family: inherit;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.chip-count {
  margin-left: 6px;
  opacity: 0.7;
  font-size: 12px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
  margin-bottom: 8px;
}

.live-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 4px 8px;
}

.live-row {
  border-radius: 12px !important;
  min-width: 0;
}

.live-row :deep(.v-list-item-title) {
  font-weight: 600;
}

.poster-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
  gap: 16px 12px;
}

.poster {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  outline: none;
}

.poster-img {
  border-radius: 12px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface-light));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  transition: border-color 0.15s ease;
}

.poster:hover .poster-img,
.poster:focus-visible .poster-img {
  border-color: rgba(var(--v-theme-on-surface), 0.4);
}

.poster-placeholder {
  aspect-ratio: 0.667;
  display: flex;
  align-items: center;
  justify-content: center;
}

.poster-title {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.poster-meta {
  margin-top: -4px;
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-hint {
  max-width: 420px;
}

.recent-chip:hover {
  border-color: rgba(var(--v-theme-on-surface), 0.4);
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
