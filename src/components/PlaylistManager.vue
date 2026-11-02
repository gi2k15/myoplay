<!-- src/components/PlaylistManager.vue -->
<template>
  <div class="lists">
    <!-- First run: welcome header -->
    <header v-if="playlists.length === 0" class="welcome">
      <div class="brand-mark" role="img" aria-label="MyoPlay">
        <v-icon size="28">mdi-play</v-icon>
      </div>
      <h1 class="page-title welcome-title">MyoPlay</h1>
      <p class="text-medium-emphasis mb-4">{{ $t('playlistManager.wizardSubtitle') }}</p>
      <v-btn variant="outlined" prepend-icon="mdi-tune-variant" @click="emit('open-settings')">
        {{ $t('nav.settings') }}
      </v-btn>
    </header>
    <h1 v-else class="page-title">{{ $t('playlistManager.title') }}</h1>

    <div class="d-flex flex-column ga-6">
      <v-alert v-if="errorMsg" type="error" closable density="compact" @click:close="errorMsg = ''">
        {{ errorMsg }}
      </v-alert>
      <v-alert v-if="successMsg" type="success" closable density="compact" @click:close="successMsg = ''">
        {{ successMsg }}
      </v-alert>

      <!-- Saved playlists -->
      <v-card v-if="playlists.length > 0">
        <div class="group-head">
          <h2 class="group-title">{{ $t('playlistManager.myPlaylists.title') }}</h2>
        </div>
        <div v-for="pl in playlists" :key="pl.id" class="pl-row">
          <v-avatar size="40" rounded="lg" color="surface-light" class="border flex-shrink-0">
            <v-icon size="20" color="medium-emphasis">{{ typeIcon(pl.type) }}</v-icon>
          </v-avatar>
          <div class="pl-text">
            <div class="pl-name">
              <span class="text-truncate">{{ pl.name }}</span>
              <span v-if="pl.id === currentPlaylistId" class="active-badge">{{ $t('playlistManager.myPlaylists.active') }}</span>
            </div>
            <div class="pl-meta">
              {{ typeLabel(pl.type) }} · {{ $t('playlistManager.channelsCount', { count: (pl.channelCount || 0).toLocaleString() }) }}
              <template v-if="pl.type !== 'file'">
                · {{ $t('playlistManager.myPlaylists.updatedAtPrefix') }}
                {{ pl.lastUpdatedAt ? new Date(pl.lastUpdatedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : $t('playlistManager.myPlaylists.never') }}
              </template>
            </div>
          </div>
          <div class="pl-actions">
            <v-btn
              v-if="pl.id !== currentPlaylistId"
              variant="outlined"
              @click="activatePlaylist(pl.id!)"
            >
              {{ $t('playlistManager.myPlaylists.activate') }}
            </v-btn>
            <v-btn
              v-if="pl.type !== 'file'"
              icon="mdi-refresh"
              variant="text"
              :aria-label="$t('playlistManager.myPlaylists.syncPlaylist')"
              :loading="loading && syncingPlaylistId === pl.id"
              :disabled="loading"
              @click="syncPlaylist(pl)"
            >
              <v-icon>mdi-refresh</v-icon>
              <v-tooltip activator="parent" location="top">{{ $t('playlistManager.myPlaylists.syncPlaylist') }}</v-tooltip>
            </v-btn>
            <v-btn
              v-if="pl.epgUrl"
              icon="mdi-calendar-sync-outline"
              variant="text"
              :aria-label="$t('playlistManager.myPlaylists.syncEpg')"
              :disabled="loading"
              @click="syncEPG(pl)"
            >
              <v-icon>mdi-calendar-sync-outline</v-icon>
              <v-tooltip activator="parent" location="top">{{ $t('playlistManager.myPlaylists.syncEpg') }}</v-tooltip>
            </v-btn>
            <v-btn
              icon="mdi-delete-outline"
              variant="text"
              class="delete-btn"
              :aria-label="$t('common.delete')"
              @click="deletePlaylist(pl.id!)"
            >
              <v-icon>mdi-delete-outline</v-icon>
              <v-tooltip activator="parent" location="top">{{ $t('common.delete') }}</v-tooltip>
            </v-btn>
          </div>
        </div>
      </v-card>

      <!-- Import progress -->
      <v-card v-if="loading" class="pa-8 text-center">
        <v-progress-circular
          :size="64"
          :width="6"
          :indeterminate="progressIndeterminate"
          :model-value="progressValue"
          class="mb-4"
        >
          <span v-if="!progressIndeterminate" class="text-body-2 font-weight-bold tabular">{{ progressValue }}%</span>
        </v-progress-circular>
        <div class="text-h6 font-weight-bold mb-1">{{ loadingStatus }}</div>
        <p class="text-body-2 text-medium-emphasis text-truncate mb-0">{{ loadingSubstatus }}</p>
      </v-card>

      <!-- Add playlist -->
      <v-card v-else>
        <div class="group-head pb-0">
          <h2 class="group-title">{{ $t('playlistManager.addTitle') }}</h2>
        </div>
        <v-tabs v-model="tab" class="add-tabs" density="comfortable">
          <v-tab value="m3u-file">{{ $t('playlistManager.tabs.m3uFile') }}</v-tab>
          <v-tab value="m3u-url">{{ $t('playlistManager.tabs.m3uUrl') }}</v-tab>
          <v-tab value="xtream">{{ $t('playlistManager.tabs.xtream') }}</v-tab>
          <v-tab value="epg">{{ $t('playlistManager.tabs.epg') }}</v-tab>
        </v-tabs>

        <div class="form-body">
          <v-window v-model="tab">
            <!-- Local M3U file -->
            <v-window-item value="m3u-file">
              <p class="group-desc tab-desc">{{ $t('playlistManager.fileTab.desc') }}</p>
              <div
                class="dropzone mb-4"
                :class="{ 'dropzone-active': isDragging }"
                role="button"
                tabindex="0"
                @dragover.prevent="isDragging = true"
                @dragleave.prevent="isDragging = false"
                @drop.prevent="onFileDrop"
                @click="triggerFileInput"
                @keydown.enter="triggerFileInput"
              >
                <input type="file" ref="fileInput" class="d-none" accept=".m3u,.m3u8,.txt" @change="onFileSelected" />
                <v-icon size="32" color="medium-emphasis" class="mb-2">mdi-tray-arrow-up</v-icon>
                <div class="font-weight-semibold">
                  {{ selectedFile ? selectedFile.name : $t('playlistManager.fileTab.dragPlaceholder') }}
                </div>
                <div class="text-body-2 text-medium-emphasis">
                  {{ selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : $t('playlistManager.fileTab.clickPlaceholder') }}
                </div>
              </div>
              <v-text-field
                v-model="playlistName"
                :label="$t('playlistManager.fileTab.playlistNameLabel')"
                :placeholder="$t('playlistManager.fileTab.playlistNamePlaceholder')"
                density="compact"
                hide-details
              />
            </v-window-item>

            <!-- M3U link -->
            <v-window-item value="m3u-url">
              <p class="group-desc tab-desc">{{ $t('playlistManager.urlTab.desc') }}</p>
              <div class="d-flex flex-column ga-4">
                <v-text-field
                  v-model="playlistName"
                  :label="$t('playlistManager.urlTab.playlistNameLabel')"
                  :placeholder="$t('playlistManager.urlTab.playlistNamePlaceholder')"
                  density="compact"
                  hide-details
                />
                <v-text-field
                  v-model="playlistUrl"
                  :label="$t('playlistManager.urlTab.playlistUrlLabel')"
                  :placeholder="$t('playlistManager.urlTab.playlistUrlPlaceholder')"
                  density="compact"
                  hide-details
                />
              </div>
            </v-window-item>

            <!-- Xtream Codes -->
            <v-window-item value="xtream">
              <p class="group-desc tab-desc">{{ $t('playlistManager.xtreamTab.desc') }}</p>
              <div class="form-grid">
                <v-text-field
                  v-model="playlistName"
                  :label="$t('playlistManager.xtreamTab.nameLabel')"
                  :placeholder="$t('playlistManager.xtreamTab.namePlaceholder')"
                  density="compact"
                  hide-details
                  class="span-2"
                />
                <v-text-field
                  v-model="xtreamHost"
                  :label="$t('playlistManager.xtreamTab.hostLabel')"
                  :placeholder="$t('playlistManager.xtreamTab.hostPlaceholder')"
                  density="compact"
                  hide-details
                  class="span-2"
                />
                <v-text-field
                  v-model="xtreamUser"
                  :label="$t('playlistManager.xtreamTab.usernameLabel')"
                  autocomplete="username"
                  density="compact"
                  hide-details
                />
                <v-text-field
                  v-model="xtreamPass"
                  :label="$t('playlistManager.xtreamTab.passwordLabel')"
                  type="password"
                  autocomplete="current-password"
                  density="compact"
                  hide-details
                />
              </div>
            </v-window-item>

            <!-- EPG guide -->
            <v-window-item value="epg">
              <p class="group-desc tab-desc">{{ $t('playlistManager.epgTab.desc') }}</p>
              <div class="epg-status mb-4">
                <div class="min-w-0">
                  <div class="font-weight-semibold">{{ $t('playlistManager.epgTab.statusLabel') }}</div>
                  <div class="text-body-2 text-medium-emphasis">
                    {{ epgCount > 0 ? $t('playlistManager.epgTab.cacheLabel', { count: epgCount.toLocaleString() }) : $t('playlistManager.epgTab.statusNone') }}
                  </div>
                </div>
                <v-btn v-if="epgCount > 0" variant="outlined" size="small" @click="clearEPGCache">
                  {{ $t('playlistManager.epgTab.clearCacheBtn') }}
                </v-btn>
              </div>

              <div class="field-label">{{ $t('playlistManager.epgTab.method1') }}</div>
              <div class="d-flex ga-2 align-center mb-4">
                <v-file-input
                  v-model="epgFile"
                  :label="$t('playlistManager.epgTab.selectEpgFile')"
                  accept=".xml,.xmltv"
                  prepend-icon=""
                  prepend-inner-icon="mdi-file-xml-box"
                  density="compact"
                  hide-details
                />
                <v-btn variant="outlined" height="40" :disabled="!epgFile" @click="importEPGFile">
                  {{ $t('playlistManager.epgTab.importLocalBtn') }}
                </v-btn>
              </div>

              <div class="field-label">{{ $t('playlistManager.epgTab.method2') }}</div>
              <v-text-field
                v-model="epgUrl"
                :label="$t('playlistManager.epgTab.epgUrlLabel')"
                :placeholder="$t('playlistManager.epgTab.epgUrlPlaceholder')"
                density="compact"
                hide-details
              />
            </v-window-item>
          </v-window>

          <!-- CORS proxy for downloads (web only) -->
          <div v-if="!isElectron && tab !== 'm3u-file'" class="proxy-box mt-4">
            <v-checkbox v-model="useCorsProxy" :label="proxyCheckboxLabel" hide-details density="compact" />
            <template v-if="useCorsProxy">
              <div class="d-flex flex-column ga-3 mt-2">
                <v-select
                  v-model="activeProxyPreset"
                  :items="proxyPresetOptions"
                  :label="$t('playlistManager.proxyServer')"
                  density="compact"
                  hide-details
                  @update:model-value="onProxyPresetSelect"
                />
                <v-text-field
                  v-if="activeProxyPreset === 'custom'"
                  v-model="currentProxyUrl"
                  :label="$t('settings.proxy.preset1Url')"
                  placeholder="http://localhost:8088/?url="
                  density="compact"
                  hide-details
                  @update:model-value="onCustomProxyUrlInput"
                />
                <p class="text-body-2 text-medium-emphasis mb-0">{{ $t('playlistManager.proxyNote') }}</p>
              </div>
            </template>
          </div>
        </div>

        <div class="group-actions">
          <v-btn color="primary" height="44" :disabled="primaryAction.disabled" @click="primaryAction.run">
            {{ primaryAction.label }}
          </v-btn>
        </div>
      </v-card>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  DEFAULT_WEB_PROXY_URL,
  LOCAL_PROXY_URL,
  isLocalProxyUrl,
  resolveProxy
} from "@/utils/proxy";
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { PlaylistUpdater } from '@/services/playlistUpdater';
import { db, type Playlist, type IPTVChannel } from '@/services/db';
import { parseM3U } from '@/services/m3uParser';
import { parseEPG } from '@/services/epgParser';
import { XtreamClient } from '@/services/xtreamClient';

