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
        AG IPTV
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
          <span v-if="!rail">Recolher</span>
        </v-btn>

        <!-- Active Playlist Summary -->
        <v-list-item v-if="activePlaylistName && !rail" class="playlist-info-card rounded-lg pa-3">
          <div class="text-caption text-medium-emphasis">Lista Ativa</div>
          <div class="text-subtitle-2 font-weight-bold text-truncate text-secondary">
            {{ activePlaylistName }}
          </div>
        </v-list-item>
      </div>
    </template>
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted } from 'vue';
import { useDisplay } from 'vuetify';

const props = defineProps<{
  modelValue: string; // Current active page value
  activePlaylistName?: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void;
}>();

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

const navItems = [
  { title: 'Canais ao Vivo', value: 'live', icon: 'mdi-television-classic' },
  { title: 'Filmes (VOD)', value: 'movie', icon: 'mdi-movie-roll' },
  { title: 'Séries (VOD)', value: 'series', icon: 'mdi-youtube-subscription' },
  { title: 'Guia de TV (EPG)', value: 'epg', icon: 'mdi-television-guide' },
  { title: 'Favoritos', value: 'favorites', icon: 'mdi-star' },
  { title: 'Gerenciar Listas', value: 'playlists', icon: 'mdi-playlist-edit' },
  { title: 'Configurações', value: 'settings', icon: 'mdi-cog' },
];
</script>

<style scoped>
.sidebar-glass {
  background: rgba(13, 11, 20, 0.95) !important;
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
  background: linear-gradient(135deg, #a044ff 0%, #00f5d4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 10px rgba(160, 68, 255, 0.3));
}

.glow-icon {
  filter: drop-shadow(0 0 8px rgba(0, 245, 212, 0.5));
}

.letter-spacing-1 {
  letter-spacing: 2px;
}

.nav-item {
  border-radius: 10px !important;
  transition: all 0.2s ease-in-out;
}

.nav-item:hover {
  background: rgba(160, 68, 255, 0.05);
}

.nav-item.v-list-item--active {
  background: linear-gradient(90deg, rgba(160, 68, 255, 0.2) 0%, rgba(0, 245, 212, 0.05) 100%) !important;
  border-left: 3px solid #00f5d4;
  box-shadow: 0 4px 15px rgba(160, 68, 255, 0.1);
}

.playlist-info-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.justify-start-rail {
  transition: padding 0.2s ease;
}

.v-navigation-drawer--rail .justify-start-rail {
  padding-left: 8px !important;
}
</style>
