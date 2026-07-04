<!-- src/components/VideoPlayer.vue -->
<template>
  <div
    ref="wrapperRef"
    class="video-player-wrapper w-100 h-100 position-relative"
  >
    <!-- Document PiP Placeholder -->
    <div
      v-if="isDocumentPip"
      class="pip-placeholder rounded-xl d-flex flex-column align-center justify-center pa-4 text-center"
    >
      <v-icon size="48" color="primary" class="mb-2 animate-pulse"
        >mdi-picture-in-picture-bottom-right</v-icon
      >
      <div class="text-subtitle-1 font-weight-bold text-glow-small mb-1">
        {{ $t('videoPlayer.pipActive') }}
      </div>
      <p class="text-caption text-medium-emphasis mb-4 max-width-280">
        {{ $t('videoPlayer.pipDesc', { name: channel.name }) }}
      </p>
      <v-btn
        size="small"
        color="primary"
        prepend-icon="mdi-arrow-collapse"
        class="text-uppercase font-weight-bold shadow-btn"
        @click="closePip"
      >
        {{ $t('videoPlayer.pipBringBack') }}
      </v-btn>
    </div>

    <!-- The actual player container -->
    <div
      ref="playerContainerRef"
      class="video-player-container overflow-hidden"
      :class="{
        'player-floating elevation-10 border-primary': floating,
        'player-pip': isDocumentPip,
      }"
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
        @enterpictureinpicture="onEnterPip"
        @leavepictureinpicture="onLeavePip"
      />

      <!-- Poster Logo Overlay (When loading or buffering) -->
      <div
        v-if="showPoster && channel.logo"
        class="video-poster-overlay d-flex align-center justify-center"
      >
        <v-img
          :src="channel.logo"
          width="120"
          max-height="120"
          contain
          class="poster-logo animate-pulse"
        />
      </div>

      <!-- Buffering/Loading Spinner -->
      <div
        v-if="isBuffering || isConnecting"
        class="video-loading-overlay d-flex flex-column align-center justify-center"
      >
        <v-progress-circular
          :size="50"
          color="secondary"
          indeterminate
          class="mb-2"
        />
        <span class="text-caption font-weight-bold text-glow-small">
          {{
            isConnecting
              ? $t('videoPlayer.connecting', { attempt: retryCount })
              : $t('videoPlayer.loadingStream')
          }}
        </span>
      </div>

      <!-- Error Overlay -->
      <div
        v-if="errorState"
        class="video-error-overlay d-flex flex-column align-center justify-center pa-4 text-center"
      >
        <v-icon size="48" color="error" class="mb-2">mdi-alert-circle</v-icon>
        <div class="text-subtitle-2 font-weight-bold mb-1">
          {{ $t('videoPlayer.playbackError') }}
        </div>
        <p class="text-caption text-medium-emphasis mb-3 max-width-280">
          {{ errorState }}
        </p>
        <div class="d-flex gap-2">
          <v-btn size="x-small" color="primary" @click="initializePlayer"
            >{{ $t('videoPlayer.retryBtn') }}</v-btn
          >
          <v-btn
            size="x-small"
            color="secondary"
            variant="outlined"
            @click="showStats = !showStats"
            >{{ $t('videoPlayer.diagnosticsBtn') }}</v-btn
          >
        </div>
      </div>

      <!-- Stats Panel overlay -->
      <v-card
        v-if="showStats"
        class="stats-panel pa-3 text-caption glass-card"
        variant="flat"
      >
        <div class="d-flex align-center justify-space-between mb-2">
          <strong>{{ $t('videoPlayer.stats.title') }}</strong>
          <v-btn
            icon="mdi-close"
            size="x-small"
            variant="text"
            @click="showStats = false"
          />
        </div>
        <div>
          {{ $t('videoPlayer.stats.name') }}: <span class="text-secondary">{{ channel.name }}</span>
        </div>
        <div>
          {{ $t('videoPlayer.stats.type') }}:
          <span class="text-secondary">{{ channel.type.toUpperCase() }}</span>
        </div>
        <div>
          {{ $t('videoPlayer.stats.resolution') }}:
          <span class="text-secondary">{{ videoWidth }}x{{ videoHeight }}</span>
        </div>
        <div>
          {{ $t('videoPlayer.stats.engine') }}:
          <span class="text-secondary">{{
            hlsInstance ? "Hls.js (MSE)" : "Nativo"
          }}</span>
        </div>
        <div>
          {{ $t('videoPlayer.stats.bufferMode') }}:
          <span class="text-secondary">{{
            playerBufferMode === "stable"
              ? $t('videoPlayer.stats.stable')
              : playerBufferMode === "balanced"
                ? $t('videoPlayer.stats.balanced')
                : $t('videoPlayer.stats.lowLatency')
          }}</span>
        </div>
        <div class="text-truncate" :title="channel.streamUrl">
          {{ $t('videoPlayer.stats.originalLink') }}:
          <span class="text-secondary text-caption">{{
            channel.streamUrl
          }}</span>
        </div>
        <div
          v-if="isActiveProxied"
          class="text-truncate text-warning font-weight-bold"
          :title="activePlayUrl"
        >
          {{ $t('videoPlayer.stats.corsProxy') }}: <span class="text-warning text-caption">{{ $t('videoPlayer.stats.active') }}</span>
        </div>
        <v-alert
          v-if="channel.streamUrl.includes('.ts')"
          type="warning"
          variant="tonal"
          density="compact"
          class="mt-2 text-caption py-1 px-2"
          hide-details
        >
          {{ $t('videoPlayer.tsWarning') }}
        </v-alert>
      </v-card>

      <!-- Custom Controls HUD -->
      <Transition name="fade">
        <div
          v-if="showControls || isPaused || floating"
          class="controls-overlay d-flex flex-column justify-space-between"
        >
          <!-- Top Toolbar -->
          <div
            class="d-flex align-center justify-space-between pa-3 top-gradient"
          >
            <div class="d-flex align-center gap-2 min-width-0">
              <v-avatar
                size="32"
                class="bg-surface-variant flex-shrink-0"
                v-if="channel.logo"
              >
                <v-img :src="channel.logo" />
              </v-avatar>
              <div
                class="text-subtitle-2 font-weight-bold text-truncate text-glow-small"
                style="max-width: 250px"
              >
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
                :title="$t('videoPlayer.diagnosticsBtn')"
                @click="showStats = !showStats"
              />
              <!-- Pop-out Toggle (Picture-in-Picture) -->
              <v-btn
                :icon="
                  isPipActive
                    ? 'mdi-arrow-collapse'
                    : 'mdi-picture-in-picture-bottom-right'
                "
                variant="text"
                color="white"
                size="small"
                :title="
                  isPipActive ? $t('videoPlayer.pipBringBack') : $t('videoPlayer.pipToggle')
                "
                @click="togglePip"
              />
              <!-- Float Mode Toggle (Only if not in PiP) -->
              <v-btn
                v-if="!isPipActive"
                :icon="floating ? 'mdi-open-in-new' : 'mdi-dock-window'"
                variant="text"
                color="white"
                size="small"
                :title="floating ? $t('videoPlayer.fullscreen') : $t('videoPlayer.floatToggle')"
                @click="$emit('toggle-float')"
              />
              <!-- Close / Stop Button -->
              <v-btn
                icon="mdi-close"
                variant="text"
                color="error"
                size="small"
                :title="$t('common.close')"
                @click="onClosePlayer"
              />
            </div>
          </div>

          <!-- Center Play Overlay Indicator (Only for normal view) -->
          <div
            v-if="!floating"
            class="d-flex align-center justify-center flex-grow-1"
            @click="togglePlay"
          >
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
              <span class="text-caption text-white">{{
                formatTimelineTime(currentTime)
              }}</span>
              <v-slider
                v-model="currentTime"
                :max="duration || 100"
                color="secondary"
                track-color="rgba(255, 255, 255, 0.2)"
                hide-details
                density="compact"
                @update:model-value="onTimelineSeek"
              />
              <span class="text-caption text-white">{{
                formatTimelineTime(duration)
              }}</span>
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
                    :icon="
                      isMuted
                        ? 'mdi-volume-off'
                        : volume > 0.5
                          ? 'mdi-volume-high'
                          : 'mdi-volume-medium'
                    "
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
                <v-chip
                  v-if="isLive"
                  size="x-small"
                  color="error"
                  class="ml-2 px-2 font-weight-bold uppercase-tag animate-pulse"
                >
                  🔴 {{ $t('tvGuide.liveTag') }}
                </v-chip>
              </div>

              <!-- Right Controls -->
              <div class="d-flex align-center gap-1">
                <!-- Buffer Mode Selector -->
                <v-menu
                  v-model="isBufferMenuOpen"
                  location="top end"
                  transition="slide-y-transition"
                >
                  <template v-slot:activator="{ props }">
                    <v-btn
                      icon="mdi-tune"
                      variant="text"
                      color="white"
                      size="small"
                      :title="$t('videoPlayer.stats.bufferMode')"
                      v-bind="props"
                    />
                  </template>
                  <v-list bg-color="surface" density="compact">
                    <v-list-item
                      v-for="opt in bufferModes"
                      :key="opt.value"
                      :active="playerBufferMode === opt.value"
                      color="secondary"
                      @click="changeBufferMode(opt.value)"
                    >
                      <v-list-item-title class="text-caption">{{
                        opt.title
                      }}</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>

                <!-- Aspect Ratio Selector -->
                <v-menu
                  v-model="isAspectRatioMenuOpen"
                  location="top end"
                  transition="slide-y-transition"
                >
                  <template v-slot:activator="{ props }">
                    <v-btn
                      icon="mdi-aspect-ratio"
                      variant="text"
                      color="white"
                      size="small"
                      :title="$t('videoPlayer.aspectRatio')"
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
                      <v-list-item-title class="text-caption">{{
                        opt.label
                      }}</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>

                <!-- Fullscreen (Only if not in PiP) -->
                <v-btn
                  v-if="!floating && !isPipActive"
                  :icon="
                    isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'
                  "
                  variant="text"
                  color="white"
                  size="small"
                  :title="$t('videoPlayer.fullscreen')"
                  @click="toggleFullscreen"
                />
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import Hls from "hls.js";
import mpegts from "mpegts.js";
import { db, type IPTVChannel } from "@/services/db";

