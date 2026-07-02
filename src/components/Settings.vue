<!-- src/components/Settings.vue -->
<template>
  <v-container class="py-8 fill-height align-start">
    <v-row class="justify-center w-100">
      <v-col cols="12" md="10" lg="8">
        
        <!-- Header -->
        <h2 class="text-h4 font-weight-bold mb-6 text-glow-small d-flex align-center">
          <v-icon start color="secondary" class="mr-2">mdi-cog</v-icon> {{ $t('settings.title') }}
        </h2>

        <v-alert
          v-if="alertMsg"
          :type="alertType"
          variant="tonal"
          closable
          class="mb-6"
          @click:close="alertMsg = ''"
        >
          {{ alertMsg }}
        </v-alert>

        <v-row>
          <!-- CORS Proxy Settings -->
          <v-col cols="12" v-if="!isElectron">
            <v-card class="glass-card pa-6 mb-6" elevation="2" variant="flat">
              <h3 class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center">
                <v-icon start color="primary" class="mr-2">mdi-network-outline</v-icon> 
                {{ $t('settings.proxy.title') }}
              </h3>
              
              <p class="text-body-2 text-medium-emphasis mb-4 leading-relaxed">
                {{ $t('settings.proxy.desc') }}
              </p>

              <div class="text-subtitle-2 font-weight-bold mb-2">{{ $t('settings.proxy.preset1Label') }}</div>
              <v-select
                v-model="selectedProxyPreset"
                :items="proxyPresets"
                :label="$t('settings.proxy.preset1Select')"
                variant="outlined"
                density="comfortable"
                class="mb-4"
                @update:model-value="onProxyPresetChange"
              />

              <v-text-field
                v-model="customProxyUrl"
                :label="$t('settings.proxy.preset1Url')"
                placeholder="https://sua-url-de-proxy.com/?url="
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-link"
                class="mb-6"
                :disabled="selectedProxyPreset !== 'custom'"
              />

              <v-divider class="mb-6 opacity-10" />

              <div class="text-subtitle-2 font-weight-bold mb-2">{{ $t('settings.proxy.preset2Label') }}</div>
              <v-select
                v-model="selectedPlayerProxyPreset"
                :items="playerProxyPresets"
                :label="$t('settings.proxy.preset2Select')"
                variant="outlined"
                density="comfortable"
                class="mb-4"
                @update:model-value="onPlayerProxyPresetChange"
              />

              <v-text-field
                v-model="customPlayerProxyUrl"
                :label="$t('settings.proxy.preset2Url')"
                placeholder="https://sua-url-de-proxy.com/?url="
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-link"
                class="mb-6"
                :disabled="selectedPlayerProxyPreset !== 'custom'"
              />

              <v-select
                v-model="playerProxyStreams"
                :items="streamProxyOptions"
                :label="$t('settings.proxy.policyLabel')"
                variant="outlined"
                density="comfortable"
                class="mb-6"
              />

              <v-btn
                color="primary"
                prepend-icon="mdi-content-save"
                @click="saveCorsProxy"
              >
                {{ $t('settings.proxy.saveBtn') }}
              </v-btn>
            </v-card>
          </v-col>

          <!-- Playback Preferences -->
          <v-col cols="12">
            <v-card class="glass-card pa-6 mb-6" elevation="2" variant="flat">
              <h3 class="text-subtitle-1 font-weight-bold mb-4 d-flex align-center">
                <v-icon start color="primary" class="mr-2">mdi-play-circle-outline</v-icon> 
                {{ $t('settings.playback.title') }}
              </h3>

              <v-switch
                v-model="autoPlay"
                :label="$t('settings.playback.autoPlay')"
                color="secondary"
                hide-details
                class="mb-2"
                @update:model-value="savePlaybackSettings"
              />

              <v-switch
                v-model="defaultFloatMode"
                :label="$t('settings.playback.defaultFloat')"
                color="secondary"
                hide-details
                class="mb-4"
                @update:model-value="savePlaybackSettings"
              />

              <v-select
                v-model="defaultAspectRatio"
                :items="aspectRatios"
                :label="$t('settings.playback.aspectRatio')"
                variant="outlined"
                density="comfortable"
                class="mb-4"
                @update:model-value="savePlaybackSettings"
              />

              <v-select
                v-model="playerBufferMode"
                :items="bufferModes"
                :label="$t('settings.playback.bufferMode')"
                variant="outlined"
                density="comfortable"
                @update:model-value="savePlaybackSettings"
              />
            </v-card>
          </v-col>

          <!-- EPG Preferences -->
          <v-col cols="12">
            <v-card class="glass-card pa-6 mb-6" elevation="2" variant="flat">
              <h3 class="text-subtitle-1 font-weight-bold mb-4 d-flex align-center">
                <v-icon start color="primary" class="mr-2">mdi-television-guide</v-icon> 
                {{ $t('settings.epg.title') }}
              </h3>

              <p class="text-body-2 text-medium-emphasis mb-4 leading-relaxed">
                {{ $t('settings.epg.desc') }}
              </p>

              <v-select
                v-model="epgTimeShift"
                :items="timeShiftOptions"
                :label="$t('settings.epg.timeShift')"
                variant="outlined"
                density="comfortable"
                hide-details
                @update:model-value="saveEpgSettings"
              />
             </v-card>
           </v-col>

           <!-- Playlist Synchronization Settings -->
           <v-col cols="12">
             <v-card class="glass-card pa-6 mb-6" elevation="2" variant="flat">
               <h3 class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center">
                 <v-icon start color="primary" class="mr-2">mdi-sync</v-icon>
                 {{ $t('settings.sync.title') }}
               </h3>
               
               <p class="text-body-2 text-medium-emphasis mb-4 leading-relaxed">
                 {{ $t('settings.sync.desc') }}
               </p>

               <v-select
                 v-model="playlistUpdateInterval"
                 :items="updateIntervalOptions"
                 :label="$t('settings.sync.interval')"
                 variant="outlined"
                 density="comfortable"
                 class="mb-6"
                 @update:model-value="saveUpdateSettings"
               />

               <v-divider class="mb-6 opacity-10" />

               <div class="d-flex flex-wrap align-center gap-3">
                 <v-btn
                   color="primary"
                   prepend-icon="mdi-refresh"
                   :loading="syncingAll"
                   @click="syncAllPlaylists"
                 >
                   {{ $t('settings.sync.syncAllBtn') }}
                 </v-btn>
                 <span v-if="syncProgressMsg" class="text-caption text-medium-emphasis ml-2">
                   {{ syncProgressMsg }}
                 </span>
               </div>
             </v-card>
           </v-col>

          <!-- Movie Metadata Database Settings -->
          <v-col cols="12">
            <v-card class="glass-card pa-6 mb-6" elevation="2" variant="flat">
              <h3 class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center">
                <v-icon start color="primary" class="mr-2">mdi-movie-search-outline</v-icon> 
                {{ $t('settings.metadata.title') }}
              </h3>
              
              <p class="text-body-2 text-medium-emphasis mb-4 leading-relaxed">
                {{ $t('settings.metadata.desc') }}
              </p>

              <v-select
                v-model="movieMetadataSource"
                :items="metadataSources"
                :label="$t('settings.metadata.providerLabel')"
                variant="outlined"
                density="comfortable"
                class="mb-4"
                @update:model-value="saveMetadataSettings"
              />

              <v-text-field
                v-if="movieMetadataSource !== 'none'"
                v-model="movieMetadataApiKey"
                :label="$t('settings.metadata.apiKeyLabel')"
                :placeholder="$t('settings.metadata.apiKeyPlaceholder')"
                variant="outlined"
                density="comfortable"
                type="password"
                prepend-inner-icon="mdi-key-variant"
                :hint="movieMetadataSource === 'tmdb' ? $t('settings.metadata.hintTmdb') : $t('settings.metadata.hintOmdb')"
                persistent-hint
                class="mb-4"
                @update:model-value="saveMetadataSettings"
              />

              <v-select
                v-if="movieMetadataSource === 'tmdb'"
                v-model="movieMetadataLanguage"
                :items="metadataLanguages"
                :label="$t('settings.metadata.languageLabel')"
                variant="outlined"
                density="comfortable"
                @update:model-value="saveMetadataSettings"
              />
            </v-card>
          </v-col>

          <!-- Language Selection -->
          <v-col cols="12">
            <v-card class="glass-card pa-6 mb-6" elevation="2" variant="flat">
              <h3 class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center">
                <v-icon start color="primary" class="mr-2">mdi-translate</v-icon> 
                {{ $t('settings.language.title') }}
              </h3>
              
              <p class="text-body-2 text-medium-emphasis mb-4 leading-relaxed">
                {{ $t('settings.language.desc') }}
              </p>

              <v-select
                v-model="activeLanguage"
                :items="languageOptions"
                :label="$t('settings.language.select')"
                variant="outlined"
                density="comfortable"
                @update:model-value="saveLanguageSetting"
              />
            </v-card>
          </v-col>

          <!-- Local Database & Maintenance -->
          <v-col cols="12">
            <v-card class="glass-card pa-6 mb-6" elevation="2" variant="flat">
              <h3 class="text-subtitle-1 font-weight-bold mb-4 d-flex align-center">
                <v-icon start color="primary" class="mr-2">mdi-database-cog-outline</v-icon> 
                {{ $t('settings.maintenance.title') }}
              </h3>

              <p class="text-body-2 text-medium-emphasis mb-6" v-html="$t('settings.maintenance.desc')"></p>

              <v-row class="mb-4 text-center">
                <v-col cols="6" sm="3" class="pa-2">
                  <div class="stat-box rounded-xl pa-3 bg-surface-variant">
                    <div class="text-h6 font-weight-bold text-glow-small">{{ stats.playlists }}</div>
                    <div class="text-caption text-medium-emphasis">{{ $t('settings.maintenance.statsPlaylists') }}</div>
                  </div>
                </v-col>
                <v-col cols="6" sm="3" class="pa-2">
                  <div class="stat-box rounded-xl pa-3 bg-surface-variant">
                    <div class="text-h6 font-weight-bold text-glow-small">{{ stats.channels.toLocaleString() }}</div>
                    <div class="text-caption text-medium-emphasis">{{ $t('settings.maintenance.statsChannels') }}</div>
                  </div>
                </v-col>
                <v-col cols="6" sm="3" class="pa-2">
                  <div class="stat-box rounded-xl pa-3 bg-surface-variant">
                    <div class="text-h6 font-weight-bold text-glow-small">{{ stats.epg.toLocaleString() }}</div>
                    <div class="text-caption text-medium-emphasis">{{ $t('settings.maintenance.statsEpg') }}</div>
                  </div>
                </v-col>
                <v-col cols="6" sm="3" class="pa-2">
                  <div class="stat-box rounded-xl pa-3 bg-surface-variant">
                    <div class="text-h6 font-weight-bold text-glow-small">{{ stats.favorites }}</div>
                    <div class="text-caption text-medium-emphasis">{{ $t('settings.maintenance.statsFavorites') }}</div>
                  </div>
                </v-col>
              </v-row>

              <v-divider class="mb-6 opacity-10" />

              <div class="d-flex flex-wrap gap-3">
                <v-btn
                  color="warning"
                  variant="tonal"
                  prepend-icon="mdi-broom"
                  @click="pruneEpg"
                >
                  {{ $t('settings.maintenance.pruneBtn') }}
                </v-btn>

                <v-btn
                  color="secondary"
                  variant="tonal"
                  prepend-icon="mdi-restore"
                  @click="resetToDefaults"
                >
                  {{ $t('settings.maintenance.resetBtn') }}
                </v-btn>

                <v-btn
                  color="error"
                  variant="flat"
                  prepend-icon="mdi-database-remove"
                  @click="wipeDatabase"
                >
                  {{ $t('settings.maintenance.wipeBtn') }}
                </v-btn>
              </div>
            </v-card>
          </v-col>

          <!-- About Project -->
          <v-col cols="12">
            <v-card class="glass-card pa-6 text-center" variant="flat">
              <v-icon size="48" color="secondary" class="mb-2">mdi-shield-check-outline</v-icon>
              <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ $t('settings.maintenance.privacyTitle') }}</h3>
              <p class="text-caption text-medium-emphasis max-width-480 mx-auto">
                {{ $t('settings.maintenance.privacyDesc') }}
              </p>
            </v-card>
          </v-col>

        </v-row>

      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { db } from '@/services/db';
