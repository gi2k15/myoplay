<!-- src/App.vue -->
<template>
  <v-app class="app-background">
    <!-- Sidebar navigation drawer -->
    <Sidebar 
      v-model="currentPage" 
      :active-playlist-name="activePlaylistName" 
      :is-playlist-updating="isActivePlaylistUpdating"
      :recent-streams="recentStreams"
      @remove-recent="onRemoveRecentStream"
      @play-stream="onPlayStream"
      v-if="hasPlaylists"
    />

    <!-- Mobile Top App Bar -->
    <v-app-bar v-if="hasPlaylists && $vuetify.display.mobile" class="app-bar-glass px-2" elevation="2">
      <v-app-bar-nav-icon color="secondary" />
      <v-app-bar-title class="font-weight-bold text-caption text-sm-body-1 text-glow-small text-uppercase">
        {{ getPageTitle() }}
      </v-app-bar-title>
    </v-app-bar>

    <!-- Main Content Area -->
    <v-main class="main-container fill-height">
      <div 
        class="d-flex fill-height w-100 position-relative overflow-hidden"
        :class="$vuetify.display.mobile ? 'flex-column-reverse' : 'flex-row'"
      >
        <!-- Left Pane: Main App Components -->
        <div class="flex-grow-1 min-width-0 h-100 position-relative overflow-y-auto" style="overflow-x: hidden;">
          <KeepAlive>
            <component 
              :is="activeComponent" 
              :playlist-id="activePlaylistId!" 
              :type="browserType" 
              :active-channel="activeChannel"
              :active-channel-epg="activeChannelEpg"
              :player-float-mode="playerFloatMode"
              @select-playlist="onPlaylistActivated"
              @play-stream="onPlayStream"
              @close-player="onClosePlayer"
              @toggle-float="onToggleFloat"
            />
          </KeepAlive>
        </div>

      </div>
    </v-main>
  </v-app>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { db, type IPTVChannel } from '@/services/db';
import { PlaylistUpdater } from '@/services/playlistUpdater';

const { t, locale } = useI18n();

// Import UI components
import Sidebar from '@/components/Sidebar.vue';
import PlaylistManager from '@/components/PlaylistManager.vue';
import StreamBrowser from '@/components/StreamBrowser.vue';
import TVGuide from '@/components/TVGuide.vue';
import Settings from '@/components/Settings.vue';
import { useSidebarCascade } from '@/composables/useSidebarCascade';

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
const { onPageChange } = useSidebarCascade();

// Application States
const currentPage = ref('playlists'); // Default view

watch(currentPage, (newPage) => {
  onPageChange(newPage);
}, { immediate: true });
const activePlaylistId = ref<number | null>(null);
const activePlaylistName = ref<string | null>(null);
const hasPlaylists = ref(false);
const recentStreams = ref<IPTVChannel[]>([]);

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
const playerFloatMode = ref(false);
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

watch(currentPage, (newVal, oldVal) => {
  const categories = ['live', 'movie', 'series'];
  if (categories.includes(newVal) && categories.includes(oldVal)) {
    onClosePlayer();
  }
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

onMounted(async () => {
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
  
  // Migrate old AllOrigins proxy setting to local proxy
  try {
    const currentProxy = await db.getSetting('cors_proxy_url');
    if (currentProxy === 'https://api.allorigins.win/raw?url=') {
      const defaultProxyUrl = isElectron ? '' : 'http://localhost:8088/?url=';
      await db.setSetting('cors_proxy_url', defaultProxyUrl);
    }
  } catch (err) {
    console.error('Migration error:', err);
  }

  // Migrate default float mode: ensure default is false (main player)
  try {
    const defaultFloatMigrated = await db.getSetting('player_default_float_migrated_v2', false);
    if (!defaultFloatMigrated) {
      await db.setSetting('player_default_float', false);
      await db.setSetting('player_default_float_migrated_v2', true);
    }
  } catch (err) {
    console.error('Float migration error:', err);
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
  
  // Retrieve player float settings (defaulting to false so videos open in main player)
  const defaultFloat = await db.getSetting('player_default_float', false);
  playerFloatMode.value = defaultFloat;

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
  playerFloatMode.value = false;
};

const onToggleFloat = () => {
  playerFloatMode.value = !playerFloatMode.value;
};

// --- ROUTER HELPER ---
const activeComponent = computed(() => {
  // If there are no playlists, enforce PlaylistManager setup wizard
  if (!hasPlaylists.value || currentPage.value === 'playlists') {
    return PlaylistManager;
  }

  if (currentPage.value === 'live' || currentPage.value === 'movie' || currentPage.value === 'series' || currentPage.value === 'favorites') {
    return StreamBrowser;
  }

  if (currentPage.value === 'epg') {
    return TVGuide;
  }

  if (currentPage.value === 'settings') {
    return Settings;
  }

  return PlaylistManager;
});

const browserType = computed(() => {
  if (currentPage.value === 'live' || currentPage.value === 'movie' || currentPage.value === 'series' || currentPage.value === 'favorites') {
    return currentPage.value;
  }
  return 'live';
});

const getPageTitle = () => {
  if (currentPage.value === 'live') return t('sidebar.liveTv');
  if (currentPage.value === 'movie') return t('sidebar.movies');
  if (currentPage.value === 'series') return t('sidebar.series');
  if (currentPage.value === 'epg') return t('sidebar.epg');
  if (currentPage.value === 'favorites') return t('sidebar.favorites');
  if (currentPage.value === 'settings') return t('sidebar.settings');
  return t('sidebar.managePlaylists');
};
</script>

<style>
/* Global App Overrides and Themes */
html, body {
  height: 100vh !important;
  overflow: hidden !important;
  margin: 0;
  padding: 0;
}

.app-background {
  background-color: #080808 !important;
  color: #ffffff !important;
  font-family: 'Outfit', 'Inter', 'Roboto', sans-serif !important;
  height: 100vh !important;
  overflow: hidden !important;
}

.main-container {
  background: radial-gradient(circle at 80% 20%, rgba(255, 193, 7, 0.02) 0%, rgba(8, 8, 8, 0) 50%);
}

.app-bar-glass {
  background: rgba(8, 8, 8, 0.8) !important;
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
}

.text-glow-small {
  background: linear-gradient(135deg, #FFB300 0%, #FFE082 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 8px rgba(255, 224, 130, 0.2));
}

/* Glassmorphism Global styles */
.glass-card {
  background: rgba(18, 18, 18, 0.7) !important;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.border-glass {
  border: 1px solid rgba(255, 255, 255, 0.04);
}



/* Scrollbar Customization for ultra premium look */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(8, 8, 8, 0.5);
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 193, 7, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 224, 130, 0.5);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.35s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
