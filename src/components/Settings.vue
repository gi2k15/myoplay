<!-- src/components/Settings.vue -->
<template>
  <div class="settings">
    <h1 class="page-title">{{ $t('nav.settings') }}</h1>

    <div class="settings-layout">
      <nav class="settings-nav" :aria-label="$t('nav.settings')">
        <button
          v-for="sec in sections"
          :key="sec.id"
          class="nav-link"
          :class="{ 'nav-link--active': activeSection === sec.id }"
          @click="scrollTo(sec.id)"
        >
          <v-icon size="18">{{ sec.icon }}</v-icon>
          {{ sec.title }}
        </button>
      </nav>

      <div class="settings-sections">
        <v-alert
          v-if="alertMsg"
          :type="alertType"
          closable
          density="compact"
          @click:close="alertMsg = ''"
        >
          {{ alertMsg }}
        </v-alert>

        <!-- CORS proxy (web) -->
        <v-card v-if="!isElectron" id="sec-proxy" class="group">
          <div class="group-head">
            <h2 class="group-title">{{ $t('settings.proxy.title') }}</h2>
            <p class="group-desc">{{ $t('settings.proxy.desc') }}</p>
          </div>
          <SettingRow :label="$t('settings.proxy.preset1Label')" :hint="$t('settings.proxy.preset1Select')">
            <v-select
              v-model="selectedProxyPreset"
              :items="proxyPresets"
              :aria-label="$t('settings.proxy.preset1Label')"
              density="compact"
              hide-details
              @update:model-value="onProxyPresetChange"
            />
          </SettingRow>
          <SettingRow v-if="selectedProxyPreset === 'custom'" :label="$t('settings.proxy.preset1Url')">
            <v-text-field
              v-model="customProxyUrl"
              :aria-label="$t('settings.proxy.preset1Url')"
              placeholder="https://proxy.exemplo.com/?url="
              density="compact"
              hide-details
            />
          </SettingRow>
          <SettingRow :label="$t('settings.proxy.preset2Label')" :hint="$t('settings.proxy.preset2Select')">
            <v-select
              v-model="selectedPlayerProxyPreset"
              :items="playerProxyPresets"
              :aria-label="$t('settings.proxy.preset2Label')"
              density="compact"
              hide-details
              @update:model-value="onPlayerProxyPresetChange"
            />
          </SettingRow>
          <SettingRow v-if="selectedPlayerProxyPreset === 'custom'" :label="$t('settings.proxy.preset2Url')">
            <v-text-field
              v-model="customPlayerProxyUrl"
              :aria-label="$t('settings.proxy.preset2Url')"
              placeholder="https://proxy.exemplo.com/?url="
              density="compact"
              hide-details
            />
          </SettingRow>
          <SettingRow :label="$t('settings.proxy.policyLabel')">
            <v-select
              v-model="playerProxyStreams"
              :items="streamProxyOptions"
              :aria-label="$t('settings.proxy.policyLabel')"
              density="compact"
              hide-details
            />
          </SettingRow>
          <div class="group-actions">
            <v-btn color="primary" @click="saveCorsProxy">{{ $t('settings.proxy.saveBtn') }}</v-btn>
          </div>
        </v-card>

        <!-- Network & VPN (Electron) -->
        <v-card v-if="isElectron" id="sec-network" class="group">
          <div class="group-head">
            <h2 class="group-title">{{ $t('settings.network.title') }}</h2>
            <p class="group-desc">{{ $t('settings.network.desc') }}</p>
          </div>
          <SettingRow :label="$t('settings.network.dohLabel')" :hint="$t('settings.network.dohHint')">
            <v-switch
              v-model="enableDoH"
              :aria-label="$t('settings.network.dohLabel')"
              hide-details
              @update:model-value="saveNetworkSettings"
            />
          </SettingRow>
          <SettingRow :label="$t('settings.network.proxyModeLabel')">
            <v-select
              v-model="electronProxyMode"
              :items="electronProxyOptions"
              :aria-label="$t('settings.network.proxyModeLabel')"
              density="compact"
              hide-details
              @update:model-value="saveNetworkSettings"
            />
          </SettingRow>
          <SettingRow v-if="electronProxyMode === 'custom'" :label="$t('settings.network.customProxyLabel')">
            <v-text-field
              v-model="customElectronProxyUrl"
              :aria-label="$t('settings.network.customProxyLabel')"
              :placeholder="$t('settings.network.customProxyPlaceholder')"
              density="compact"
              hide-details
              @update:model-value="saveNetworkSettings"
            />
          </SettingRow>
          <SettingRow :label="$t('settings.network.sslBypassLabel')" :hint="$t('settings.network.sslBypassWarning')">
            <v-switch
              v-model="ignoreSslErrors"
              :aria-label="$t('settings.network.sslBypassLabel')"
              color="error"
              hide-details
              @update:model-value="saveNetworkSettings"
            />
          </SettingRow>
          <div class="group-note">
            <v-icon size="18" color="medium-emphasis">mdi-information-outline</v-icon>
            <span>{{ $t('settings.network.vpnNotice') }}</span>
          </div>
        </v-card>

        <!-- Playback -->
        <v-card id="sec-playback" class="group">
          <div class="group-head">
            <h2 class="group-title">{{ $t('settings.playback.title') }}</h2>
          </div>
          <SettingRow :label="$t('settings.playback.autoPlay')" :hint="$t('settings.playback.autoPlayHint')">
            <v-switch
              v-model="autoPlay"
              :aria-label="$t('settings.playback.autoPlay')"
              hide-details
              @update:model-value="savePlaybackSettings"
            />
          </SettingRow>
          <SettingRow :label="$t('settings.playback.aspectRatio')">
            <v-select
              v-model="defaultAspectRatio"
              :items="aspectRatios"
              :aria-label="$t('settings.playback.aspectRatio')"
              density="compact"
              hide-details
              @update:model-value="savePlaybackSettings"
            />
          </SettingRow>
          <SettingRow :label="$t('settings.playback.bufferMode')" :hint="$t('settings.playback.bufferHint')">
            <v-select
              v-model="playerBufferMode"
              :items="bufferModes"
              :aria-label="$t('settings.playback.bufferMode')"
              density="compact"
              hide-details
              @update:model-value="savePlaybackSettings"
            />
          </SettingRow>
        </v-card>

        <!-- EPG -->
        <v-card id="sec-epg" class="group">
          <div class="group-head">
            <h2 class="group-title">{{ $t('settings.epg.title') }}</h2>
          </div>
          <SettingRow :label="$t('settings.epg.timeShift')" :hint="$t('settings.epg.desc')">
            <v-select
              v-model="epgTimeShift"
              :items="timeShiftOptions"
              :aria-label="$t('settings.epg.timeShift')"
              density="compact"
              hide-details
              @update:model-value="saveEpgSettings"
            />
          </SettingRow>
        </v-card>

        <!-- Sync -->
        <v-card id="sec-sync" class="group">
          <div class="group-head">
            <h2 class="group-title">{{ $t('settings.sync.title') }}</h2>
          </div>
          <SettingRow :label="$t('settings.sync.interval')" :hint="$t('settings.sync.desc')">
            <v-select
              v-model="playlistUpdateInterval"
              :items="updateIntervalOptions"
              :aria-label="$t('settings.sync.interval')"
              density="compact"
              hide-details
              @update:model-value="saveUpdateSettings"
            />
          </SettingRow>
          <div class="group-actions">
            <span v-if="syncProgressMsg" class="text-body-2 text-medium-emphasis mr-auto">{{ syncProgressMsg }}</span>
            <v-btn variant="outlined" prepend-icon="mdi-refresh" :loading="syncingAll" @click="syncAllPlaylists">
              {{ $t('settings.sync.syncAllBtn') }}
            </v-btn>
          </div>
        </v-card>

        <!-- Movie metadata -->
        <v-card id="sec-metadata" class="group">
          <div class="group-head">
            <h2 class="group-title">{{ $t('settings.metadata.title') }}</h2>
            <p class="group-desc">{{ $t('settings.metadata.desc') }}</p>
          </div>
          <SettingRow :label="$t('settings.metadata.providerLabel')">
            <v-select
              v-model="movieMetadataSource"
              :items="metadataSources"
              :aria-label="$t('settings.metadata.providerLabel')"
              density="compact"
              hide-details
              @update:model-value="saveMetadataSettings"
            />
          </SettingRow>
          <SettingRow
            v-if="movieMetadataSource !== 'none'"
            :label="$t('settings.metadata.apiKeyLabel')"
            :hint="movieMetadataSource === 'tmdb' ? $t('settings.metadata.hintTmdb') : $t('settings.metadata.hintOmdb')"
          >
            <v-text-field
              v-model="movieMetadataApiKey"
              :aria-label="$t('settings.metadata.apiKeyLabel')"
              :placeholder="$t('settings.metadata.apiKeyPlaceholder')"
              type="password"
              density="compact"
              hide-details
              @update:model-value="saveMetadataSettings"
            />
          </SettingRow>
          <SettingRow v-if="movieMetadataSource === 'tmdb'" :label="$t('settings.metadata.languageLabel')">
            <v-select
              v-model="movieMetadataLanguage"
              :items="metadataLanguages"
              :aria-label="$t('settings.metadata.languageLabel')"
              density="compact"
              hide-details
              @update:model-value="saveMetadataSettings"
            />
          </SettingRow>
        </v-card>

        <!-- Language -->
        <v-card id="sec-language" class="group">
          <div class="group-head">
            <h2 class="group-title">{{ $t('settings.language.title') }}</h2>
          </div>
          <SettingRow :label="$t('settings.language.select')">
            <v-select
              v-model="activeLanguage"
              :items="languageOptions"
              :aria-label="$t('settings.language.select')"
              density="compact"
              hide-details
              @update:model-value="saveLanguageSetting"
            />
          </SettingRow>
        </v-card>

        <!-- Data & maintenance -->
        <v-card id="sec-data" class="group">
          <div class="group-head">
            <h2 class="group-title">{{ $t('settings.maintenance.title') }}</h2>
            <p class="group-desc">{{ $t('settings.maintenance.desc') }}</p>
          </div>
          <div class="stats">
            <div v-for="st in statItems" :key="st.label" class="stat">
              <div class="stat-value tabular">{{ st.value.toLocaleString() }}</div>
              <div class="stat-label">{{ st.label }}</div>
            </div>
          </div>
          <div class="group-actions">
            <v-btn variant="outlined" prepend-icon="mdi-broom" @click="pruneEpg">{{ $t('settings.maintenance.pruneBtn') }}</v-btn>
            <v-btn variant="outlined" prepend-icon="mdi-restore" @click="resetToDefaults">{{ $t('settings.maintenance.resetBtn') }}</v-btn>
            <v-btn variant="outlined" color="error" prepend-icon="mdi-delete-outline" @click="wipeDatabase">{{ $t('settings.maintenance.wipeBtn') }}</v-btn>
          </div>
          <div class="group-note">
            <v-icon size="18" color="medium-emphasis">mdi-shield-check-outline</v-icon>
            <span><strong>{{ $t('settings.maintenance.privacyTitle') }}.</strong> {{ $t('settings.maintenance.privacyDesc') }}</span>
          </div>
        </v-card>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { DEFAULT_WEB_PROXY_URL, LOCAL_PROXY_URL, isLocalProxyUrl, getDataProxy } from "@/utils/proxy";
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { db } from '@/services/db';
import { PlaylistUpdater } from '@/services/playlistUpdater';
import SettingRow from '@/components/SettingRow.vue';

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