import { PlaylistUpdater } from '@/services/playlistUpdater';

const { t, locale } = useI18n();

// Electron Environment Detection
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Alert States
const alertMsg = ref('');
const alertType = ref<'success' | 'error' | 'warning' | 'info'>('success');

// Language Preference
const activeLanguage = ref('en');
const languageOptions = [
  { title: 'Português', value: 'pt' },
  { title: 'English', value: 'en' },
];

const loadLanguageSetting = async () => {
  try {
    const saved = await db.getSetting('language');
    if (saved) {
      activeLanguage.value = saved;
    } else {
      activeLanguage.value = locale.value;
    }
  } catch (err) {
    console.error(err);
  }
};

const saveLanguageSetting = async (val: string) => {
  try {
    locale.value = val;
    await db.setSetting('language', val);
    alertType.value = 'success';
    alertMsg.value = t('settings.language.successMsg');
  } catch (err: any) {
    alertType.value = 'error';
    alertMsg.value = err.message || err;
  }
};

// Proxy Fields
const customProxyUrl = ref('');
const selectedProxyPreset = ref('allorigins');

const customPlayerProxyUrl = ref('');
const selectedPlayerProxyPreset = ref('corsproxy');

const playerProxyStreams = ref('auto');
const streamProxyOptions = computed(() => [
  { title: t('settings.proxy.policyOptions.auto'), value: 'auto' },
  { title: t('settings.proxy.policyOptions.always'), value: 'always' },
  { title: t('settings.proxy.policyOptions.never'), value: 'never' },
]);

