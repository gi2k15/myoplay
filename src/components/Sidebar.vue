<!-- src/components/Sidebar.vue -->
<template>
  <v-navigation-drawer
    v-model="drawer"
    :rail="rail"
    permanent
    class="sidebar-glass"
    elevation="4"
  >
    <!-- Brand Title -->
    <v-list-item class="py-4 border-bottom d-flex justify-center justify-start-rail">
      <template v-slot:prepend>
        <v-icon color="secondary" size="large" class="glow-icon">mdi-television-play</v-icon>
      </template>
      <v-list-item-title class="text-h6 font-weight-bold text-glow-small ml-2 text-uppercase letter-spacing-1">
        MyoPlay
      </v-list-item-title>
    </v-list-item>

    <v-divider class="opacity-10" />

    <!-- Navigation Items -->
    <v-list density="comfortable" nav class="px-2 py-4">
      <v-list-item
        v-for="item in navItems"
        :key="item.value"
        :value="item.value"
        :active="modelValue === item.value"
        color="primary"
        class="nav-item mb-2"
        @click="$emit('update:modelValue', item.value)"
      >
        <template v-slot:prepend>
          <v-icon :color="modelValue === item.value ? 'secondary' : 'medium-emphasis'">
            {{ item.icon }}
          </v-icon>
        </template>
        <v-list-item-title class="font-weight-medium">
          {{ item.title }}
        </v-list-item-title>
      </v-list-item>
    </v-list>
 
    <!-- Recent Streams Section -->
    <div v-if="recentStreams && recentStreams.length > 0" class="recent-section mt-2 px-2">
      <!-- Section Header -->
        <div v-if="!rail" class="d-flex align-center justify-space-between px-3 py-2 text-caption text-uppercase font-weight-bold text-medium-emphasis letter-spacing-1">
        <div class="d-flex align-center gap-2">
          <v-icon size="small" color="secondary">mdi-history</v-icon>
          <span>{{ $t('sidebar.recent') }}</span>
        </div>
      </div>
      <div v-else class="text-center py-2">
        <v-divider class="opacity-10 mb-2" />
        <v-icon color="secondary" size="small" class="glow-icon">mdi-history</v-icon>
      </div>

      <!-- Recent Streams List -->
      <v-list density="compact" nav class="pa-0">
        <v-list-item
          v-for="stream in recentStreams"
          :key="stream.id"
          class="recent-item mb-1"
          :class="{ 'rail-item': rail }"
          @click="$emit('play-stream', stream)"
        >
          <template v-slot:prepend>
            <div class="position-relative d-flex align-center justify-center" :class="{ 'mr-3': !rail }">
              <v-avatar size="28" class="bg-surface-variant flex-shrink-0 border-glass">
                <v-img v-if="stream.logo" :src="stream.logo">
                  <template v-slot:placeholder>
                    <div class="d-flex align-center justify-center fill-height bg-surface-variant">
                      <v-icon size="small" color="secondary">mdi-play-circle-outline</v-icon>
                    </div>
                  </template>
                </v-img>
                <v-icon v-else size="small" color="secondary">
                  {{ stream.type === 'movie' ? 'mdi-movie' : stream.type === 'series' ? 'mdi-television-classic' : 'mdi-play-circle-outline' }}
                </v-icon>
              </v-avatar>
              <!-- Hover delete badge in rail mode -->
              <div
                v-if="rail"
                class="rail-delete-overlay d-flex align-center justify-center"
                @click.stop="$emit('remove-recent', stream.id)"
              >
                <v-icon size="x-small" color="white" style="font-size: 10px;">mdi-close</v-icon>
              </div>
            </div>
          </template>

          <v-list-item-title v-if="!rail" class="text-body-2 font-weight-medium text-truncate" style="max-width: 140px;">
            {{ stream.name }}
          </v-list-item-title>

          <v-list-item-subtitle v-if="!rail" class="text-caption text-medium-emphasis">
            {{ formatStreamType(stream.type) }}
          </v-list-item-subtitle>

          <template v-slot:append v-if="!rail">
            <v-btn
              icon="mdi-close"
              variant="text"
              size="x-small"
              class="delete-btn"
              color="error"
              style="width: 20px; height: 20px; min-width: 20px;"
              @click.stop="$emit('remove-recent', stream.id)"
            />
          </template>

          <!-- Rich tooltip for both modes, but especially important in rail mode -->
          <v-tooltip
            activator="parent"
            location="right"
            class="recent-tooltip"
            :open-delay="200"
          >
            <div class="d-flex align-center gap-2 mb-1">
              <v-avatar size="20" class="bg-surface-variant flex-shrink-0" v-if="stream.logo">
                <v-img :src="stream.logo" />
              </v-avatar>
              <span class="font-weight-bold text-white">{{ stream.name }}</span>
            </div>
            <div class="text-caption text-white mb-1">{{ $t('common.type') }}: {{ formatStreamType(stream.type) }}</div>
            <div class="text-caption text-medium-emphasis">{{ $t('sidebar.clickToWatch') }}</div>
            <div class="text-caption text-error font-weight-bold mt-1" v-if="rail">
              {{ $t('sidebar.removeRecent') }}
            </div>
          </v-tooltip>
        </v-list-item>
      </v-list>
    </div>

    <!-- Bottom Footer (Active Playlist Info or Rail Toggle) -->
    <template v-slot:append>
      <div class="pa-2 border-top">
        <!-- Rail Toggle Button (Desktop only) -->
        <v-btn
          v-if="!$vuetify.display.mobile"
          variant="text"
          block
          class="justify-start mb-2"
          @click="rail = !rail"
        >
          <v-icon start>{{ rail ? 'mdi-chevron-double-right' : 'mdi-chevron-double-left' }}</v-icon>
          <span v-if="!rail">{{ $t('sidebar.collapse') }}</span>
        </v-btn>

        <!-- Active Playlist Summary -->
        <v-list-item 
          v-if="activePlaylistName && !rail" 
          class="playlist-info-card rounded-lg pa-3 transition-all"
          :class="{ 'updating-card': isPlaylistUpdating }"
        >
          <div class="d-flex align-center justify-space-between mb-1">
            <div class="text-caption text-medium-emphasis">{{ $t('sidebar.activePlaylist') }}</div>
            <v-icon
              v-if="isPlaylistUpdating"
              size="14"
              color="amber-accent-2"
              class="spin-sync-icon"
            >
              mdi-sync
            </v-icon>
          </div>
          <div class="text-subtitle-2 font-weight-bold text-truncate text-secondary">
            {{ activePlaylistName }}
          </div>
        </v-list-item>
      </div>
    </template>
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useDisplay } from 'vuetify';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
  modelValue: string; // Current active page value
  activePlaylistName?: string | null;
  isPlaylistUpdating?: boolean;
  recentStreams?: any[]; // Array of IPTVChannel
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void;
  (e: 'remove-recent', channelId: string): void;
  (e: 'play-stream', channel: any): void;
}>();

