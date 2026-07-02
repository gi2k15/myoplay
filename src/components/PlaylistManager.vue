<!-- src/components/PlaylistManager.vue -->
<template>
  <v-container class="py-8 fill-height align-start">
    <v-row class="justify-center w-100">
      <v-col cols="12" md="10" lg="8">
        
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-h3 font-weight-bold mb-2 text-glow">MyoPlay</h1>
          <p class="text-subtitle-1 text-medium-emphasis">{{ $t('playlistManager.wizardSubtitle') }}</p>
        </div>

        <!-- Progress Overlay -->
        <v-card v-if="loading" class="pa-8 text-center glass-card border-primary mb-8" elevation="10">
          <v-progress-circular
            :size="80"
            :width="8"
            color="primary"
            :indeterminate="progressIndeterminate"
            :model-value="progressValue"
            class="mb-4"
          >
            <span v-if="!progressIndeterminate" class="text-caption font-weight-bold">
              {{ progressValue }}%
            </span>
          </v-progress-circular>
          <h3 class="text-h6 mb-2">{{ loadingStatus }}</h3>
          <p class="text-body-2 text-medium-emphasis mb-4 text-truncate w-100 px-4">{{ loadingSubstatus }}</p>
          <v-progress-linear
            color="secondary"
            :indeterminate="progressIndeterminate"
            :model-value="progressValue"
            rounded
            height="8"
          />
        </v-card>

        <!-- Main Configuration Panel -->
        <v-card v-else class="glass-card mb-8" elevation="4">
          <v-tabs v-model="tab" color="primary" align-tabs="center" class="border-bottom">
            <v-tab value="m3u-file">
              <v-icon start>mdi-file-code</v-icon> {{ $t('playlistManager.tabs.m3uFile') }}
            </v-tab>
            <v-tab value="m3u-url">
              <v-icon start>mdi-link</v-icon> {{ $t('playlistManager.tabs.m3uUrl') }}
            </v-tab>
            <v-tab value="xtream">
              <v-icon start>mdi-server</v-icon> {{ $t('playlistManager.tabs.xtream') }}
            </v-tab>
            <v-tab value="epg">
              <v-icon start>mdi-television-guide</v-icon> {{ $t('playlistManager.tabs.epg') }}
            </v-tab>
          </v-tabs>

          <v-card-text class="pa-6">
            <v-alert
              v-if="errorMsg"
              type="error"
              variant="tonal"
              closable
              class="mb-6"
              @click:close="errorMsg = ''"
            >
              {{ errorMsg }}
            </v-alert>

            <v-alert
              v-if="successMsg"
              type="success"
              variant="tonal"
              closable
              class="mb-6"
              @click:close="successMsg = ''"
            >
              {{ successMsg }}
            </v-alert>

            <v-window v-model="tab">
              <!-- M3U Local File Tab -->
              <v-window-item value="m3u-file">
                <p class="text-body-2 text-medium-emphasis mb-6">
                  {{ $t('playlistManager.fileTab.desc') }}
                </p>

                <div 
                  class="dropzone mb-6"
                  :class="{ 'dropzone-active': isDragging }"
                  @dragover.prevent="isDragging = true"
                  @dragleave.prevent="isDragging = false"
                  @drop.prevent="onFileDrop"
                  @click="triggerFileInput"
                >
                  <input 
                    type="file" 
                    ref="fileInput" 
                    class="d-none" 
                    accept=".m3u,.m3u8,.txt" 
                    @change="onFileSelected"
                  />
                  <v-icon size="48" color="primary" class="mb-2">mdi-cloud-upload</v-icon>
                  <div class="text-subtitle-1 font-weight-bold">
                    {{ selectedFile ? selectedFile.name : $t('playlistManager.fileTab.dragPlaceholder') }}
                  </div>
                  <div class="text-caption text-medium-emphasis mt-1">
                    {{ selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : $t('playlistManager.fileTab.clickPlaceholder') }}
                  </div>
                </div>

                <v-text-field
                  v-model="playlistName"
                  :label="$t('playlistManager.fileTab.playlistNameLabel')"
                  :placeholder="$t('playlistManager.fileTab.playlistNamePlaceholder')"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-format-title"
                  class="mb-6"
                />

                <v-btn
                  color="primary"
                  block
                  size="large"
                  :disabled="!selectedFile"
                  @click="importM3UFile"
                >
                  <v-icon start>mdi-import</v-icon> {{ $t('playlistManager.fileTab.importBtn') }}
                </v-btn>
              </v-window-item>

              <!-- M3U URL Tab -->
              <v-window-item value="m3u-url">
                <p class="text-body-2 text-medium-emphasis mb-6">
                  {{ $t('playlistManager.urlTab.desc') }}
                </p>

                <v-text-field
                  v-model="playlistName"
                  :label="$t('playlistManager.urlTab.playlistNameLabel')"
                  :placeholder="$t('playlistManager.urlTab.playlistNamePlaceholder')"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-format-title"
                  class="mb-4"
                  :rules="[v => !!v || $t('playlistManager.urlTab.validationName')]"
                />

                <v-text-field
                  v-model="playlistUrl"
                  :label="$t('playlistManager.urlTab.playlistUrlLabel')"
                  :placeholder="$t('playlistManager.urlTab.playlistUrlPlaceholder')"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-link-variant"
                  class="mb-4"
                  :rules="[v => !!v || $t('playlistManager.urlTab.validationUrl')]"
                />

                <v-checkbox
                  v-if="!isElectron"
                  v-model="useCorsProxy"
                  :label="$t('playlistManager.urlTab.useProxy')"
                  color="secondary"
                  hide-details
                  class="mb-6"
                />

                <v-btn
                  color="primary"
                  block
                  size="large"
                  :disabled="!playlistUrl || !playlistName"
                  @click="importM3UUrl"
                >
                  <v-icon start>mdi-cloud-download</v-icon> {{ $t('playlistManager.urlTab.loadBtn') }}
                </v-btn>
              </v-window-item>

              <!-- Xtream Codes API Tab -->
              <v-window-item value="xtream">
                <p class="text-body-2 text-medium-emphasis mb-6">
                  {{ $t('playlistManager.xtreamTab.desc') }}
                </p>

                <v-row>
                  <v-col cols="12">
                    <v-text-field
                      v-model="playlistName"
                      :label="$t('playlistManager.xtreamTab.nameLabel')"
                      :placeholder="$t('playlistManager.xtreamTab.namePlaceholder')"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-format-title"
                      :rules="[v => !!v || $t('playlistManager.urlTab.validationName')]"
                    />
                  </v-col>

                  <v-col cols="12">
                    <v-text-field
                      v-model="xtreamHost"
                      :label="$t('playlistManager.xtreamTab.hostLabel')"
                      :placeholder="$t('playlistManager.xtreamTab.hostPlaceholder')"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-server"
                      :rules="[v => !!v || $t('playlistManager.xtreamTab.validationHost')]"
                    />
                  </v-col>

                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="xtreamUser"
                      :label="$t('playlistManager.xtreamTab.usernameLabel')"
                      :placeholder="$t('playlistManager.xtreamTab.usernamePlaceholder')"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-account"
                      :rules="[v => !!v || $t('playlistManager.xtreamTab.validationUser')]"
                    />
                  </v-col>

                  <v-col cols="12" sm="6">
                    <v-text-field
                      v-model="xtreamPass"
                      :label="$t('playlistManager.xtreamTab.passwordLabel')"
                      type="password"
                      :placeholder="$t('playlistManager.xtreamTab.passwordPlaceholder')"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-lock"
                      :rules="[v => !!v || $t('playlistManager.xtreamTab.validationPass')]"
                    />
                  </v-col>
                </v-row>

                <v-checkbox
                  v-if="!isElectron"
                  v-model="useCorsProxy"
                  :label="$t('playlistManager.xtreamTab.useProxy')"
                  color="secondary"
                  hide-details
                  class="mb-6"
                />

                <v-btn
                  color="primary"
                  block
                  size="large"
                  :disabled="!playlistName || !xtreamHost || !xtreamUser || !xtreamPass"
                  @click="importXtream"
                >
                  <v-icon start>mdi-server-plus</v-icon> {{ $t('playlistManager.xtreamTab.connectBtn') }}
                </v-btn>
              </v-window-item>

              <!-- EPG Tab -->
              <v-window-item value="epg">
                <p class="text-body-2 text-medium-emphasis mb-6">
                  {{ $t('playlistManager.epgTab.desc') }}
                </p>

                <!-- EPG Status -->
                <v-card class="pa-4 mb-6 bg-surface-variant rounded-lg" variant="flat">
                  <div class="d-flex align-center justify-between mb-2">
                    <span class="text-subtitle-2 font-weight-bold">{{ $t('playlistManager.epgTab.statusLabel') }}</span>
                    <v-chip size="small" :color="epgCount > 0 ? 'success' : 'warning'">
                      {{ epgCount > 0 ? $t('playlistManager.epgTab.statusActive') : $t('playlistManager.epgTab.statusNone') }}
                    </v-chip>
                  </div>
                  <div class="text-body-2 mb-3">
                    {{ $t('playlistManager.epgTab.cacheLabel') }} <strong>{{ epgCount.toLocaleString() }}</strong>
                  </div>
                  <v-btn
                    v-if="epgCount > 0"
                    color="error"
                    size="small"
                    variant="tonal"
                    prepend-icon="mdi-trash-can"
                    @click="clearEPGCache"
                  >
                    {{ $t('playlistManager.epgTab.clearCacheBtn') }}
                  </v-btn>
                </v-card>

                <v-divider class="mb-6" />

                <div class="text-subtitle-2 font-weight-bold mb-3">{{ $t('playlistManager.epgTab.method1') }}</div>
                <v-file-input
                  v-model="epgFile"
                  :label="$t('playlistManager.epgTab.selectEpgFile')"
                  variant="outlined"
                  density="comfortable"
                  accept=".xml,.xmltv"
                  prepend-icon="mdi-file-xml"
                  class="mb-6"
                />

                <v-btn
                  color="primary"
                  block
                  size="large"
                  :disabled="!epgFile"
                  @click="importEPGFile"
                >
                  <v-icon start>mdi-import</v-icon> {{ $t('playlistManager.epgTab.importLocalBtn') }}
                </v-btn>

                <div class="text-subtitle-2 font-weight-bold mb-3 mt-6">{{ $t('playlistManager.epgTab.method2') }}</div>
                <v-text-field
                  v-model="epgUrl"
                  :label="$t('playlistManager.epgTab.epgUrlLabel')"
                  :placeholder="$t('playlistManager.epgTab.epgUrlPlaceholder')"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-link-variant"
                  class="mb-4"
                />

                <v-btn
                  color="primary"
                  block
                  size="large"
                  :disabled="!epgUrl"
                  @click="importEPGUrl"
                >
                  <v-icon start>mdi-cloud-download</v-icon> {{ $t('playlistManager.epgTab.downloadBtn') }}
                </v-btn>
              </v-window-item>
            </v-window>
          </v-card-text>
        </v-card>

        <!-- Existing Playlists Panel -->
        <h2 class="text-h5 font-weight-bold mb-4 d-flex align-center">
          <v-icon start color="primary">mdi-playlist-play</v-icon> {{ $t('playlistManager.myPlaylists.title') }}
        </h2>

        <v-card v-if="playlists.length === 0" class="glass-card pa-6 text-center" variant="flat">
          <v-icon size="40" class="text-medium-emphasis mb-2">mdi-playlist-remove</v-icon>
          <div class="text-subtitle-1 text-medium-emphasis">{{ $t('playlistManager.myPlaylists.noPlaylistsTitle') }}</div>
          <div class="text-caption text-medium-emphasis">{{ $t('playlistManager.myPlaylists.noPlaylistsDesc') }}</div>
        </v-card>

        <v-row v-else>
          <v-col cols="12" sm="6" v-for="pl in playlists" :key="pl.id">
            <v-card 
              class="glass-card playlist-card fill-height d-flex flex-column"
              :class="{ 'playlist-card-active border-primary': pl.id === currentPlaylistId }"
              elevation="2"
            >
              <v-card-item class="pb-2">
                <div class="d-flex align-start justify-space-between">
                  <div>
                    <div class="text-h6 font-weight-bold text-truncate" style="max-width: 220px;">
                      {{ pl.name }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ $t('common.type') }}: 
                      <v-chip size="x-small" :color="getPlaylistTypeColor(pl.type)" class="ml-1 font-weight-bold">
                        {{ pl.type.toUpperCase() }}
                      </v-chip>
                    </div>
                  </div>
                  
                  <v-btn
                    icon="mdi-delete"
                    color="error"
                    size="small"
                    variant="text"
                    :title="$t('common.delete')"
                    @click="deletePlaylist(pl.id!)"
                  />
                </div>
              </v-card-item>

              <v-card-text class="pt-0 flex-grow-1">
                <div class="text-caption text-medium-emphasis mt-2">
                  <div class="d-flex justify-space-between mb-1">
                    <span>{{ $t('playlistManager.myPlaylists.channelsCountLabel') }}</span>
                    <strong class="text-primary">{{ pl.channelCount || 0 }}</strong>
                  </div>
                  <div class="d-flex justify-space-between mb-1" v-if="pl.epgUrl">
                    <span class="text-truncate mr-2" style="max-width: 140px;">URL EPG:</span>
                    <span class="text-truncate text-secondary text-right" style="max-width: 160px;" :title="pl.epgUrl">{{ pl.epgUrl }}</span>
                  </div>
                  <div class="d-flex justify-space-between mb-1">
                    <span>{{ $t('playlistManager.myPlaylists.createdAtPrefix') }}</span>
                    <span>{{ new Date(pl.createdAt).toLocaleDateString() }}</span>
                  </div>
                  <div class="d-flex justify-space-between" v-if="pl.type !== 'file'">
                    <span>{{ $t('playlistManager.myPlaylists.updatedAtPrefix') }}</span>
                    <span>{{ pl.lastUpdatedAt ? new Date(pl.lastUpdatedAt).toLocaleString() : $t('playlistManager.myPlaylists.never') }}</span>
                  </div>
                </div>
              </v-card-text>

              <v-divider />

              <v-card-actions class="pa-3 d-flex gap-2">
                <v-btn
                  v-if="pl.id === currentPlaylistId"
                  color="success"
                  variant="flat"
                  class="flex-grow-1"
                  prepend-icon="mdi-check-circle"
                  @click="$emit('select-playlist', pl.id)"
                >
                  {{ $t('playlistManager.myPlaylists.active') }}
                </v-btn>
                <v-btn
                  v-else
                  color="primary"
                  variant="outlined"
                  class="flex-grow-1"
                  prepend-icon="mdi-play-network"
                  @click="activatePlaylist(pl.id!)"
                >
                  {{ $t('playlistManager.myPlaylists.activate') }}
                </v-btn>
                
                <v-btn
                  v-if="pl.type !== 'file'"
                  icon="mdi-refresh"
                  color="primary"
                  variant="tonal"
                  :title="$t('playlistManager.myPlaylists.syncPlaylist')"
                  :loading="loading && syncingPlaylistId === pl.id"
                  :disabled="loading"
                  @click="syncPlaylist(pl)"
                />

                <v-btn
                  v-if="pl.epgUrl"
                  icon="mdi-television-guide"
                  color="secondary"
                  variant="tonal"
                  :title="$t('playlistManager.myPlaylists.syncEpg')"
                  :disabled="loading"
                  @click="syncEPG(pl)"
                />
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue';
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