const proxyPresets = computed(() => [
  { title: t('settings.proxy.presets.none'), value: 'none' },
  { title: t('settings.proxy.presets.local'), value: 'local' },
  { title: t('settings.proxy.presets.allorigins'), value: 'allorigins' },
  { title: t('settings.proxy.presets.corsAnywhere'), value: 'cors-anywhere' },
  { title: t('settings.proxy.presets.thingproxy'), value: 'thingproxy' },
  { title: t('settings.proxy.presets.custom'), value: 'custom' },
]);

const playerProxyPresets = computed(() => [
  { title: t('settings.proxy.presets.none'), value: 'none' },
  { title: t('settings.proxy.presets.corsproxy'), value: 'corsproxy' },
  { title: t('settings.proxy.presets.local'), value: 'local' },
  { title: t('settings.proxy.presets.allorigins'), value: 'allorigins' },
  { title: t('settings.proxy.presets.corsAnywhere'), value: 'cors-anywhere' },
  { title: t('settings.proxy.presets.thingproxy'), value: 'thingproxy' },
  { title: t('settings.proxy.presets.custom'), value: 'custom' },
]);

// Playback Fields
const autoPlay = ref(true);
const defaultFloatMode = ref(true);
const defaultAspectRatio = ref('fit');
const aspectRatios = computed(() => [
  { title: t('settings.playback.aspectRatioOptions.fit'), value: 'fit' },
  { title: t('settings.playback.aspectRatioOptions.fill'), value: 'fill' },
  { title: t('settings.playback.aspectRatioOptions.widescreen'), value: '16-9' },
  { title: t('settings.playback.aspectRatioOptions.classic'), value: '4-3' },
]);
const playerBufferMode = ref('stable');
const bufferModes = computed(() => [
  { title: t('settings.playback.bufferOptions.lowLatency'), value: 'low-latency' },
  { title: t('settings.playback.bufferOptions.balanced'), value: 'balanced' },
  { title: t('settings.playback.bufferOptions.stable'), value: 'stable' },
]);