const props = defineProps<{
  channel: IPTVChannel;
  floating?: boolean;
}>();

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

const emit = defineEmits<{
  (e: "close-player"): void;
  (e: "toggle-float"): void;
}>();

const { t } = useI18n();

// Video Element and Container Refs
const videoRef = ref<HTMLVideoElement | null>(null);
const wrapperRef = ref<HTMLElement | null>(null);
const playerContainerRef = ref<HTMLElement | null>(null);

// PiP / Pop-out States
const isPipActive = ref(false);
const isDocumentPip = ref(false);
let pipWindowInstance: any = null;

let hlsInstance: Hls | null = null;
let mpegtsInstance: mpegts.Player | null = null;

// Media States
const isPaused = ref(true);
const isBuffering = ref(true);
const isConnecting = ref(true);
const showPoster = ref(true);
const errorState = ref<string | null>(null);

// Proxy configuration and active playback state
const proxyUrlSetting = ref("");
const playerProxyStreams = ref("auto");
const activePlayUrl = ref("");
const isActiveProxied = ref(false);
const playerBufferMode = ref("stable");

const loadSettings = async () => {
  try {
    const defaultPlayerProxyUrl = isElectron ? "" : "https://corsproxy.io/?";
    proxyUrlSetting.value = await db.getSetting(
      "player_proxy_url",
      defaultPlayerProxyUrl,
    );
    const defaultPlayerProxyStreams = isElectron ? "never" : "auto";
    playerProxyStreams.value = await db.getSetting(
      "player_proxy_streams",
      defaultPlayerProxyStreams,
    );
    playerBufferMode.value = await db.getSetting(
      "player_buffer_mode",
      "stable",
    );
  } catch (e) {
    console.error("Error loading stream proxy settings:", e);
  }
};