const { t } = useI18n();

// Emits
const emit = defineEmits<{
  (e: 'select-playlist', id: number): void;
  (e: 'open-settings'): void;
}>();

// UI States
const fileInput = ref<HTMLInputElement | null>(null);
const triggerFileInput = () => {
  fileInput.value?.click();
};

const tab = ref('m3u-file');
const loading = ref(false);
const loadingStatus = ref('');
const loadingSubstatus = ref('');
const progressValue = ref(0);
const progressIndeterminate = ref(true);
const errorMsg = ref('');
const successMsg = ref('');

const isDragging = ref(false);
const selectedFile = ref<File | null>(null);

// Form Fields
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
const playlistName = ref('');
const playlistUrl = ref('');
const useCorsProxy = ref(!isElectron);

// Quick Proxy Configuration
const currentProxyUrl = ref(DEFAULT_WEB_PROXY_URL);
const activeProxyPreset = ref<'local' | 'custom'>('local');

const proxyPresetOptions = computed(() => [
  { title: t('settings.proxy.presets.local'), value: 'local' },
  { title: t('settings.proxy.presets.custom'), value: 'custom' },
]);

const proxyCheckboxLabel = computed(() => {
  if (tab.value === 'xtream') return t('playlistManager.xtreamTab.useProxy');
  if (tab.value === 'epg') return t('playlistManager.epgTab.useProxy');
  return t('playlistManager.urlTab.useProxy');
});