// EPG Fields
const epgTimeShift = ref(0);
const timeShiftOptions = computed(() => [
  { title: t('settings.epg.hoursAgo', { count: 12 }), value: -12 },
  { title: t('settings.epg.hoursAgo', { count: 11 }), value: -11 },
  { title: t('settings.epg.hoursAgo', { count: 10 }), value: -10 },
  { title: t('settings.epg.hoursAgo', { count: 9 }), value: -9 },
  { title: t('settings.epg.hoursAgo', { count: 8 }), value: -8 },
  { title: t('settings.epg.hoursAgo', { count: 7 }), value: -7 },
  { title: t('settings.epg.hoursAgo', { count: 6 }), value: -6 },
  { title: t('settings.epg.hoursAgo', { count: 5 }), value: -5 },
  { title: t('settings.epg.hoursAgo', { count: 4 }), value: -4 },
  { title: t('settings.epg.brasiliaShift'), value: -3 },
  { title: t('settings.epg.hoursAgo', { count: 2 }), value: -2 },
  { title: t('settings.epg.hoursAgo', { count: 1 }), value: -1 },
  { title: t('settings.epg.noShift'), value: 0 },
  { title: t('settings.epg.hoursAhead', { count: 1 }), value: 1 },
  { title: t('settings.epg.hoursAhead', { count: 2 }), value: 2 },
  { title: t('settings.epg.shiftThreeAhead'), value: 3 },
  { title: t('settings.epg.hoursAhead', { count: 4 }), value: 4 },
  { title: t('settings.epg.hoursAhead', { count: 5 }), value: 5 },
  { title: t('settings.epg.hoursAhead', { count: 6 }), value: 6 },
  { title: t('settings.epg.hoursAhead', { count: 7 }), value: 7 },
  { title: t('settings.epg.hoursAhead', { count: 8 }), value: 8 },
  { title: t('settings.epg.hoursAhead', { count: 9 }), value: 9 },
  { title: t('settings.epg.hoursAhead', { count: 10 }), value: 10 },
  { title: t('settings.epg.hoursAhead', { count: 11 }), value: 11 },
  { title: t('settings.epg.hoursAhead', { count: 12 }), value: 12 },
]);

