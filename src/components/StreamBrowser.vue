<!-- src/components/StreamBrowser.vue -->
<template>
  <v-container fluid class="pa-0 fill-height align-start">
    <v-row class="ma-0 w-100 fill-height">
      
      <!-- Category Sidebar (Hidden on mobile by default) -->
      <v-col 
        cols="12" 
        md="3" 
        class="category-sidebar border-right pa-4 fill-height d-flex flex-column"
        v-if="(!$vuetify.display.mobile && !categoriesCollapsed) || ($vuetify.display.mobile && showMobileCategories)"
        style="max-height: calc(100vh - 64px); overflow-y: auto;"
      >
        <div class="d-flex align-center justify-space-between mb-4">
          <h3 class="text-subtitle-1 font-weight-bold uppercase-title">{{ $t('streamBrowser.categoriesTitle') }}</h3>
          <div class="d-flex align-center gap-1">
            <!-- Desktop Collapse Button -->
            <v-btn
              v-if="!$vuetify.display.mobile"
              icon="mdi-chevron-left"
              variant="text"
              size="small"
              @click="categoriesCollapsed = true"
              :title="$t('streamBrowser.collapseCategories')"
            />
            <!-- Mobile Close Button -->
            <v-btn
              v-slot:default
              v-if="$vuetify.display.mobile"
              icon="mdi-close"
              variant="text"
              size="small"
              @click="showMobileCategories = false"
            />
          </div>
        </div>

        <v-list density="comfortable" nav bg-color="transparent" class="pa-0">
          <v-list-item
            value="all"
            :active="selectedCategory === 'all'"
            color="primary"
            class="category-item mb-1"
            rounded="lg"
            @click="selectCategory('all')"
          >
            <template v-slot:prepend>
              <v-icon>mdi-border-all</v-icon>
            </template>
            <v-list-item-title class="font-weight-medium">{{ $t('streamBrowser.allCategories') }}</v-list-item-title>
            <template v-slot:append>
              <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-bold">{{ totalChannelsCount }}</v-chip>
            </template>
          </v-list-item>

          <v-divider class="my-2 opacity-10" />

          <v-list-item
            v-for="cat in categories"
            :key="cat.name"
            :value="cat.name"
            :active="selectedCategory === cat.name"
            color="primary"
            class="category-item mb-1"
            rounded="lg"
            @click="selectCategory(cat.name)"
          >
            <template v-slot:prepend>
              <v-icon>{{ getCategoryIcon() }}</v-icon>
            </template>
            <v-list-item-title class="font-weight-medium text-truncate" style="max-width: 150px;">
              {{ cat.name === 'Sem Categoria' ? $t('common.noCategory') : cat.name }}
            </v-list-item-title>
            <template v-slot:append>
              <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-bold">{{ cat.count }}</v-chip>
            </template>
          </v-list-item>
        </v-list>
      </v-col>

      <!-- Channels Browser Content Area -->
      <v-col 
        cols="12" 
        :md="(!$vuetify.display.mobile && categoriesCollapsed) ? 12 : ((!$vuetify.display.mobile || showMobileCategories) ? 9 : 12)" 
        class="pa-0 d-flex flex-column fill-height overflow-hidden channels-content-area"
        style="max-height: calc(100vh - 64px);"
      >
        <!-- Live Player Top Section (Active when a live channel is playing and not floating) -->
        <div 
          v-if="type === 'live' && activeChannel && !playerFloatMode" 
          class="live-player-top-section py-2 px-4 border-bottom-glow flex-shrink-0 position-relative"
        >
          <v-row class="ma-0 justify-center">
            <!-- Player (Aumentado, largura total com limite elegante) -->
            <v-col cols="12" class="pa-1">
              <div ref="playerWrapperRef" class="player-wrapper mx-auto player-wrapper-responsive" :style="customPlayerHeightStyle">
                <VideoPlayer
                  :channel="activeChannel"
                  :floating="false"
                  @close-player="emit('close-player')"
                  @toggle-float="emit('toggle-float')"
                />
              </div>
            </v-col>
            
            <!-- Active Channel EPG / Info Card (Abaixo do player em formato de barra) -->
            <v-col cols="12" class="pa-1">
              <v-card class="glass-card py-2 px-4 rounded-xl mx-auto" style="max-width: 960px;" variant="flat">
                <div class="d-flex flex-column flex-sm-row align-sm-center justify-space-between gap-3">
                  <!-- Channel Logo and Name -->
                  <div class="d-flex align-center gap-3 flex-shrink-0" style="min-width: 220px; max-width: 300px;">
                    <v-avatar size="44" class="bg-surface-variant flex-shrink-0" v-slot:default v-if="activeChannel.logo">
                      <v-img :src="activeChannel.logo" />
                    </v-avatar>
                    <div class="min-width-0">
                      <h3 class="text-subtitle-2 font-weight-bold text-truncate text-glow-small mb-0">{{ activeChannel.name }}</h3>
                      <v-chip size="x-small" color="primary" class="font-weight-bold uppercase-tag mt-1">{{ activeChannel.category === 'Sem Categoria' ? $t('common.noCategory') : activeChannel.category }}</v-chip>
                    </div>
                  </div>

                  <!-- EPG Current Programme -->
                  <div v-if="activeChannelEpg?.current" class="flex-grow-1 min-width-0 px-sm-4 border-left-sm">
                    <div class="text-caption text-secondary font-weight-bold d-flex align-center mb-1">
                      <span class="mr-1">🔴</span> {{ $t('streamBrowser.onAirNow') }}
                    </div>
                    <div class="text-body-2 font-weight-bold text-truncate mb-1">
                      {{ activeChannelEpg.current.title }}
                    </div>
                    <div class="d-flex align-center gap-3">
                      <v-progress-linear :model-value="getEpgProgress(activeChannelEpg.current)" color="secondary" height="4" rounded class="flex-grow-1" style="max-width: 150px;" />
                      <span class="text-caption text-medium-emphasis flex-shrink-0">
                        {{ formatTime(activeChannelEpg.current.start) }} - {{ formatTime(activeChannelEpg.current.stop) }} 
                        ({{ Math.round(getEpgProgress(activeChannelEpg.current)) }}%)
                      </span>
                    </div>
                  </div>

                  <!-- EPG Next Programme -->
                  <div v-if="activeChannelEpg?.next" class="flex-grow-1 min-width-0 px-sm-4 border-left-sm hidden-xs-only">
                    <div class="text-caption text-medium-emphasis font-weight-bold mb-1">{{ $t('streamBrowser.nextProg') }}</div>
                    <div class="text-body-2 font-weight-bold text-truncate mb-1">{{ activeChannelEpg.next.title }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ $t('streamBrowser.startsAt', { time: formatTime(activeChannelEpg.next.start) }) }}
                    </div>
                  </div>

                  <!-- Fallback if no EPG -->
                  <div v-if="!activeChannelEpg?.current" class="text-caption text-medium-emphasis italic py-2 flex-grow-1 text-center">
                    {{ $t('streamBrowser.noEpgShort') }}
                  </div>
                </div>
              </v-card>
            </v-col>
          </v-row>

          <!-- Draggable Divider Handle (Only visible on desktop) -->
          <div 
            v-if="!mobile" 
            class="player-resize-divider"
            @mousedown="initResize"
            @dblclick="resetResize"
            :title="$t('streamBrowser.resizeTooltip')"
          >
            <div class="resize-handle-line"></div>
          </div>
        </div>

        <!-- Browser Top Toolbar (Fixed/Static) -->
        <div class="pa-4 pb-2 flex-shrink-0">
          <div class="d-flex flex-column flex-sm-row align-sm-center justify-space-between gap-3">
            <div class="d-flex align-center">
              <!-- Mobile Category Toggle -->
              <v-btn
                v-if="$vuetify.display.mobile"
                icon="mdi-format-list-bulleted"
                variant="text"
                color="primary"
                class="mr-2"
                @click="showMobileCategories = !showMobileCategories"
              />
              <!-- Desktop Category Toggle (Expand Button) -->
              <v-btn
                v-if="!$vuetify.display.mobile && categoriesCollapsed"
                icon="mdi-chevron-right"
                variant="text"
                color="primary"
                class="mr-2"
                @click="categoriesCollapsed = false"
                :title="$t('streamBrowser.expandCategories')"
              />
              <div>
                <h2 class="text-h5 font-weight-bold d-flex align-center">
                  {{ getBrowserTitle() }}
                  <v-chip size="small" color="secondary" class="ml-2 font-weight-bold">
                    {{ filteredChannels.length }}
                  </v-chip>
                </h2>
                <div class="text-caption text-medium-emphasis">
                  {{ selectedCategory === 'all' ? getBrowserSubtitleAll() : $t('streamBrowser.categoryLabel', { name: selectedCategory === 'Sem Categoria' ? $t('common.noCategory') : selectedCategory }) }}
                </div>
              </div>
            </div>

            <!-- Search & Sort Controls -->
            <div class="d-flex align-center gap-2 w-100 w-sm-auto" style="max-width: 480px;">
              <v-select
                v-if="type === 'movie' || type === 'series'"
                v-model="sortBy"
                :items="sortOptions"
                :label="$t('streamBrowser.sortOptions.label')"
                variant="outlined"
                density="compact"
                hide-details
                prepend-inner-icon="mdi-sort"
                style="max-width: 200px; min-width: 170px;"
                @update:model-value="resetPagination"
              />

              <v-text-field
                v-model="searchQuery"
                :placeholder="$t('streamBrowser.searchPlaceholder')"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-magnify"
                hide-details
                clearable
                width="280px"
                @update:model-value="resetPagination"
              />
            </div>
          </div>
        </div>

        <!-- Scrollable Channels Container -->
        <div 
          class="flex-grow-1 overflow-y-auto px-4 pb-4 pt-2"
          @scroll="onScroll"
        >

          <!-- No Channels Alert -->
          <div v-if="filteredChannels.length === 0" class="text-center py-12">
            <v-icon size="60" color="medium-emphasis" class="mb-4">mdi-alert-circle-outline</v-icon>
            <h3 class="text-h6 font-weight-bold text-medium-emphasis">{{ $t('streamBrowser.noChannelsSearchTitle') }}</h3>
            <p class="text-caption text-medium-emphasis">{{ $t('streamBrowser.noChannelsSearchDesc') }}</p>
          </div>

          <!-- Live Channels View (List Layout) -->
          <v-list v-else-if="type === 'live' || type === 'favorites'" bg-color="transparent" class="pa-0">
            <v-card 
              v-for="ch in paginatedChannels" 
              :key="ch.id"
              class="mb-3 glass-channel-card" 
              variant="flat"
              @click="playStream(ch)"
            >
              <div class="d-flex align-center pa-3 gap-3">
                <!-- Channel Logo -->
                <v-avatar size="50" rounded="lg" class="bg-surface-variant flex-shrink-0">
                  <v-img v-if="ch.logo" :src="ch.logo" cover />
                  <v-icon v-else size="28" color="medium-emphasis">mdi-television-classic</v-icon>
                </v-avatar>

                <!-- Channel Metadata & EPG -->
                <div class="flex-grow-1 min-width-0">
                  <div class="d-flex align-center">
                    <span class="text-subtitle-1 font-weight-bold text-truncate pr-2">{{ ch.name }}</span>
                    <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-bold">
                      {{ ch.category }}
                    </v-chip>
                  </div>

                  <!-- Live EPG info -->
                  <div v-if="epgData[ch.tvgId || '']?.current" class="mt-1">
                    <div class="d-flex align-center justify-space-between text-caption font-weight-medium">
                      <span class="text-secondary text-truncate pr-2">
                        🔴 No Ar: {{ epgData[ch.tvgId || ''].current?.title }}
                      </span>
                      <span class="text-medium-emphasis text-caption flex-shrink-0">
                        {{ formatTime(epgData[ch.tvgId || ''].current?.start || 0) }} - 
                        {{ formatTime(epgData[ch.tvgId || ''].current?.stop || 0) }}
                      </span>
                    </div>
                    <v-progress-linear
                      :model-value="getEpgProgress(epgData[ch.tvgId || ''].current)"
                      color="secondary"
                      height="4"
                      rounded
                      class="mt-1"
                    />
                    <!-- Next EPG info -->
                    <div v-if="epgData[ch.tvgId || '']?.next" class="text-caption text-medium-emphasis text-truncate mt-1">
                      Seguinte: {{ epgData[ch.tvgId || ''].next?.title }} ({{ formatTime(epgData[ch.tvgId || ''].next?.start || 0) }})
                    </div>
                  </div>
                  <div v-else class="text-caption text-medium-emphasis">
                    Nenhuma informação de guia disponível.
                  </div>
                </div>

                <!-- Action buttons -->
                <div class="d-flex align-center flex-shrink-0" @click.stop>
                  <v-btn
                    :icon="isFavorite(ch.id) ? 'mdi-star' : 'mdi-star-outline'"
                    :color="isFavorite(ch.id) ? 'warning' : 'medium-emphasis'"
                    variant="text"
                    size="small"
                    @click="toggleFavorite(ch.id)"
                  />
                  <v-btn
                    icon="mdi-play"
                    color="primary"
                    variant="flat"
                    size="small"
                    class="ml-2 play-btn-glow"
                    @click="playStream(ch)"
                  />
                </div>
              </div>
            </v-card>
          </v-list>

          <!-- Movies View (Grid Layout) -->
          <v-row v-else-if="type === 'movie'" class="ma-0 gap-y-4">
            <v-col 
              cols="6" 
              sm="4" 
              md="3" 
              lg="2" 
              v-for="ch in paginatedChannels" 
              :key="ch.id"
              class="pa-2"
            >
              <v-card 
                class="movie-card fill-height d-flex flex-column rounded-xl border-glass" 
                variant="flat"
                @click="openMovieDetails(ch)"
              >
                <!-- Poster Image -->
                <div class="movie-poster-container flex-shrink-0">
                  <v-img 
                    v-if="ch.logo" 
                    :src="ch.logo" 
                    cover 
                    aspect-ratio="0.67" 
                    class="bg-surface-variant rounded-t-xl"
                  />
                  <div v-else class="movie-poster-placeholder d-flex flex-column align-center justify-center rounded-t-xl">
                    <v-icon size="40" color="medium-emphasis">mdi-movie-open</v-icon>
                  </div>
                  
                  <!-- Favorite Overlay Button -->
                  <v-btn
                    :icon="isFavorite(ch.id) ? 'mdi-star' : 'mdi-star-outline'"
                    :color="isFavorite(ch.id) ? 'warning' : 'white'"
                    variant="flat"
                    size="x-small"
                    class="favorite-overlay-btn"
                    @click.stop="toggleFavorite(ch.id)"
                  />

                  <!-- Info overlays -->
                  <v-chip v-if="ch.rating" size="x-small" color="secondary" class="rating-overlay font-weight-bold">
                    ★ {{ ch.rating }}
                  </v-chip>
                  
                  <v-chip v-if="ch.year" size="x-small" color="black" class="year-overlay font-weight-bold">
                    {{ ch.year }}
                  </v-chip>

                  <!-- Play Hover Overlay -->
                  <div class="play-overlay d-flex align-center justify-center">
                    <v-btn icon="mdi-play" color="primary" size="large" class="play-btn-glow" />
                  </div>
                </div>

                <!-- Details -->
                <v-card-text class="pa-3 d-flex flex-column justify-space-between flex-grow-1 min-width-0">
                  <div class="text-subtitle-2 font-weight-bold text-truncate w-100 mb-1" :title="ch.name">
                    {{ ch.name }}
                  </div>
                  <div class="text-caption text-medium-emphasis text-truncate w-100">
                    {{ ch.category }}
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Series View (Grid Layout) -->
          <v-row v-else-if="type === 'series'" class="ma-0 gap-y-4">
            <v-col 
              cols="6" 
              sm="4" 
              md="3" 
              lg="2" 
              v-for="ch in paginatedChannels" 
              :key="ch.id"
              class="pa-2"
            >
              <v-card 
                class="movie-card fill-height d-flex flex-column rounded-xl border-glass" 
                variant="flat"
                @click="openSeriesDetails(ch)"
              >
                <!-- Cover Image -->
                <div class="movie-poster-container flex-shrink-0">
                  <v-img 
                    v-if="ch.logo" 
                    :src="ch.logo" 
                    cover 
                    aspect-ratio="0.67" 
                    class="bg-surface-variant rounded-t-xl"
                  />
                  <div v-else class="movie-poster-placeholder d-flex flex-column align-center justify-center rounded-t-xl">
                    <v-icon size="40" color="medium-emphasis">mdi-youtube-subscription</v-icon>
                  </div>
                  
                  <v-btn
                    :icon="isFavorite(ch.id) ? 'mdi-star' : 'mdi-star-outline'"
                    :color="isFavorite(ch.id) ? 'warning' : 'white'"
                    variant="flat"
                    size="x-small"
                    class="favorite-overlay-btn"
                    @click.stop="toggleFavorite(ch.id)"
                  />

                  <v-chip v-if="ch.rating" size="x-small" color="secondary" class="rating-overlay font-weight-bold">
                    ★ {{ ch.rating }}
                  </v-chip>

                  <!-- Show Hub Overlay -->
                  <div class="play-overlay d-flex align-center justify-center">
                    <v-btn icon="mdi-open-in-new" color="secondary" size="large" />
                  </div>
                </div>

                <!-- Details -->
                <v-card-text class="pa-3 d-flex flex-column justify-space-between flex-grow-1 min-width-0">
                  <div class="text-subtitle-2 font-weight-bold text-truncate w-100 mb-1" :title="ch.name">
                    {{ ch.name }}
                  </div>
                  <div class="text-caption text-medium-emphasis text-truncate w-100">
                    {{ ch.category }}
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Load More trigger -->
          <div v-if="hasMore" class="d-flex justify-center my-6">
            <v-btn color="secondary" variant="outlined" rounded="xl" @click="loadNextPage">
              Carregar Mais Canais...
            </v-btn>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- TV SERIES DETAILS DIALOG/HUB -->
    <v-dialog v-model="seriesDialog" max-width="850" class="series-dialog rounded-xl">
      <v-card v-if="selectedSeries" class="glass-dialog pa-4 rounded-xl border-glass">
        <div class="d-flex align-end justify-end mb-2">
          <v-btn icon="mdi-close" variant="text" size="small" @click="seriesDialog = false" />
        </div>

        <v-row class="ma-0 mb-6">
          <!-- Series Cover -->
          <v-col cols="12" sm="4" class="pa-2">
            <v-img 
              v-if="selectedSeries.logo" 
              :src="selectedSeries.logo" 
              cover 
              aspect-ratio="0.67" 
              class="bg-surface-variant rounded-xl elevation-6"
            />
            <div v-else class="movie-poster-placeholder d-flex align-center justify-center rounded-xl elevation-6 py-12">
              <v-icon size="60" color="medium-emphasis">mdi-youtube-subscription</v-icon>
            </div>
          </v-col>

          <!-- Series Meta Info -->
          <v-col cols="12" sm="8" class="pa-2 d-flex flex-column justify-center">
            <h2 class="text-h4 font-weight-bold mb-2 text-glow-small">{{ selectedSeries.name }}</h2>
            <div class="d-flex align-center mb-4 gap-2 flex-wrap">
              <v-chip size="small" color="primary" class="font-weight-bold">{{ selectedSeries.category }}</v-chip>
              <v-chip v-if="selectedSeries.rating" size="small" color="secondary" class="font-weight-bold">★ {{ selectedSeries.rating }}</v-chip>
              <v-chip v-if="selectedSeries.year" size="small" color="secondary" variant="tonal" class="font-weight-bold">{{ selectedSeries.year }}</v-chip>
            </div>
            
            <p v-if="selectedSeries.plot" class="text-body-2 text-medium-emphasis mb-0 leading-relaxed max-plot-height">
              {{ selectedSeries.plot }}
            </p>
            <p v-else class="text-body-2 text-medium-emphasis mb-0 italic">
              Nenhuma descrição disponível para esta série.
            </p>
          </v-col>
        </v-row>

        <v-divider class="mb-4 opacity-10" />

        <!-- Seasons and Episodes Hub -->
        <h3 class="text-h6 font-weight-bold mb-3 d-flex align-center">
          <v-icon start color="secondary">mdi-folder-play</v-icon> {{ $t('streamBrowser.seriesDetails.seasons') }} & {{ $t('streamBrowser.seriesDetails.episodes') }}
        </h3>

        <!-- Loading Episodes Circular -->
        <div v-if="loadingEpisodes" class="text-center py-8">
          <v-progress-circular color="primary" indeterminate size="40" class="mb-2" />
          <div class="text-caption text-medium-emphasis">{{ $t('streamBrowser.seriesDetails.loadingEpisodes') }}</div>
        </div>

        <div v-else-if="Object.keys(seasonsData).length === 0" class="text-center py-8 text-medium-emphasis">
          {{ $t('streamBrowser.seriesDetails.noEpisodes') }}
        </div>

        <div v-else>
          <!-- Season Tabs -->
          <v-tabs v-model="activeSeason" color="secondary" class="border-bottom mb-4">
            <v-tab v-for="season in sortedSeasons" :key="season" :value="season">
              {{ $t('streamBrowser.seriesDetails.seasonLabel', { season }) }}
            </v-tab>
          </v-tabs>

          <!-- Episode List -->
          <v-window v-model="activeSeason">
            <v-window-item v-for="season in sortedSeasons" :key="season" :value="season">
              <v-list bg-color="transparent" class="pa-0 max-episodes-height">
                <v-list-item
                  v-for="ep in seasonsData[season]"
                  :key="ep.id"
                  class="mb-2 rounded-lg bg-surface-variant border-glass"
                  @click="playEpisode(ep)"
                >
                  <template v-slot:prepend>
                    <v-avatar rounded="lg" color="surface-variant" size="45" class="mr-2 flex-shrink-0">
                      <v-img v-if="ep.logo" :src="ep.logo" cover />
                      <v-icon v-else color="medium-emphasis">mdi-play-circle</v-icon>
                    </v-avatar>
                  </template>
                  
                  <v-list-item-title class="font-weight-bold text-white">
                    {{ ep.episodeNum }}. {{ ep.title }}
                  </v-list-item-title>
                  
                  <v-list-item-subtitle v-if="ep.plot" class="text-caption text-medium-emphasis text-truncate mt-1" style="max-width: 480px;">
                    {{ ep.plot }}
                  </v-list-item-subtitle>

                  <template v-slot:append>
                    <div class="d-flex align-center">
                      <span v-if="ep.duration" class="text-caption text-medium-emphasis mr-4">
                        {{ ep.duration }}
                      </span>
                      <v-btn icon="mdi-play" color="secondary" size="small" variant="flat" class="play-btn-glow" />
                    </div>
                  </template>
                </v-list-item>
              </v-list>
            </v-window-item>
          </v-window>
        </div>
      </v-card>
    </v-dialog>

    <!-- MOVIE DETAILS DIALOG -->
    <v-dialog v-model="movieDialog" max-width="850" class="movie-dialog rounded-xl">
      <v-card v-if="selectedMovie" class="glass-dialog pa-4 rounded-xl border-glass">
        <!-- Botão fechar -->
        <div class="d-flex align-end justify-end mb-2">
          <v-btn icon="mdi-close" variant="text" size="small" @click="movieDialog = false" />
        </div>

        <v-row class="ma-0 mb-4 movie-details-row">
          <!-- Poster do Filme -->
          <v-col cols="12" sm="4" class="pa-2">
            <v-img 
              v-if="selectedMovie.logo" 
              :src="selectedMovie.logo" 
              cover 
              aspect-ratio="0.67" 
              class="bg-surface-variant rounded-xl elevation-6"
            />
            <div v-else class="movie-poster-placeholder d-flex align-center justify-center rounded-xl elevation-6 py-12">
              <v-icon size="60" color="medium-emphasis">mdi-movie-open</v-icon>
            </div>
          </v-col>

          <!-- Informações de Metadados do Filme -->
          <v-col cols="12" sm="8" class="pa-2 d-flex flex-column justify-start movie-details-col">
            <h2 class="text-h4 font-weight-bold mb-2 text-glow-small">{{ selectedMovie.name }}</h2>
            
            <div class="d-flex align-center mb-4 gap-2 flex-wrap">
              <v-chip size="small" color="primary" class="font-weight-bold">{{ selectedMovie.category }}</v-chip>
              <v-chip v-if="selectedMovie.rating" size="small" color="secondary" class="font-weight-bold">★ {{ selectedMovie.rating }}</v-chip>
              <v-chip v-if="selectedMovie.year" size="small" color="secondary" variant="tonal" class="font-weight-bold">{{ selectedMovie.year }}</v-chip>
              <v-chip v-if="selectedMovie.duration" size="small" color="secondary" variant="tonal" class="font-weight-bold">{{ selectedMovie.duration }} min</v-chip>
            </div>

            <!-- Gênero e Diretor -->
            <div v-if="selectedMovie.genre || selectedMovie.director" class="ma-0 mb-4 text-caption text-medium-emphasis">
              <span v-if="selectedMovie.genre" class="mr-3"><strong>{{ $t('common.category') }}:</strong> {{ selectedMovie.genre }}</span>
              <span v-if="selectedMovie.director"><strong>{{ $t('streamBrowser.movieDetails.directorLabel') }}</strong> {{ selectedMovie.director }}</span>
            </div>
            
            <!-- Sinopse -->
            <div class="flex-grow-1 mb-6 d-flex flex-column overflow-hidden">
              <h4 class="text-subtitle-2 font-weight-bold text-glow-small mb-2">{{ $t('streamBrowser.movieDetails.sinopse') }}</h4>
              <p v-if="selectedMovie.plot" class="text-body-2 text-medium-emphasis mb-0 leading-relaxed max-plot-height-movie">
                {{ selectedMovie.plot }}
              </p>
              <p v-else-if="loadingMovieInfo" class="text-body-2 text-medium-emphasis mb-0 italic">
                <v-progress-circular size="16" width="2" color="secondary" indeterminate class="mr-2" />
                {{ $t('streamBrowser.movieDetails.loadingOnline') }}
              </p>
              <p v-else class="text-body-2 text-medium-emphasis mb-0 italic">
                {{ $t('streamBrowser.movieDetails.noSynopsis') }}
              </p>
            </div>

            <!-- Alerta de erro de busca -->
            <v-alert v-if="movieErrorMsg" type="warning" variant="tonal" density="compact" class="mb-4 text-caption">
              {{ movieErrorMsg }}
            </v-alert>

            <!-- Barra de Ações -->
            <div class="d-flex align-center justify-space-between flex-wrap gap-2 pt-2 border-top">
              <div class="d-flex align-center gap-2">
                <!-- Botão Assistir -->
                <v-btn
                  prepend-icon="mdi-play"
                  color="primary"
                  variant="flat"
                  size="large"
                  class="play-btn-glow"
                  @click="playMovie(selectedMovie)"
                >
                  {{ $t('streamBrowser.movieDetails.watchBtn') }}
                </v-btn>

                <!-- Botão Favoritar -->
                <v-btn
                  :prepend-icon="isFavorite(selectedMovie.id) ? 'mdi-star' : 'mdi-star-outline'"
                  :color="isFavorite(selectedMovie.id) ? 'warning' : 'medium-emphasis'"
                  variant="outlined"
                  size="large"
                  @click="toggleFavorite(selectedMovie.id)"
                >
                  {{ isFavorite(selectedMovie.id) ? $t('streamBrowser.movieDetails.favorited') : $t('streamBrowser.movieDetails.favorite') }}
                </v-btn>
              </div>

              <!-- Botão Busca Manual -->
              <v-btn
                prepend-icon="mdi-movie-search-outline"
                variant="text"
                color="secondary"
                size="small"
                :loading="loadingMovieInfo"
                @click="forceSearchMetadata"
              >
                {{ $t('streamBrowser.movieDetails.fetchMetadata') }}
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { db, type IPTVChannel } from '@/services/db';
import { XtreamClient, type XtreamEpisode } from '@/services/xtreamClient';
import VideoPlayer from '@/components/VideoPlayer.vue';

