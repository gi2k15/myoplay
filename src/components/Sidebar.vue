<!-- src/components/Sidebar.vue -->
<template>
  <!-- Mobile: bottom navigation -->
  <v-bottom-navigation
    v-if="mobile"
    :model-value="mobileValue"
    grow
    color="primary"
    bg-color="background"
    class="bottom-nav"
    height="64"
  >
    <v-btn
      v-for="item in mobileItems"
      :key="item.value"
      :value="item.value"
      @click="$emit('update:modelValue', item.value)"
    >
      <v-icon>{{ item.icon }}</v-icon>
      <span class="nav-label">{{ item.title }}</span>
    </v-btn>

    <v-menu location="top end">
      <template v-slot:activator="{ props: menuProps }">
        <v-btn v-bind="menuProps" value="more">
          <v-icon>mdi-dots-horizontal</v-icon>
          <span class="nav-label">{{ $t('nav.more') }}</span>
        </v-btn>
      </template>
      <v-list density="comfortable" bg-color="surface" class="border rounded-lg" min-width="220">
        <v-list-item prepend-icon="mdi-magnify" :title="$t('nav.search')" @click="$emit('open-global-search')" />
        <v-list-item
          v-for="item in moreItems"
          :key="item.value"
          :prepend-icon="item.icon"
          :title="item.title"
          :active="modelValue === item.value"
          @click="$emit('update:modelValue', item.value)"
        />
      </v-list>
    </v-menu>
  </v-bottom-navigation>

  <!-- Desktop: icon rail -->
  <v-navigation-drawer
    v-else
    permanent
    rail
    rail-width="80"
    color="background"
    class="nav-rail"
  >
    <div class="rail-inner">
      <div class="brand-mark" role="img" aria-label="MyoPlay">
        <v-icon size="20">mdi-play</v-icon>
      </div>

      <v-btn
        class="search-btn"
        variant="outlined"
        :aria-label="`${$t('nav.search')} (Ctrl+K)`"
        @click="$emit('open-global-search')"
      >
        <v-icon size="20">mdi-magnify</v-icon>
        <v-tooltip activator="parent" location="end">{{ $t('nav.search') }} (Ctrl+K)</v-tooltip>
      </v-btn>

      <button
        v-for="item in mainItems"
        :key="item.value"
        class="rail-item"
        :class="{ 'rail-item--active': modelValue === item.value }"
        :aria-current="modelValue === item.value ? 'page' : undefined"
        @click="$emit('update:modelValue', item.value)"
      >
        <v-icon size="22">{{ item.icon }}</v-icon>
        <span class="nav-label">{{ item.title }}</span>
      </button>

      <div class="flex-grow-1" />

      <v-menu v-if="recentStreams && recentStreams.length > 0" location="end bottom">
        <template v-slot:activator="{ props: menuProps }">
          <button v-bind="menuProps" class="rail-item">
            <v-icon size="22">mdi-history</v-icon>
            <span class="nav-label">{{ $t('nav.recent') }}</span>
          </button>
        </template>
        <v-list density="comfortable" bg-color="surface" class="border rounded-lg" width="320">
          <v-list-subheader>{{ $t('sidebar.recent') }}</v-list-subheader>
          <v-list-item
            v-for="stream in recentStreams"
            :key="stream.id"
            :title="stream.name"
            :subtitle="formatStreamType(stream.type)"
            @click="$emit('play-stream', stream)"
          >
            <template v-slot:prepend>
              <v-avatar size="32" rounded="lg" color="surface-light">
                <v-img v-if="stream.logo" :src="stream.logo" />
                <v-icon v-else size="18">mdi-play-circle-outline</v-icon>
              </v-avatar>
            </template>
            <template v-slot:append>
              <v-btn
                icon="mdi-close"
                variant="text"
                size="small"
                :aria-label="$t('sidebar.removeRecent')"
                @click.stop="$emit('remove-recent', stream.id)"
              />
            </template>
          </v-list-item>
        </v-list>
      </v-menu>

      <button
        v-for="item in bottomItems"
        :key="item.value"
        class="rail-item"
        :class="{ 'rail-item--active': modelValue === item.value }"
        :aria-current="modelValue === item.value ? 'page' : undefined"
        @click="$emit('update:modelValue', item.value)"
      >
        <v-badge
          v-if="item.value === 'playlists' && isPlaylistUpdating"
          dot
          color="primary"
        >
          <v-icon size="22" class="spin-sync-icon">mdi-sync</v-icon>
        </v-badge>
        <v-icon v-else size="22">{{ item.icon }}</v-icon>
        <span class="nav-label">{{ item.title }}</span>
        <v-tooltip v-if="item.value === 'playlists' && activePlaylistName" activator="parent" location="end">
          {{ $t('sidebar.activePlaylist') }}: {{ activePlaylistName }}
          <span v-if="isPlaylistUpdating"> · {{ $t('sidebar.updatingBackground') }}</span>
        </v-tooltip>
      </button>
    </div>
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useDisplay } from 'vuetify';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const { mobile } = useDisplay();

