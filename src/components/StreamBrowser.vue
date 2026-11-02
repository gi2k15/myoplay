<!-- src/components/StreamBrowser.vue -->
<template>
  <div class="browser">
    <div class="browser-head">
      <div class="d-flex align-center justify-space-between">
        <h2 class="browser-title">{{ getBrowserTitle() }}</h2>
        <span class="text-body-2 text-medium-emphasis tabular">{{ filteredChannels.length.toLocaleString() }}</span>
      </div>

      <div class="d-flex ga-2">
        <v-text-field
          v-model="searchQuery"
          :placeholder="$t('streamBrowser.searchPlaceholder')"
          :aria-label="$t('streamBrowser.searchPlaceholder')"
          prepend-inner-icon="mdi-magnify"
          density="compact"
          hide-details
          clearable
          @update:model-value="resetPagination"
        >
          <template v-slot:append-inner>
            <v-btn
              icon="mdi-earth"
              variant="text"
              size="small"
              density="comfortable"
              :aria-label="$t('sidebar.globalSearch')"
              @click.stop="triggerGlobalSearch"
            >
              <v-icon size="18">mdi-earth</v-icon>
              <v-tooltip activator="parent" location="bottom">{{ $t('sidebar.globalSearch') }} (Ctrl+K)</v-tooltip>
            </v-btn>
          </template>
        </v-text-field>

        <v-menu v-if="type === 'movie' || type === 'series'" location="bottom end">
          <template v-slot:activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" variant="outlined" height="40" min-width="40" class="px-0" :aria-label="$t('streamBrowser.sortOptions.label')">
              <v-icon>mdi-sort</v-icon>
            </v-btn>
          </template>
          <v-list density="compact" bg-color="surface" class="border rounded-lg">
            <v-list-subheader>{{ $t('streamBrowser.sortOptions.label') }}</v-list-subheader>
            <v-list-item
              v-for="opt in sortOptions"
              :key="opt.value"
              :title="opt.title"
              :active="sortBy === opt.value"
              @click="sortBy = opt.value; resetPagination()"
            />
          </v-list>
        </v-menu>
      </div>

      <v-slide-group class="category-chips" :show-arrows="!mobile">
        <v-slide-group-item v-for="cat in categoryChips" :key="cat.value">
          <v-chip
            class="mr-2"
            :variant="selectedCategory === cat.value ? 'flat' : 'outlined'"
            :color="selectedCategory === cat.value ? 'primary' : undefined"
            @click="selectCategory(cat.value)"
          >
            {{ cat.label }}
            <span class="chip-count tabular">{{ cat.count }}</span>
          </v-chip>
        </v-slide-group-item>
      </v-slide-group>
    </div>

    <!-- Scrollable list -->
    <div class="browser-body" @scroll="onScroll">
      <div v-if="filteredChannels.length === 0" class="text-center py-12 px-4">
        <v-icon size="40" color="medium-emphasis" class="mb-3">mdi-magnify-close</v-icon>
        <div class="font-weight-semibold">{{ $t('streamBrowser.noChannelsSearchTitle') }}</div>
        <p class="text-body-2 text-medium-emphasis">{{ $t('streamBrowser.noChannelsSearchDesc') }}</p>
      </div>

      <!-- Live / Favorites: compact rows -->
      <v-list v-else-if="type === 'live' || type === 'favorites'" class="pa-0" density="comfortable">
        <v-list-item
          v-for="ch in paginatedChannels"
          :key="ch.id"
          :active="ch.id === activeChannelId"
          class="channel-row mb-1"
          @click="playStream(ch)"
        >
          <template v-slot:prepend>
            <v-avatar size="40" rounded="lg" color="surface-light" class="border mr-3">
              <v-img v-if="ch.logo" :src="ch.logo" />
              <v-icon v-else size="20" color="medium-emphasis">mdi-television-classic</v-icon>
            </v-avatar>
          </template>

          <v-list-item-title class="font-weight-semibold">{{ ch.name }}</v-list-item-title>
          <v-list-item-subtitle class="mt-1">
            {{ epgData[ch.tvgId || '']?.current?.title || ch.category }}
          </v-list-item-subtitle>
          <v-progress-linear
            v-if="epgData[ch.tvgId || '']?.current"
            :model-value="getEpgProgress(epgData[ch.tvgId || ''].current)"
            height="2"
            color="secondary-darken-1"
            bg-color="surface-bright"
            bg-opacity="1"
            class="mt-2"
          />

          <template v-slot:append>
            <v-btn
              :icon="isFavorite(ch.id) ? 'mdi-star' : 'mdi-star-outline'"
              :color="isFavorite(ch.id) ? 'warning' : undefined"
              :aria-label="isFavorite(ch.id) ? $t('streamBrowser.movieDetails.favorited') : $t('streamBrowser.movieDetails.favorite')"
              variant="text"
              size="small"
              class="fav-btn"
              :class="{ 'fav-btn--on': isFavorite(ch.id) }"
              @click.stop="toggleFavorite(ch.id)"
            />
          </template>
        </v-list-item>
      </v-list>

      <!-- Movies / Series: poster grid -->
      <div v-else class="poster-grid">
        <div
          v-for="ch in paginatedChannels"
          :key="ch.id"
          class="poster"
          :class="{ 'poster--active': ch.id === activeChannelId }"
          role="button"
          tabindex="0"
          @click="type === 'movie' ? openMovieDetails(ch) : openSeriesDetails(ch)"
          @keydown.enter="type === 'movie' ? openMovieDetails(ch) : openSeriesDetails(ch)"
        >
          <div class="poster-img">
            <v-img v-if="ch.logo" :src="ch.logo" cover aspect-ratio="0.667" />
            <div v-else class="poster-placeholder">
              <v-icon size="32" color="medium-emphasis">{{ type === 'movie' ? 'mdi-movie-open-outline' : 'mdi-layers-outline' }}</v-icon>
            </div>
            <v-btn
              :icon="isFavorite(ch.id) ? 'mdi-star' : 'mdi-star-outline'"
              :color="isFavorite(ch.id) ? 'warning' : 'white'"
              :aria-label="isFavorite(ch.id) ? $t('streamBrowser.movieDetails.favorited') : $t('streamBrowser.movieDetails.favorite')"
              variant="text"
              size="small"
              class="poster-fav"
              @click.stop="toggleFavorite(ch.id)"
            />
          </div>
          <div class="poster-title" :title="ch.name">{{ ch.name }}</div>
          <div class="poster-meta">
            <template v-if="ch.year">{{ ch.year }}</template>
            <template v-if="ch.year && ch.rating"> · </template>
            <template v-if="ch.rating">★ {{ ch.rating }}</template>
            <template v-if="!ch.year && !ch.rating">{{ ch.category }}</template>
          </div>
        </div>
      </div>

      <div v-if="hasMore" class="d-flex justify-center my-4">
        <v-btn variant="outlined" @click="loadNextPage">{{ $t('streamBrowser.loadMore') }}</v-btn>
      </div>
    </div>

    <MediaDetails
      v-model="seriesDialog"
      kind="series"
      :item="selectedSeries"
      :favorite="!!selectedSeries && isFavorite(selectedSeries.id)"
      :loading-episodes="loadingEpisodes"
      :seasons="seasonsData"
      @play-episode="playEpisode"
      @toggle-favorite="toggleFavorite(selectedSeries!.id)"
    />

    <MediaDetails
      v-model="movieDialog"
      kind="movie"
      :item="selectedMovie"
      :favorite="!!selectedMovie && isFavorite(selectedMovie.id)"
      :loading-info="loadingMovieInfo"
      :error-msg="movieErrorMsg"
      @play="playMovie(selectedMovie!)"
      @toggle-favorite="toggleFavorite(selectedMovie!.id)"
    />
  </div>