const { t } = useI18n();

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

// Props
const props = defineProps<{
  playlistId: number;
  type: 'live' | 'movie' | 'series' | 'favorites';
  activeChannel?: IPTVChannel | null;
  activeChannelEpg?: { current?: any; next?: any };
  playerFloatMode?: boolean;
}>();

// Emits
const emit = defineEmits<{
  (e: 'play-stream', ch: IPTVChannel): void;
  (e: 'close-player'): void;
  (e: 'toggle-float'): void;
}>();

// UI States
const searchQuery = ref('');
const selectedCategory = ref('all');
const showMobileCategories = ref(false);
const categoriesCollapsed = ref(localStorage.getItem('categories_collapsed') === 'true');

watch(categoriesCollapsed, (val) => {
  localStorage.setItem('categories_collapsed', String(val));
});

// Sorting States
const sortBy = ref(localStorage.getItem('movie_sort_by') || 'added');
watch(sortBy, (val) => {
  localStorage.setItem('movie_sort_by', val);
});

const sortOptions = computed(() => [
  { title: t('streamBrowser.sortOptions.default'), value: 'added' },
  { title: t('streamBrowser.sortOptions.yearDesc'), value: 'year' },
  { title: t('streamBrowser.sortOptions.rating'), value: 'rating' },
  { title: t('streamBrowser.sortOptions.nameAsc'), value: 'name' }
]);

