<!-- src/components/Settings.vue -->
<template>
  <v-container class="py-8 fill-height align-start">
    <v-row class="justify-center w-100">
      <v-col cols="12" md="10" lg="8">
        
        <!-- Header -->
        <h2 class="text-h4 font-weight-bold mb-6 text-glow-small d-flex align-center">
          <v-icon start color="secondary" class="mr-2">mdi-cog</v-icon> Configurações Gerais
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
          <v-col cols="12">
            <v-card class="glass-card pa-6 mb-6" elevation="2" variant="flat">
              <h3 class="text-subtitle-1 font-weight-bold mb-3 d-flex align-center">
                <v-icon start color="primary" class="mr-2">mdi-network-outline</v-icon> 
                Proxy CORS (Cross-Origin Resource Sharing)
              </h3>
              
              <p class="text-body-2 text-medium-emphasis mb-4 leading-relaxed">
                Navegadores bloqueiam requisições a servidores externos que não permitam compartilhamento CORS (muito comum em links de IPTV M3U e EPG remotos). Usar um Proxy CORS ajuda a contornar essa restrição.
              </p>

              <div class="text-subtitle-2 font-weight-bold mb-2">1. Proxy para M3U e APIs (EPG, Categorias, VOD e Séries)</div>
              <v-select
                v-model="selectedProxyPreset"
                :items="proxyPresets"
                label="Selecione o Servidor de Proxy de Dados"
                variant="outlined"
                density="comfortable"
                class="mb-4"
                @update:model-value="onProxyPresetChange"
              />

              <v-text-field
                v-model="customProxyUrl"
                label="URL do Proxy CORS de Dados Personalizado"
                placeholder="https://sua-url-de-proxy.com/?url="
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-link"
                class="mb-6"
                :disabled="selectedProxyPreset !== 'custom'"
              />

              <v-divider class="mb-6 opacity-10" />

              <div class="text-subtitle-2 font-weight-bold mb-2">2. Proxy para Canais e Streams (Vídeo HLS/TS)</div>
              <v-select
                v-model="selectedPlayerProxyPreset"
                :items="playerProxyPresets"
                label="Selecione o Servidor de Proxy de Vídeo"
                variant="outlined"
                density="comfortable"
                class="mb-4"
                @update:model-value="onPlayerProxyPresetChange"
              />

              <v-text-field
                v-model="customPlayerProxyUrl"
                label="URL do Proxy CORS de Vídeo Personalizado"
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
                label="Política de Uso do Proxy para Transmissões"
                variant="outlined"
                density="comfortable"
                class="mb-6"
              />

              <v-btn
                color="primary"
                prepend-icon="mdi-content-save"
                @click="saveCorsProxy"
              >
                Salvar Configurações de Proxy
              </v-btn>
            </v-card>
          </v-col>

          <!-- Playback Preferences -->
          <v-col cols="12">
            <v-card class="glass-card pa-6 mb-6" elevation="2" variant="flat">
              <h3 class="text-subtitle-1 font-weight-bold mb-4 d-flex align-center">
                <v-icon start color="primary" class="mr-2">mdi-play-circle-outline</v-icon> 
                Preferências de Reprodução
              </h3>

              <v-switch
                v-model="autoPlay"
                label="Reprodução Automática (Iniciar canais imediatamente ao clicar)"
                color="secondary"
                hide-details
                class="mb-2"
                @update:model-value="savePlaybackSettings"
              />

              <v-switch
                v-model="defaultFloatMode"
                label="Minimizar player para modo flutuante por padrão ao navegar"
                color="secondary"
                hide-details
                class="mb-4"
                @update:model-value="savePlaybackSettings"
              />

              <v-select
                v-model="defaultAspectRatio"
                :items="aspectRatios"
                label="Proporção de Tela Padrão do Player"
                variant="outlined"
                density="comfortable"
                @update:model-value="savePlaybackSettings"
              />
            </v-card>
          </v-col>

          <!-- Local Database & Maintenance -->
          <v-col cols="12">
            <v-card class="glass-card pa-6 mb-6" elevation="2" variant="flat">
              <h3 class="text-subtitle-1 font-weight-bold mb-4 d-flex align-center">
                <v-icon start color="primary" class="mr-2">mdi-database-cog-outline</v-icon> 
                Armazenamento & Manutenção
              </h3>

              <p class="text-body-2 text-medium-emphasis mb-6">
                Todas as suas listas, canais e grades de guia de programação (EPG) são salvos de forma <strong>100% local e privada</strong> no banco de dados IndexedDB do seu próprio navegador.
              </p>

              <v-row class="mb-4 text-center">
                <v-col cols="6" sm="3" class="pa-2">
                  <div class="stat-box rounded-xl pa-3 bg-surface-variant">
                    <div class="text-h6 font-weight-bold text-glow-small">{{ stats.playlists }}</div>
                    <div class="text-caption text-medium-emphasis">Listas</div>
                  </div>
                </v-col>
                <v-col cols="6" sm="3" class="pa-2">
                  <div class="stat-box rounded-xl pa-3 bg-surface-variant">
                    <div class="text-h6 font-weight-bold text-glow-small">{{ stats.channels.toLocaleString() }}</div>
                    <div class="text-caption text-medium-emphasis">Canais</div>
                  </div>
                </v-col>
                <v-col cols="6" sm="3" class="pa-2">
                  <div class="stat-box rounded-xl pa-3 bg-surface-variant">
                    <div class="text-h6 font-weight-bold text-glow-small">{{ stats.epg.toLocaleString() }}</div>
                    <div class="text-caption text-medium-emphasis">Guia EPG</div>
                  </div>
                </v-col>
                <v-col cols="6" sm="3" class="pa-2">
                  <div class="stat-box rounded-xl pa-3 bg-surface-variant">
                    <div class="text-h6 font-weight-bold text-glow-small">{{ stats.favorites }}</div>
                    <div class="text-caption text-medium-emphasis">Favoritos</div>
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
                  Otimizar Guia EPG (Excluir programação antiga)
                </v-btn>

                <v-btn
                  color="error"
                  variant="flat"
                  prepend-icon="mdi-database-remove"
                  @click="wipeDatabase"
                >
                  Limpar Todo o Banco de Dados
                </v-btn>
              </div>
            </v-card>
          </v-col>

          <!-- About Project -->
          <v-col cols="12">
            <v-card class="glass-card pa-6 text-center" variant="flat">
              <v-icon size="48" color="secondary" class="mb-2">mdi-shield-check-outline</v-icon>
              <h3 class="text-subtitle-1 font-weight-bold mb-1">Privacidade Garantida</h3>
              <p class="text-caption text-medium-emphasis max-width-480 mx-auto">
                Este aplicativo não envia suas listas de IPTV, credenciais de Xtream Codes ou buscas para nenhum servidor externo. Todos os parsers, conexões de API e reprodutores rodam localmente na sua máquina!
              </p>
              <div class="text-caption text-medium-emphasis mt-6 font-weight-bold">
                Antigravity IPTV Player v1.0.0
              </div>
            </v-card>
          </v-col>

        </v-row>

      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { db } from '@/services/db';