</template>

<script lang="ts" setup>
import { getDataProxy } from "@/utils/proxy";
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { db, type IPTVChannel } from '@/services/db';
import { XtreamClient, type XtreamEpisode } from '@/services/xtreamClient';
import MediaDetails from '@/components/MediaDetails.vue';

const { t } = useI18n();


// Props
const props = defineProps<{
  playlistId: number;
  type: 'live' | 'movie' | 'series' | 'favorites';
  activeChannelId?: string;
}>();

// Emits
const emit = defineEmits<{
  (e: 'play-stream', ch: IPTVChannel): void;
}>();

// UI States
const searchQuery = ref('');
const selectedCategory = ref('all');

const triggerGlobalSearch = () => {
  window.dispatchEvent(new CustomEvent('open-global-search'));
};

// Sorting States
const sortBy = ref(localStorage.getItem('movie_sort_by') || 'added');
watch(sortBy, (val) => {
  localStorage.setItem('movie_sort_by', val);
});

const sortOptions = computed(() => [
  { title: t('streamBrowser.sortOptions.default'), value: 'added' },
  { title: t('streamBrowser.sortOptions.yearDesc'), value: 'year' },
  { title: t('streamBrowser.sortOptions.rating'), value: 'rating' },
  { title: t('streamBrowser.sortOptions.nameAsc'), value: 'name' }
]);