const statItems = computed(() => [
  { label: t('settings.maintenance.statsPlaylists'), value: stats.value.playlists },
  { label: t('settings.maintenance.statsChannels'), value: stats.value.channels },
  { label: t('settings.maintenance.statsEpg'), value: stats.value.epg },
  { label: t('settings.maintenance.statsFavorites'), value: stats.value.favorites },
]);

// Section navigation
const sections = computed(() => [
  isElectron
    ? { id: 'sec-network', title: t('settings.network.title'), icon: 'mdi-shield-key-outline' }
    : { id: 'sec-proxy', title: t('settings.proxy.title'), icon: 'mdi-swap-horizontal' },
  { id: 'sec-playback', title: t('settings.playback.title'), icon: 'mdi-play-circle-outline' },
  { id: 'sec-epg', title: t('settings.epg.title'), icon: 'mdi-calendar-blank-outline' },
  { id: 'sec-sync', title: t('settings.sync.title'), icon: 'mdi-sync' },
  { id: 'sec-metadata', title: t('settings.metadata.title'), icon: 'mdi-movie-open-outline' },
  { id: 'sec-language', title: t('settings.language.title'), icon: 'mdi-translate' },
  { id: 'sec-data', title: t('settings.maintenance.title'), icon: 'mdi-database-outline' },
]);
const activeSection = ref(sections.value[0].id);

