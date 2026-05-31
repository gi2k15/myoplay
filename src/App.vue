<!-- src/App.vue -->
<template>
  <v-app class="app-background">
    <!-- Sidebar navigation drawer -->
    <Sidebar 
      v-model="currentPage" 
      :active-playlist-name="activePlaylistName" 
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
        <div class="flex-grow-1 min-width-0 h-100 position-relative overflow-hidden">
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

        <!-- Right/Top Pane: Embedded Player (Active when a channel is playing and not floating) -->
        <div 
          v-if="activeChannel && !playerFloatMode && currentPage !== 'live'" 
          class="embedded-player-container flex-shrink-0"
          :class="$vuetify.display.mobile ? 'w-100 h-auto border-bottom-glow' : 'embedded-player-desktop border-left-glow'"
        >
          <div class="pa-4 h-100 d-flex flex-column gap-4">
            <!-- The Player Rectangle -->
            <div class="player-wrapper w-100 flex-shrink-0">
              <VideoPlayer
                :channel="activeChannel"
                :floating="false"
                @close-player="onClosePlayer"
                @toggle-float="onToggleFloat"
              />
            </div>

            <!-- Active Channel Metadata & EPG Card (Scrollable Container) -->
            <div class="flex-grow-1 overflow-y-auto pr-1">
              <v-card class="glass-card pa-4 rounded-xl" variant="flat">
                <div class="d-flex align-center gap-3 mb-4">
                  <v-avatar size="48" class="bg-surface-variant flex-shrink-0" v-slot:default v-if="activeChannel.logo">
                    <v-img :src="activeChannel.logo" />
                  </v-avatar>
                  <div class="min-width-0">
                    <h3 class="text-subtitle-2 font-weight-bold text-truncate text-glow-small mb-1">{{ activeChannel.name }}</h3>
                    <v-chip size="x-small" color="primary" class="font-weight-bold uppercase-tag">{{ activeChannel.category }}</v-chip>
                  </div>
                </div>

                <!-- EPG Programme Info -->
                <div v-if="activeChannelEpg.current" class="mt-2">
                  <div class="text-caption text-secondary font-weight-bold mb-1">🔴 NO AR AGORA</div>
                  <div class="text-body-2 font-weight-bold mb-1">{{ activeChannelEpg.current.title }}</div>
                  <p v-if="activeChannelEpg.current.desc" class="text-caption text-medium-emphasis mb-2 leading-relaxed text-line-clamp">
                    {{ activeChannelEpg.current.desc }}
                  </p>
                  <div class="d-flex align-center justify-space-between text-caption text-medium-emphasis mb-1">
                    <span>{{ formatEpgTime(activeChannelEpg.current.start) }} - {{ formatEpgTime(activeChannelEpg.current.stop) }}</span>
                    <span>{{ getEpgProgressPercent(activeChannelEpg.current) }}%</span>
                  </div>
                  <v-progress-linear :model-value="getEpgProgressPercent(activeChannelEpg.current)" color="secondary" height="4" rounded class="mb-4" />
                </div>

                <div v-if="activeChannelEpg.next" class="mt-2 pt-2 border-top">
                  <div class="text-caption text-medium-emphasis font-weight-bold mb-1">PRÓXIMO PROGRAMA</div>
                  <div class="text-body-2 font-weight-bold mb-1">{{ activeChannelEpg.next.title }}</div>
                  <div class="text-caption text-medium-emphasis">
                    Começa às {{ formatEpgTime(activeChannelEpg.next.start) }}
                  </div>
                </div>

                <!-- Description for Movies / Series VOD -->
                <div v-if="activeChannel.plot" class="mt-2 pt-2 border-top">
                  <div class="text-caption text-secondary font-weight-bold mb-1">SINOPSE</div>
                  <p class="text-caption text-medium-emphasis leading-relaxed mb-0">
                    {{ activeChannel.plot }}
                  </p>
                </div>

                <div v-if="!activeChannelEpg.current && !activeChannel.plot" class="text-caption text-medium-emphasis italic text-center py-2">
                  Nenhum detalhe de programação disponível para este canal.
                </div>
              </v-card>
            </div>
          </div>
        </div>

      </div>

      <!-- Persistent Floating Mini-Player (PiP) -->
      <VideoPlayer
        v-if="activeChannel && playerFloatMode"
        :channel="activeChannel"
        :floating="true"
        @close-player="onClosePlayer"
        @toggle-float="onToggleFloat"
      />
    </v-main>
  </v-app>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue';
import { db, type IPTVChannel } from '@/services/db';

// Import UI components
import Sidebar from '@/components/Sidebar.vue';
import PlaylistManager from '@/components/PlaylistManager.vue';
import StreamBrowser from '@/components/StreamBrowser.vue';
import TVGuide from '@/components/TVGuide.vue';
import Settings from '@/components/Settings.vue';
import VideoPlayer from '@/components/VideoPlayer.vue';

// Application States
const currentPage = ref('playlists'); // Default view
const activePlaylistId = ref<number | null>(null);
const activePlaylistName = ref<string | null>(null);
const hasPlaylists = ref(false);
const recentStreams = ref<IPTVChannel[]>([]);

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
  await db.init();
  
  // Migrate old AllOrigins proxy setting to local proxy
  try {
    const currentProxy = await db.getSetting('cors_proxy_url');
    if (currentProxy === 'https://api.allorigins.win/raw?url=') {
      await db.setSetting('cors_proxy_url', 'http://localhost:8088/?url=');
    }
  } catch (err) {
    console.error('Migration error:', err);
  }

  await checkActivePlaylist();
  await loadRecentStreams();
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
  
  // Retrieve player float settings
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
  if (currentPage.value === 'live') return 'Canais ao Vivo';
  if (currentPage.value === 'movie') return 'Filmes (VOD)';
  if (currentPage.value === 'series') return 'Séries (VOD)';
  if (currentPage.value === 'epg') return 'Grade EPG';
  if (currentPage.value === 'favorites') return 'Favoritos';
  if (currentPage.value === 'settings') return 'Configurações';
  return 'Listas M3U / APIs';
};
</script>

<style>
/* Global App Overrides and Themes */
.app-background {
  background-color: #080808 !important;
  color: #ffffff !important;
  font-family: 'Outfit', 'Inter', 'Roboto', sans-serif !important;
  overflow-x: hidden;
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

/* Embedded Player layout & separation */
.embedded-player-container {
  background: rgba(8, 8, 8, 0.4);
  backdrop-filter: blur(12px);
  z-index: 10;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.embedded-player-desktop {
  width: 480px;
  max-width: 40vw;
  height: 100%;
  animation: slideInLeft 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.border-left-glow {
  border-left: 1px solid rgba(255, 193, 7, 0.15) !important;
  box-shadow: -5px 0 25px rgba(0, 0, 0, 0.3);
}

.border-bottom-glow {
  border-bottom: 1px solid rgba(255, 193, 7, 0.15) !important;
  box-shadow: 0 5px 25px rgba(0, 0, 0, 0.3);
}

.player-wrapper {
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.6);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  aspect-ratio: 16/9;
}

.border-top {
  border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
}

.text-line-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.uppercase-tag {
  letter-spacing: 1px;
}

@keyframes slideInLeft {
  from {
    transform: translateX(50px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
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
