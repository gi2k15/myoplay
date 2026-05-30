<!-- src/components/TVGuide.vue -->
<template>
  <v-container fluid class="pa-0 fill-height align-start">
    <v-row class="ma-0 w-100 fill-height" style="height: calc(100vh - 64px);">
      
      <!-- Channels Selector Column -->
      <v-col 
        cols="12" 
        md="5" 
        lg="4" 
        class="border-right pa-4 fill-height d-flex flex-column"
        style="max-height: 100%; overflow-y: auto;"
      >
        <div class="d-flex align-center justify-space-between mb-4">
          <h3 class="text-subtitle-1 font-weight-bold uppercase-title">Guia de Canais</h3>
        </div>

        <!-- Search Bar -->
        <v-text-field
          v-model="searchQuery"
          placeholder="Buscar canal..."
          variant="outlined"
          density="compact"
          prepend-inner-icon="mdi-magnify"
          hide-details
          clearable
          class="mb-4"
        />

        <!-- Loading Indicator -->
        <div v-if="loadingChannels" class="text-center py-8">
          <v-progress-circular color="primary" indeterminate />
        </div>

        <div v-else-if="filteredChannels.length === 0" class="text-center py-8 text-medium-emphasis">
          Nenhum canal com guia EPG ativo encontrado.
        </div>

        <!-- Channels List -->
        <v-list v-else bg-color="transparent" class="pa-0">
          <v-list-item
            v-for="ch in filteredChannels"
            :key="ch.id"
            :active="selectedChannel?.id === ch.id"
            color="primary"
            class="channel-item mb-2 rounded-lg bg-surface-variant border-glass"
            @click="selectChannel(ch)"
          >
            <template v-slot:prepend>
              <v-avatar rounded="lg" size="36" class="bg-surface-variant mr-2">
                <v-img v-if="ch.logo" :src="ch.logo" />
                <v-icon v-else size="20">mdi-television-classic</v-icon>
              </v-avatar>
            </template>

            <v-list-item-title class="font-weight-bold text-caption text-sm-body-2">
              {{ ch.name }}
            </v-list-item-title>

            <v-list-item-subtitle 
              v-if="currentShows[ch.tvgId || '']" 
              class="text-caption text-secondary text-truncate mt-1"
            >
              🔴 {{ currentShows[ch.tvgId || ''].title }}
            </v-list-item-subtitle>
            <v-list-item-subtitle v-else class="text-caption text-medium-emphasis mt-1">
              Sem guia disponível
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-col>

      <!-- TV Timeline Program Schedule Column -->
      <v-col 
        cols="12" 
        md="7" 
        lg="8" 
        class="pa-4 fill-height d-flex flex-column bg-dark-glow"
        style="max-height: 100%; overflow-y: auto;"
      >
        <div v-if="!selectedChannel" class="fill-height d-flex flex-column align-center justify-center text-center py-12">
          <v-icon size="64" color="medium-emphasis" class="mb-4">mdi-television-guide</v-icon>
          <h3 class="text-h6 font-weight-bold text-medium-emphasis">Selecione um canal</h3>
          <p class="text-caption text-medium-emphasis max-width-280">
            Escolha um canal do guia na barra lateral para carregar a grade completa de programação.
          </p>
        </div>

        <div v-else class="d-flex flex-column fill-height">
          <!-- Active Channel Banner -->
          <v-card class="pa-4 mb-6 glass-card border-glass d-flex align-center justify-space-between" variant="flat">
            <div class="d-flex align-center gap-3">
              <v-avatar size="56" rounded="lg" class="bg-surface-variant">
                <v-img v-if="selectedChannel.logo" :src="selectedChannel.logo" />
                <v-icon v-else size="28">mdi-television-classic</v-icon>
              </v-avatar>
              <div>
                <h2 class="text-h6 font-weight-bold text-glow-small">{{ selectedChannel.name }}</h2>
                <div class="text-caption text-medium-emphasis">
                  Categoria: {{ selectedChannel.category }}
                </div>
              </div>
            </div>

            <v-btn
              color="primary"
              prepend-icon="mdi-play"
              class="play-btn-glow"
              @click="playSelectedChannel"
            >
              Assistir Canal
            </v-btn>
          </v-card>

          <!-- Timeline Header -->
          <h3 class="text-subtitle-1 font-weight-bold mb-4 uppercase-title d-flex align-center">
            <v-icon start color="secondary" size="small">mdi-timeline-text-outline</v-icon>
            Grade de Programação para Hoje
          </h3>

          <!-- Loading Schedule Loader -->
          <div v-if="loadingSchedule" class="text-center py-12 flex-grow-1">
            <v-progress-circular indeterminate color="secondary" size="48" />
            <div class="text-caption text-medium-emphasis mt-2">Carregando cronograma...</div>
          </div>

          <!-- Empty Timeline -->
          <div v-else-if="schedule.length === 0" class="text-center py-12 flex-grow-1 d-flex flex-column align-center justify-center">
            <v-icon size="40" color="medium-emphasis" class="mb-2">mdi-calendar-blank</v-icon>
            <div class="text-subtitle-2 text-medium-emphasis">Sem eventos programados</div>
            <p class="text-caption text-medium-emphasis max-width-280">
              Não encontramos horários de programas cadastrados para este canal nas próximas 24 horas.
            </p>
          </div>

          <!-- Timeline Grid list -->
          <div v-else class="timeline-container pr-2 flex-grow-1">
            <div 
              v-for="prog in schedule" 
              :key="prog.id" 
              class="timeline-item"
              :class="{ 'timeline-item-live border-secondary': isCurrentlyLive(prog) }"
            >
              <!-- Timeline indicator line dot -->
              <div class="timeline-badge" :class="{ 'bg-secondary': isCurrentlyLive(prog), 'bg-surface-variant': !isCurrentlyLive(prog) }">
                <div v-if="isCurrentlyLive(prog)" class="pulse-dot"></div>
              </div>

              <!-- Program Card Content -->
              <v-card 
                class="timeline-content pa-4 rounded-xl border-glass" 
                :class="{ 'live-bg': isCurrentlyLive(prog) }"
                variant="flat"
              >
                <div class="d-flex align-center justify-space-between flex-wrap gap-2 mb-1">
                  <!-- Time and Category -->
                  <div class="d-flex align-center gap-2">
                    <span class="text-subtitle-2 font-weight-bold text-secondary">
                      {{ formatTime(prog.start) }} - {{ formatTime(prog.stop) }}
                    </span>
                    <v-chip v-if="prog.category" size="x-small" color="surface-variant" variant="flat" class="text-uppercase">
                      {{ prog.category }}
                    </v-chip>
                  </div>
                  
                  <!-- Live tag badge -->
                  <v-chip v-if="isCurrentlyLive(prog)" size="x-small" color="error" class="font-weight-bold">
                    🔴 NO AR
                  </v-chip>
                </div>

                <h4 class="text-subtitle-1 font-weight-bold mb-1" :class="{ 'text-secondary': isCurrentlyLive(prog) }">
                  {{ prog.title }}
                </h4>

                <p v-if="prog.desc" class="text-body-2 text-medium-emphasis mb-0 mt-2 leading-relaxed">
                  {{ prog.desc }}
                </p>

                <!-- Progress Line indicator (Only if live) -->
                <v-progress-linear
                  v-if="isCurrentlyLive(prog)"
                  :model-value="getLiveProgress(prog)"
                  color="secondary"
                  height="4"
                  rounded
                  class="mt-3"
                />
              </v-card>
            </div>
          </div>
        </div>
      </v-col>

    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue';
