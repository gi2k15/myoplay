<!-- src/components/VideoPlayer.vue -->
<template>
  <div 
    class="video-player-container rounded-xl overflow-hidden" 
    :class="{ 'player-floating elevation-10 border-primary': floating }"
    @mousemove="onMouseMove"
    @mouseleave="hideControls"
  >
    <!-- HTML5 Video element -->
    <video
      ref="videoRef"
      class="video-element"
      :class="aspectRatioClass"
      @play="isPaused = false"
      @pause="isPaused = true"
      @timeupdate="onTimeUpdate"
      @volumechange="onVolumeChange"
      @waiting="isBuffering = true"
      @playing="isBuffering = false"
      @click="togglePlay"
    />

    <!-- Poster Logo Overlay (When loading or buffering) -->
    <div v-if="showPoster && channel.logo" class="video-poster-overlay d-flex align-center justify-center">
      <v-img :src="channel.logo" width="120" max-height="120" contain class="poster-logo animate-pulse" />
    </div>

    <!-- Buffering/Loading Spinner -->
    <div v-if="isBuffering || isConnecting" class="video-loading-overlay d-flex flex-column align-center justify-center">
      <v-progress-circular :size="50" color="secondary" indeterminate class="mb-2" />
      <span class="text-caption font-weight-bold text-glow-small">
        {{ isConnecting ? `Conectando (Tentativa ${retryCount}/5)...` : 'Carregando stream...' }}
      </span>
    </div>

    <!-- Error Overlay -->
    <div v-if="errorState" class="video-error-overlay d-flex flex-column align-center justify-center pa-4 text-center">
      <v-icon size="48" color="error" class="mb-2">mdi-alert-circle</v-icon>
      <div class="text-subtitle-2 font-weight-bold mb-1">Erro de Reprodução</div>
      <p class="text-caption text-medium-emphasis mb-3 max-width-280">
        {{ errorState }}
      </p>
      <div class="d-flex gap-2">
        <v-btn size="x-small" color="primary" @click="initializePlayer">Tentar Novamente</v-btn>
        <v-btn size="x-small" color="secondary" variant="outlined" @click="showStats = !showStats">Diagnóstico</v-btn>
      </div>
    </div>

    <!-- Stats Panel overlay -->
    <v-card v-if="showStats" class="stats-panel pa-3 text-caption glass-card" variant="flat">
      <div class="d-flex align-center justify-space-between mb-2">
        <strong>Estatísticas do Stream</strong>
        <v-btn icon="mdi-close" size="x-small" variant="text" @click="showStats = false" />
      </div>
      <div>Nome: <span class="text-secondary">{{ channel.name }}</span></div>
      <div>Tipo: <span class="text-secondary">{{ channel.type.toUpperCase() }}</span></div>
      <div>Resolução: <span class="text-secondary">{{ videoWidth }}x{{ videoHeight }}</span></div>
      <div>Motor: <span class="text-secondary">{{ hlsInstance ? 'Hls.js (MSE)' : 'Nativo' }}</span></div>
      <div class="text-truncate" :title="channel.streamUrl">
        Link original: <span class="text-secondary text-caption">{{ channel.streamUrl }}</span>
      </div>
      <div v-if="isActiveProxied" class="text-truncate text-warning font-weight-bold" :title="activePlayUrl">
        CORS Proxy: <span class="text-warning text-caption">Ativo</span>
      </div>
      <v-alert
        v-if="channel.streamUrl.includes('.ts')"
        type="warning"
        variant="tonal"
        density="compact"
        class="mt-2 text-caption py-1 px-2"
        hide-details
      >
        Streams .ts podem requerer CORS Proxy ou suporte nativo no navegador.
      </v-alert>
    </v-card>

    <!-- Custom Controls HUD -->
    <Transition name="fade">
      <div v-if="showControls || isPaused || floating" class="controls-overlay d-flex flex-column justify-space-between">
        
        <!-- Top Toolbar -->
        <div class="d-flex align-center justify-space-between pa-3 top-gradient">
          <div class="d-flex align-center gap-2 min-width-0">
            <v-avatar size="32" class="bg-surface-variant flex-shrink-0" v-if="channel.logo">
              <v-img :src="channel.logo" />
            </v-avatar>
            <div class="text-subtitle-2 font-weight-bold text-truncate text-glow-small" style="max-width: 250px;">
              {{ channel.name }}
            </div>
          </div>
          
          <div class="d-flex align-center">
            <!-- Diagnostics -->
            <v-btn
              icon="mdi-television-guide"
              variant="text"
              color="white"
              size="small"
              title="Diagnóstico"
              @click="showStats = !showStats"
            />
            <!-- Float Mode Toggle -->
            <v-btn
              :icon="floating ? 'mdi-open-in-new' : 'mdi-dock-window'"
              variant="text"
              color="white"
              size="small"
              :title="floating ? 'Maximizar Player' : 'Modo Flutuante'"
              @click="$emit('toggle-float')"
            />
            <!-- Close / Stop Button -->
            <v-btn
              icon="mdi-close"
              variant="text"
              color="error"
              size="small"
              title="Fechar Player"
              @click="$emit('close-player')"
            />
          </div>
        </div>

        <!-- Center Play Overlay Indicator (Only for normal view) -->
        <div v-if="!floating" class="d-flex align-center justify-center flex-grow-1" @click="togglePlay">
          <v-btn
            v-if="isPaused"
            icon="mdi-play"
            color="primary"
            size="x-large"
            class="play-center-btn play-btn-glow"
          />
        </div>

        <!-- Bottom Controls Bar -->
        <div class="pa-3 bottom-gradient">
          <!-- Timeline progress bar (For VOD movies or series) -->
          <div v-if="!isLive" class="px-2 mb-2 d-flex align-center gap-2">
            <span class="text-caption text-white">{{ formatTimelineTime(currentTime) }}</span>
            <v-slider
              v-model="currentTime"
              :max="duration || 100"
              color="secondary"
              track-color="rgba(255, 255, 255, 0.2)"
              hide-details
              density="compact"
              @update:model-value="onTimelineSeek"
            />
            <span class="text-caption text-white">{{ formatTimelineTime(duration) }}</span>
          </div>

          <div class="d-flex align-center justify-space-between">
            <!-- Left Controls -->
            <div class="d-flex align-center gap-1">
              <!-- Play / Pause -->
              <v-btn
                :icon="isPaused ? 'mdi-play' : 'mdi-pause'"
                variant="text"
                color="white"
                size="small"
                @click="togglePlay"
              />

              <!-- Volume Control -->
              <div class="d-flex align-center volume-slider-container">
                <v-btn
                  :icon="isMuted ? 'mdi-volume-off' : volume > 0.5 ? 'mdi-volume-high' : 'mdi-volume-medium'"
                  variant="text"
                  color="white"
                  size="small"
                  @click="toggleMute"
                />
                <v-slider
                  v-model="volume"
                  min="0"
                  max="1"
                  step="0.05"
                  color="secondary"
                  track-color="rgba(255, 255, 255, 0.2)"
                  class="volume-slider ml-1"
                  hide-details
                  density="compact"
                />
              </div>

              <!-- Live Indicator -->
              <v-chip v-if="isLive" size="x-small" color="error" class="ml-2 px-2 font-weight-bold uppercase-tag animate-pulse">
                🔴 AO VIVO
              </v-chip>
            </div>

            <!-- Right Controls -->
            <div class="d-flex align-center gap-1">
              <!-- Aspect Ratio Selector -->
              <v-menu location="top end" transition="slide-y-transition">
                <template v-slot:activator="{ props }">
                  <v-btn
                    icon="mdi-aspect-ratio"
                    variant="text"
                    color="white"
                    size="small"
                    title="Proporção da Tela"
                    v-bind="props"
                  />
                </template>
                <v-list bg-color="surface" density="compact">
                  <v-list-item 
                    v-for="opt in aspectRatios" 
                    :key="opt.value" 
                    :active="aspectRatio === opt.value"
                    color="secondary"
                    @click="aspectRatio = opt.value"
                  >
                    <v-list-item-title class="text-caption">{{ opt.label }}</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>

              <!-- Fullscreen -->
              <v-btn
                v-if="!floating"
                :icon="isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'"
                variant="text"
                color="white"
                size="small"
                title="Tela Cheia"
                @click="toggleFullscreen"
              />
            </div>
          </div>
        </div>

      </div>
    </Transition>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import Hls from 'hls.js';