const props = defineProps<{
  modelValue: string; // Current active page value
  activePlaylistName?: string | null;
  isPlaylistUpdating?: boolean;
  recentStreams?: any[]; // Array of IPTVChannel
}>();

defineEmits<{
  (e: 'update:modelValue', val: string): void;
  (e: 'remove-recent', channelId: string): void;
  (e: 'play-stream', channel: any): void;
  (e: 'open-global-search'): void;
}>();

const formatStreamType = (type: string) => {
  if (type === 'live') return t('sidebar.typeLive');
  if (type === 'movie') return t('sidebar.typeMovie');
  if (type === 'series') return t('sidebar.typeSeries');
  return type;
};

const mainItems = computed(() => [
  { title: t('nav.live'), value: 'live', icon: 'mdi-television-classic' },
  { title: t('nav.movies'), value: 'movie', icon: 'mdi-movie-open-outline' },
  { title: t('nav.series'), value: 'series', icon: 'mdi-layers-outline' },
  { title: t('nav.guide'), value: 'epg', icon: 'mdi-calendar-blank-outline' },
  { title: t('nav.favorites'), value: 'favorites', icon: 'mdi-star-outline' },
]);

const bottomItems = computed(() => [
  { title: t('nav.playlists'), value: 'playlists', icon: 'mdi-format-list-bulleted' },
  { title: t('nav.settings'), value: 'settings', icon: 'mdi-tune-variant' },
]);

const mobileItems = computed(() => mainItems.value.slice(0, 4));
const moreItems = computed(() => [mainItems.value[4], ...bottomItems.value]);

// Pages behind the "More" menu highlight the More tab
const mobileValue = computed(() =>
  mobileItems.value.some(i => i.value === props.modelValue) ? props.modelValue : 'more'
);
</script>

<style scoped>
.nav-rail {
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;
}

.rail-inner {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 8px;
}

.brand-mark {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.search-btn {
  width: 64px !important;
  min-width: 0 !important;
  height: 44px !important;
  margin-bottom: 12px;
  border-radius: 12px !important;
  background: rgb(var(--v-theme-surface));
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.rail-item {
  border: 0;
  background: transparent;
  font: inherit;
  cursor: pointer;
  width: 64px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  transition: background-color 0.15s ease, color 0.15s ease;
}

.rail-item:hover {
  background: rgba(var(--v-theme-on-surface), 0.05);
  color: rgb(var(--v-theme-on-surface));
}

.rail-item:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.rail-item--active,
.rail-item--active:hover {
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary-lighten-1));
}

.nav-label {
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0;
}

.bottom-nav {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.bottom-nav :deep(.v-btn) {
  gap: 4px;
}

.spin-sync-icon {
  animation: spin 1.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