import { db, type IPTVChannel, type EPGProgram } from '@/services/db';

// Props
const props = defineProps<{
  playlistId: number;
}>();

// Emits
const emit = defineEmits<{
  (e: 'play-stream', ch: IPTVChannel): void;
}>();

// UI States
const searchQuery = ref('');
const loadingChannels = ref(false);
const loadingSchedule = ref(false);

const allChannelsWithEpg = ref<IPTVChannel[]>([]);
const currentShows = ref<Record<string, EPGProgram>>({});

const selectedChannel = ref<IPTVChannel | null>(null);
const schedule = ref<EPGProgram[]>([]);

onMounted(async () => {
  await loadGuideData();
});

watch(() => props.playlistId, async () => {
  selectedChannel.value = null;
  schedule.value = [];
  await loadGuideData();
});

// --- EPG GUIDE METADATA LOADER ---
const loadGuideData = async () => {
  loadingChannels.value = true;
  allChannelsWithEpg.value = [];
  currentShows.value = {};

  try {
    const list = await db.getChannels(props.playlistId);
    
    // Filter channels that have a valid tvgId mapped
    const channels = list.filter(ch => !!ch.tvgId);
    
    // Verify which channels actually have EPG programs in IndexedDB
    const activeChannels: IPTVChannel[] = [];

    for (const ch of channels) {
      const { current } = await db.getCurrentAndNextProgramme(ch.tvgId!);
      if (current) {
        currentShows.value[ch.tvgId!] = current;
      }
      // Keep only channels that have EPG programs (current or in schedule)
      const epgEvents = await db.getEpgForChannel(ch.tvgId!);
      if (epgEvents.length > 0) {
        activeChannels.push(ch);
      }
    }

    allChannelsWithEpg.value = activeChannels;
    
    // Select first channel automatically
    if (activeChannels.length > 0) {
      selectChannel(activeChannels[0]);
    }
  } catch (err) {
    console.error(err);
  } finally {
    loadingChannels.value = false;
  }
};