import mpegts from 'mpegts.js';
import { db, type IPTVChannel } from '@/services/db';

const props = defineProps<{
  channel: IPTVChannel;
  floating?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close-player'): void;
  (e: 'toggle-float'): void;
}>();

// Video Element Refs
const videoRef = ref<HTMLVideoElement | null>(null);
let hlsInstance: Hls | null = null;
let mpegtsInstance: mpegts.Player | null = null;

// Media States
const isPaused = ref(true);
const isBuffering = ref(true);
const isConnecting = ref(true);
const showPoster = ref(true);
const errorState = ref<string | null>(null);

// Proxy configuration and active playback state
const proxyUrlSetting = ref('');
const playerProxyStreams = ref('auto');
const activePlayUrl = ref('');
const isActiveProxied = ref(false);

const loadSettings = async () => {
  try {
    proxyUrlSetting.value = await db.getSetting('player_proxy_url', 'https://corsproxy.io/?');
    playerProxyStreams.value = await db.getSetting('player_proxy_streams', 'auto');
  } catch (e) {
    console.error('Error loading stream proxy settings:', e);
  }
};

const currentTime = ref(0);
const duration = ref(0);
const volume = ref(0.8);
const isMuted = ref(false);

const videoWidth = ref(0);
const videoHeight = ref(0);