const loadCurrentProxySetting = async () => {
  try {
    const saved = await db.getSetting('cors_proxy_url', DEFAULT_WEB_PROXY_URL);
    currentProxyUrl.value = saved || DEFAULT_WEB_PROXY_URL;
    if (isLocalProxyUrl(currentProxyUrl.value)) {
      activeProxyPreset.value = 'local';
    } else {
      activeProxyPreset.value = 'custom';
    }
  } catch (err) {
    console.error('Failed to load proxy setting:', err);
  }
};

const onProxyPresetSelect = async (preset: 'local' | 'custom') => {
  activeProxyPreset.value = preset;
  if (preset === 'local') {
    currentProxyUrl.value = LOCAL_PROXY_URL;
  }
  await db.setSetting('cors_proxy_url', currentProxyUrl.value);
};

const onCustomProxyUrlInput = async (val: string) => {
  currentProxyUrl.value = val;
  await db.setSetting('cors_proxy_url', val);
};

const xtreamHost = ref('');
const xtreamUser = ref('');
const xtreamPass = ref('');

const epgFile = ref<File | null>(null);
const epgUrl = ref('');

// Database Data
const playlists = ref<(Playlist & { channelCount?: number })[]>([]);
const currentPlaylistId = ref<number | null>(null);
const epgCount = ref(0);