const currentTime = ref(0);
const duration = ref(0);
const volume = ref(0.8);
const isMuted = ref(false);

const videoWidth = ref(0);
const videoHeight = ref(0);

// Playback Options
const aspectRatio = ref("fit"); // fit, fill, 16-9, 4-3
const aspectRatios = computed(() => [
  { label: t('settings.playback.aspectRatioOptions.fit'), value: "fit" },
  { label: t('settings.playback.aspectRatioOptions.fill'), value: "fill" },
  { label: t('settings.playback.aspectRatioOptions.widescreen'), value: "16-9" },
  { label: t('settings.playback.aspectRatioOptions.classic'), value: "4-3" },
]);

const bufferModes = computed(() => [
  { title: t('settings.playback.bufferOptions.lowLatency'), value: "low-latency" },
  { title: t('settings.playback.bufferOptions.balanced'), value: "balanced" },
  { title: t('settings.playback.bufferOptions.stable'), value: "stable" },
]);

const changeBufferMode = async (mode: string) => {
  playerBufferMode.value = mode;
  try {
    await db.setSetting("player_buffer_mode", mode);
  } catch (err) {
    console.error("Error saving buffer mode setting from player:", err);
  }
  initializePlayer();
};

const isLive = computed(() => {
  return props.channel.type === "live";
});