// Playback Options
const aspectRatio = ref('fit'); // fit, fill, 16-9, 4-3
const aspectRatios = [
  { label: 'Ajustar Tela (Padrão)', value: 'fit' },
  { label: 'Esticar (Stretch)', value: 'fill' },
  { label: '16:9 widescreen', value: '16-9' },
  { label: '4:3 clássico', value: '4-3' },
];

const isLive = computed(() => {
  return props.channel.type === 'live';
});

const showControls = ref(true);
let controlsTimeout: number | null = null;
const isFullscreen = ref(false);
const showStats = ref(false);

// Reconnection Engine
const retryCount = ref(0);
let retryTimeout: number | null = null;
const isHealing = ref(false);

onMounted(async () => {
  await loadSettings();
  initializePlayer();
  setupHotkeys();
  
  // Listen for Fullscreen changes
  document.addEventListener('fullscreenchange', onFullscreenChange);
});

onBeforeUnmount(() => {
  destroyPlayer();
  removeHotkeys();
  document.removeEventListener('fullscreenchange', onFullscreenChange);
  if (retryTimeout) clearTimeout(retryTimeout);
  if (controlsTimeout) clearTimeout(controlsTimeout);
});

// Watch for stream URL change
watch(() => props.channel.streamUrl, async () => {
  if (isHealing.value) {
    isHealing.value = false;
    // Clear any scheduled retry timeout to avoid double loading
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      retryTimeout = null;
    }
    await loadSettings();
    initializePlayer();
    return;
  }

  // Normal channel change (user selected a new channel)
  retryCount.value = 0;
  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }
  await loadSettings();
  initializePlayer();
});

// Watch volume slider
watch(volume, (newVol) => {
  if (videoRef.value) {
    videoRef.value.volume = newVol;
    isMuted.value = newVol === 0;
  }
});

