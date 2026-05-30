<!-- src/App.vue -->
<template>
  <v-app class="app-background">
    <!-- Sidebar navigation drawer -->
    <Sidebar 
      v-model="currentPage" 
      :active-playlist-name="activePlaylistName" 
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
      <!-- Full Page View switcher -->
      <KeepAlive>
        <component 
          :is="activeComponent" 
          :playlist-id="activePlaylistId!" 
          :type="browserType" 
          @select-playlist="onPlaylistActivated"
          @play-stream="onPlayStream"
        />
      </KeepAlive>

      <!-- Full-screen Cinematic Video Overlay -->
      <Transition name="fade">
        <div v-if="activeChannel && !playerFloatMode" class="cinematic-player-overlay d-flex align-center justify-center">
          <div class="player-wrapper">
            <VideoPlayer
              :channel="activeChannel"
              :floating="false"
              @close-player="onClosePlayer"
              @toggle-float="onToggleFloat"
            />
          </div>
        </div>
      </Transition>

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
import { ref, computed, onMounted } from 'vue';
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

// Global Video Player States
const activeChannel = ref<IPTVChannel | null>(null);
const playerFloatMode = ref(false);

onMounted(async () => {
  await db.init();
  await checkActivePlaylist();
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
  background-color: #0d0c15 !important;
  color: #ffffff !important;
  font-family: 'Outfit', 'Inter', 'Roboto', sans-serif !important;
  overflow-x: hidden;
}

.main-container {
  background: radial-gradient(circle at 80% 20%, rgba(160, 68, 255, 0.04) 0%, rgba(13, 12, 21, 0) 50%);
}

.app-bar-glass {
  background: rgba(13, 11, 20, 0.8) !important;
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
}

.text-glow-small {
  background: linear-gradient(135deg, #a044ff 0%, #00f5d4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 8px rgba(0, 245, 212, 0.2));
}

/* Glassmorphism Global styles */
.glass-card {
  background: rgba(22, 20, 36, 0.7) !important;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.border-glass {
  border: 1px solid rgba(255, 255, 255, 0.04);
}

/* Custom cinematic player overlay style */
.cinematic-player-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(20px);
  z-index: 9999;
}

.player-wrapper {
  width: 90%;
  max-width: 1100px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8);
}

/* Scrollbar Customization for ultra premium look */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(13, 11, 20, 0.5);
}

::-webkit-scrollbar-thumb {
  background: rgba(160, 68, 255, 0.3);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 245, 212, 0.5);
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