const syncingPlaylistId = ref<number | null>(null);

const onPlaylistUpdated = async () => {
  await refreshPlaylists();
  await refreshEpgCount();
};

// Fetch Initial Data
onMounted(async () => {
  await loadCurrentProxySetting();
  await refreshPlaylists();
  await refreshEpgCount();
  window.addEventListener('playlist-updated', onPlaylistUpdated);
});

onUnmounted(() => {
  window.removeEventListener('playlist-updated', onPlaylistUpdated);
});

const refreshPlaylists = async () => {
  try {
    const rawPlaylists = await db.getPlaylists();
    const playlistsWithCounts = [];
    
    // Get channel counts for each playlist
    for (const pl of rawPlaylists) {
      const channels = await db.getChannels(pl.id!);
      playlistsWithCounts.push({
        ...pl,
        channelCount: channels.length
      });
    }

    playlists.value = playlistsWithCounts;
    
    // Load current playlist setting
    const activeId = await db.getSetting('current_playlist_id');
    currentPlaylistId.value = activeId;
  } catch (err: any) {
    console.error(err);
  }
};

const refreshEpgCount = async () => {
  try {
    // A simple count from indexedDB
    const database = await db.init();
    const tx = database.transaction('epg', 'readonly');
    const store = tx.objectStore('epg');
    const req = store.count();
    req.onsuccess = () => {
      epgCount.value = req.result;
    };
  } catch (err) {
    console.error(err);
  }
};

const typeIcon = (type: string) =>
  type === 'file' ? 'mdi-file-outline' : type === 'url' ? 'mdi-link-variant' : 'mdi-server-network';

const typeLabel = (type: string) =>
  type === 'file' ? t('playlistManager.tabs.m3uFile') : type === 'url' ? t('playlistManager.tabs.m3uUrl') : t('playlistManager.tabs.xtream');

// The footer button runs the import for the open tab
const primaryAction = computed(() => {
  if (tab.value === 'm3u-url') {
    return { label: t('playlistManager.urlTab.loadBtn'), disabled: !playlistUrl.value || !playlistName.value, run: importM3UUrl };
  }
  if (tab.value === 'xtream') {
    return { label: t('playlistManager.xtreamTab.connectBtn'), disabled: !playlistName.value || !xtreamHost.value || !xtreamUser.value || !xtreamPass.value, run: importXtream };
  }
  if (tab.value === 'epg') {
    return { label: t('playlistManager.epgTab.downloadBtn'), disabled: !epgUrl.value, run: importEPGUrl };
  }
  return { label: t('playlistManager.fileTab.importBtn'), disabled: !selectedFile.value, run: importM3UFile };
});

// --- FILE DRAG & DROP HANDLERS ---
const onFileSelected = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0];
    if (!playlistName.value) {
      // Auto fill name
      playlistName.value = target.files[0].name.replace(/\.[^/.]+$/, "");
    }
  }
};

const onFileDrop = (e: DragEvent) => {
  isDragging.value = false;
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
    const file = e.dataTransfer.files[0];
    // Simple filter
    if (file.name.endsWith('.m3u') || file.name.endsWith('.m3u8') || file.name.endsWith('.txt')) {
      selectedFile.value = file;
      if (!playlistName.value) {
        playlistName.value = file.name.replace(/\.[^/.]+$/, "");
      }
    } else {
      errorMsg.value = 'Por favor, envie apenas arquivos .m3u, .m3u8 ou .txt.';
    }
  }
};

// --- IMPORT ACTIONS ---

