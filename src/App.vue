<!-- src/App.vue -->
<template>
  <v-app class="app-background">
    <Sidebar 
      v-model="currentPage" 
      :active-playlist-name="activePlaylistName" 
      :is-playlist-updating="isActivePlaylistUpdating"
      :recent-streams="recentStreams"
      @remove-recent="onRemoveRecentStream"
      @play-stream="onPlayStream"
      @open-global-search="showGlobalSearch = true"
      v-if="hasPlaylists"
    />

    <!-- Mobile Top App Bar -->
    <v-app-bar v-if="hasPlaylists && $vuetify.display.mobile" flat color="background" height="56" class="px-2">
      <v-app-bar-title class="font-weight-bold">{{ getPageTitle() }}</v-app-bar-title>
      <v-btn icon="mdi-magnify" variant="text" :aria-label="$t('nav.search')" @click="showGlobalSearch = true" />
    </v-app-bar>

    <v-main class="fill-height">
      <div
        class="app-shell"
        :class="{ 'app-shell--mobile': $vuetify.display.mobile, 'app-shell--expanded': catalogExpanded }"
      >
        <!-- Stage: the player always comes first -->
        <main class="stage" :class="{ 'stage--guide': currentPage === 'epg', 'stage--page': !isStagePage }">
          <div v-if="!hasPlaylists && currentPage === 'settings'" class="mb-4">
            <v-btn prepend-icon="mdi-arrow-left" variant="outlined" @click="currentPage = 'playlists'">
              {{ $t('sidebar.playlists') || 'Voltar para Listas' }}
            </v-btn>
          </div>

          <div v-if="activeChannel || isStagePage" class="stage-top">
            <div class="stage-player" :class="{ 'stage-player--floating': playerFloating }">
              <VideoPlayer
                v-if="activeChannel"
                :channel="activeChannel"
                :floating="playerFloating"
                @close-player="onClosePlayer"
                @toggle-float="onReturnToStage"
              />
              <div v-else class="stage-empty">
                <v-icon size="40" color="medium-emphasis">mdi-play-circle-outline</v-icon>
                <div class="text-h6 font-weight-bold">{{ $t('stage.emptyTitle') }}</div>
                <div class="text-body-2 text-medium-emphasis">{{ $t('stage.emptyDesc') }}</div>
              </div>
            </div>

            <!-- Guide: selected programme sits beside the player -->
            <v-card v-if="currentPage === 'epg' && guideSelection" class="guide-detail pa-6 d-flex flex-column ga-3">
              <div class="text-body-2 text-medium-emphasis">
                <span class="text-high-emphasis font-weight-semibold">{{ guideSelection.channel.name }}</span>
              </div>
              <h2 class="text-h5 font-weight-bold">{{ guideSelection.programme.title }}</h2>
              <div class="text-body-2 text-medium-emphasis tabular">
                {{ formatEpgTime(guideSelection.programme.start) }} – {{ formatEpgTime(guideSelection.programme.stop) }}
              </div>
              <p v-if="guideSelection.programme.desc" class="text-body-2 text-medium-emphasis mb-0 guide-detail-desc">
                {{ guideSelection.programme.desc }}
              </p>
              <div class="flex-grow-1" />
              <div>
                <v-btn color="primary" prepend-icon="mdi-play" height="44" @click="onPlayStream(guideSelection.channel)">
                  {{ $t('tvGuide.watchBtn') }}
                </v-btn>
              </div>
            </v-card>
          </div>

          <NowPlaying
            v-if="isBrowsePage && activeChannel"
            :channel="activeChannel"
            :epg="activeChannelEpg"
            @open-guide="currentPage = 'epg'"
          />

          <section v-else-if="isBrowsePage && recentStreams.length > 0">
            <h2 class="section-label mb-3">{{ $t('stage.continueWatching') }}</h2>
            <div class="recent-grid">
              <v-card
                v-for="stream in recentStreams.slice(0, 6)"
                :key="stream.id"
                rounded="lg"
                class="pa-3 d-flex align-center ga-3"
                @click="onPlayStream(stream)"
              >
                <v-avatar size="40" rounded="lg" color="surface-light" class="border">
                  <v-img v-if="stream.logo" :src="stream.logo" />
                  <v-icon v-else size="20">mdi-play-circle-outline</v-icon>
                </v-avatar>
                <div class="min-w-0">
                  <div class="font-weight-semibold text-truncate">{{ stream.name }}</div>
                  <div class="text-body-2 text-medium-emphasis text-truncate">{{ stream.category }}</div>
                </div>
              </v-card>
            </div>
          </section>

          <TVGuide
            v-if="currentPage === 'epg' && activePlaylistId"
            :playlist-id="activePlaylistId"
            @play-stream="onPlayStream"
            @select-programme="guideSelection = $event"
          />

          <component
            v-if="!isStagePage"
            :is="pageComponent"
            :playlist-id="activePlaylistId!"
            @select-playlist="onPlaylistActivated"
            @open-settings="currentPage = 'settings'"
          />
        </main>

        <!-- Panel: complementary browsing -->
        <aside v-if="hasPlaylists && activePlaylistId" v-show="isBrowsePage" class="panel">
          <StreamBrowser
            :playlist-id="activePlaylistId"
            :type="browserType"
            :active-channel-id="activeChannel?.id"
            :expanded="catalogExpanded"
            @play-stream="onPlayStream"
            @toggle-expand="panelExpanded = !panelExpanded"
          />
        </aside>
      </div>

      <!-- Global Search Spotlight Modal -->
      <GlobalSearchModal
        v-model="showGlobalSearch"
        :playlist-id="activePlaylistId"
        @play-stream="onPlayStream"
      />
      <span class="app-version" aria-hidden="true">v{{ appVersion }}</span>
    </v-main>
  </v-app>