const scrollTo = (id: string) => {
  activeSection.value = id;
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// Highlight the section crossing the upper part of the viewport
let observer: IntersectionObserver | undefined;
const observeSections = () => {
  observer = new IntersectionObserver((entries) => {
    const hit = entries.find(e => e.isIntersecting);
    if (hit) activeSection.value = hit.target.id;
  }, { rootMargin: '0px 0px -70% 0px' });
  sections.value.forEach(sec => {
    const el = document.getElementById(sec.id);
    if (el) observer!.observe(el);
  });
};
onUnmounted(() => observer?.disconnect());

// Network & VPN Settings (Electron)
const enableDoH = ref(true);
const electronProxyMode = ref<'system' | 'direct' | 'custom'>('system');
const customElectronProxyUrl = ref('');
const ignoreSslErrors = ref(false);

const electronProxyOptions = computed(() => [
  { title: t('settings.network.proxyModes.system'), value: 'system' },
  { title: t('settings.network.proxyModes.direct'), value: 'direct' },
  { title: t('settings.network.proxyModes.custom'), value: 'custom' },
]);

const loadNetworkSettings = async () => {
  if (!isElectron) return;
  try {
    enableDoH.value = await db.getSetting('network_enable_doh', true);
    electronProxyMode.value = await db.getSetting('network_proxy_mode', 'system');
    customElectronProxyUrl.value = await db.getSetting('network_custom_proxy_url', '');
    ignoreSslErrors.value = await db.getSetting('network_ignore_ssl_errors', false);
  } catch (err) {
    console.error('Erro ao carregar configurações de rede:', err);
  }
};

const saveNetworkSettings = async () => {
  if (!isElectron) return;
  try {
    await db.setSetting('network_enable_doh', enableDoH.value);
    await db.setSetting('network_proxy_mode', electronProxyMode.value);
    await db.setSetting('network_custom_proxy_url', customElectronProxyUrl.value);
    await db.setSetting('network_ignore_ssl_errors', ignoreSslErrors.value);

    await db.syncNetworkSettingsToElectron();

    alertType.value = 'success';
    alertMsg.value = t('settings.network.successMsg');
  } catch (err: any) {
    alertType.value = 'error';
    alertMsg.value = err.message || err;
  }
};

onMounted(async () => {
  observeSections();
  await loadProxySettings();
  await loadNetworkSettings();
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
    const proxy = await getDataProxy();
    customProxyUrl.value = proxy;

    if (proxy === '') {
      selectedProxyPreset.value = 'none';
    } else if (isLocalProxyUrl(proxy)) {
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
    } else if (isLocalProxyUrl(playerProxy)) {
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
    customProxyUrl.value = LOCAL_PROXY_URL;
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
    customPlayerProxyUrl.value = LOCAL_PROXY_URL;
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
    defaultAspectRatio.value = await db.getSetting('player_default_aspect', 'fit');
    playerBufferMode.value = await db.getSetting('player_buffer_mode', 'stable');
  } catch (err) {
    console.error(err);
  }
};

const savePlaybackSettings = async () => {
  try {
    await db.setSetting('player_autoplay', autoPlay.value);
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
        const defaultProxyUrl = isElectron ? '' : DEFAULT_WEB_PROXY_URL;
        const defaultPlayerProxyUrl = isElectron ? '' : 'https://corsproxy.io/?';
        const defaultPlayerProxyStreams = isElectron ? 'never' : 'auto';

        await db.setSetting('cors_proxy_url', defaultProxyUrl);
        await db.setSetting('player_proxy_url', defaultPlayerProxyUrl);
        await db.setSetting('player_proxy_streams', defaultPlayerProxyStreams);
        await db.setSetting('player_autoplay', true);
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
      const defaultProxyUrl = isElectron ? '' : DEFAULT_WEB_PROXY_URL;
      const defaultPlayerProxyUrl = isElectron ? '' : 'https://corsproxy.io/?';
      const defaultPlayerProxyStreams = isElectron ? 'never' : 'auto';

      await db.setSetting('cors_proxy_url', defaultProxyUrl);
      await db.setSetting('player_proxy_url', defaultPlayerProxyUrl);
      await db.setSetting('player_proxy_streams', defaultPlayerProxyStreams);
      await db.setSetting('player_autoplay', true);
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
.settings {
  max-width: 1040px;
  width: 100%;
  margin: 0 auto;
  padding: 8px 0 48px;
}

.page-title {
  font-size: 28px;
  line-height: 34px;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 24px;
}

.settings-layout {
  display: flex;
  gap: 32px;
  align-items: flex-start;
}

.settings-nav {
  flex: 0 0 220px;
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 40px;
  padding: 0 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.nav-link:hover {
  background: rgba(var(--v-theme-on-surface), 0.05);
  color: rgb(var(--v-theme-on-surface));
}

.nav-link--active,
.nav-link--active:hover {
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary-lighten-1));
}

.nav-link:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.settings-sections {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.group {
  scroll-margin-top: 16px;
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
  margin: 4px 0 0;
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

.stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.stat {
  padding: 16px 24px;
}

.stat + .stat {
  border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
}

.stat-label {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

@media (max-width: 600px) {
  .page-title {
    display: none;
  }
}

@media (max-width: 960px) {
  .settings-nav {
    display: none;
  }
  .stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .stat:nth-child(3) {
    border-left: 0;
  }
}
</style>