const categories = ref<{ name: string; count: number }[]>([]);
const allChannels = ref<IPTVChannel[]>([]);
const favoritesSet = ref<Set<string>>(new Set());

// EPG data map: key is tvgId
const epgData = ref<Record<string, { current?: any; next?: any; lastFetched?: number }>>({});

// TV Movie States
const movieDialog = ref(false);
const selectedMovie = ref<IPTVChannel | null>(null);
const loadingMovieInfo = ref(false);
const movieErrorMsg = ref('');

// TV Series States
const seriesDialog = ref(false);
const selectedSeries = ref<IPTVChannel | null>(null);
const loadingEpisodes = ref(false);
const seasonsData = ref<Record<number, XtreamEpisode[]>>({});

// Pagination / Sliced Lazy Loading
const itemsPerPage = 40;
const pageLimit = ref(1);

const onPlaylistUpdatedEvent = async (e: Event) => {
  const customEv = e as CustomEvent<{ playlistId: number }>;
  if (customEv.detail && customEv.detail.playlistId === props.playlistId) {
    console.log(`[StreamBrowser] Active playlist ${props.playlistId} was updated, reloading...`);
    await loadFavorites();
    await loadBrowserData();
  }
};

onMounted(async () => {
  await loadFavorites();
  await loadBrowserData();
  window.addEventListener('playlist-updated', onPlaylistUpdatedEvent);
});

onUnmounted(() => {
  window.removeEventListener('playlist-updated', onPlaylistUpdatedEvent);
});

// Watch parameters changes (e.g. switching between Live TV and Movies)
watch(() => [props.playlistId, props.type], async () => {
  selectedCategory.value = 'all';
  searchQuery.value = '';
  resetPagination();
  await loadFavorites();
  await loadBrowserData();
}, { deep: true });

const resetPagination = () => {
  pageLimit.value = 1;
};

// --- DATA INGESTION & HEURISTICS ---
const loadFavorites = async () => {
  try {
    const list = await db.getFavorites(props.playlistId);
    favoritesSet.value = new Set(list);
  } catch (err) {
    console.error(err);
  }
};

const isFavorite = (id: string) => favoritesSet.value.has(id);

const toggleFavorite = async (id: string) => {
  try {
    if (isFavorite(id)) {
      await db.removeFavorite(props.playlistId, id);
      favoritesSet.value.delete(id);
      
      // If browsing favorites, immediately filter it out
      if (props.type === 'favorites') {
        allChannels.value = allChannels.value.filter(ch => ch.id !== id);
      }
    } else {
      await db.addFavorite(props.playlistId, id);
      favoritesSet.value.add(id);
    }
  } catch (err) {
    console.error(err);
  }
};