// --- ASPECT RATIO CALCULATOR ---
const aspectRatioClass = computed(() => {
  if (aspectRatio.value === 'fill') return 'aspect-fill';
  if (aspectRatio.value === '16-9') return 'aspect-16-9';
  if (aspectRatio.value === '4-3') return 'aspect-4-3';
  return 'aspect-fit'; // default
});

// --- PLAYER INITIALIZATION ENGINE ---
const destroyPlayer = () => {
  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }
  if (mpegtsInstance) {
    mpegtsInstance.destroy();
    mpegtsInstance = null;
  }
  if (videoRef.value) {
    videoRef.value.src = '';
    videoRef.value.load();
  }
  isBuffering.value = false;
  isConnecting.value = false;
  showPoster.value = true;
};

const initializePlayer = () => {
  destroyPlayer();
  errorState.value = null;
  isConnecting.value = true;
  isBuffering.value = true;

  let originalUrl = props.channel.streamUrl;
  console.log(`[VideoPlayer] Inicializando player. URL Original: "${originalUrl}"`);
  const video = videoRef.value;

  if (!video) return;

  // Determine if stream should be proxied
  const shouldProxy = 
    proxyUrlSetting.value && (
      playerProxyStreams.value === 'always' || 
      (playerProxyStreams.value === 'auto' && retryCount.value > 0)
    );

  // Dynamic Proxy Rotation / Failover Engine
  const activeProxy = ref('');
  if (shouldProxy) {
    if (retryCount.value <= 1) {
      activeProxy.value = proxyUrlSetting.value;
    } else {
      // Rotate through fallbacks when primary fails (e.g. 403 rate-limiting)
      const primary = proxyUrlSetting.value;
      const fallbacks = [
        primary,
        'http://localhost:8088/?url=', // Local proxy is the ultimate unlimited backup
        'https://api.allorigins.win/raw?url=',
        'https://thingproxy.freeboard.io/fetch/'
      ];
      const unique = Array.from(new Set(fallbacks.filter(Boolean)));
      const index = (retryCount.value - 1) % unique.length;
      activeProxy.value = unique[index];
    }
  }

  isActiveProxied.value = !!shouldProxy;

  // Set default volume
  video.volume = volume.value;
  video.muted = isMuted.value;

  // Helper to handle native metadata loading
  const onMetadataLoaded = () => {
    videoWidth.value = video.videoWidth;
    videoHeight.value = video.videoHeight;
    duration.value = video.duration || 0;
    isConnecting.value = false;
    isBuffering.value = false;
    showPoster.value = false;
    retryCount.value = 0; // reset retry loops
    
    // Auto Play
    video.play().catch(e => {
      console.warn('Auto-play blocked by browser, requiring user interaction.', e);
    });
  };

  video.onloadedmetadata = onMetadataLoaded;
  
  video.onerror = (e) => {
    handlePlaybackError();
  };

  // Check stream formats
  const isHls = originalUrl.toLowerCase().includes('.m3u8') || originalUrl.toLowerCase().includes('m3u8');
  const isTs = originalUrl.toLowerCase().includes('.ts') || 
               originalUrl.includes('output=ts') || 
               originalUrl.includes('output=mpegts') ||
               originalUrl.includes('output=mpeg-ts');

  // --- PLAYBACK ENGINE SELECTOR ---
  
  // Case A: HLS Stream played via Hls.js
  if (isHls && Hls.isSupported()) {
    // Custom Hls.js Loader to proxy fragments, playlists, and keys
    // @ts-ignore
    class ProxyLoader extends Hls.DefaultConfig.loader {
      constructor(config: any) {
        super(config);
      }

      load(context: any, config: any, callbacks: any) {
        if (shouldProxy && activeProxy.value) {
          const reqUrl = context.url;
          // Avoid double proxying if already prefixed
          const isAlreadyProxied = 
            reqUrl.startsWith(proxyUrlSetting.value) || 
            reqUrl.startsWith('http://localhost:8088/?url=') || 
            reqUrl.startsWith('https://api.allorigins.win/raw?url=') || 
            reqUrl.startsWith('https://thingproxy.freeboard.io/fetch/');

          if (reqUrl && !isAlreadyProxied) {
            context.url = `${activeProxy.value}${encodeURIComponent(reqUrl)}`;
          }
        }
        super.load(context, config, callbacks);
      }
    }

    hlsInstance = new Hls({
      enableWorker: true,
      maxBufferLength: 10,
      lowLatencyMode: true,
      manifestLoadingMaxRetry: 4,
      manifestLoadingRetryDelay: 1000,
      loader: ProxyLoader
    });

    if (shouldProxy && activeProxy.value) {
      console.log(`[VideoPlayer] Usando Proxy CORS via Custom Loader ("${activeProxy.value}"). Tentativa: ${retryCount.value}`);
      activePlayUrl.value = `${activeProxy.value}${encodeURIComponent(originalUrl)}`;
    } else {
      activePlayUrl.value = originalUrl;
    }

    hlsInstance.loadSource(originalUrl);
    hlsInstance.attachMedia(video);

    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      // Stream connected
      isConnecting.value = false;
      showPoster.value = false;
    });

    hlsInstance.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        console.error('Hls.js fatal error event triggered:', data);
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.error('Fatal network error in HLS, attempting recovery...');
            if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR || 
                data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT ||
                data.details === Hls.ErrorDetails.LEVEL_LOAD_ERROR) {
              console.error('Fatal manifest loading error (CORS/Network). Retrying via proxy...');
              handlePlaybackError();
            } else {
              hlsInstance?.startLoad();
            }
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.error('Fatal media parsing error, attempting recovery...');
            hlsInstance?.recoverMediaError();
            break;
          default:
            console.error('Fatal unrecoverable player error.');
            handlePlaybackError();
            break;
        }
      }
    });
  } 
  // Case B: Raw MPEG-TS Stream played via mpegts.js (solves .ts support in Chrome/Firefox)
  else if (isTs && mpegts.isSupported()) {
    let playUrl = originalUrl;
    if (shouldProxy && activeProxy.value) {
      console.log(`[VideoPlayer] Usando Proxy CORS via mpegts.js ("${activeProxy.value}"). Tentativa: ${retryCount.value}`);
      playUrl = `${activeProxy.value}${encodeURIComponent(originalUrl)}`;
    }
    
    activePlayUrl.value = playUrl;

    mpegtsInstance = mpegts.createPlayer({
      type: 'mpegts',
      isLive: isLive.value,
      url: playUrl
    }, {
      enableWorker: true,
      enableStashBuffer: false, // minimize latency
      liveBufferLatencyChasing: true
    });

    mpegtsInstance.attachMediaElement(video);
    mpegtsInstance.load();

    mpegtsInstance.on(mpegts.Events.ERROR, (type, detail, info) => {
      console.error(`[VideoPlayer] Erro no mpegts.js: Tipo ${type}, Detalhe ${detail}`, info);
      handlePlaybackError();
    });

    // Resolve loading overlay when metadata or stream connects
    video.onloadedmetadata = () => {
      videoWidth.value = video.videoWidth;
      videoHeight.value = video.videoHeight;
      duration.value = video.duration || 0;
      isConnecting.value = false;
      isBuffering.value = false;
      showPoster.value = false;
      retryCount.value = 0; // reset retry loops
      
      video.play().catch(e => {
        console.warn('Auto-play blocked by browser, requiring user interaction.', e);
      });
    };
  }
  // Case C: Fallback to native HLS support (Safari, iOS, Android, and standard MP4 links)
  else if (video.canPlayType('application/vnd.apple.mpegurl') || !isHls) {
    let playUrl = originalUrl;
    if (shouldProxy && activeProxy.value) {
      console.log(`[VideoPlayer] Usando Proxy CORS Nativo ("${activeProxy.value}") para reprodução. Tentativa: ${retryCount.value}`);
      playUrl = `${activeProxy.value}${encodeURIComponent(originalUrl)}`;
    }
    activePlayUrl.value = playUrl;
    video.src = playUrl;
    video.load();
  } else {
    isConnecting.value = false;
    isBuffering.value = false;
    errorState.value = 'Formato de streaming HLS ou MPEG-TS não suportado neste navegador. Use Chrome/Firefox.';
  }
};