const formatStreamType = (type: string) => {
  if (type === 'live') return t('sidebar.typeLive');
  if (type === 'movie') return t('sidebar.typeMovie');
  if (type === 'series') return t('sidebar.typeSeries');
  return type;
};

const { mobile } = useDisplay();
const drawer = ref(true);
const rail = ref(false);

// Auto minimize rail on mobile or smaller screens
onMounted(() => {
  if (mobile.value) {
    rail.value = true;
  }
});

watch(mobile, (isMobile) => {
  if (isMobile) {
    rail.value = true;
  } else {
    rail.value = false;
  }
});

const navItems = computed(() => [
  { title: t('sidebar.liveTv'), value: 'live', icon: 'mdi-television-classic' },
  { title: t('sidebar.movies'), value: 'movie', icon: 'mdi-movie-roll' },
  { title: t('sidebar.series'), value: 'series', icon: 'mdi-youtube-subscription' },
  { title: t('sidebar.epg'), value: 'epg', icon: 'mdi-television-guide' },
  { title: t('sidebar.favorites'), value: 'favorites', icon: 'mdi-star' },
  { title: t('sidebar.managePlaylists'), value: 'playlists', icon: 'mdi-playlist-edit' },
  { title: t('sidebar.settings'), value: 'settings', icon: 'mdi-cog' },
]);
</script>