// Movie Metadata Fields
const movieMetadataSource = ref('tmdb');
const movieMetadataApiKey = ref('');
const movieMetadataLanguage = ref('pt-BR');

const metadataSources = computed(() => [
  { title: t('settings.metadata.sources.none'), value: 'none' },
  { title: t('settings.metadata.sources.tmdb'), value: 'tmdb' },
  { title: t('settings.metadata.sources.omdb'), value: 'omdb' },
]);

const metadataLanguages = computed(() => [
  { title: t('settings.metadata.languages.ptBR'), value: 'pt-BR' },
  { title: t('settings.metadata.languages.ptPT'), value: 'pt-PT' },
  { title: t('settings.metadata.languages.enUS'), value: 'en-US' },
  { title: t('settings.metadata.languages.esES'), value: 'es-ES' },
]);

// Playlist Synchronization Fields
const playlistUpdateInterval = ref(24);
const syncingAll = ref(false);
const syncProgressMsg = ref('');
const updateIntervalOptions = computed(() => [
  { title: t('settings.sync.intervalOptions.never'), value: 'never' },
  { title: t('settings.sync.intervalOptions.h12'), value: 12 },
  { title: t('settings.sync.intervalOptions.h24'), value: 24 },
  { title: t('settings.sync.intervalOptions.h48'), value: 48 },
  { title: t('settings.sync.intervalOptions.days7'), value: 168 },
]);

// DB Statistics
const stats = ref({
  playlists: 0,
  channels: 0,
  epg: 0,
  favorites: 0
});

onMounted(async () => {
  await loadProxySettings();
  await loadPlaybackSettings();
  await loadEpgSettings();
  await loadMetadataSettings();
  await loadUpdateSettings();
  await loadLanguageSetting();
  await calculateStats();
});

const loadMetadataSettings = async () => {
  try {
    movieMetadataSource.value = await db.getSetting('movie_metadata_source', 'tmdb');
    movieMetadataApiKey.value = await db.getSetting('movie_metadata_api_key', '');
    movieMetadataLanguage.value = await db.getSetting('movie_metadata_language', 'pt-BR');
  } catch (err) {
    console.error('Erro ao carregar configurações de metadados:', err);
  }
};

const saveMetadataSettings = async () => {
  try {
    await db.setSetting('movie_metadata_source', movieMetadataSource.value);
    await db.setSetting('movie_metadata_api_key', movieMetadataApiKey.value);
    await db.setSetting('movie_metadata_language', movieMetadataLanguage.value);
  } catch (err) {
    console.error('Erro ao salvar configurações de metadados:', err);
  }
};

const loadUpdateSettings = async () => {
  try {
    playlistUpdateInterval.value = await db.getSetting('playlist_update_interval', 24);
  } catch (err) {
    console.error('Erro ao carregar configurações de sincronização:', err);
  }
};