const loadBrowserData = async () => {
  try {
    // Reset data
    allChannels.value = [];
    categories.value = [];
    epgData.value = {};

    let channels: IPTVChannel[] = [];
    
    if (props.type === 'favorites') {
      const activeChannels = await db.getChannels(props.playlistId);
      channels = activeChannels.filter(c => favoritesSet.value.has(c.id));
    } else {
      channels = await db.getChannelsByType(props.playlistId, props.type);
    }

    allChannels.value = channels;

    // Build Category counts
    const countsMap: Record<string, number> = {};
    for (const ch of channels) {
      const cat = ch.category || 'Sem Categoria';
      countsMap[cat] = (countsMap[cat] || 0) + 1;
    }

    categories.value = Object.keys(countsMap).map(name => ({
      name,
      count: countsMap[name]
    })).sort((a, b) => b.count - a.count); // sort categories by size

    // Fetch EPG guides for live TV immediately on visible/paginated elements
    if (props.type === 'live' || props.type === 'favorites') {
      fetchEpgDataForVisibleChannels();
    }
  } catch (err) {
    console.error(err);
  }
};

const totalChannelsCount = computed(() => allChannels.value.length);

// Select category
const selectCategory = (cat: string) => {
  selectedCategory.value = cat;
  resetPagination();
  // Load EPG for new list
  if (props.type === 'live' || props.type === 'favorites') {
    setTimeout(fetchEpgDataForVisibleChannels, 100);
  }
};

const getBrowserTitle = () => {
  if (props.type === 'live') return t('streamBrowser.titleLive');
  if (props.type === 'movie') return t('streamBrowser.titleMovie');
  if (props.type === 'series') return t('streamBrowser.titleSeries');
  return t('streamBrowser.titleFavorites');
};

const categoryChips = computed(() => [
  { value: 'all', label: t('streamBrowser.allCategories'), count: totalChannelsCount.value },
  ...categories.value.map(c => ({
    value: c.name,
    label: c.name === 'Sem Categoria' ? t('common.noCategory') : c.name,
    count: c.count,
  })),
]);

// Filtered Channels logic
const filteredChannels = computed(() => {
  let result = allChannels.value;

  // Filter category
  if (selectedCategory.value !== 'all') {
    result = result.filter(ch => (ch.category || 'Sem Categoria') === selectedCategory.value);
  }

  // Filter search query
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase().trim();
    result = result.filter(ch => ch.name.toLowerCase().includes(q));
  }

  // Sort movies and series in-memory
  if (props.type === 'movie' || props.type === 'series') {
    result = [...result];
    if (sortBy.value === 'added') {
      result.sort((a, b) => {
        const addedA = a.added ? parseInt(a.added, 10) : 0;
        const addedB = b.added ? parseInt(b.added, 10) : 0;
        if (addedA !== addedB) {
          return addedB - addedA; // Newest added first
        }
        const yearA = a.year ? parseInt(a.year, 10) : 0;
        const yearB = b.year ? parseInt(b.year, 10) : 0;
        if (yearA !== yearB) {
          return yearB - yearA; // Newest release first
        }
        const ratingA = a.rating ? parseFloat(a.rating) : 0;
        const ratingB = b.rating ? parseFloat(b.rating) : 0;
        if (ratingA !== ratingB) {
          return ratingB - ratingA; // Highest rating first
        }
        if (a.xtreamId && b.xtreamId) {
          return b.xtreamId - a.xtreamId; // Newest provider ID first
        }
        if (a.index !== undefined && b.index !== undefined) {
          return a.index - b.index; // M3U playlist order
        }
        return a.name.localeCompare(b.name);
      });
    } else if (sortBy.value === 'year') {
      result.sort((a, b) => {
        const yearA = a.year ? parseInt(a.year, 10) : 0;
        const yearB = b.year ? parseInt(b.year, 10) : 0;
        if (yearA !== yearB) {
          return yearB - yearA; // Newest release first
        }
        const addedA = a.added ? parseInt(a.added, 10) : 0;
        const addedB = b.added ? parseInt(b.added, 10) : 0;
        if (addedA !== addedB) {
          return addedB - addedA; // Newest added first
        }
        const ratingA = a.rating ? parseFloat(a.rating) : 0;
        const ratingB = b.rating ? parseFloat(b.rating) : 0;
        if (ratingA !== ratingB) {
          return ratingB - ratingA; // Highest rating first
        }
        return a.name.localeCompare(b.name);
      });
    } else if (sortBy.value === 'rating') {
      result.sort((a, b) => {
        const ratingA = a.rating ? parseFloat(a.rating) : 0;
        const ratingB = b.rating ? parseFloat(b.rating) : 0;
        if (ratingA !== ratingB) {
          return ratingB - ratingA; // Highest rating first
        }
        const addedA = a.added ? parseInt(a.added, 10) : 0;
        const addedB = b.added ? parseInt(b.added, 10) : 0;
        if (addedA !== addedB) {
          return addedB - addedA; // Newest added first
        }
        const yearA = a.year ? parseInt(a.year, 10) : 0;
        const yearB = b.year ? parseInt(b.year, 10) : 0;
        if (yearA !== yearB) {
          return yearB - yearA; // Newest release first
        }
        return a.name.localeCompare(b.name);
      });
    } else if (sortBy.value === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  return result;
});

// Paginated slicing
const paginatedChannels = computed(() => {
  const limit = pageLimit.value * itemsPerPage;
  return filteredChannels.value.slice(0, limit);
});

// Watch paginated channels changes (e.g., search, category switch, scrolling) to dynamically resolve EPG
watch(paginatedChannels, () => {
  if (props.type === 'live' || props.type === 'favorites') {
    fetchEpgDataForVisibleChannels();
  }
});

const hasMore = computed(() => {
  return paginatedChannels.value.length < filteredChannels.value.length;
});

const loadNextPage = () => {
  pageLimit.value++;
  if (props.type === 'live' || props.type === 'favorites') {
    setTimeout(fetchEpgDataForVisibleChannels, 100);
  }
};

// Infinite Scroll trigger on container scroll
const onScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  const bottomThreshold = target.scrollHeight - target.scrollTop <= target.clientHeight + 150;
  if (bottomThreshold && hasMore.value) {
    loadNextPage();
  }
};