<style scoped>
.sidebar-glass {
  background: rgba(8, 8, 8, 0.95) !important;
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.05) !important;
}

.border-bottom {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
}

.border-top {
  border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
}

.text-glow-small {
  background: linear-gradient(135deg, #FFB300 0%, #FFE082 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 10px rgba(255, 193, 7, 0.3));
}

.glow-icon {
  filter: drop-shadow(0 0 8px rgba(255, 213, 79, 0.5));
}

.letter-spacing-1 {
  letter-spacing: 2px;
}

.nav-item {
  border-radius: 10px !important;
  transition: all 0.2s ease-in-out;
}

.nav-item:hover {
  background: rgba(255, 193, 7, 0.05);
}

.nav-item.v-list-item--active {
  background: linear-gradient(90deg, rgba(255, 193, 7, 0.2) 0%, rgba(255, 213, 79, 0.05) 100%) !important;
  border-left: 3px solid #FFD54F;
  box-shadow: 0 4px 15px rgba(255, 193, 7, 0.1);
}

.playlist-info-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.playlist-info-card.updating-card {
  background: rgba(255, 193, 7, 0.02) !important;
  animation: card-pulse 2s ease-in-out infinite;
}

.spin-sync-icon {
  animation: spin 1.8s linear infinite;
}

.transition-all {
  transition: all 0.3s ease;
}

.gap-1 {
  gap: 4px;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes card-pulse {
  0%, 100% {
    border-color: rgba(255, 255, 255, 0.05);
    box-shadow: 0 0 0 rgba(255, 193, 7, 0);
  }
  50% {
    border-color: rgba(255, 193, 7, 0.3) !important;
    box-shadow: 0 0 10px rgba(255, 193, 7, 0.06);
  }
}

.justify-start-rail {
  transition: padding 0.2s ease;
}

.v-navigation-drawer--rail .justify-start-rail {
  padding-left: 8px !important;
}

/* Recent streams custom styling */
.recent-section {
  transition: all 0.3s ease;
}

.recent-item {
  border-radius: 8px !important;
  transition: all 0.2s ease-in-out;
  position: relative;
  overflow: visible !important;
}

.recent-item:hover {
  background: rgba(255, 193, 7, 0.03);
}

.recent-item .delete-btn {
  opacity: 0 !important;
  transition: opacity 0.2s ease-in-out;
}

.recent-item:hover .delete-btn {
  opacity: 0.6 !important;
}

.recent-item .delete-btn:hover {
  opacity: 1 !important;
}

/* Rail mode specific styles */
.rail-item {
  justify-content: center !important;
  padding: 0 !important;
  min-height: 40px !important;
}

.rail-delete-overlay {
  position: absolute;
  top: -6px;
  right: -6px;
  background: rgba(255, 51, 102, 0.95);
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0.6);
  transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
  box-shadow: 0 0 8px rgba(255, 51, 102, 0.5);
  cursor: pointer;
}

.recent-item:hover .rail-delete-overlay {
  opacity: 1;
  transform: scale(1);
}

.rail-delete-overlay:hover {
  background: #ff3366;
  transform: scale(1.15) !important;
}

.gap-2 {
  gap: 8px;
}

.border-glass {
  border: 1px solid rgba(255, 255, 255, 0.08);
}
</style>