const saveUpdateSettings = async () => {
  try {
    await db.setSetting('playlist_update_interval', playlistUpdateInterval.value);
    alertType.value = 'success';
    alertMsg.value = t('settings.sync.successMsg');
  } catch (err: any) {
    alertType.value = 'error';
    alertMsg.value = `${t('common.error')}: ${err.message}`;
  }
};

const syncAllPlaylists = async () => {
  syncingAll.value = true;
  syncProgressMsg.value = t('settings.sync.syncingAll');
  alertMsg.value = '';
  try {
    const playlistsList = await db.getPlaylists();
    const toUpdate = playlistsList.filter(p => p.type !== 'file');
    if (toUpdate.length === 0) {
      alertType.value = 'info';
      alertMsg.value = t('settings.sync.noPlaylistsMsg');
      syncProgressMsg.value = '';
      return;
    }
    let successCount = 0;
    for (let i = 0; i < toUpdate.length; i++) {
      const pl = toUpdate[i];
      syncProgressMsg.value = t('settings.sync.syncProgress', { current: i + 1, total: toUpdate.length, name: pl.name });
      try {
        await PlaylistUpdater.updatePlaylist(pl);
        successCount++;
      } catch (e: any) {
        console.error(`Erro ao sincronizar playlist "${pl.name}":`, e);
      }
    }
    alertType.value = 'success';
    alertMsg.value = t('settings.sync.syncSuccessDetailed', { success: successCount, total: toUpdate.length });
    await calculateStats();
  } catch (err: any) {
    alertType.value = 'error';
    alertMsg.value = t('settings.sync.syncErrorMsg', { error: err.message || err });
  } finally {
    syncingAll.value = false;
    syncProgressMsg.value = '';
  }
};

// --- LOAD PREFERENCES ---
const loadProxySettings = async () => {
  try {
    // 1. Data Proxy
    const defaultProxyUrl = isElectron ? '' : 'http://localhost:8088/?url=';
    const proxy = await db.getSetting('cors_proxy_url', defaultProxyUrl);
    customProxyUrl.value = proxy;

    if (proxy === '') {
      selectedProxyPreset.value = 'none';
    } else if (proxy.includes('localhost:8088') || proxy.includes('127.0.0.1:8088')) {
      selectedProxyPreset.value = 'local';
    } else if (proxy.includes('allorigins.win')) {
      selectedProxyPreset.value = 'allorigins';
    } else if (proxy.includes('cors-anywhere.herokuapp.com')) {
      selectedProxyPreset.value = 'cors-anywhere';
    } else if (proxy.includes('thingproxy.freeboard.io')) {
      selectedProxyPreset.value = 'thingproxy';
    } else {
      selectedProxyPreset.value = 'custom';
    }

    // 2. Player Proxy
    const defaultPlayerProxyUrl = isElectron ? '' : 'https://corsproxy.io/?';
    const playerProxy = await db.getSetting('player_proxy_url', defaultPlayerProxyUrl);
    customPlayerProxyUrl.value = playerProxy;

    if (playerProxy === '') {
      selectedPlayerProxyPreset.value = 'none';
    } else if (playerProxy.includes('corsproxy.io')) {
      selectedPlayerProxyPreset.value = 'corsproxy';
    } else if (playerProxy.includes('localhost:8088') || playerProxy.includes('127.0.0.1:8088')) {
      selectedPlayerProxyPreset.value = 'local';
    } else if (playerProxy.includes('allorigins.win')) {
      selectedPlayerProxyPreset.value = 'allorigins';
    } else if (playerProxy.includes('cors-anywhere.herokuapp.com')) {
      selectedPlayerProxyPreset.value = 'cors-anywhere';
    } else if (playerProxy.includes('thingproxy.freeboard.io')) {
      selectedPlayerProxyPreset.value = 'thingproxy';
    } else {
      selectedPlayerProxyPreset.value = 'custom';
    }

    const defaultPlayerProxyStreams = isElectron ? 'never' : 'auto';
    playerProxyStreams.value = await db.getSetting('player_proxy_streams', defaultPlayerProxyStreams);
  } catch (err) {
    console.error(err);
  }
};