const getM3uIndex = (id: string) => {
  const parts = id.split('_');
  const lastPart = parts[parts.length - 1];
  return parseInt(lastPart, 10);
};

const categories = ref<{ name: string; count: number }[]>([]);
const allChannels = ref<IPTVChannel[]>([]);
const favoritesSet = ref<Set<string>>(new Set());

// EPG data map: key is tvgId
const epgData = ref<Record<string, { current?: any; next?: any; lastFetched?: number }>>({});

// TV Movie States
const movieDialog = ref(false);
const selectedMovie = ref<IPTVChannel | null>(null);
const loadingMovieInfo = ref(false);
const movieErrorMsg = ref('');

// TV Series States
const seriesDialog = ref(false);
const selectedSeries = ref<IPTVChannel | null>(null);
const loadingEpisodes = ref(false);
const seasonsData = ref<Record<number, XtreamEpisode[]>>({});
const activeSeason = ref<number>(1);

// Pagination / Sliced Lazy Loading
const itemsPerPage = 40;
const pageLimit = ref(1);

// Resizing the live player
const playerWrapperRef = ref<HTMLElement | null>(null);
const playerHeight = ref<number | null>(null);

const loadPlayerHeight = async () => {
  try {
    const height = await db.getSetting('live_player_height', null);
    playerHeight.value = height;
  } catch (err) {
    console.error('Error loading player height:', err);
  }
};