const filteredChannels = computed(() => {
  if (!searchQuery.value) return allChannelsWithEpg.value;
  const q = searchQuery.value.toLowerCase().trim();
  return allChannelsWithEpg.value.filter(ch => ch.name.toLowerCase().includes(q));
});

// --- SELECT CHANNEL TIMELINE ---
const selectChannel = async (ch: IPTVChannel) => {
  selectedChannel.value = ch;
  loadingSchedule.value = true;
  schedule.value = [];

  try {
    const events = await db.getEpgForChannel(ch.tvgId!);
    
    // Filter programs: keep only programs from today/tomorrow (upcoming schedule)
    const cutoff = Date.now() - 3 * 60 * 60 * 1000; // show completed programs up to 3 hours ago
    const filtered = events.filter(prog => prog.stop >= cutoff);
    
    // Take maximum 30 events to avoid massive list
    schedule.value = filtered.slice(0, 30);
  } catch (err) {
    console.error(err);
  } finally {
    loadingSchedule.value = false;
  }
};

// --- TIMELINE CALCULATORS ---
const isCurrentlyLive = (prog: EPGProgram) => {
  const now = Date.now();
  return now >= prog.start && now <= prog.stop;
};

const getLiveProgress = (prog: EPGProgram) => {
  const now = Date.now();
  const duration = prog.stop - prog.start;
  if (duration <= 0) return 0;
  const elapsed = now - prog.start;
  return Math.min(100, Math.max(0, (elapsed / duration) * 100));
};

const formatTime = (timestamp: number) => {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// --- ACTION TRIGGER ---
const playSelectedChannel = () => {
  if (selectedChannel.value) {
    emit('play-stream', selectedChannel.value);
  }
};
</script>

<style scoped>
.uppercase-title {
  font-size: 0.75rem;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
}

.border-right {
  border-right: 1px solid rgba(255, 255, 255, 0.06) !important;
}

.border-glass {
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.channel-item {
  border: 1px solid transparent;
  transition: all 0.2s ease;
  cursor: pointer;
}

.channel-item:hover {
  background: rgba(156, 39, 176, 0.05) !important;
  border-color: rgba(156, 39, 176, 0.2);
}

.channel-item.v-list-item--active {
  background: linear-gradient(90deg, rgba(0, 245, 212, 0.1) 0%, rgba(156, 39, 176, 0.05) 100%) !important;
  border-color: rgba(0, 245, 212, 0.2);
}

.glass-card {
  background: rgba(22, 20, 36, 0.7) !important;
  backdrop-filter: blur(16px);
}

.play-btn-glow {
  box-shadow: 0 0 15px rgba(156, 39, 176, 0.5) !important;
}

.text-glow-small {
  background: linear-gradient(135deg, #a044ff 0%, #00f5d4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Timeline Custom Styles */
.timeline-container {
  position: relative;
  padding-left: 32px;
  border-left: 2px dashed rgba(255, 255, 255, 0.06);
  margin-left: 16px;
  margin-top: 10px;
}

.timeline-item {
  position: relative;
  margin-bottom: 24px;
}

.timeline-badge {
  position: absolute;
  top: 16px;
  left: -41px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 3px solid #0d0b14;
  z-index: 2;
}

.timeline-item-live {
  border-radius: 16px;
  box-shadow: 0 0 25px rgba(0, 245, 212, 0.05);
}

.live-bg {
  background: rgba(0, 245, 212, 0.03) !important;
  border-color: rgba(0, 245, 212, 0.2) !important;
}

.timeline-content {
  background: rgba(22, 20, 36, 0.4) !important;
  border: 1px solid rgba(255, 255, 255, 0.03);
  transition: all 0.2s ease;
}

.timeline-content:hover {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(22, 20, 36, 0.6) !important;
}

/* Pulsing red dot for live timeline items */
.pulse-dot {
  width: 10px;
  height: 10px;
  background-color: #00f5d4;
  border-radius: 50%;
  position: absolute;
  top: 0px;
  left: 0px;
  box-shadow: 0 0 0 0 rgba(0, 245, 212, 0.7);
  animation: pulse 1.6s infinite cubic-bezier(0.66, 0, 0, 1);
}

@keyframes pulse {
  to {
    box-shadow: 0 0 0 10px rgba(0, 245, 212, 0);
  }
}

.bg-dark-glow {
  background: radial-gradient(circle at top right, rgba(160, 68, 255, 0.02) 0%, rgba(13, 11, 20, 0) 60%);
}

.max-width-280 {
  max-width: 280px;
}

.leading-relaxed {
  line-height: 1.6;
}

.gap-3 {
  gap: 12px;
}
.gap-2 {
  gap: 8px;
}
</style>