// Helper to save channels and EPG url
const savePlaylistToDb = async (name: string, type: 'file' | 'url' | 'xtream', channels: IPTVChannel[], url?: string, user?: string, pass?: string, autoEpgUrl?: string) => {
  loadingStatus.value = 'Salvando metadados no banco local...';
  progressIndeterminate.value = true;
  progressValue.value = 0;
  
  const plId = await db.addPlaylist({
    name,
    type,
    url,
    username: user,
    password: pass,
    epgUrl: autoEpgUrl,
    createdAt: Date.now()
  });

  loadingStatus.value = `Salvando canais no banco local...`;
  progressIndeterminate.value = false;

  // Map playlist ID into channels
  const mappedChannels = channels.map(c => ({
    ...c,
    id: c.id.includes('_') ? `${plId}_${c.id.split('_').slice(1).join('_')}` : `${plId}_${c.id}`,
    playlistId: plId
  }));

  await db.addChannelsBatch(mappedChannels, (percent) => {
    progressValue.value = percent;
    loadingSubstatus.value = `Salvando canais: ${percent}% (${Math.round((percent / 100) * mappedChannels.length).toLocaleString()} de ${mappedChannels.length.toLocaleString()})`;
  });

  // Auto set active
  await db.setSetting('current_playlist_id', plId);
  currentPlaylistId.value = plId;

  // If there was an epgURL auto-discovered in the M3U or computed, download it
  if (autoEpgUrl) {
    try {
      await downloadAndSaveEPG(autoEpgUrl, true);
    } catch (e) {
      console.warn('Erro ao tentar carregar EPG auto-detectado:', e);
    }
  }

  return plId;
};

// 1. M3U File Import
const importM3UFile = async () => {
  if (!selectedFile.value) return;
  
  loading.value = true;
  progressIndeterminate.value = true;
  progressValue.value = 0;
  errorMsg.value = '';
  successMsg.value = '';
  loadingStatus.value = 'Lendo o arquivo local...';
  loadingSubstatus.value = selectedFile.value.name;

  try {
    const text = await selectedFile.value.text();
    loadingStatus.value = 'Analisando lista M3U...';
    loadingSubstatus.value = 'Dividindo linhas e parseando tags EXTINF...';
    
    const { channels, epgUrl: autoEpg } = parseM3U(text, 0);

    if (channels.length === 0) {
      throw new Error('Nenhum canal válido foi encontrado neste arquivo M3U. Verifique se o arquivo está no formato padrão.');
    }

    const name = playlistName.value || selectedFile.value.name.replace(/\.[^/.]+$/, "");
    const plId = await savePlaylistToDb(name, 'file', channels, undefined, undefined, undefined, autoEpg);

    successMsg.value = `Lista "${name}" importada com sucesso! ${channels.length.toLocaleString()} canais salvos.`;
    
    // Clean fields
    selectedFile.value = null;
    playlistName.value = '';
    
    await refreshPlaylists();
    await refreshEpgCount();
    emit('select-playlist', plId);
  } catch (err: any) {
    errorMsg.value = `Erro ao importar arquivo: ${err.message || err}`;
  } finally {
    loading.value = false;
  }
};