const customPlayerHeightStyle = computed(() => {
  if (mobile.value || playerHeight.value === null) return {};
  return {
    height: `${playerHeight.value}px`,
    maxHeight: 'none',
    minHeight: '180px'
  };
});

let isResizing = false;
let startY = 0;
let startHeight = 0;

const initResize = (e: MouseEvent) => {
  if (mobile.value) return;
  e.preventDefault();
  isResizing = true;
  startY = e.clientY;
  
  if (playerWrapperRef.value) {
    startHeight = playerWrapperRef.value.clientHeight;
  } else {
    startHeight = playerHeight.value || 300;
  }

  window.addEventListener('mousemove', onResize);
  window.addEventListener('mouseup', stopResize);
  document.body.style.cursor = 'ns-resize';
  document.body.style.userSelect = 'none';
};

const onResize = (e: MouseEvent) => {
  if (!isResizing) return;
  const dy = e.clientY - startY;
  playerHeight.value = Math.min(600, Math.max(180, startHeight + dy));
};

const stopResize = async () => {
  if (!isResizing) return;
  isResizing = false;
  window.removeEventListener('mousemove', onResize);
  window.removeEventListener('mouseup', stopResize);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';

  try {
    await db.setSetting('live_player_height', playerHeight.value);
  } catch (err) {
    console.error('Error saving player height:', err);
  }
};