const showControls = ref(true);
let controlsTimeout: number | null = null;
const isFullscreen = ref(false);
const showStats = ref(false);

// Menu visibility state trackers to prevent HUD auto-hiding
const isBufferMenuOpen = ref(false);
const isAspectRatioMenuOpen = ref(false);
const isAnyMenuOpen = computed(
  () => isBufferMenuOpen.value || isAspectRatioMenuOpen.value,
);

watch(isAnyMenuOpen, (isOpen) => {
  if (!isOpen) {
    // Menu closed, trigger normal controls timeout check
    onMouseMove();
  }
});

// Reconnection Engine
const retryCount = ref(0);
let retryTimeout: number | null = null;
const isHealing = ref(false);
let isHandlingError = false;
let lastErrorCode: number | null = null;

let resizeObserver: ResizeObserver | null = null;

onMounted(async () => {
  await loadSettings();
  initializePlayer();
  setupHotkeys();

  // Listen for Fullscreen changes
  document.addEventListener("fullscreenchange", onFullscreenChange);

  // Setup ResizeObserver for floating player to save dimensions
  if (props.floating && playerContainerRef.value) {
    const savedWidth = await db.getSetting("floating_player_width", 480);
    const savedHeight = await db.getSetting("floating_player_height", 270);
    playerContainerRef.value.style.width = `${savedWidth}px`;
    playerContainerRef.value.style.height = `${savedHeight}px`;

    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Don't save if width/height are too small or close to 0 (e.g. hidden/unmounted)
        if (width > 50 && height > 50) {
          db.setSetting("floating_player_width", Math.round(width));
          db.setSetting("floating_player_height", Math.round(height));
        }
      }
    });
    resizeObserver.observe(playerContainerRef.value);
  }
});

onBeforeUnmount(() => {
  closePip();
  destroyPlayer();
  removeHotkeys();
  document.removeEventListener("fullscreenchange", onFullscreenChange);
  if (retryTimeout) clearTimeout(retryTimeout);
  if (controlsTimeout) clearTimeout(controlsTimeout);
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});

// Watch for stream URL change
watch(
  () => props.channel.streamUrl,
  async () => {
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
  },
);

// Watch volume slider
watch(volume, (newVol) => {
  if (videoRef.value) {
    videoRef.value.volume = newVol;
    isMuted.value = newVol === 0;
  }
});

// --- ASPECT RATIO CALCULATOR ---
const aspectRatioClass = computed(() => {
  if (aspectRatio.value === "fill") return "aspect-fill";
  if (aspectRatio.value === "16-9") return "aspect-16-9";
  if (aspectRatio.value === "4-3") return "aspect-4-3";
  return "aspect-fit"; // default
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
    videoRef.value.src = "";
    videoRef.value.load();
  }
  isBuffering.value = false;
  isConnecting.value = false;
  showPoster.value = true;
};