</template>

<script lang="ts" setup>
import { LOCAL_PROXY_URL } from "@/utils/proxy";
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDisplay } from 'vuetify';
import { db, type IPTVChannel, type EPGProgram } from '@/services/db';
import { PlaylistUpdater } from '@/services/playlistUpdater';

const { t, locale } = useI18n();
const { mobile } = useDisplay();

// Import UI components
import Sidebar from '@/components/Sidebar.vue';
import PlaylistManager from '@/components/PlaylistManager.vue';
import StreamBrowser from '@/components/StreamBrowser.vue';
import TVGuide from '@/components/TVGuide.vue';
import Settings from '@/components/Settings.vue';
import GlobalSearchModal from '@/components/GlobalSearchModal.vue';
import VideoPlayer from '@/components/VideoPlayer.vue';
import NowPlaying from '@/components/NowPlaying.vue';

const appVersion = __APP_VERSION__;
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Application States
const currentPage = ref('playlists'); // Default view

type BrowseType = 'live' | 'movie' | 'series' | 'favorites';
const BROWSE_PAGES = ['live', 'movie', 'series', 'favorites'];
const isBrowsePage = computed(() => hasPlaylists.value && BROWSE_PAGES.includes(currentPage.value));
const isStagePage = computed(() => isBrowsePage.value || (hasPlaylists.value && currentPage.value === 'epg'));

// Panel keeps the last browse type so visiting the guide does not reload it
const browserType = ref<BrowseType>('live');
watch(currentPage, (page) => {
  if (BROWSE_PAGES.includes(page)) browserType.value = page as BrowseType;
});

const guideSelection = ref<{ channel: IPTVChannel; programme: EPGProgram } | null>(null);
const activePlaylistId = ref<number | null>(null);
const activePlaylistName = ref<string | null>(null);
const hasPlaylists = ref(false);
const recentStreams = ref<IPTVChannel[]>([]);
const showGlobalSearch = ref(false);

const handleGlobalKeydown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (hasPlaylists.value && activePlaylistId.value) {
      showGlobalSearch.value = !showGlobalSearch.value;
    }
  }
};

// Background playlist update states
const updatingPlaylistIds = ref<number[]>([]);

const isActivePlaylistUpdating = computed(() => {
  return activePlaylistId.value !== null && updatingPlaylistIds.value.includes(activePlaylistId.value);
});

const handlePlaylistUpdating = (e: Event) => {
  const customEvent = e as CustomEvent<{ playlistId: number }>;
  const id = customEvent.detail?.playlistId;
  if (id && !updatingPlaylistIds.value.includes(id)) {
    updatingPlaylistIds.value.push(id);
  }
};