const onProxyPresetChange = (preset: string) => {
  if (preset === 'none') {
    customProxyUrl.value = '';
  } else if (preset === 'local') {
    customProxyUrl.value = 'http://localhost:8088/?url=';
  } else if (preset === 'allorigins') {
    customProxyUrl.value = 'https://api.allorigins.win/raw?url=';
  } else if (preset === 'cors-anywhere') {
    customProxyUrl.value = 'https://cors-anywhere.herokuapp.com/';
  } else if (preset === 'thingproxy') {
    customProxyUrl.value = 'https://thingproxy.freeboard.io/fetch/';
  } else if (preset === 'custom') {
    customProxyUrl.value = '';
  }
};

const onPlayerProxyPresetChange = (preset: string) => {
  if (preset === 'none') {
    customPlayerProxyUrl.value = '';
  } else if (preset === 'local') {
    customPlayerProxyUrl.value = 'http://localhost:8088/?url=';
  } else if (preset === 'corsproxy') {
    customPlayerProxyUrl.value = 'https://corsproxy.io/?';
  } else if (preset === 'allorigins') {
    customPlayerProxyUrl.value = 'https://api.allorigins.win/raw?url=';
  } else if (preset === 'cors-anywhere') {
    customPlayerProxyUrl.value = 'https://cors-anywhere.herokuapp.com/';
  } else if (preset === 'thingproxy') {
    customPlayerProxyUrl.value = 'https://thingproxy.freeboard.io/fetch/';
  } else if (preset === 'custom') {
    customPlayerProxyUrl.value = '';
  }
};

const saveCorsProxy = async () => {
  try {
    const proxyVal = customProxyUrl.value.trim();
    const playerProxyVal = customPlayerProxyUrl.value.trim();
    await db.setSetting('cors_proxy_url', proxyVal);
    await db.setSetting('player_proxy_url', playerProxyVal);
    await db.setSetting('player_proxy_streams', playerProxyStreams.value);
    alertType.value = 'success';
    alertMsg.value = t('settings.proxy.successMsg');
  } catch (err: any) {
    alertType.value = 'error';
    alertMsg.value = `${t('common.error')}: ${err.message}`;
  }
};

const loadPlaybackSettings = async () => {
  try {
    autoPlay.value = await db.getSetting('player_autoplay', true);
    defaultFloatMode.value = await db.getSetting('player_default_float', true);
    defaultAspectRatio.value = await db.getSetting('player_default_aspect', 'fit');
    playerBufferMode.value = await db.getSetting('player_buffer_mode', 'stable');
  } catch (err) {
    console.error(err);
  }
};

const savePlaybackSettings = async () => {
  try {
    await db.setSetting('player_autoplay', autoPlay.value);
    await db.setSetting('player_default_float', defaultFloatMode.value);
    await db.setSetting('player_default_aspect', defaultAspectRatio.value);
    await db.setSetting('player_buffer_mode', playerBufferMode.value);
  } catch (err) {
    console.error(err);
  }
};

const loadEpgSettings = async () => {
  try {
    epgTimeShift.value = await db.getSetting('epg_time_shift', 0);
  } catch (err) {
    console.error(err);
  }
};

const saveEpgSettings = async () => {
  try {
    await db.setSetting('epg_time_shift', epgTimeShift.value);
    alertType.value = 'success';
    alertMsg.value = t('settings.epg.successMsg');
  } catch (err: any) {
    alertType.value = 'error';
    alertMsg.value = `${t('common.error')}: ${err.message}`;
  }
};

// --- DATABASE MAINTENANCE & STATS ---
const calculateStats = async () => {
  try {
    const playlistsList = await db.getPlaylists();
    stats.value.playlists = playlistsList.length;

    const database = await db.init();
    
    // Count Channels
    const txChan = database.transaction('channels', 'readonly');
    const chReq = txChan.objectStore('channels').count();
    chReq.onsuccess = () => {
      stats.value.channels = chReq.result;
    };

    // Count EPG
    const txEpg = database.transaction('epg', 'readonly');
    const epgReq = txEpg.objectStore('epg').count();
    epgReq.onsuccess = () => {
      stats.value.epg = epgReq.result;
    };

    // Count Favorites
    const txFav = database.transaction('favorites', 'readonly');
    const favReq = txFav.objectStore('favorites').count();
    favReq.onsuccess = () => {
      stats.value.favorites = favReq.result;
    };
  } catch (err) {
    console.error(err);
  }
};