// Alert States
const alertMsg = ref('');
const alertType = ref<'success' | 'error' | 'warning' | 'info'>('success');

// Proxy Fields
const customProxyUrl = ref('');
const selectedProxyPreset = ref('allorigins');

const customPlayerProxyUrl = ref('');
const selectedPlayerProxyPreset = ref('corsproxy');

const playerProxyStreams = ref('auto');
const streamProxyOptions = [
  { title: 'Apenas se falhar (Automático - Recomendado)', value: 'auto' },
  { title: 'Sempre usar proxy para reprodução', value: 'always' },
  { title: 'Nunca usar proxy para reprodução', value: 'never' },
];

const proxyPresets = [
  { title: 'Sem Proxy (Conexão Direta)', value: 'none' },
  { title: 'Proxy Local (Recomendado - Super Rápido e Sem Limites)', value: 'local' },
  { title: 'AllOrigins (Alternativa - Sem Limites)', value: 'allorigins' },
  { title: 'Cors-Anywhere (Exige Ativação de Demo)', value: 'cors-anywhere' },
  { title: 'ThingProxy (Leve)', value: 'thingproxy' },
  { title: 'CORS Proxy Personalizado', value: 'custom' },
];

const playerProxyPresets = [
  { title: 'Sem Proxy (Conexão Direta)', value: 'none' },
  { title: 'CorsProxy.io (Recomendado - Excelente para Vídeos)', value: 'corsproxy' },
  { title: 'Proxy Local (Super Rápido e Sem Limites)', value: 'local' },
  { title: 'AllOrigins (Sem Limites de Texto/APIs)', value: 'allorigins' },
  { title: 'Cors-Anywhere (Exige Ativação de Demo)', value: 'cors-anywhere' },
  { title: 'ThingProxy (Leve)', value: 'thingproxy' },
  { title: 'CORS Proxy Personalizado', value: 'custom' },
];