// 2. M3U URL Import
const importM3UUrl = async () => {
  if (!playlistUrl.value || !playlistName.value) return;

  loading.value = true;
  progressIndeterminate.value = true;
  progressValue.value = 0;
  errorMsg.value = '';
  successMsg.value = '';
  loadingStatus.value = 'Baixando arquivo M3U da nuvem...';
  loadingSubstatus.value = playlistUrl.value;

  try {
    let finalUrl = playlistUrl.value.trim();
    
    // Proxy CORS
    const proxy = resolveProxy(useCorsProxy.value, currentProxyUrl.value);
    const fetchUrl = proxy ? `${proxy}${encodeURIComponent(finalUrl)}` : finalUrl;

    const res = await fetch(fetchUrl);
    if (!res.ok) {
      throw new Error(`Erro de rede HTTP ${res.status}. Certifique-se de que a URL está correta ou experimente habilitar o proxy CORS.`);
    }

    const contentLength = res.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
    
    let loadedBytes = 0;
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];

    if (!reader) {
      const text = await res.text();
      loadingStatus.value = 'Analisando lista M3U...';
      loadingSubstatus.value = 'Mapeando canais e tags...';
      const { channels, epgUrl: autoEpg } = parseM3U(text, 0);
      if (channels.length === 0) {
        throw new Error('Nenhum canal foi encontrado no link M3U.');
      }
      const plId = await savePlaylistToDb(playlistName.value, 'url', channels, finalUrl, undefined, undefined, autoEpg);
      successMsg.value = `Lista "${playlistName.value}" baixada com sucesso! ${channels.length.toLocaleString()} canais salvos.`;
      playlistUrl.value = '';
      playlistName.value = '';
      await refreshPlaylists();
      await refreshEpgCount();
      emit('select-playlist', plId);
      return;
    }

    progressIndeterminate.value = totalBytes === 0;
    progressValue.value = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        loadedBytes += value.length;
        if (totalBytes > 0) {
          progressValue.value = Math.round((loadedBytes / totalBytes) * 100);
          loadingStatus.value = `Baixando arquivo M3U... ${progressValue.value}%`;
          loadingSubstatus.value = `Baixado ${(loadedBytes / 1024 / 1024).toFixed(2)} MB de ${(totalBytes / 1024 / 1024).toFixed(2)} MB`;
        } else {
          loadingStatus.value = 'Baixando arquivo M3U...';
          loadingSubstatus.value = `Baixado ${(loadedBytes / 1024 / 1024).toFixed(2)} MB`;
        }
      }
    }

    const combined = new Uint8Array(loadedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    const text = new TextDecoder('utf-8').decode(combined);

    loadingStatus.value = 'Analisando lista M3U...';
    progressIndeterminate.value = true;
    const { channels, epgUrl: autoEpg } = parseM3U(text, 0);

    if (channels.length === 0) {
      throw new Error('Nenhum canal foi encontrado no link M3U.');
    }

    const plId = await savePlaylistToDb(playlistName.value, 'url', channels, finalUrl, undefined, undefined, autoEpg);

    successMsg.value = `Lista "${playlistName.value}" baixada com sucesso! ${channels.length.toLocaleString()} canais salvos.`;

    // Clean fields
    playlistUrl.value = '';
    playlistName.value = '';
    
    await refreshPlaylists();
    await refreshEpgCount();
    emit('select-playlist', plId);
  } catch (err: any) {
    errorMsg.value = `Erro ao importar URL: ${err.message || err}`;
  } finally {
    loading.value = false;
  }
};

// 3. Xtream Codes API Import
const importXtream = async () => {
  if (!playlistName.value || !xtreamHost.value || !xtreamUser.value || !xtreamPass.value) return;

  loading.value = true;
  progressIndeterminate.value = true;
  progressValue.value = 0;
  errorMsg.value = '';
  successMsg.value = '';
  loadingStatus.value = 'Verificando conexão com o servidor Xtream...';
  loadingSubstatus.value = xtreamHost.value;

  try {
    const proxy = resolveProxy(useCorsProxy.value, currentProxyUrl.value);
    
    const client = new XtreamClient({
      url: xtreamHost.value,
      username: xtreamUser.value,
      password: xtreamPass.value,
      corsProxy: proxy
    });

    const auth = await client.authenticate();
    if (!auth.success) {
      throw new Error(auth.message);
    }

    loadingStatus.value = 'Autenticado com sucesso!';
    loadingSubstatus.value = 'Buscando lista de categorias e streams...';
    progressIndeterminate.value = false;
    progressValue.value = 0;

    const channels = await client.fetchAllData(0, (msg, percent) => {
      loadingStatus.value = 'Baixando dados do Xtream...';
      loadingSubstatus.value = msg;
      if (percent !== undefined) {
        progressValue.value = percent;
        progressIndeterminate.value = false;
      } else {
        progressIndeterminate.value = true;
      }
    });

    if (channels.length === 0) {
      throw new Error('Autenticado com sucesso, mas nenhum stream (canal, filme ou série) foi retornado.');
    }

    let baseUrl = xtreamHost.value.trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'http://' + baseUrl;
    }
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    const autoEpg = `${baseUrl}/xmltv.php?${new URLSearchParams({ username: xtreamUser.value.trim(), password: xtreamPass.value.trim() })}`;

    const plId = await savePlaylistToDb(
      playlistName.value, 
      'xtream', 
      channels, 
      xtreamHost.value, 
      xtreamUser.value, 
      xtreamPass.value,
      autoEpg
    );

    successMsg.value = `Servidor Xtream conectado! ${channels.length.toLocaleString()} itens importados com sucesso!`;

    // Reset fields
    xtreamHost.value = '';
    xtreamUser.value = '';
    xtreamPass.value = '';
    playlistName.value = '';

    await refreshPlaylists();
    emit('select-playlist', plId);
  } catch (err: any) {
    errorMsg.value = `Erro na API Xtream: ${err.message || err}`;
  } finally {
    loading.value = false;
  }
};