const handlePlaylistUpdated = (e: Event) => {
  const customEvent = e as CustomEvent<{ playlistId: number }>;
  const id = customEvent.detail?.playlistId;
  if (id) {
    updatingPlaylistIds.value = updatingPlaylistIds.value.filter(x => x !== id);
  }
};

const handlePlaylistUpdateFailed = (e: Event) => {
  const customEvent = e as CustomEvent<{ playlistId: number }>;
  const id = customEvent.detail?.playlistId;
  if (id) {
    updatingPlaylistIds.value = updatingPlaylistIds.value.filter(x => x !== id);
  }
};

// Global Video Player States
const activeChannel = ref<IPTVChannel | null>(null);
// The catalog can take over the screen while browsing; the video keeps going as a mini player
const panelExpanded = ref(false);
const catalogExpanded = computed(() => panelExpanded.value && isBrowsePage.value && !mobile.value);

// Outside the stage pages (settings, playlists) and while the catalog is expanded the player floats
const playerFloating = computed(() => !isStagePage.value || catalogExpanded.value);
const activeChannelEpg = ref<{ current?: any; next?: any }>({});

const loadActiveChannelEpg = async () => {
  activeChannelEpg.value = {};
  if (activeChannel.value && activeChannel.value.tvgId) {
    try {
      const epg = await db.getCurrentAndNextProgramme(activeChannel.value.tvgId);
      activeChannelEpg.value = epg;
    } catch (e) {
      console.error('Error loading active channel EPG:', e);
    }
  }
};

watch(activeChannel, () => {
  loadActiveChannelEpg();
});