const initializePlayer = () => {
  isHandlingError = false;
  lastErrorCode = null;
  destroyPlayer();
  errorState.value = null;
  isConnecting.value = true;
  isBuffering.value = true;

  let originalUrl = props.channel.streamUrl;
  const video = videoRef.value;

  if (!video) return;

  // Determine if stream should be proxied
  const shouldProxy =
    proxyUrlSetting.value &&
    (playerProxyStreams.value === "always" ||
      (playerProxyStreams.value === "auto" && retryCount.value > 0));

  // Dynamic Proxy Rotation / Failover Engine
  const activeProxy = ref("");
  if (shouldProxy) {
    if (retryCount.value <= 1) {
      activeProxy.value = proxyUrlSetting.value;
    } else {
      // Rotate through fallbacks when primary fails (e.g. 403 rate-limiting)
      const primary = proxyUrlSetting.value;
      const fallbacks = [
        primary,
        "http://localhost:8088/?url=", // Local proxy is the ultimate unlimited backup
        "https://api.allorigins.win/raw?url=",
        "https://thingproxy.freeboard.io/fetch/",
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
    video.play().catch((e) => {
      console.warn(
        "Auto-play blocked by browser, requiring user interaction.",
        e,
      );
    });
  };

  video.onloadedmetadata = onMetadataLoaded;

  video.onerror = (e) => {
    handlePlaybackError();
  };

  // Check stream formats
  const isHls =
    originalUrl.toLowerCase().includes(".m3u8") ||
    originalUrl.toLowerCase().includes("m3u8");
  const isTs =
    originalUrl.toLowerCase().includes(".ts") ||
    originalUrl.includes("output=ts") ||
    originalUrl.includes("output=mpegts") ||
    originalUrl.includes("output=mpeg-ts");

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
            reqUrl.startsWith("http://localhost:8088/?url=") ||
            reqUrl.startsWith("https://api.allorigins.win/raw?url=") ||
            reqUrl.startsWith("https://thingproxy.freeboard.io/fetch/");

          if (reqUrl && !isAlreadyProxied) {
            context.url = `${activeProxy.value}${encodeURIComponent(reqUrl)}`;
          }
        }
        super.load(context, config, callbacks);
      }
    }

    let hlsConfig: any = {
      enableWorker: true,
      loader: ProxyLoader,
    };

    if (playerBufferMode.value === "stable") {
      hlsConfig = {
        ...hlsConfig,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        lowLatencyMode: false,
        liveSyncDurationCount: 6,
        manifestLoadingMaxRetry: 10,
        manifestLoadingRetryDelay: 2000,
      };
    } else if (playerBufferMode.value === "balanced") {
      hlsConfig = {
        ...hlsConfig,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        lowLatencyMode: false,
        liveSyncDurationCount: 4,
        manifestLoadingMaxRetry: 6,
        manifestLoadingRetryDelay: 1500,
      };
    } else {
      // Default to low-latency
      hlsConfig = {
        ...hlsConfig,
        maxBufferLength: 10,
        lowLatencyMode: true,
        manifestLoadingMaxRetry: 4,
        manifestLoadingRetryDelay: 1000,
      };
    }

    hlsInstance = new Hls(hlsConfig);

    if (shouldProxy && activeProxy.value) {
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
        console.error("Hls.js fatal error event triggered:", data);
        const code = data.response?.code;
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.error("Fatal network error in HLS, attempting recovery...");
            if (
              data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
              data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT ||
              data.details === Hls.ErrorDetails.LEVEL_LOAD_ERROR
            ) {
              console.error(
                "Fatal manifest loading error (CORS/Network). Retrying via proxy...",
              );
              handlePlaybackError(code);
            } else {
              hlsInstance?.startLoad();
            }
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.error("Fatal media parsing error, attempting recovery...");
            hlsInstance?.recoverMediaError();
            break;
          default:
            console.error("Fatal unrecoverable player error.");
            handlePlaybackError(code);
            break;
        }
      }
    });
  }
  // Case B: Raw MPEG-TS Stream played via mpegts.js (solves .ts support in Chrome/Firefox)
  else if (isTs && mpegts.isSupported()) {
    let playUrl = originalUrl;
    if (shouldProxy && activeProxy.value) {
      playUrl = `${activeProxy.value}${encodeURIComponent(originalUrl)}`;
    }

    activePlayUrl.value = playUrl;

    let mpegtsOptionalConfig: any = {
      enableWorker: true,
    };

    if (playerBufferMode.value === "stable") {
      mpegtsOptionalConfig.enableStashBuffer = true;
      mpegtsOptionalConfig.liveBufferLatencyChasing = false;
    } else if (playerBufferMode.value === "balanced") {
      mpegtsOptionalConfig.enableStashBuffer = true;
      mpegtsOptionalConfig.liveBufferLatencyChasing = true;
    } else {
      // low-latency (default)
      mpegtsOptionalConfig.enableStashBuffer = false;
      mpegtsOptionalConfig.liveBufferLatencyChasing = true;
    }

    mpegtsInstance = mpegts.createPlayer(
      {
        type: "mpegts",
        isLive: isLive.value,
        url: playUrl,
      },
      mpegtsOptionalConfig,
    );

    mpegtsInstance.attachMediaElement(video);
    mpegtsInstance.load();

    mpegtsInstance.on(mpegts.Events.ERROR, (type, detail, info) => {
      console.error(
        `[VideoPlayer] Erro no mpegts.js: Tipo ${type}, Detalhe ${detail}`,
        info,
      );
      const code = info?.code;
      handlePlaybackError(code);
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

      video.play().catch((e) => {
        console.warn(
          "Auto-play blocked by browser, requiring user interaction.",
          e,
        );
      });
    };
  }
  // Case C: Fallback to native HLS support (Safari, iOS, Android, and standard MP4 links)
  else if (video.canPlayType("application/vnd.apple.mpegurl") || !isHls) {
    let playUrl = originalUrl;
    if (shouldProxy && activeProxy.value) {
      playUrl = `${activeProxy.value}${encodeURIComponent(originalUrl)}`;
    }
    activePlayUrl.value = playUrl;
    video.src = playUrl;
    video.load();
  } else {
    isConnecting.value = false;
    isBuffering.value = false;
    errorState.value =
      "Formato de streaming HLS ou MPEG-TS não suportado neste navegador. Use Chrome/Firefox.";
  }
};