const pruneEpg = async () => {
  try {
    const deleted = await db.cleanOldEpg();
    alertType.value = 'success';
    alertMsg.value = t('settings.maintenance.pruneSuccess', { count: deleted.toLocaleString() });
    await calculateStats();
  } catch (err: any) {
    alertType.value = 'error';
    alertMsg.value = `${t('common.error')}: ${err.message}`;
  }
};

const wipeDatabase = async () => {
  if (confirm(t('settings.maintenance.wipeConfirm'))) {
    try {
      const database = await db.init();
      const stores = Array.from(database.objectStoreNames);
      
      const tx = database.transaction(stores, 'readwrite');
      for (const store of stores) {
        tx.objectStore(store).clear();
      }

      tx.oncomplete = async () => {
        // Restore default settings
        const defaultProxyUrl = isElectron ? '' : 'http://localhost:8088/?url=';
        const defaultPlayerProxyUrl = isElectron ? '' : 'https://corsproxy.io/?';
        const defaultPlayerProxyStreams = isElectron ? 'never' : 'auto';

        await db.setSetting('cors_proxy_url', defaultProxyUrl);
        await db.setSetting('player_proxy_url', defaultPlayerProxyUrl);
        await db.setSetting('player_proxy_streams', defaultPlayerProxyStreams);
        await db.setSetting('player_autoplay', true);
        await db.setSetting('player_default_float', true);
        await db.setSetting('player_default_aspect', 'fit');
        await db.setSetting('player_buffer_mode', 'stable');
        await db.setSetting('epg_time_shift', 0);
        await db.setSetting('playlist_update_interval', 24);
        await db.setSetting('movie_metadata_source', 'tmdb');
        await db.setSetting('movie_metadata_api_key', '');
        await db.setSetting('movie_metadata_language', 'pt-BR');
        await db.setSetting('language', 'pt');

        alertType.value = 'success';
        alertMsg.value = t('settings.maintenance.wipeSuccess');
        locale.value = 'pt';
        activeLanguage.value = 'pt';
        await calculateStats();
      };
    } catch (err: any) {
      alertType.value = 'error';
      alertMsg.value = `${t('common.error')}: ${err.message}`;
    }
  }
};

const resetToDefaults = async () => {
  if (confirm(t('settings.maintenance.resetConfirm'))) {
    try {
      const defaultProxyUrl = isElectron ? '' : 'http://localhost:8088/?url=';
      const defaultPlayerProxyUrl = isElectron ? '' : 'https://corsproxy.io/?';
      const defaultPlayerProxyStreams = isElectron ? 'never' : 'auto';

      await db.setSetting('cors_proxy_url', defaultProxyUrl);
      await db.setSetting('player_proxy_url', defaultPlayerProxyUrl);
      await db.setSetting('player_proxy_streams', defaultPlayerProxyStreams);
      await db.setSetting('player_autoplay', true);
      await db.setSetting('player_default_float', true);
      await db.setSetting('player_default_aspect', 'fit');
      await db.setSetting('player_buffer_mode', 'stable');
      await db.setSetting('epg_time_shift', 0);
      await db.setSetting('playlist_update_interval', 24);
      await db.setSetting('movie_metadata_source', 'tmdb');
      await db.setSetting('movie_metadata_api_key', '');
      await db.setSetting('movie_metadata_language', 'pt-BR');

      // Reload settings in the UI
      await loadProxySettings();
      await loadPlaybackSettings();
      await loadEpgSettings();
      await loadMetadataSettings();
      await loadUpdateSettings();
      await loadLanguageSetting();

      alertType.value = 'success';
      alertMsg.value = t('settings.maintenance.resetSuccess');
    } catch (err: any) {
      alertType.value = 'error';
      alertMsg.value = `${t('common.error')}: ${err.message}`;
    }
  }
};
</script>

<style scoped>
.glass-card {
  background: rgba(18, 18, 18, 0.7) !important;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
}

.text-glow-small {
  background: linear-gradient(135deg, #FFB300 0%, #FFE082 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.stat-box {
  border: 1px solid rgba(255, 255, 255, 0.04);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
}

.gap-3 {
  gap: 12px;
}
.leading-relaxed {
  line-height: 1.6;
}
.max-width-480 {
  max-width: 480px;
}
.mx-auto {
  margin-left: auto;
  margin-right: auto;
}
</style>