// Mobile helper
import { useDisplay } from 'vuetify';
const { mobile } = useDisplay();

// --- EPG MAPPING & DYNAMIC RESOLUTION ---
const fetchEpgDataForVisibleChannels = async () => {
  const visible = paginatedChannels.value;
  const now = Date.now();
  
  // Resolve current/next program for each visible channel asynchronously
  for (const ch of visible) {
    if (ch.tvgId) {
      const cached = epgData.value[ch.tvgId];
      // A cache is valid if it exists and the current show matches the current time,
      // or if it doesn't have a show but we checked it very recently (under 60s) to prevent DB spamming.
      const isCacheValid = cached && (
        (cached.current && now >= cached.current.start && now <= cached.current.stop) ||
        (!cached.current && cached.lastFetched && now - cached.lastFetched < 60000)
      );

      if (!isCacheValid) {
        // Fetch from DB
        db.getCurrentAndNextProgramme(ch.tvgId).then(({ current, next }) => {
          epgData.value[ch.tvgId!] = { 
            current, 
            next,
            lastFetched: now
          };
        }).catch(err => {
          console.error(`Error resolving EPG for channel ${ch.name}:`, err);
        });
      }
    }
  }
};

const formatTime = (timestamp: number) => {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getEpgProgress = (prog: any) => {
  if (!prog) return 0;
  const now = Date.now();
  const duration = prog.stop - prog.start;
  if (duration <= 0) return 0;
  const elapsed = now - prog.start;
  return Math.min(100, Math.max(0, (elapsed / duration) * 100));
};

// --- TV SERIES HUB LOADER ---
const openSeriesDetails = async (series: IPTVChannel) => {
  selectedSeries.value = series;
  seriesDialog.value = true;
  loadingEpisodes.value = true;
  seasonsData.value = {};

  try {
    // 1. Fetch Playlist metadata to determine if it's Xtream Codes
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
    } else {
      // Standard M3U series does not have sub-episodes nested, they are loaded as flat channels
      // but in case we want support, M3U flat channels are loaded in their specific category tab
      loadingEpisodes.value = false;
    }
  } catch (err) {
    console.error(err);
  } finally {
    loadingEpisodes.value = false;
  }
};