// 4. EPG File Import
const importEPGFile = async () => {
  if (!epgFile.value) return;

  loading.value = true;
  progressIndeterminate.value = true;
  progressValue.value = 0;
  errorMsg.value = '';
  successMsg.value = '';
  loadingStatus.value = 'Lendo arquivo XMLTV local...';
  loadingSubstatus.value = epgFile.value.name;

  try {
    const text = await epgFile.value.text();
    loadingStatus.value = 'Analisando programas do XML...';
    loadingSubstatus.value = 'Isso pode demorar um pouco para arquivos grandes...';

    const programs = parseEPG(text);

    if (programs.length === 0) {
      throw new Error('Nenhum programa de guia de TV foi encontrado no arquivo XML.');
    }

    loadingStatus.value = `Salvando ${programs.length.toLocaleString()} programas...`;
    progressIndeterminate.value = false;

    await db.addEpgBatch(programs, (percent) => {
      progressValue.value = percent;
      loadingSubstatus.value = `Gravando programas do guia: ${percent}%`;
    });

    successMsg.value = `Guia EPG importado com sucesso! ${programs.length.toLocaleString()} exibições registradas no guia.`;
    epgFile.value = null;

    await refreshEpgCount();
  } catch (err: any) {
    errorMsg.value = `Erro ao importar arquivo EPG: ${err.message || err}`;
  } finally {
    loading.value = false;
  }
};

// Reusable EPG downloader and saver
const downloadAndSaveEPG = async (urlToFetch: string, showUI: boolean = true) => {
  if (showUI) {
    loading.value = true;
    progressIndeterminate.value = true;
    progressValue.value = 0;
    errorMsg.value = '';
    successMsg.value = '';
    loadingStatus.value = 'Baixando guia EPG XMLTV da nuvem...';
    loadingSubstatus.value = urlToFetch;
  }
  
  try {
    const finalEpgUrl = urlToFetch.trim();
    const proxy = resolveProxy(useCorsProxy.value, currentProxyUrl.value);
    const fetchUrl = proxy ? `${proxy}${encodeURIComponent(finalEpgUrl)}` : finalEpgUrl;

    const res = await fetch(fetchUrl);
    if (!res.ok) {
      throw new Error(`Erro de rede HTTP ${res.status}. Verifique se a URL está correta.`);
    }

    const contentLength = res.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
    let loadedBytes = 0;
    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];

    if (!reader) {
      const text = await res.text();
      if (showUI) {
        loadingStatus.value = 'Analisando XML do EPG...';
        loadingSubstatus.value = 'Estruturando canais e programações...';
      }
      const programs = parseEPG(text);
      if (programs.length === 0) {
        throw new Error('Nenhum programa foi mapeado deste link EPG.');
      }
      if (showUI) {
        loadingStatus.value = `Armazenando ${programs.length.toLocaleString()} programações...`;
      }
      await db.addEpgBatch(programs);
      return programs.length;
    }

    if (showUI) {
      progressIndeterminate.value = totalBytes === 0;
      progressValue.value = 0;
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        loadedBytes += value.length;
        if (showUI) {
          if (totalBytes > 0) {
            progressValue.value = Math.round((loadedBytes / totalBytes) * 100);
            loadingStatus.value = `Baixando guia EPG... ${progressValue.value}%`;
            loadingSubstatus.value = `Baixado ${(loadedBytes / 1024 / 1024).toFixed(2)} MB de ${(totalBytes / 1024 / 1024).toFixed(2)} MB`;
          } else {
            loadingStatus.value = 'Baixando guia EPG...';
            loadingSubstatus.value = `Baixado ${(loadedBytes / 1024 / 1024).toFixed(2)} MB`;
          }
        }
      }
    }

    const combined = new Uint8Array(loadedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    const text = new TextDecoder('utf-8').decode(combined);

    if (showUI) {
      loadingStatus.value = 'Analisando XML do EPG...';
      progressIndeterminate.value = true;
    }
    const programs = parseEPG(text);
    if (programs.length === 0) {
      throw new Error('Nenhum programa foi mapeado deste link EPG.');
    }

    if (showUI) {
      progressIndeterminate.value = false;
      progressValue.value = 0;
      loadingStatus.value = `Salvando ${programs.length.toLocaleString()} programas...`;
    }

    await db.addEpgBatch(programs, (percent) => {
      if (showUI) {
        progressValue.value = percent;
        loadingSubstatus.value = `Gravando programas do guia: ${percent}%`;
      }
    });

    return programs.length;
  } catch (err: any) {
    console.error('Erro no download/processamento do EPG:', err);
    if (showUI) {
      errorMsg.value = `Erro no EPG: ${err.message || err}`;
    }
    throw err;
  } finally {
    if (showUI) {
      loading.value = false;
    }
  }
};