const resetResize = async () => {
  playerHeight.value = null;
  try {
    await db.setSetting('live_player_height', null);
  } catch (err) {
    console.error('Error resetting player height:', err);
  }
};

const onPlaylistUpdatedEvent = async (e: Event) => {
  const customEv = e as CustomEvent<{ playlistId: number }>;
  if (customEv.detail && customEv.detail.playlistId === props.playlistId) {
    console.log(`[StreamBrowser] Active playlist ${props.playlistId} was updated, reloading...`);
    await loadFavorites();
    await loadBrowserData();
  }
};

onMounted(async () => {
  await loadFavorites();
  await loadBrowserData();
  await loadPlayerHeight();
  window.addEventListener('playlist-updated', onPlaylistUpdatedEvent);
});

onUnmounted(() => {
  window.removeEventListener('playlist-updated', onPlaylistUpdatedEvent);
  window.removeEventListener('mousemove', onResize);
  window.removeEventListener('mouseup', stopResize);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
});

// Watch parameters changes (e.g. switching between Live TV and Movies)
watch(() => [props.playlistId, props.type], async () => {
  selectedCategory.value = 'all';
  searchQuery.value = '';
  resetPagination();
  await loadFavorites();
  await loadBrowserData();
}, { deep: true });

const resetPagination = () => {
  pageLimit.value = 1;
};

// --- DATA INGESTION & HEURISTICS ---
const loadFavorites = async () => {
  try {
    const list = await db.getFavorites(props.playlistId);
    favoritesSet.value = new Set(list);
  } catch (err) {
    console.error(err);
  }
};

const isFavorite = (id: string) => favoritesSet.value.has(id);

const toggleFavorite = async (id: string) => {
  try {
    if (isFavorite(id)) {
      await db.removeFavorite(props.playlistId, id);
      favoritesSet.value.delete(id);
      
      // If browsing favorites, immediately filter it out
      if (props.type === 'favorites') {
        allChannels.value = allChannels.value.filter(ch => ch.id !== id);
      }
    } else {
      await db.addFavorite(props.playlistId, id);
      favoritesSet.value.add(id);
    }
  } catch (err) {
    console.error(err);
  }
};