// --- PLAYBACK TRIGGERING ---
const playStream = (channel: IPTVChannel) => {
  emit('play-stream', channel);
};

const playEpisode = (ep: XtreamEpisode) => {
  // Convert standard Xtream episode into channels wrapper to launch player
  const mockChannel: IPTVChannel = {
    id: `ep_${ep.id}`,
    playlistId: props.playlistId,
    name: `${selectedSeries.value?.name || ''} - S${ep.seasonNum}E${ep.episodeNum}: ${ep.title}`,
    logo: ep.logo || selectedSeries.value?.logo || '',
    streamUrl: ep.streamUrl,
    category: selectedSeries.value?.category || 'Série',
    type: 'series'
  };
  emit('play-stream', mockChannel);
  seriesDialog.value = false; // close hub on playback start
};

// --- TV MOVIE DETAILS & ONLINE METADATA RESOLUTION ---
const DEFAULT_TMDB_API_KEY = 'bd6af17904b638d482df1a924f1eabb4';

function cleanMovieName(name: string): string {
  if (!name) return '';
  let clean = name;

  // 1. Remover colchetes e parênteses e seus conteúdos (ex: [4K], (2022))
  clean = clean.replace(/\[[^\]]*\]/g, ' ');
  clean = clean.replace(/\([^)]*\)/g, ' ');

  // 2. Remover tags comuns de qualidade e idioma
  const tags = [
    /\b(4k|uhd|fhd|hdtv|h264|x264|hevc|x265|bluray|web-dl|webrip|web|rip|dvd|hd)\b/gi,
    /\b(dublado|legendado|dual|multi|audio|som|dub|leg|portugues|legendado|eng|spa)\b/gi,
    /\b(1080p|720p|480p|360p|2160p)\b/gi
  ];
  for (const regex of tags) {
    clean = clean.replace(regex, ' ');
  }

  // 3. Remover anos de 4 dígitos apenas se não for a única palavra no título
  const yearMatch = clean.match(/\b(19|20)\d{2}\b/g);
  if (yearMatch) {
    const temp = clean.replace(/\b(19|20)\d{2}\b/g, ' ').trim();
    if (temp.length > 0) {
      clean = temp;
    }
  }

  // 4. Limpar caracteres especiais
  clean = clean.replace(/[\._\-#]/g, ' ');

  // 5. Remover espaços extras
  clean = clean.replace(/\s+/g, ' ').trim();

  return clean;
}

async function fetchTMDB(title: string, apiKey: string, lang: string) {
  const query = encodeURIComponent(title);
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${query}&language=${lang}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erro TMDB: ${response.status}`);
  const data = await response.json();
  if (data.results && data.results.length > 0) {
    const movie = data.results[0];
    return {
      plot: movie.overview || '',
      rating: movie.vote_average ? String(movie.vote_average.toFixed(1)) : undefined,
      year: movie.release_date ? movie.release_date.substring(0, 4) : undefined,
      logo: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined,
    };
  }
  return null;
}

async function fetchOMDb(title: string, apiKey: string) {
  const query = encodeURIComponent(title);
  const url = `https://www.omdbapi.com/?apikey=${apiKey}&t=${query}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erro OMDb: ${response.status}`);
  const movie = await response.json();
  if (movie.Response === 'True') {
    return {
      plot: movie.Plot !== 'N/A' ? movie.Plot : '',
      rating: movie.imdbRating !== 'N/A' ? movie.imdbRating : undefined,
      year: movie.Year !== 'N/A' ? movie.Year.substring(0, 4) : undefined,
      logo: movie.Poster !== 'N/A' ? movie.Poster : undefined,
      genre: movie.Genre !== 'N/A' ? movie.Genre : undefined,
      director: movie.Director !== 'N/A' ? movie.Director : undefined,
    };
  }
  return null;
}

const openMovieDetails = async (movie: IPTVChannel) => {
  selectedMovie.value = movie;
  movieDialog.value = true;
  loadingMovieInfo.value = false;
  movieErrorMsg.value = '';

  // Busca metadados automaticamente se não tiver sinopse local
  const source = await db.getSetting('movie_metadata_source', 'tmdb');
  let apiKey = await db.getSetting('movie_metadata_api_key', '');
  const lang = await db.getSetting('movie_metadata_language', 'pt-BR');

  if (!apiKey && source === 'tmdb') {
    apiKey = DEFAULT_TMDB_API_KEY;
  }

  if (source !== 'none' && apiKey && !movie.plot) {
    await fetchOnlineMetadata(movie, source, apiKey, lang);
  }
};

const fetchOnlineMetadata = async (movie: IPTVChannel, source: string, apiKey: string, lang: string) => {
  loadingMovieInfo.value = true;
  movieErrorMsg.value = '';
  try {
    const cleanedTitle = cleanMovieName(movie.name);
    let result = null;
    if (source === 'tmdb') {
      result = await fetchTMDB(cleanedTitle, apiKey, lang);
    } else if (source === 'omdb') {
      result = await fetchOMDb(cleanedTitle, apiKey);
    }

    if (result && selectedMovie.value && selectedMovie.value.id === movie.id) {
      // Atualiza o objeto selecionado reativamente
      selectedMovie.value = {
        ...selectedMovie.value,
        plot: result.plot || selectedMovie.value.plot,
        rating: result.rating || selectedMovie.value.rating,
        year: result.year || selectedMovie.value.year,
        logo: result.logo || selectedMovie.value.logo,
        genre: (result as any).genre || selectedMovie.value.genre,
        director: (result as any).director || selectedMovie.value.director,
      };

      // Atualiza a lista atual na tela para refletir no grid
      const originalChannel = allChannels.value.find(c => c.id === movie.id);
      if (originalChannel) {
        originalChannel.plot = selectedMovie.value.plot;
        originalChannel.rating = selectedMovie.value.rating;
        originalChannel.year = selectedMovie.value.year;
        originalChannel.logo = selectedMovie.value.logo;
        originalChannel.genre = selectedMovie.value.genre;
        originalChannel.director = selectedMovie.value.director;
      }

      // Persiste no banco IndexedDB para carregamentos futuros instantâneos
      await db.updateChannel({ ...selectedMovie.value });
    } else if (!result) {
      console.log(`Nenhum metadado encontrado online para o filme: ${cleanedTitle}`);
    }
  } catch (err: any) {
    console.error('Erro ao buscar metadados online:', err);
    movieErrorMsg.value = 'Não foi possível buscar a sinopse do filme online.';
  } finally {
    loadingMovieInfo.value = false;
  }
};

const playMovie = (movie: IPTVChannel) => {
  playStream(movie);
  movieDialog.value = false;
};
</script>

<style scoped>
.browser {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.browser-head {
  padding: 20px 20px 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.browser-title {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.chip-count {
  margin-left: 6px;
  opacity: 0.7;
  font-size: 12px;
}

.browser-body {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px 12px 16px;
}

.channel-row {
  border-radius: 12px !important;
  padding-block: 8px !important;
}

.channel-row :deep(.v-list-item-subtitle) {
  opacity: 1;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.channel-row.v-list-item--active :deep(.v-list-item-title) {
  color: rgb(var(--v-theme-primary-lighten-1));
}

.channel-row.v-list-item--active :deep(.v-list-item-subtitle) {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

/* Favorite star appears on hover, stays when set */
.fav-btn {
  opacity: 0;
  transition: opacity 0.15s ease;
}

.channel-row:hover .fav-btn,
.fav-btn:focus-visible,
.fav-btn--on {
  opacity: 1;
}

.poster-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px 12px;
  padding: 0 8px;
}

.poster {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  border-radius: 12px;
  outline: none;
}

.poster-img {
  position: relative;
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

.poster--active .poster-img {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.poster-placeholder {
  aspect-ratio: 0.667;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(var(--v-theme-surface-light));
}

.poster-fav {
  position: absolute !important;
  top: 6px;
  right: 6px;
  background: rgba(0, 0, 0, 0.6) !important;
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

</style>