const getPlaylistTypeColor = (type: string) => {
  if (type === 'file') return 'info';
  if (type === 'url') return 'secondary';
  return 'primary';
};

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
    const proxy = useCorsProxy.value ? await db.getSetting('cors_proxy_url', 'http://localhost:8088/?url=') : '';
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
    const proxy = useCorsProxy.value ? await db.getSetting('cors_proxy_url', 'http://localhost:8088/?url=') : '';
    
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
    const autoEpg = `${baseUrl}/xmltv.php?username=${xtreamUser.value.trim()}&password=${xtreamPass.value.trim()}`;

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
    const proxy = useCorsProxy.value ? await db.getSetting('cors_proxy_url', 'http://localhost:8088/?url=') : '';
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
.text-glow {
  background: linear-gradient(135deg, #FFB300 0%, #FFE082 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 30px rgba(255, 193, 7, 0.2);
}

.glass-card {
  background: rgba(18, 18, 18, 0.7) !important;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
}

.border-primary {
  border-color: rgba(255, 193, 7, 0.5) !important;
}

.border-bottom {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
}

.dropzone {
  border: 2px dashed rgba(255, 193, 7, 0.3);
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  background: rgba(255, 193, 7, 0.02);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.dropzone:hover, .dropzone-active {
  border-color: #FFD54F;
  background: rgba(255, 213, 79, 0.04);
}

.playlist-card {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.playlist-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 213, 79, 0.3) !important;
}

.playlist-card-active {
  background: rgba(255, 193, 7, 0.15) !important;
  border-color: rgba(255, 193, 7, 0.6) !important;
  box-shadow: 0 0 20px rgba(255, 193, 7, 0.15);
}
</style>