const loadBrowserData = async () => {
  try {
    // Reset data
    allChannels.value = [];
    categories.value = [];
    epgData.value = {};

    let channels: IPTVChannel[] = [];
    
    if (props.type === 'favorites') {
      const activeChannels = await db.getChannels(props.playlistId);
      channels = activeChannels.filter(c => favoritesSet.value.has(c.id));
    } else {
      channels = await db.getChannelsByType(props.playlistId, props.type);
    }

    allChannels.value = channels;

    // Build Category counts
    const countsMap: Record<string, number> = {};
    for (const ch of channels) {
      const cat = ch.category || 'Sem Categoria';
      countsMap[cat] = (countsMap[cat] || 0) + 1;
    }

    categories.value = Object.keys(countsMap).map(name => ({
      name,
      count: countsMap[name]
    })).sort((a, b) => b.count - a.count); // sort categories by size

    // Fetch EPG guides for live TV immediately on visible/paginated elements
    if (props.type === 'live' || props.type === 'favorites') {
      fetchEpgDataForVisibleChannels();
    }
  } catch (err) {
    console.error(err);
  }
};

const totalChannelsCount = computed(() => allChannels.value.length);

// Select category
const selectCategory = (cat: string) => {
  selectedCategory.value = cat;
  resetPagination();
  if (mobile.value) {
    showMobileCategories.value = false;
  }
  // Load EPG for new list
  if (props.type === 'live' || props.type === 'favorites') {
    setTimeout(fetchEpgDataForVisibleChannels, 100);
  }
};

// Icon provider for category items
const getCategoryIcon = () => {
  if (props.type === 'live') return 'mdi-television-box';
  if (props.type === 'movie') return 'mdi-movie-outline';
  if (props.type === 'series') return 'mdi-play-box-multiple';
  return 'mdi-star-outline';
};

const getBrowserTitle = () => {
  if (props.type === 'live') return t('streamBrowser.titleLive');
  if (props.type === 'movie') return t('streamBrowser.titleMovie');
  if (props.type === 'series') return t('streamBrowser.titleSeries');
  return t('streamBrowser.titleFavorites');
};

const getBrowserSubtitleAll = () => {
  if (props.type === 'live') return t('streamBrowser.showingAll');
  if (props.type === 'movie') return t('streamBrowser.showingAllMovies');
  if (props.type === 'series') return t('streamBrowser.showingAllSeries');
  return t('streamBrowser.showingAllFavorites');
};

// Filtered Channels logic
const filteredChannels = computed(() => {
  let result = allChannels.value;

  // Filter category
  if (selectedCategory.value !== 'all') {
    result = result.filter(ch => (ch.category || 'Sem Categoria') === selectedCategory.value);
  }

  // Filter search query
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase().trim();
    result = result.filter(ch => ch.name.toLowerCase().includes(q));
  }

  // Sort movies and series in-memory
  if (props.type === 'movie' || props.type === 'series') {
    result = [...result];
    if (sortBy.value === 'added') {
      result.sort((a, b) => {
        const addedA = a.added ? parseInt(a.added, 10) : 0;
        const addedB = b.added ? parseInt(b.added, 10) : 0;
        if (addedA !== addedB) {
          return addedB - addedA; // Newest added first
        }
        const yearA = a.year ? parseInt(a.year, 10) : 0;
        const yearB = b.year ? parseInt(b.year, 10) : 0;
        if (yearA !== yearB) {
          return yearB - yearA; // Newest release first
        }
        const ratingA = a.rating ? parseFloat(a.rating) : 0;
        const ratingB = b.rating ? parseFloat(b.rating) : 0;
        if (ratingA !== ratingB) {
          return ratingB - ratingA; // Highest rating first
        }
        if (a.xtreamId && b.xtreamId) {
          return b.xtreamId - a.xtreamId; // Newest provider ID first
        }
        const indexA = getM3uIndex(a.id);
        const indexB = getM3uIndex(b.id);
        if (!isNaN(indexA) && !isNaN(indexB)) {
          return indexA - indexB; // M3U playlist order
        }
        return a.name.localeCompare(b.name);
      });
    } else if (sortBy.value === 'year') {
      result.sort((a, b) => {
        const yearA = a.year ? parseInt(a.year, 10) : 0;
        const yearB = b.year ? parseInt(b.year, 10) : 0;
        if (yearA !== yearB) {
          return yearB - yearA; // Newest release first
        }
        const addedA = a.added ? parseInt(a.added, 10) : 0;
        const addedB = b.added ? parseInt(b.added, 10) : 0;
        if (addedA !== addedB) {
          return addedB - addedA; // Newest added first
        }
        const ratingA = a.rating ? parseFloat(a.rating) : 0;
        const ratingB = b.rating ? parseFloat(b.rating) : 0;
        if (ratingA !== ratingB) {
          return ratingB - ratingA; // Highest rating first
        }
        return a.name.localeCompare(b.name);
      });
    } else if (sortBy.value === 'rating') {
      result.sort((a, b) => {
        const ratingA = a.rating ? parseFloat(a.rating) : 0;
        const ratingB = b.rating ? parseFloat(b.rating) : 0;
        if (ratingA !== ratingB) {
          return ratingB - ratingA; // Highest rating first
        }
        const addedA = a.added ? parseInt(a.added, 10) : 0;
        const addedB = b.added ? parseInt(b.added, 10) : 0;
        if (addedA !== addedB) {
          return addedB - addedA; // Newest added first
        }
        const yearA = a.year ? parseInt(a.year, 10) : 0;
        const yearB = b.year ? parseInt(b.year, 10) : 0;
        if (yearA !== yearB) {
          return yearB - yearA; // Newest release first
        }
        return a.name.localeCompare(b.name);
      });
    } else if (sortBy.value === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  return result;
});

// Paginated slicing
const paginatedChannels = computed(() => {
  const limit = pageLimit.value * itemsPerPage;
  return filteredChannels.value.slice(0, limit);
});

// Watch paginated channels changes (e.g., search, category switch, scrolling) to dynamically resolve EPG
watch(paginatedChannels, () => {
  if (props.type === 'live' || props.type === 'favorites') {
    fetchEpgDataForVisibleChannels();
  }
});

const hasMore = computed(() => {
  return paginatedChannels.value.length < filteredChannels.value.length;
});

const loadNextPage = () => {
  pageLimit.value++;
  if (props.type === 'live' || props.type === 'favorites') {
    setTimeout(fetchEpgDataForVisibleChannels, 100);
  }
};

// Infinite Scroll trigger on container scroll
const onScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  const bottomThreshold = target.scrollHeight - target.scrollTop <= target.clientHeight + 150;
  if (bottomThreshold && hasMore.value) {
    loadNextPage();
  }
};

// Mobile helper
import { useDisplay } from 'vuetify';
const { mobile } = useDisplay();

// --- EPG MAPPING & DYNAMIC RESOLUTION ---
const fetchEpgDataForVisibleChannels = async () => {
  const visible = paginatedChannels.value;
  const now = Date.now();
  
  // Resolve current/next program for each visible channel asynchronously
  for (const ch of visible) {
    if (ch.tvgId) {
      const cached = epgData.value[ch.tvgId];
      // A cache is valid if it exists and the current show matches the current time,
      // or if it doesn't have a show but we checked it very recently (under 60s) to prevent DB spamming.
      const isCacheValid = cached && (
        (cached.current && now >= cached.current.start && now <= cached.current.stop) ||
        (!cached.current && cached.lastFetched && now - cached.lastFetched < 60000)
      );

      if (!isCacheValid) {
        // Fetch from DB
        db.getCurrentAndNextProgramme(ch.tvgId).then(({ current, next }) => {
          epgData.value[ch.tvgId!] = { 
            current, 
            next,
            lastFetched: now
          };
        }).catch(err => {
          console.error(`Error resolving EPG for channel ${ch.name}:`, err);
        });
      }
    }
  }
};