// --- RECOVERY AND RETRY ENGINE ---
const handlePlaybackError = (code?: number) => {
  if (isHandlingError) {
    return;
  }
  isHandlingError = true;
  if (code) {
    lastErrorCode = code;
  }
  destroyPlayer();

  if (retryCount.value < 5) {
    retryCount.value++;
    isConnecting.value = true;
    errorState.value = null;

    let healed = false;
    // Se o stream falhar na reprodução e for uma URL de m3u8 (e sabemos que este provedor não suporta .m3u8),
    // nós curamos o link para .ts dinamicamente em memória e atualizamos no banco IndexedDB!
    const originalUrl = props.channel.streamUrl;
    if (originalUrl.toLowerCase().includes(".m3u8")) {
      const urlParts = originalUrl.split("?");
      let path = urlParts[0];
      if (path.toLowerCase().endsWith(".m3u8")) {
        path = path.slice(0, -5) + ".ts";
      }
      const newUrl = path + (urlParts[1] ? "?" + urlParts[1] : "");

      // Set isHealing to true before mutating to let the watcher handle immediate loading cleanly
      isHealing.value = true;
      props.channel.streamUrl = newUrl;
      healed = true;

      // Salva a nova URL curada no banco IndexedDB local (cópia rasa para evitar DataCloneError)
      db.updateChannel({ ...props.channel }).catch((err) => {
        console.error(
          "Erro ao atualizar URL de canal curado no IndexedDB:",
          err,
        );
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
    if (lastErrorCode === 404) {
      errorState.value =
        "Este canal não foi encontrado no servidor do provedor (Erro 404). O link está quebrado ou o canal foi removido permanentemente pelo servidor de IPTV.";
    } else if (lastErrorCode === 403) {
      errorState.value =
        "Acesso negado a este canal (Erro 403 / Proibido). O provedor de IPTV bloqueou a conexão, as credenciais expiraram ou o limite de conexões simultâneas do seu plano foi atingido.";
    } else {
      errorState.value =
        "Não foi possível reproduzir este canal. O stream está offline ou bloqueado por políticas de CORS do provedor. Verifique se o link está correto.";
    }
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
  if (!secs || isNaN(secs)) return "00:00";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  const pad = (n: number) => String(n).padStart(2, "0");

  if (h > 0) {
    return `${h}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
};

// --- PLAYBACK TRIGGERS ---
const togglePlay = () => {
  if (videoRef.value) {
    if (videoRef.value.paused) {
      videoRef.value.play().catch((err) => console.error(err));
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

  // Hide controls after 3 seconds of mouse inactivity (only if playing, not floating, and no menu is open)
  if (!isPaused.value && !props.floating && !isAnyMenuOpen.value) {
    controlsTimeout = window.setTimeout(() => {
      showControls.value = false;
    }, 3000);
  }
};

const hideControls = () => {
  if (!isPaused.value && !props.floating && !isAnyMenuOpen.value) {
    showControls.value = false;
  }
};

// --- FULLSCREEN ENGINE ---
const toggleFullscreen = () => {
  const container = videoRef.value?.parentElement;
  if (!container) return;

  if (!document.fullscreenElement) {
    container
      .requestFullscreen()
      .then(() => (isFullscreen.value = true))
      .catch((err) => console.error(err));
  } else {
    document
      .exitFullscreen()
      .then(() => (isFullscreen.value = false))
      .catch((err) => console.error(err));
  }
};

const onFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement;
};

// --- SHORTCUT HOTKEYS ENGINE ---
const handleKeyDown = (e: KeyboardEvent) => {
  // Ignore input keystrokes
  if (
    e.target instanceof HTMLInputElement ||
    e.target instanceof HTMLTextAreaElement
  ) {
    return;
  }

  switch (e.key.toLowerCase()) {
    case " ":
    case "k":
      e.preventDefault();
      togglePlay();
      break;
    case "f":
      e.preventDefault();
      toggleFullscreen();
      break;
    case "m":
      e.preventDefault();
      toggleMute();
      break;
    case "arrowup":
      e.preventDefault();
      volume.value = Math.min(1, volume.value + 0.1);
      break;
    case "arrowdown":
      e.preventDefault();
      volume.value = Math.max(0, volume.value - 0.1);
      break;
  }
};

const setupHotkeys = () => {
  window.addEventListener("keydown", handleKeyDown);
};

const removeHotkeys = () => {
  window.removeEventListener("keydown", handleKeyDown);
};

// --- PICTURE IN PIPELINE / POP-OUT WINDOW ENGINE ---
const closePip = () => {
  if (pipWindowInstance) {
    pipWindowInstance.close();
    pipWindowInstance = null;
  }
};

const togglePip = async () => {
  if (isPipActive.value) {
    closePip();
    return;
  }

  const video = videoRef.value;
  if (!video) return;

  const w = window as any;
  if (
    w.documentPictureInPicture &&
    w.documentPictureInPicture.requestWindow
  ) {
    try {
      const container = playerContainerRef.value;
      if (!container) return;

      // Request Picture-in-Picture window with same aspect ratio size
      const pipWindow = await w.documentPictureInPicture.requestWindow({
        width: Math.max(640, container.clientWidth || 640),
        height: Math.max(360, container.clientHeight || 360),
      });

      pipWindowInstance = pipWindow;
      isPipActive.value = true;
      isDocumentPip.value = true;

      // Copy all active stylesheets from main window to Pip window
      [...document.styleSheets].forEach((styleSheet) => {
        try {
          if (styleSheet.href) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = styleSheet.href;
            pipWindow.document.head.appendChild(link);
          } else {
            const cssRules = [...styleSheet.cssRules]
              .map((rule) => rule.cssText)
              .join("");
            const style = document.createElement("style");
            style.textContent = cssRules;
            pipWindow.document.head.appendChild(style);
          }
        } catch (e) {
          if (styleSheet.ownerNode) {
            const clonedNode = styleSheet.ownerNode.cloneNode(true);
            pipWindow.document.head.appendChild(clonedNode);
          }
        }
      });

      // Copy other links (fonts, icons)
      document
        .querySelectorAll('link[rel="stylesheet"]')
        .forEach((linkNode) => {
          const href = linkNode.getAttribute("href");
          if (
            href &&
            !pipWindow.document.querySelector(`link[href="${href}"]`)
          ) {
            const cloned = linkNode.cloneNode(true);
            pipWindow.document.head.appendChild(cloned);
          }
        });

      // Style pip body with full width/height & black background
      pipWindow.document.body.className =
        "v-theme--midnightGlow app-background";
      pipWindow.document.body.style.margin = "0";
      pipWindow.document.body.style.padding = "0";
      pipWindow.document.body.style.backgroundColor = "#080808";
      pipWindow.document.body.style.overflow = "hidden";
      pipWindow.document.body.style.display = "flex";
      pipWindow.document.body.style.justifyContent = "center";
      pipWindow.document.body.style.alignItems = "center";
      pipWindow.document.body.style.width = "100vw";
      pipWindow.document.body.style.height = "100vh";

      // Move player container element to the Picture-in-Picture document body
      pipWindow.document.body.appendChild(container);

      // Handle PiP window close event to restore DOM element back to original place
      pipWindow.addEventListener("pagehide", () => {
        if (wrapperRef.value && container) {
          wrapperRef.value.appendChild(container);
        }
        pipWindowInstance = null;
        isPipActive.value = false;
        isDocumentPip.value = false;
      });
    } catch (err) {
      console.error("Document PiP failed, falling back to Video PiP:", err);
      handleStandardVideoPip(video);
    }
  } else {
    handleStandardVideoPip(video);
  }
};

const handleStandardVideoPip = async (video: HTMLVideoElement) => {
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else {
      await video.requestPictureInPicture();
    }
  } catch (err) {
    console.error("Error with standard Video Picture-in-Picture:", err);
  }
};

const onEnterPip = () => {
  isPipActive.value = true;
  isDocumentPip.value = false;
};

const onLeavePip = () => {
  isPipActive.value = false;
};

const onClosePlayer = () => {
  closePip();
  emit("close-player");
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
  align-items: center;
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
  width: 480px;
  height: 270px;
  min-width: 320px;
  min-height: 180px;
  max-width: 90vw;
  max-height: 90vh;
  z-index: 999;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 193, 7, 0.5) !important;
  resize: both;
  overflow: hidden;
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
  background: rgba(8, 8, 8, 0.95);
}

.poster-logo {
  filter: drop-shadow(0 0 20px rgba(255, 193, 7, 0.25));
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
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.8) 0%,
    rgba(0, 0, 0, 0) 100%
  );
}

.bottom-gradient {
  background: linear-gradient(
    360deg,
    rgba(0, 0, 0, 0.8) 0%,
    rgba(0, 0, 0, 0) 100%
  );
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
  background: rgba(8, 8, 8, 0.9) !important;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
}

/* Animations */
.animate-pulse {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
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
  background: linear-gradient(135deg, #ffb300 0%, #ffe082 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.play-btn-glow {
  box-shadow: 0 0 15px rgba(255, 193, 7, 0.5) !important;
}

/* Picture in Picture & Pop-out Styles */
.video-player-wrapper {
  width: 100%;
  height: 100%;
}

.pip-placeholder {
  width: 100%;
  height: 100%;
  min-height: 250px;
  background: rgba(10, 10, 10, 0.95);
  backdrop-filter: blur(16px);
  border: 2px dashed rgba(255, 193, 7, 0.25);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  aspect-ratio: 16/9;
  user-select: none;
  box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.8);
  border-radius: 12px;
}

.player-pip {
  width: 100vw !important;
  height: 100vh !important;
  min-height: 0 !important;
  aspect-ratio: auto !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.shadow-btn {
  box-shadow: 0 4px 15px rgba(255, 193, 7, 0.3) !important;
}
</style>