// --- RECOVERY AND RETRY ENGINE ---
const handlePlaybackError = () => {
  destroyPlayer();
  
  if (retryCount.value < 5) {
    retryCount.value++;
    isConnecting.value = true;
    errorState.value = null;

    let healed = false;
    // Se o stream falhar na reprodução e for uma URL de m3u8 (e sabemos que este provedor não suporta .m3u8),
    // nós curamos o link para .ts dinamicamente em memória e atualizamos no banco IndexedDB!
    const originalUrl = props.channel.streamUrl;
    if (originalUrl.toLowerCase().includes('.m3u8')) {
      const urlParts = originalUrl.split('?');
      let path = urlParts[0];
      if (path.toLowerCase().endsWith('.m3u8')) {
        path = path.slice(0, -5) + '.ts';
      }
      const newUrl = path + (urlParts[1] ? '?' + urlParts[1] : '');
      
      // Set isHealing to true before mutating to let the watcher handle immediate loading cleanly
      isHealing.value = true;
      props.channel.streamUrl = newUrl;
      healed = true;
      console.log(`[VideoPlayer] Detectada falha no m3u8. Curando URL do canal para .ts: ${newUrl}`);
      
      // Salva a nova URL curada no banco IndexedDB local (cópia rasa para evitar DataCloneError)
      db.updateChannel({ ...props.channel }).catch(err => {
        console.error('Erro ao atualizar URL de canal curado no IndexedDB:', err);
      });
    }
    
    // Only schedule the 3-second retry if we did NOT perform a self-healing rewrite.
    // If we healed, the watcher already immediately re-initializes the player.
    if (!healed) {
      if (retryTimeout) clearTimeout(retryTimeout);
      retryTimeout = window.setTimeout(() => {
        initializePlayer();
      }, 3000);
    }
  } else {
    isConnecting.value = false;
    isBuffering.value = false;
    errorState.value = 'Não foi possível reproduzir este canal. O stream está offline ou bloqueado por políticas de CORS do provedor. Verifique se o link está correto.';
  }
};