const formatTime = (timestamp: number) => {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getEpgProgress = (prog: any) => {
  if (!prog) return 0;
  const now = Date.now();
  const duration = prog.stop - prog.start;
  if (duration <= 0) return 0;
  const elapsed = now - prog.start;
  return Math.min(100, Math.max(0, (elapsed / duration) * 100));
};

// --- TV SERIES HUB LOADER ---
const openSeriesDetails = async (series: IPTVChannel) => {
  selectedSeries.value = series;
  seriesDialog.value = true;
  loadingEpisodes.value = true;
  seasonsData.value = {};
  activeSeason.value = 1;

  try {
    // 1. Fetch Playlist metadata to determine if it's Xtream Codes
    const pl = (await db.getPlaylists()).find(p => p.id === props.playlistId);
    
    if (pl && pl.type === 'xtream' && series.xtreamId) {
      const defaultProxyUrl = isElectron ? '' : 'http://localhost:8088/?url=';
      const proxy = await db.getSetting('cors_proxy_url', defaultProxyUrl);
      
      const client = new XtreamClient({
        url: pl.url!,
        username: pl.username!,
        password: pl.password!,
        corsProxy: proxy
      });

      const epData = await client.fetchSeriesEpisodes(series.xtreamId);
      seasonsData.value = epData;

      // Select first available season
      const seasonsKeys = Object.keys(epData).map(Number);
      if (seasonsKeys.length > 0) {
        activeSeason.value = Math.min(...seasonsKeys);
      }
    } else {
      // Standard M3U series does not have sub-episodes nested, they are loaded as flat channels
      // but in case we want support, M3U flat channels are loaded in their specific category tab
      loadingEpisodes.value = false;
    }
  } catch (err) {
    console.error(err);
  } finally {
    loadingEpisodes.value = false;
  }
};

const sortedSeasons = computed(() => {
  return Object.keys(seasonsData.value).map(Number).sort((a, b) => a - b);
});

// --- PLAYBACK TRIGGERING ---
const playStream = (channel: IPTVChannel) => {
  emit('play-stream', channel);
};

const playEpisode = (ep: XtreamEpisode) => {
  // Convert standard Xtream episode into channels wrapper to launch player
  const mockChannel: IPTVChannel = {
    id: `ep_${ep.id}`,
    playlistId: props.playlistId,
    name: `${selectedSeries.value?.name || ''} - S${ep.seasonNum}E${ep.episodeNum}: ${ep.title}`,
    logo: ep.logo || selectedSeries.value?.logo || '',
    streamUrl: ep.streamUrl,
    category: selectedSeries.value?.category || 'Série',
    type: 'series'
  };
  emit('play-stream', mockChannel);
  seriesDialog.value = false; // close hub on playback start
};

// --- TV MOVIE DETAILS & ONLINE METADATA RESOLUTION ---
const DEFAULT_TMDB_API_KEY = 'bd6af17904b638d482df1a924f1eabb4';

function cleanMovieName(name: string): string {
  if (!name) return '';
  let clean = name;

  // 1. Remover colchetes e parênteses e seus conteúdos (ex: [4K], (2022))
  clean = clean.replace(/\[[^\]]*\]/g, ' ');
  clean = clean.replace(/\([^)]*\)/g, ' ');

  // 2. Remover tags comuns de qualidade e idioma
  const tags = [
    /\b(4k|uhd|fhd|hdtv|h264|x264|hevc|x265|bluray|web-dl|webrip|web|rip|dvd|hd)\b/gi,
    /\b(dublado|legendado|dual|multi|audio|som|dub|leg|portugues|legendado|eng|spa)\b/gi,
    /\b(1080p|720p|480p|360p|2160p)\b/gi
  ];
  for (const regex of tags) {
    clean = clean.replace(regex, ' ');
  }

  // 3. Remover anos de 4 dígitos apenas se não for a única palavra no título
  const yearMatch = clean.match(/\b(19|20)\d{2}\b/g);
  if (yearMatch) {
    const temp = clean.replace(/\b(19|20)\d{2}\b/g, ' ').trim();
    if (temp.length > 0) {
      clean = temp;
    }
  }

  // 4. Limpar caracteres especiais
  clean = clean.replace(/[\._\-#]/g, ' ');

  // 5. Remover espaços extras
  clean = clean.replace(/\s+/g, ' ').trim();

  return clean;
}

async function fetchTMDB(title: string, apiKey: string, lang: string) {
  const query = encodeURIComponent(title);
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${query}&language=${lang}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erro TMDB: ${response.status}`);
  const data = await response.json();
  if (data.results && data.results.length > 0) {
    const movie = data.results[0];
    return {
      plot: movie.overview || '',
      rating: movie.vote_average ? String(movie.vote_average.toFixed(1)) : undefined,
      year: movie.release_date ? movie.release_date.substring(0, 4) : undefined,
      logo: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined,
    };
  }
  return null;
}

async function fetchOMDb(title: string, apiKey: string) {
  const query = encodeURIComponent(title);
  const url = `https://www.omdbapi.com/?apikey=${apiKey}&t=${query}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erro OMDb: ${response.status}`);
  const movie = await response.json();
  if (movie.Response === 'True') {
    return {
      plot: movie.Plot !== 'N/A' ? movie.Plot : '',
      rating: movie.imdbRating !== 'N/A' ? movie.imdbRating : undefined,
      year: movie.Year !== 'N/A' ? movie.Year.substring(0, 4) : undefined,
      logo: movie.Poster !== 'N/A' ? movie.Poster : undefined,
      genre: movie.Genre !== 'N/A' ? movie.Genre : undefined,
      director: movie.Director !== 'N/A' ? movie.Director : undefined,
    };
  }
  return null;
}

const openMovieDetails = async (movie: IPTVChannel) => {
  selectedMovie.value = movie;
  movieDialog.value = true;
  loadingMovieInfo.value = false;
  movieErrorMsg.value = '';

  // Busca metadados automaticamente se não tiver sinopse local
  const source = await db.getSetting('movie_metadata_source', 'tmdb');
  let apiKey = await db.getSetting('movie_metadata_api_key', '');
  const lang = await db.getSetting('movie_metadata_language', 'pt-BR');

  if (!apiKey && source === 'tmdb') {
    apiKey = DEFAULT_TMDB_API_KEY;
  }

  if (source !== 'none' && apiKey && !movie.plot) {
    await fetchOnlineMetadata(movie, source, apiKey, lang);
  }
};

const fetchOnlineMetadata = async (movie: IPTVChannel, source: string, apiKey: string, lang: string) => {
  loadingMovieInfo.value = true;
  movieErrorMsg.value = '';
  try {
    const cleanedTitle = cleanMovieName(movie.name);
    let result = null;
    if (source === 'tmdb') {
      result = await fetchTMDB(cleanedTitle, apiKey, lang);
    } else if (source === 'omdb') {
      result = await fetchOMDb(cleanedTitle, apiKey);
    }

    if (result && selectedMovie.value && selectedMovie.value.id === movie.id) {
      // Atualiza o objeto selecionado reativamente
      selectedMovie.value = {
        ...selectedMovie.value,
        plot: result.plot || selectedMovie.value.plot,
        rating: result.rating || selectedMovie.value.rating,
        year: result.year || selectedMovie.value.year,
        logo: result.logo || selectedMovie.value.logo,
        genre: (result as any).genre || selectedMovie.value.genre,
        director: (result as any).director || selectedMovie.value.director,
      };

      // Atualiza a lista atual na tela para refletir no grid
      const originalChannel = allChannels.value.find(c => c.id === movie.id);
      if (originalChannel) {
        originalChannel.plot = selectedMovie.value.plot;
        originalChannel.rating = selectedMovie.value.rating;
        originalChannel.year = selectedMovie.value.year;
        originalChannel.logo = selectedMovie.value.logo;
        originalChannel.genre = selectedMovie.value.genre;
        originalChannel.director = selectedMovie.value.director;
      }

      // Persiste no banco IndexedDB para carregamentos futuros instantâneos
      await db.updateChannel({ ...selectedMovie.value });
    } else if (!result) {
      console.log(`Nenhum metadado encontrado online para o filme: ${cleanedTitle}`);
    }
  } catch (err: any) {
    console.error('Erro ao buscar metadados online:', err);
    movieErrorMsg.value = 'Não foi possível buscar a sinopse do filme online.';
  } finally {
    loadingMovieInfo.value = false;
  }
};

const forceSearchMetadata = async () => {
  if (!selectedMovie.value) return;
  const source = await db.getSetting('movie_metadata_source', 'tmdb');
  let apiKey = await db.getSetting('movie_metadata_api_key', '');
  const lang = await db.getSetting('movie_metadata_language', 'pt-BR');

  if (!apiKey && source === 'tmdb') {
    apiKey = DEFAULT_TMDB_API_KEY;
  }

  if (source === 'none' || (source === 'omdb' && !apiKey)) {
    movieErrorMsg.value = 'Por favor, configure o provedor de metadados e a chave de API nas configurações.';
    return;
  }

  await fetchOnlineMetadata(selectedMovie.value, source, apiKey, lang);
};

const playMovie = (movie: IPTVChannel) => {
  playStream(movie);
  movieDialog.value = false;
};
</script>

<style scoped>
.category-sidebar {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 1;
}

.channels-content-area {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.uppercase-title {
  font-size: 0.75rem;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
}

.border-right {
  border-right: 1px solid rgba(255, 255, 255, 0.06) !important;
}

.category-item {
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.category-item:hover {
  background: rgba(255, 193, 7, 0.05) !important;
}

.category-item.v-list-item--active {
  background: linear-gradient(90deg, rgba(255, 213, 79, 0.1) 0%, rgba(255, 193, 7, 0.05) 100%) !important;
  border-color: rgba(255, 213, 79, 0.2);
}

.glass-channel-card {
  background: rgba(18, 18, 18, 0.6) !important;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  cursor: pointer;
}

.glass-channel-card:hover {
  background: rgba(255, 193, 7, 0.08) !important;
  border-color: rgba(255, 193, 7, 0.3);
  transform: translateX(4px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.movie-card {
  background: rgba(18, 18, 18, 0.6) !important;
  backdrop-filter: blur(12px);
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.movie-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 193, 7, 0.4) !important;
}

.border-glass {
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.movie-poster-container {
  position: relative;
  overflow: hidden;
}

.movie-poster-placeholder {
  aspect-ratio: 0.67;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.08) 100%);
}

.favorite-overlay-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
  background: rgba(0, 0, 0, 0.6) !important;
  backdrop-filter: blur(4px);
  border-radius: 8px;
}

.rating-overlay {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 3;
  backdrop-filter: blur(4px);
}

.year-overlay {
  position: absolute;
  bottom: 8px;
  right: 8px;
  z-index: 3;
  background: rgba(0, 0, 0, 0.7) !important;
  color: white !important;
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  z-index: 2;
  transition: all 0.3s ease;
}

.movie-card:hover .play-overlay {
  opacity: 1;
}

.play-btn-glow {
  box-shadow: 0 0 15px rgba(255, 193, 7, 0.6) !important;
}

.text-glow-small {
  background: linear-gradient(135deg, #FFB300 0%, #FFE082 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.glass-dialog {
  background: rgba(8, 8, 8, 0.95) !important;
  backdrop-filter: blur(25px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.leading-relaxed {
  line-height: 1.6;
}

.max-plot-height {
  max-height: 120px;
  overflow-y: auto;
}

.max-plot-height-movie {
  max-height: 150px;
  overflow-y: auto;
}

@media (min-width: 600px) {
  .movie-details-row {
    position: relative;
  }
  .movie-details-col {
    position: absolute !important;
    right: 0;
    top: 0;
    bottom: 0;
    width: 66.666667% !important;
  }
  .max-plot-height-movie {
    max-height: none;
    flex-grow: 1;
  }
}

.max-episodes-height {
  max-height: 350px;
  overflow-y: auto;
}

.gap-3 {
  gap: 12px;
}
.gap-2 {
  gap: 8px;
}
.gap-y-4 {
  row-gap: 16px;
}
.min-width-0 {
  min-width: 0;
}

.live-player-top-section {
  background: rgba(18, 18, 18, 0.45);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 193, 7, 0.15) !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  z-index: 5;
}

.player-wrapper-responsive {
  max-width: 960px;
  aspect-ratio: 16/9;
}

@media (min-width: 960px) {
  .player-wrapper-responsive {
    max-height: 38vh;
  }
}

@media (min-width: 960px) and (min-height: 1080px) {
  .player-wrapper-responsive {
    max-height: 480px;
  }
}

@media (min-width: 960px) and (max-height: 850px) {
  .player-wrapper-responsive {
    max-height: 32vh;
  }
}

.border-bottom-glow {
  border-bottom: 1px solid rgba(255, 193, 7, 0.15) !important;
  box-shadow: 0 5px 25px rgba(0, 0, 0, 0.3);
}

.border-left-sm {
  border-left: 1px solid rgba(255, 255, 255, 0.08);
}

.player-resize-divider {
  position: absolute;
  bottom: -4px;
  left: 0;
  right: 0;
  height: 8px;
  z-index: 20;
  cursor: ns-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.player-resize-divider:hover {
  background: rgba(255, 193, 7, 0.05);
}

.resize-handle-line {
  width: 40px;
  height: 3px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  transition: all 0.2s ease;
}

.player-resize-divider:hover .resize-handle-line {
  background: rgba(255, 193, 7, 0.7);
  box-shadow: 0 0 8px rgba(255, 193, 7, 0.6);
  width: 60px;
}

@media (max-width: 600px) {
  .border-left-sm {
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 12px;
    padding-left: 0 !important;
  }
}
</style>