// Playback Fields
const autoPlay = ref(true);
const defaultFloatMode = ref(false);
const defaultAspectRatio = ref('fit');
const aspectRatios = [
  { title: 'Ajustar Tela (Padrão)', value: 'fit' },
  { title: 'Esticar (Stretch)', value: 'fill' },
  { title: '16:9 widescreen', value: '16-9' },
  { title: '4:3 clássico', value: '4-3' },
];

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
  await calculateStats();
});

// --- LOAD PREFERENCES ---
// --- LOAD PREFERENCES ---
const loadProxySettings = async () => {
  try {
    // 1. Data Proxy
    const proxy = await db.getSetting('cors_proxy_url', 'http://localhost:8088/?url=');
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
    const playerProxy = await db.getSetting('player_proxy_url', 'https://corsproxy.io/?');
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

    playerProxyStreams.value = await db.getSetting('player_proxy_streams', 'auto');
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
    alertMsg.value = 'Configurações de Proxy CORS salvas com sucesso!';
  } catch (err: any) {
    alertType.value = 'error';
    alertMsg.value = `Erro ao salvar configurações de proxy: ${err.message}`;
  }
};

const loadPlaybackSettings = async () => {
  try {
    autoPlay.value = await db.getSetting('player_autoplay', true);
    defaultFloatMode.value = await db.getSetting('player_default_float', false);
    defaultAspectRatio.value = await db.getSetting('player_default_aspect', 'fit');
  } catch (err) {
    console.error(err);
  }
};

const savePlaybackSettings = async () => {
  try {
    await db.setSetting('player_autoplay', autoPlay.value);
    await db.setSetting('player_default_float', defaultFloatMode.value);
    await db.setSetting('player_default_aspect', defaultAspectRatio.value);
  } catch (err) {
    console.error(err);
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
    alertMsg.value = `Otimização concluída! Foram removidos ${deleted.toLocaleString()} registros antigos do guia de EPG.`;
    await calculateStats();
  } catch (err: any) {
    alertType.value = 'error';
    alertMsg.value = `Erro ao limpar EPG: ${err.message}`;
  }
};

const wipeDatabase = async () => {
  if (confirm('ATENÇÃO: Isso excluirá PERMANENTEMENTE todas as playlists, canais, históricos, favoritos e guias XMLTV salvos neste navegador. Deseja prosseguir?')) {
    try {
      const database = await db.init();
      const stores = Array.from(database.objectStoreNames);
      
      const tx = database.transaction(stores, 'readwrite');
      for (const store of stores) {
        tx.objectStore(store).clear();
      }

      tx.oncomplete = async () => {
        // Restore default setting
        await db.setSetting('cors_proxy_url', 'http://localhost:8088/?url=');
        await db.setSetting('player_proxy_url', 'https://corsproxy.io/?');
        alertType.value = 'success';
        alertMsg.value = 'Todo o banco de dados local foi esvaziado com sucesso! Recarregue a página.';
        await calculateStats();
      };
    } catch (err: any) {
      alertType.value = 'error';
      alertMsg.value = `Erro ao limpar banco: ${err.message}`;
    }
  }
};
</script>

<style scoped>
.glass-card {
  background: rgba(22, 20, 36, 0.7) !important;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
}

.text-glow-small {
  background: linear-gradient(135deg, #a044ff 0%, #00f5d4 100%);
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