// --- TIMELINE TRACKERS ---
const onTimeUpdate = () => {
  if (videoRef.value && !isLive.value) {
    currentTime.value = videoRef.value.currentTime;
  }
};

const onTimelineSeek = (time: number) => {
  if (videoRef.value && !isLive.value) {
    videoRef.value.currentTime = time;
  }
};

const onVolumeChange = () => {
  if (videoRef.value) {
    isMuted.value = videoRef.value.muted;
  }
};

const formatTimelineTime = (secs: number) => {
  if (!secs || isNaN(secs)) return '00:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  
  if (h > 0) {
    return `${h}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
};

// --- PLAYBACK TRIGGERS ---
const togglePlay = () => {
  if (videoRef.value) {
    if (videoRef.value.paused) {
      videoRef.value.play().catch(err => console.error(err));
    } else {
      videoRef.value.pause();
    }
  }
};

const toggleMute = () => {
  if (videoRef.value) {
    isMuted.value = !isMuted.value;
    videoRef.value.muted = isMuted.value;
    if (!isMuted.value && volume.value === 0) {
      volume.value = 0.5; // restore some sound
    }
  }
};

// --- CONTROL VISIBILITY HANDLERS (IDLE TIMOUT) ---
const onMouseMove = () => {
  showControls.value = true;
  if (controlsTimeout) clearTimeout(controlsTimeout);
  
  // Hide controls after 3 seconds of mouse inactivity (only if playing and not floating)
  if (!isPaused.value && !props.floating) {
    controlsTimeout = window.setTimeout(() => {
      showControls.value = false;
    }, 3000);
  }
};

const hideControls = () => {
  if (!isPaused.value && !props.floating) {
    showControls.value = false;
  }
};

// --- FULLSCREEN ENGINE ---
const toggleFullscreen = () => {
  const container = videoRef.value?.parentElement;
  if (!container) return;

  if (!document.fullscreenElement) {
    container.requestFullscreen()
      .then(() => isFullscreen.value = true)
      .catch(err => console.error(err));
  } else {
    document.exitFullscreen()
      .then(() => isFullscreen.value = false)
      .catch(err => console.error(err));
  }
};

const onFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement;
};

// --- SHORTCUT HOTKEYS ENGINE ---
const handleKeyDown = (e: KeyboardEvent) => {
  // Ignore input keystrokes
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return;
  }

  switch (e.key.toLowerCase()) {
    case ' ':
    case 'k':
      e.preventDefault();
      togglePlay();
      break;
    case 'f':
      e.preventDefault();
      toggleFullscreen();
      break;
    case 'm':
      e.preventDefault();
      toggleMute();
      break;
    case 'arrowup':
      e.preventDefault();
      volume.value = Math.min(1, volume.value + 0.1);
      break;
    case 'arrowdown':
      e.preventDefault();
      volume.value = Math.max(0, volume.value - 0.1);
      break;
  }
};

const setupHotkeys = () => {
  window.addEventListener('keydown', handleKeyDown);
};

const removeHotkeys = () => {
  window.removeEventListener('keydown', handleKeyDown);
};
</script>

<style scoped>
.video-player-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 250px;
  background: black;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  display: flex;
  align-center: center;
  justify-content: center;
  user-select: none;
  aspect-ratio: 16/9;
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: contain;
  z-index: 1;
}

/* Aspect Ratio classes */
.aspect-fit {
  object-fit: contain !important;
}

.aspect-fill {
  object-fit: fill !important;
}

.aspect-16-9 {
  aspect-ratio: 16/9;
  object-fit: fill !important;
}

.aspect-4-3 {
  aspect-ratio: 4/3;
  object-fit: fill !important;
}

/* Floating player state */
.player-floating {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 320px;
  height: 180px;
  min-height: 180px !important;
  z-index: 999;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(156, 39, 176, 0.5) !important;
}

.video-poster-overlay,
.video-loading-overlay,
.video-error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
}

.video-loading-overlay {
  background: rgba(0, 0, 0, 0.5);
}

.video-error-overlay {
  background: rgba(13, 11, 20, 0.95);
}

.poster-logo {
  filter: drop-shadow(0 0 20px rgba(160, 68, 255, 0.25));
}

.controls-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 5;
  background: rgba(0, 0, 0, 0.2);
}

.top-gradient {
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0) 100%);
}

.bottom-gradient {
  background: linear-gradient(360deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0) 100%);
}

.play-center-btn {
  transform: scale(1);
  transition: transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.play-center-btn:hover {
  transform: scale(1.15);
}

.volume-slider-container {
  width: 45px;
  overflow: hidden;
  transition: width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.volume-slider-container:hover {
  width: 130px;
}

.volume-slider {
  width: 70px;
}

.stats-panel {
  position: absolute;
  top: 60px;
  left: 12px;
  z-index: 6;
  max-width: 280px;
  width: 100%;
  background: rgba(13, 11, 20, 0.9) !important;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
}

/* Animations */
.animate-pulse {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(0.97);
  }
}

.max-width-280 {
  max-width: 280px;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.gap-2 {
  gap: 8px;
}
.gap-1 {
  gap: 4px;
}
.text-glow-small {
  background: linear-gradient(135deg, #a044ff 0%, #00f5d4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.play-btn-glow {
  box-shadow: 0 0 15px rgba(156, 39, 176, 0.5) !important;
}
</style>