const syncPlaylist = async (pl: Playlist) => {
  if (!pl.id) return;
  loading.value = true;
  syncingPlaylistId.value = pl.id;
  progressIndeterminate.value = true;
  progressValue.value = 0;
  errorMsg.value = '';
  successMsg.value = '';
  loadingStatus.value = `Sincronizando lista "${pl.name}"...`;
  loadingSubstatus.value = 'Conectando ao servidor...';

  try {
    await PlaylistUpdater.updatePlaylist(pl, (msg, percent) => {
      loadingStatus.value = `Sincronizando "${pl.name}"...`;
      loadingSubstatus.value = msg;
      if (percent !== undefined) {
        progressValue.value = percent;
        progressIndeterminate.value = false;
      } else {
        progressIndeterminate.value = true;
      }
    });
    successMsg.value = `Lista "${pl.name}" sincronizada com sucesso!`;
    await refreshPlaylists();
    await refreshEpgCount();
  } catch (err: any) {
    errorMsg.value = `Erro ao sincronizar lista: ${err.message || err}`;
  } finally {
    loading.value = false;
    syncingPlaylistId.value = null;
  }
};

const syncEPG = async (pl: Playlist) => {
  if (!pl.epgUrl) {
    errorMsg.value = `Esta playlist não possui uma URL de EPG configurada.`;
    return;
  }
  
  loading.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    const count = await downloadAndSaveEPG(pl.epgUrl, true);
    successMsg.value = `Guia EPG sincronizado com sucesso para "${pl.name}"! ${count.toLocaleString()} programações atualizadas.`;
    await refreshEpgCount();
  } catch (err: any) {
    // Erro já tratado por downloadAndSaveEPG
  } finally {
    loading.value = false;
  }
};

// 5. EPG URL Import
const importEPGUrl = async () => {
  if (!epgUrl.value) return;

  try {
    const count = await downloadAndSaveEPG(epgUrl.value, true);
    successMsg.value = `Guia EPG baixado com sucesso! ${count.toLocaleString()} programações inseridas no guia.`;
    epgUrl.value = '';
    await refreshEpgCount();
  } catch (err: any) {
    // Erro já tratado por downloadAndSaveEPG
  }
};

// 6. EPG Clear Cache
const clearEPGCache = async () => {
  if (confirm('Deseja realmente limpar toda a programação do guia EPG salva? Os canais continuarão funcionando normalmente.')) {
    try {
      await db.clearEpg();
      successMsg.value = 'Cache do Guia EPG esvaziado com sucesso!';
      await refreshEpgCount();
    } catch (err: any) {
      errorMsg.value = `Erro ao limpar EPG: ${err.message}`;
    }
  }
};

// --- PLAYLIST ACTIONS ---

const activatePlaylist = async (playlistId: number) => {
  try {
    await db.setSetting('current_playlist_id', playlistId);
    currentPlaylistId.value = playlistId;
    successMsg.value = t('playlistManager.loading.importedSuccess');
    emit('select-playlist', playlistId);
  } catch (err: any) {
    errorMsg.value = `${t('common.error')}: ${err.message}`;
  }
};

const deletePlaylist = async (playlistId: number) => {
  const pl = playlists.value.find(p => p.id === playlistId);
  const plName = pl ? pl.name : '';
  if (confirm(t('playlistManager.myPlaylists.deleteConfirmDesc', { name: plName }))) {
    try {
      await db.deletePlaylist(playlistId);
      
      if (currentPlaylistId.value === playlistId) {
        await db.setSetting('current_playlist_id', null);
        currentPlaylistId.value = null;
      }
      
      successMsg.value = t('playlistManager.myPlaylists.updating');
      await refreshPlaylists();
    } catch (err: any) {
      errorMsg.value = `${t('common.error')}: ${err.message}`;
    }
  }
};
</script>

<style scoped>
.lists {
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
  padding: 8px 0 48px;
}

.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px 0 32px;
}

.welcome-title {
  margin-bottom: 4px;
}

.tab-desc {
  margin-bottom: 16px;
}

.brand-mark {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  margin-bottom: 16px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  display: flex;
  align-items: center;
  justify-content: center;
}

.pl-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
  padding: 16px 24px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.pl-text {
  flex: 1 1 240px;
  min-width: 0;
}

.pl-name {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-weight: 600;
}

.active-badge {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary-lighten-1));
}

.pl-meta {
  margin-top: 2px;
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.pl-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.delete-btn:hover {
  color: rgb(var(--v-theme-error));
}

.add-tabs {
  padding: 0 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.form-body {
  padding: 20px 24px 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.form-grid .span-2 {
  grid-column: span 2;
}

.field-label {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.dropzone {
  border: 1px dashed rgba(var(--v-border-color), 0.25);
  border-radius: 12px;
  padding: 32px 20px;
  text-align: center;
  cursor: pointer;
  background: rgb(var(--v-theme-surface-light));
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.dropzone:hover,
.dropzone:focus-visible,
.dropzone-active {
  outline: none;
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.06);
}

.epg-status,
.proxy-box {
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.epg-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

@media (max-width: 600px) {
  .form-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .form-grid .span-2 {
    grid-column: auto;
  }
}
</style>