const formatEpgTime = (timestamp: number) => {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getEpgProgressPercent = (prog: any) => {
  if (!prog) return 0;
  const now = Date.now();
  const duration = prog.stop - prog.start;
  if (duration <= 0) return 0;
  const elapsed = now - prog.start;
  return Math.round(Math.min(100, Math.max(0, (elapsed / duration) * 100)));
};

const loadRecentStreams = async () => {
  try {
    const list = await db.getSetting('recent_streams', []);
    recentStreams.value = list;
  } catch (err) {
    console.error('Error loading recent streams:', err);
  }
};

const onOpenGlobalSearchEvent = () => {
  if (hasPlaylists.value && activePlaylistId.value) {
    showGlobalSearch.value = true;
  }
};

onMounted(async () => {
  window.addEventListener('keydown', handleGlobalKeydown);
  window.addEventListener('open-global-search', onOpenGlobalSearchEvent);
  window.addEventListener('playlist-updating', handlePlaylistUpdating);
  window.addEventListener('playlist-updated', handlePlaylistUpdated);
  window.addEventListener('playlist-update-failed', handlePlaylistUpdateFailed);

  await db.init();

  // Load language setting
  try {
    const savedLang = await db.getSetting('language');
    if (savedLang) {
      locale.value = savedLang;
    }
  } catch (err) {
    console.error('Error loading language setting:', err);
  }
  
  // Migrate proxy settings to local proxy
  try {
    const currentProxy = await db.getSetting('cors_proxy_url');
    if (!isElectron) {
      // Old defaults move once so later user choices stick; /api/proxy always moves because it was removed
      const migrated = await db.getSetting('proxy_migrated_v3', false);
      if (currentProxy === '/api/proxy?url=' || (!migrated && (!currentProxy || currentProxy === 'https://api.allorigins.win/raw?url='))) {
        await db.setSetting('cors_proxy_url', LOCAL_PROXY_URL);
      }
      if (!migrated) await db.setSetting('proxy_migrated_v3', true);
    }
  } catch (err) {
    console.error('Migration error:', err);
  }

  await checkActivePlaylist();
  await loadRecentStreams();

  // Check if any restored playlist has no channels and update in the background
  try {
    const playlists = await db.getPlaylists();
    for (const pl of playlists) {
      if (pl.id) {
        const channels = await db.getChannels(pl.id);
        if (channels.length === 0) {
          console.log(`[App] Restored playlist "${pl.name}" has no channels, triggering background update...`);
          PlaylistUpdater.updatePlaylist(pl).catch(err => {
            console.error(`[App] Failed to update restored playlist "${pl.name}":`, err);
          });
        }
      }
    }
  } catch (err) {
    console.error('[App] Error verifying restored playlist channels:', err);
  }

  // Check and run automatic playlist updates in the background
  PlaylistUpdater.checkAndRunAutoUpdates();
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
  window.removeEventListener('open-global-search', onOpenGlobalSearchEvent);
  window.removeEventListener('playlist-updating', handlePlaylistUpdating);
  window.removeEventListener('playlist-updated', handlePlaylistUpdated);
  window.removeEventListener('playlist-update-failed', handlePlaylistUpdateFailed);
});

const checkActivePlaylist = async () => {
  try {
    const playlists = await db.getPlaylists();
    
    if (playlists.length > 0) {
      hasPlaylists.value = true;
      
      // Load selected playlist setting
      const activeId = await db.getSetting('current_playlist_id');
      const activePl = playlists.find(p => p.id === activeId) || playlists[0];
      
      if (activePl && activePl.id) {
        activePlaylistId.value = activePl.id;
        activePlaylistName.value = activePl.name;
        
        // Auto set in config if missing
        if (!activeId) {
          await db.setSetting('current_playlist_id', activePl.id);
        }

        currentPage.value = 'live'; // Boot directly into Live TV
      }
    } else {
      hasPlaylists.value = false;
      currentPage.value = 'playlists'; // Force Playlist Manager Setup Wizard
    }
  } catch (err) {
    console.error('Error checking active playlist:', err);
    hasPlaylists.value = false;
    currentPage.value = 'playlists';
  }
};

// --- HANDLERS ---
const onPlaylistActivated = async (playlistId: number) => {
  const playlists = await db.getPlaylists();
  const pl = playlists.find(p => p.id === playlistId);
  
  if (pl && pl.id) {
    activePlaylistId.value = pl.id;
    activePlaylistName.value = pl.name;
    hasPlaylists.value = true;
    currentPage.value = 'live'; // Switch to Live view
  }
};

const onPlayStream = async (channel: IPTVChannel) => {
  activeChannel.value = channel;
  panelExpanded.value = false;
  if (!isStagePage.value) currentPage.value = browserType.value;

  // Sync playlist if different
  if (channel.playlistId !== activePlaylistId.value) {
    try {
      const playlists = await db.getPlaylists();
      const pl = playlists.find(p => p.id === channel.playlistId);
      if (pl && pl.id) {
        activePlaylistId.value = pl.id;
        activePlaylistName.value = pl.name;
        await db.setSetting('current_playlist_id', pl.id);
      }
    } catch (e) {
      console.error('Error syncing playlist for recent stream:', e);
    }
  }

  // Add to recent streams list
  await addRecentStream(channel);
};

const addRecentStream = async (channel: IPTVChannel) => {
  try {
    const filtered = recentStreams.value.filter(c => c.id !== channel.id);
    filtered.unshift(channel);
    const updated = filtered.slice(0, 10);
    recentStreams.value = updated;
    await db.setSetting('recent_streams', updated);
  } catch (err) {
    console.error('Error adding recent stream:', err);
  }
};

const onRemoveRecentStream = async (channelId: string) => {
  try {
    const updated = recentStreams.value.filter(c => c.id !== channelId);
    recentStreams.value = updated;
    await db.setSetting('recent_streams', updated);
  } catch (err) {
    console.error('Error removing recent stream:', err);
  }
};

const onClosePlayer = () => {
  activeChannel.value = null;
};

const onReturnToStage = () => {
  panelExpanded.value = false;
  currentPage.value = browserType.value;
};

// --- ROUTER HELPER ---
// Pages rendered in the stage column instead of the player (setup wizard, playlists, settings)
const pageComponent = computed(() => {
  if (currentPage.value === 'settings') return Settings;
  return PlaylistManager;
});

const getPageTitle = () => {
  if (currentPage.value === 'live') return t('nav.live');
  if (currentPage.value === 'movie') return t('nav.movies');
  if (currentPage.value === 'series') return t('nav.series');
  if (currentPage.value === 'epg') return t('nav.guide');
  if (currentPage.value === 'favorites') return t('nav.favorites');
  if (currentPage.value === 'settings') return t('nav.settings');
  return t('nav.playlists');
};
</script>

<style>
.app-version {
  position: fixed;
  right: 8px;
  bottom: 4px;
  font-size: 10px;
  line-height: 1;
  opacity: 0.3;
  color: rgb(var(--v-theme-on-background));
  pointer-events: none;
  user-select: none;
  z-index: 5;
}

html, body {
  height: 100vh !important;
  overflow: hidden !important;
  margin: 0;
  padding: 0;
}

.v-application,
.v-application .text-h1, .v-application .text-h2, .v-application .text-h3,
.v-application .text-h4, .v-application .text-h5, .v-application .text-h6,
.v-application .text-subtitle-1, .v-application .text-subtitle-2,
.v-application .text-body-1, .v-application .text-body-2,
.v-application .text-caption, .v-application .text-button, .v-application .text-overline {
  font-family: 'Inter', system-ui, sans-serif !important;
  letter-spacing: normal !important;
}

.app-background {
  background: rgb(var(--v-theme-background)) !important;
  color: rgb(var(--v-theme-on-background));
  height: 100vh !important;
  overflow: hidden !important;
}

/* ---- Stage layout ---- */
.app-shell {
  display: flex;
  height: 100%;
  min-height: 0;
}

.stage {
  flex: 1 1 0;
  min-width: 0;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.stage-top {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: stretch;
}

/* Player width is bound by the window height so the info below stays in view */
.stage-player {
  flex: 999 1 560px;
  min-width: 0;
  max-width: calc((100vh - 260px) * 16 / 9);
  margin-inline: auto;
  aspect-ratio: 16 / 9;
  border-radius: 16px;
  overflow: hidden;
  background: #000;
}

.stage--guide .stage-player {
  max-width: calc(45vh * 16 / 9);
  margin-inline: 0;
}

.stage-player--floating {
  flex: 0 0 0;
  aspect-ratio: auto;
  height: 0;
  overflow: visible;
}

.stage-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  padding: 24px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px;
}

.guide-detail {
  flex: 1 1 320px;
  min-width: 0;
}

.guide-detail-desc {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.recent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.panel {
  flex: 0 0 384px;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: rgb(var(--v-theme-surface));
  border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

/* Expanded catalog: the panel takes the stage; only the floating player stays visible */
.app-shell--expanded .stage {
  flex: 0 0 0;
  padding: 0;
  overflow: visible;
}

.app-shell--expanded .stage > :not(.stage-top),
.app-shell--expanded .stage-empty {
  display: none;
}

.app-shell--expanded .panel {
  flex: 1 1 0;
  border-left: 0;
}

/* Mobile: player pinned on top, panel scrolls below */
.app-shell--mobile {
  flex-direction: column;
}

.app-shell--mobile .stage {
  flex: 0 0 auto;
  max-height: 60%;
  padding: 0 12px 12px;
  gap: 16px;
}

.app-shell--mobile .stage--page,
.app-shell--mobile .stage--guide {
  flex: 1 1 0;
  max-height: none;
}

.app-shell--mobile .stage-player {
  flex-basis: 100%;
  max-width: none;
  border-radius: 12px;
}

.app-shell--mobile .panel {
  flex: 1 1 0;
  border-left: 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

/* ---- Shared helpers ---- */
.min-w-0 {
  min-width: 0;
}

.tabular {
  font-variant-numeric: tabular-nums;
}

.section-label {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em !important;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.rounded-xl {
  border-radius: 16px !important;
}

/* Page and grouped-card pattern shared by Settings and Playlists */
.page-title {
  margin-top: 0;
  font-size: 28px;
  line-height: 34px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 24px;
}

.group-head {
  padding: 20px 24px 16px;
}

.group-title {
  margin: 0;
  font-size: 18px;
  line-height: 24px;
  font-weight: 700;
}

.group-desc {
  margin: 0;
  font-size: 14px;
  line-height: 20px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.group-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.group-note {
  display: flex;
  gap: 10px;
  padding: 16px 24px;
  font-size: 13px;
  line-height: 18px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

/* Description under a group title */
.group-head .group-desc {
  margin-top: 4px;
}

/* Legacy class names still used across views, flattened to the new system */
.glass-card,
.glass-dialog {
  background: rgb(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.border-glass {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.text-glow,
.text-glow-small {
  color: rgb(var(--v-theme-on-surface));
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.22);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
