<!-- src/components/GlobalSearchModal.vue -->
<template>
  <v-dialog
    v-model="isOpen"
    max-width="960"
    scrollable
    transition="dialog-top-transition"
    class="global-search-dialog"
  >
    <v-card class="search-modal-card rounded-xl border-glass elevation-24">
      <!-- Search Input Header -->
      <div class="search-header px-4 pt-4 pb-2 border-bottom">
        <div class="d-flex align-center gap-3">
          <v-icon color="secondary" size="28" class="glow-icon">mdi-magnify</v-icon>
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            class="search-native-input flex-grow-1"
            :placeholder="$t('globalSearch.placeholder')"
            @keydown.down.prevent="focusNextItem"
            @keydown.up.prevent="focusPrevItem"
            @keydown.enter.prevent="handleEnterPress"
            @keydown.esc.prevent="closeModal"
          />

          <!-- Loading Indicator -->
          <v-progress-circular
            v-if="isSearching"
            indeterminate
            size="20"
            width="2"
            color="secondary"
            class="flex-shrink-0"
          />

          <!-- Clear Button -->
          <v-btn
            v-if="searchQuery"
            icon="mdi-close"
            variant="text"
            size="small"
            color="medium-emphasis"
            @click="clearSearch"
          />

          <!-- ESC Badge (Desktop) -->
          <div v-if="!$vuetify.display.mobile" class="esc-badge text-caption flex-shrink-0">
            <kbd class="kbd-key">ESC</kbd>
          </div>

          <!-- Close Icon (Mobile) -->
          <v-btn
            v-if="$vuetify.display.mobile"
            icon="mdi-close"
            variant="text"
            size="small"
            @click="closeModal"
          />
        </div>

        <!-- Filter Chips / Tabs -->
        <div class="d-flex align-center gap-2 pt-3 pb-1 overflow-x-auto no-scrollbar">
          <v-chip
            filter
            variant="tonal"
            size="small"
            :color="activeFilter === 'all' ? 'secondary' : 'default'"
            :class="{ 'chip-active': activeFilter === 'all' }"
            @click="activeFilter = 'all'"
          >
            <v-icon start size="16">mdi-view-grid-outline</v-icon>
            {{ $t('globalSearch.all') }}
            <span v-if="searchResults.totalMatches > 0" class="ml-1 text-caption opacity-80">
              ({{ searchResults.totalMatches }})
            </span>
          </v-chip>

          <v-chip
            filter
            variant="tonal"
            size="small"
            :color="activeFilter === 'live' ? 'primary' : 'default'"
            :class="{ 'chip-active': activeFilter === 'live' }"
            @click="activeFilter = 'live'"
          >
            <v-icon start size="16">mdi-television-classic</v-icon>
            {{ $t('globalSearch.live') }}
            <span v-if="searchResults.counts.live > 0" class="ml-1 text-caption opacity-80">
              ({{ searchResults.counts.live }})
            </span>
          </v-chip>

          <v-chip
            filter
            variant="tonal"
            size="small"
            :color="activeFilter === 'movie' ? 'amber-accent-3' : 'default'"
            :class="{ 'chip-active': activeFilter === 'movie' }"
            @click="activeFilter = 'movie'"
          >
            <v-icon start size="16">mdi-movie-roll</v-icon>
            {{ $t('globalSearch.movies') }}
            <span v-if="searchResults.counts.movie > 0" class="ml-1 text-caption opacity-80">
              ({{ searchResults.counts.movie }})
            </span>
          </v-chip>

          <v-chip
            filter
            variant="tonal"
            size="small"
            :color="activeFilter === 'series' ? 'deep-purple-accent-2' : 'default'"
            :class="{ 'chip-active': activeFilter === 'series' }"
            @click="activeFilter = 'series'"
          >
            <v-icon start size="16">mdi-youtube-subscription</v-icon>
            {{ $t('globalSearch.series') }}
            <span v-if="searchResults.counts.series > 0" class="ml-1 text-caption opacity-80">
              ({{ searchResults.counts.series }})
            </span>
          </v-chip>
        </div>
      </div>

      <!-- Search Content Body -->
      <v-card-text class="search-content-body pa-4 overflow-y-auto" style="min-height: 380px; max-height: 68vh;">
        <!-- 1. EMPTY QUERY STATE: Recent searches & hint -->
        <div v-if="!searchQuery.trim()" class="py-6">
          <div v-if="recentSearches.length > 0" class="mb-6">
            <div class="d-flex align-center justify-space-between mb-3">
              <span class="text-caption font-weight-bold text-uppercase letter-spacing-1 text-medium-emphasis">
                <v-icon size="16" class="mr-1">mdi-history</v-icon>
                {{ $t('globalSearch.recentSearches') }}
              </span>
              <v-btn
                variant="text"
                size="x-small"
                color="medium-emphasis"
                @click="clearRecentSearches"
              >
                {{ $t('globalSearch.clearRecent') }}
              </v-btn>
            </div>
            <div class="d-flex flex-wrap gap-2">
              <v-chip
                v-for="item in recentSearches"
                :key="item"
                variant="outlined"
                size="small"
                closable
                class="recent-chip"
                @click="applyRecentSearch(item)"
                @click:close.stop="removeRecentSearch(item)"
              >
                {{ item }}
              </v-chip>
            </div>
          </div>

          <!-- Empty search guide banner -->
          <div class="text-center py-8">
            <v-avatar size="64" color="surface-variant" class="mb-3 border-glass">
              <v-icon size="32" color="secondary">mdi-text-search</v-icon>
            </v-avatar>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ $t('globalSearch.typeToSearch') }}</h3>
            <p class="text-caption text-medium-emphasis max-w-md mx-auto">
              {{ $t('globalSearch.typeToSearchDesc') }}
            </p>
          </div>
        </div>

        <!-- 2. NO RESULTS STATE -->
        <div v-else-if="!isSearching && searchResults.totalMatches === 0" class="text-center py-12">
          <v-icon size="56" color="medium-emphasis" class="mb-3">mdi-file-search-outline</v-icon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">
            {{ $t('globalSearch.noResults', { query: searchQuery }) }}
          </h3>
          <p class="text-caption text-medium-emphasis max-w-md mx-auto">
            {{ $t('globalSearch.noResultsDesc') }}
          </p>
        </div>

        <!-- 3. RESULTS DISPLAY -->
        <div v-else class="results-container">
          <!-- VIEW: ALL (GROUPED) -->
          <template v-if="activeFilter === 'all'">
            <!-- Live Channels Section -->
            <div v-if="searchResults.live.length > 0" class="mb-6">
              <div class="d-flex align-center justify-space-between mb-3">
                <div class="d-flex align-center gap-2">
                  <v-icon size="small" color="primary">mdi-television-classic</v-icon>
                  <span class="text-subtitle-2 font-weight-bold">{{ $t('globalSearch.live') }}</span>
                  <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-bold">
                    {{ searchResults.counts.live }}
                  </v-chip>
                </div>
                <v-btn
                  v-if="searchResults.counts.live > 4"
                  variant="text"
                  size="x-small"
                  color="secondary"
                  @click="activeFilter = 'live'"
                >
                  {{ $t('globalSearch.viewAll', { count: searchResults.counts.live }) }}
                </v-btn>
              </div>

              <div class="live-grid">
                <v-card
                  v-for="ch in searchResults.live.slice(0, 4)"
                  :key="ch.id"
                  class="live-result-card rounded-lg pa-2 border-glass"
                  variant="flat"
                  @click="playChannel(ch)"
                >
                  <div class="d-flex align-center gap-3">
                    <v-avatar size="44" rounded="md" class="bg-surface-variant flex-shrink-0">
                      <v-img v-if="ch.logo" :src="ch.logo" cover />
                      <v-icon v-else size="24" color="medium-emphasis">mdi-television-box</v-icon>
                    </v-avatar>
                    <div class="flex-grow-1 min-width-0">
                      <div class="text-body-2 font-weight-bold text-truncate" :title="ch.name">
                        {{ ch.name }}
                      </div>
                      <div class="text-caption text-medium-emphasis text-truncate">
                        {{ ch.category }}
                      </div>
                    </div>
                    <v-btn
                      icon="mdi-play"
                      color="primary"
                      size="small"
                      variant="flat"
                      class="play-btn-glow flex-shrink-0"
                      @click.stop="playChannel(ch)"
                    />
                  </div>
                </v-card>
              </div>
            </div>

            <!-- Movies Section -->
            <div v-if="searchResults.movie.length > 0" class="mb-6">
              <div class="d-flex align-center justify-space-between mb-3">
                <div class="d-flex align-center gap-2">
                  <v-icon size="small" color="amber-accent-3">mdi-movie-roll</v-icon>
                  <span class="text-subtitle-2 font-weight-bold">{{ $t('globalSearch.movies') }}</span>
                  <v-chip size="x-small" color="amber-accent-3" variant="tonal" class="font-weight-bold">
                    {{ searchResults.counts.movie }}
                  </v-chip>
                </div>
                <v-btn
                  v-if="searchResults.counts.movie > 6"
                  variant="text"
                  size="x-small"
                  color="secondary"
                  @click="activeFilter = 'movie'"
                >
                  {{ $t('globalSearch.viewAll', { count: searchResults.counts.movie }) }}
                </v-btn>
              </div>

              <v-row class="ma-0 gap-y-3">
                <v-col
                  v-for="movie in searchResults.movie.slice(0, 6)"
                  :key="movie.id"
                  cols="6"
                  sm="4"
                  md="2"
                  class="pa-1"
                >
                  <v-card
                    class="movie-poster-card fill-height rounded-lg border-glass"
                    variant="flat"
                    @click="openMoviePreview(movie)"
                  >
                    <div class="poster-wrapper position-relative">
                      <v-img
                        v-if="movie.logo"
                        :src="movie.logo"
                        cover
                        aspect-ratio="0.67"
                        class="rounded-t-lg bg-surface-variant"
                      />
                      <div v-else class="poster-placeholder rounded-t-lg d-flex align-center justify-center">
                        <v-icon size="32" color="medium-emphasis">mdi-movie-open</v-icon>
                      </div>

                      <v-chip v-if="movie.rating" size="x-small" color="secondary" class="rating-badge font-weight-bold">
                        ★ {{ movie.rating }}
                      </v-chip>
                      <v-chip v-if="movie.year" size="x-small" color="black" class="year-badge font-weight-bold">
                        {{ movie.year }}
                      </v-chip>

                      <div class="play-hover-overlay d-flex align-center justify-center">
                        <v-btn
                          icon="mdi-play"
                          color="primary"
                          size="small"
                          class="play-btn-glow"
                          @click.stop="playChannel(movie)"
                        />
                      </div>
                    </div>
                    <div class="pa-2">
                      <div class="text-caption font-weight-bold text-truncate" :title="movie.name">
                        {{ movie.name }}
                      </div>
                      <div class="text-caption text-medium-emphasis text-truncate">
                        {{ movie.category }}
                      </div>
                    </div>
                  </v-card>
                </v-col>
              </v-row>
            </div>

            <!-- Series Section -->
            <div v-if="searchResults.series.length > 0" class="mb-4">
              <div class="d-flex align-center justify-space-between mb-3">
                <div class="d-flex align-center gap-2">
                  <v-icon size="small" color="deep-purple-accent-2">mdi-youtube-subscription</v-icon>
                  <span class="text-subtitle-2 font-weight-bold">{{ $t('globalSearch.series') }}</span>
                  <v-chip size="x-small" color="deep-purple-accent-2" variant="tonal" class="font-weight-bold">
                    {{ searchResults.counts.series }}
                  </v-chip>
                </div>
                <v-btn
                  v-if="searchResults.counts.series > 6"
                  variant="text"
                  size="x-small"
                  color="secondary"
                  @click="activeFilter = 'series'"
                >
                  {{ $t('globalSearch.viewAll', { count: searchResults.counts.series }) }}
                </v-btn>
              </div>

              <v-row class="ma-0 gap-y-3">
                <v-col
                  v-for="series in searchResults.series.slice(0, 6)"
                  :key="series.id"
                  cols="6"
                  sm="4"
                  md="2"
                  class="pa-1"
                >
                  <v-card
                    class="movie-poster-card fill-height rounded-lg border-glass"
                    variant="flat"
                    @click="openSeriesHub(series)"
                  >
                    <div class="poster-wrapper position-relative">
                      <v-img
                        v-if="series.logo"
                        :src="series.logo"
                        cover
                        aspect-ratio="0.67"
                        class="rounded-t-lg bg-surface-variant"
                      />
                      <div v-else class="poster-placeholder rounded-t-lg d-flex align-center justify-center">
                        <v-icon size="32" color="medium-emphasis">mdi-youtube-subscription</v-icon>
                      </div>

                      <v-chip v-if="series.rating" size="x-small" color="secondary" class="rating-badge font-weight-bold">
                        ★ {{ series.rating }}
                      </v-chip>

                      <div class="play-hover-overlay d-flex align-center justify-center">
                        <v-btn icon="mdi-folder-play" color="secondary" size="small" />
                      </div>
                    </div>
                    <div class="pa-2">
                      <div class="text-caption font-weight-bold text-truncate" :title="series.name">
                        {{ series.name }}
                      </div>
                      <div class="text-caption text-medium-emphasis text-truncate">
                        {{ series.category }}
                      </div>
                    </div>
                  </v-card>
                </v-col>
              </v-row>
            </div>
          </template>

          <!-- VIEW: LIVE CHANNELS ONLY -->
          <template v-else-if="activeFilter === 'live'">
            <div class="live-grid-full">
              <v-card
                v-for="ch in searchResults.live"
                :key="ch.id"
                class="live-result-card rounded-lg pa-2 border-glass mb-2"
                variant="flat"
                @click="playChannel(ch)"
              >
                <div class="d-flex align-center gap-3">
                  <v-avatar size="48" rounded="md" class="bg-surface-variant flex-shrink-0">
                    <v-img v-if="ch.logo" :src="ch.logo" cover />
                    <v-icon v-else size="28" color="medium-emphasis">mdi-television-box</v-icon>
                  </v-avatar>
                  <div class="flex-grow-1 min-width-0">
                    <div class="text-subtitle-2 font-weight-bold text-truncate">{{ ch.name }}</div>
                    <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-bold mt-1">
                      {{ ch.category }}
                    </v-chip>
                  </div>
                  <v-btn
                    icon="mdi-play"
                    color="primary"
                    size="small"
                    variant="flat"
                    class="play-btn-glow flex-shrink-0"
                    @click.stop="playChannel(ch)"
                  />
                </div>
              </v-card>
            </div>
          </template>

          <!-- VIEW: MOVIES ONLY -->
          <template v-else-if="activeFilter === 'movie'">
            <v-row class="ma-0 gap-y-3">
              <v-col
                v-for="movie in searchResults.movie"
                :key="movie.id"
                cols="6"
                sm="4"
                md="2"
                class="pa-1"
              >
                <v-card
                  class="movie-poster-card fill-height rounded-lg border-glass"
                  variant="flat"
                  @click="openMoviePreview(movie)"
                >
                  <div class="poster-wrapper position-relative">
                    <v-img
                      v-if="movie.logo"
                      :src="movie.logo"
                      cover
                      aspect-ratio="0.67"
                      class="rounded-t-lg bg-surface-variant"
                    />
                    <div v-else class="poster-placeholder rounded-t-lg d-flex align-center justify-center">
                      <v-icon size="32" color="medium-emphasis">mdi-movie-open</v-icon>
                    </div>

                    <v-chip v-if="movie.rating" size="x-small" color="secondary" class="rating-badge font-weight-bold">
                      ★ {{ movie.rating }}
                    </v-chip>
                    <v-chip v-if="movie.year" size="x-small" color="black" class="year-badge font-weight-bold">
                      {{ movie.year }}
                    </v-chip>

                    <div class="play-hover-overlay d-flex align-center justify-center">
                      <v-btn
                        icon="mdi-play"
                        color="primary"
                        size="small"
                        class="play-btn-glow"
                        @click.stop="playChannel(movie)"
                      />
                    </div>
                  </div>
                  <div class="pa-2">
                    <div class="text-caption font-weight-bold text-truncate" :title="movie.name">
                      {{ movie.name }}
                    </div>
                    <div class="text-caption text-medium-emphasis text-truncate">
                      {{ movie.category }}
                    </div>
                  </div>
                </v-card>
              </v-col>
            </v-row>
          </template>

          <!-- VIEW: SERIES ONLY -->
          <template v-else-if="activeFilter === 'series'">
            <v-row class="ma-0 gap-y-3">
              <v-col
                v-for="series in searchResults.series"
                :key="series.id"
                cols="6"
                sm="4"
                md="2"
                class="pa-1"
              >
                <v-card
                  class="movie-poster-card fill-height rounded-lg border-glass"
                  variant="flat"
                  @click="openSeriesHub(series)"
                >
                  <div class="poster-wrapper position-relative">
                    <v-img
                      v-if="series.logo"
                      :src="series.logo"
                      cover
                      aspect-ratio="0.67"
                      class="rounded-t-lg bg-surface-variant"
                    />
                    <div v-else class="poster-placeholder rounded-t-lg d-flex align-center justify-center">
                      <v-icon size="32" color="medium-emphasis">mdi-youtube-subscription</v-icon>
                    </div>

                    <v-chip v-if="series.rating" size="x-small" color="secondary" class="rating-badge font-weight-bold">
                      ★ {{ series.rating }}
                    </v-chip>

                    <div class="play-hover-overlay d-flex align-center justify-center">
                      <v-btn icon="mdi-folder-play" color="secondary" size="small" />
                    </div>
                  </div>
                  <div class="pa-2">
                    <div class="text-caption font-weight-bold text-truncate" :title="series.name">
                      {{ series.name }}
                    </div>
                    <div class="text-caption text-medium-emphasis text-truncate">
                      {{ series.category }}
                    </div>
                  </div>
                </v-card>
              </v-col>
            </v-row>
          </template>
        </div>
      </v-card-text>

      <!-- Footer Info -->
      <div class="search-footer px-4 py-2 border-top d-flex align-center justify-space-between text-caption text-medium-emphasis">
        <div class="d-flex align-center gap-2">
          <span v-if="searchResults.totalMatches > 0">
            {{ $t('globalSearch.resultsCount', { count: searchResults.totalMatches }) }}
          </span>
          <span v-else>
            {{ $t('globalSearch.shortcut') }}
          </span>
        </div>
        <div class="d-flex align-center gap-3">
          <span>{{ $t('globalSearch.pressEsc') }}</span>
        </div>
      </div>
    </v-card>

    <!-- MOVIE PREVIEW SUB-DIALOG -->
    <v-dialog v-model="moviePreviewDialog" max-width="720" class="rounded-xl">
      <v-card v-if="selectedMovie" class="glass-dialog pa-4 rounded-xl border-glass">
        <div class="d-flex align-end justify-end mb-2">
          <v-btn icon="mdi-close" variant="text" size="small" @click="moviePreviewDialog = false" />
        </div>
        <v-row class="ma-0">
          <v-col cols="12" sm="4" class="pa-2">
            <v-img
              v-if="selectedMovie.logo"
              :src="selectedMovie.logo"
              cover
              aspect-ratio="0.67"
              class="rounded-xl elevation-6 bg-surface-variant"
            />
            <div v-else class="poster-placeholder rounded-xl d-flex align-center justify-center py-12">
              <v-icon size="48" color="medium-emphasis">mdi-movie-open</v-icon>
            </div>
          </v-col>
          <v-col cols="12" sm="8" class="pa-2 d-flex flex-column justify-start">
            <h2 class="text-h5 font-weight-bold mb-2 text-glow-small">{{ selectedMovie.name }}</h2>
            <div class="d-flex align-center gap-2 flex-wrap mb-3">
              <v-chip size="small" color="primary" class="font-weight-bold">{{ selectedMovie.category }}</v-chip>
              <v-chip v-if="selectedMovie.rating" size="small" color="secondary" class="font-weight-bold">
                ★ {{ selectedMovie.rating }}
              </v-chip>
              <v-chip v-if="selectedMovie.year" size="small" color="secondary" variant="tonal" class="font-weight-bold">
                {{ selectedMovie.year }}
              </v-chip>
              <v-chip v-if="selectedMovie.duration" size="small" color="secondary" variant="tonal" class="font-weight-bold">
                {{ selectedMovie.duration }} min
              </v-chip>
            </div>

            <p v-if="selectedMovie.plot" class="text-body-2 text-medium-emphasis mb-4 leading-relaxed">
              {{ selectedMovie.plot }}
            </p>
            <p v-else class="text-body-2 text-medium-emphasis mb-4 italic">
              {{ $t('streamBrowser.movieDetails.noSynopsis') }}
            </p>

            <div class="mt-auto d-flex align-center gap-3 pt-3 border-top">
              <v-btn
                prepend-icon="mdi-play"
                color="primary"
                variant="flat"
                size="large"
                class="play-btn-glow"
                @click="playMovie(selectedMovie)"
              >
                {{ $t('globalSearch.watchNow') }}
              </v-btn>
              <v-btn
                :icon="isFavorite(selectedMovie.id) ? 'mdi-star' : 'mdi-star-outline'"
                :color="isFavorite(selectedMovie.id) ? 'warning' : 'medium-emphasis'"
                variant="outlined"
                size="large"
                @click="toggleFavorite(selectedMovie.id)"
              />
            </div>
          </v-col>
        </v-row>
      </v-card>
    </v-dialog>

    <!-- SERIES SEASONS & EPISODES HUB -->
    <v-dialog v-model="seriesHubDialog" max-width="800" class="rounded-xl">
      <v-card v-if="selectedSeries" class="glass-dialog pa-4 rounded-xl border-glass">
        <div class="d-flex align-end justify-end mb-2">
          <v-btn icon="mdi-close" variant="text" size="small" @click="seriesHubDialog = false" />
        </div>
        <div class="d-flex align-center gap-4 mb-4">
          <v-avatar size="56" rounded="lg" class="bg-surface-variant flex-shrink-0">
            <v-img v-if="selectedSeries.logo" :src="selectedSeries.logo" cover />
            <v-icon v-else size="32" color="medium-emphasis">mdi-youtube-subscription</v-icon>
          </v-avatar>
          <div class="min-width-0">
            <h3 class="text-h6 font-weight-bold text-truncate text-glow-small mb-1">{{ selectedSeries.name }}</h3>
            <v-chip size="x-small" color="primary" class="font-weight-bold">{{ selectedSeries.category }}</v-chip>
          </div>
        </div>

        <div v-if="loadingEpisodes" class="text-center py-8">
          <v-progress-circular color="primary" indeterminate size="36" class="mb-2" />
          <div class="text-caption text-medium-emphasis">{{ $t('streamBrowser.seriesDetails.loadingEpisodes') }}</div>
        </div>

        <div v-else-if="Object.keys(seasonsData).length === 0" class="text-center py-8 text-medium-emphasis">
          {{ $t('streamBrowser.seriesDetails.noEpisodes') }}
        </div>

        <div v-else>
          <v-tabs v-model="activeSeason" color="secondary" density="compact" class="border-bottom mb-3">
            <v-tab v-for="season in sortedSeasons" :key="season" :value="season">
              {{ $t('streamBrowser.seriesDetails.seasonLabel', { season }) }}
            </v-tab>
          </v-tabs>

          <v-window v-model="activeSeason">
            <v-window-item v-for="season in sortedSeasons" :key="season" :value="season">
              <v-list bg-color="transparent" class="pa-0" style="max-height: 400px; overflow-y: auto;">
                <v-list-item
                  v-for="ep in seasonsData[season]"
                  :key="ep.id"
                  class="mb-2 rounded-lg bg-surface-variant border-glass"
                  @click="playEpisode(ep)"
                >
                  <template v-slot:prepend>
                    <v-avatar rounded="lg" color="surface-variant" size="40" class="mr-2 flex-shrink-0">
                      <v-img v-if="ep.logo" :src="ep.logo" cover />
                      <v-icon v-else color="medium-emphasis">mdi-play-circle</v-icon>
                    </v-avatar>
                  </template>
                  <v-list-item-title class="font-weight-bold text-white text-body-2">
                    {{ ep.episodeNum }}. {{ ep.title }}
                  </v-list-item-title>
                  <template v-slot:append>
                    <v-btn icon="mdi-play" color="secondary" size="small" variant="flat" class="play-btn-glow" />
                  </template>
                </v-list-item>
              </v-list>
            </v-window-item>
          </v-window>
        </div>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script lang="ts" setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { db, type IPTVChannel, type GlobalSearchResults } from '@/services/db';
import { XtreamClient, type XtreamEpisode } from '@/services/xtreamClient';

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

const props = defineProps<{
  modelValue: boolean;
  playlistId: number | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'play-stream', ch: IPTVChannel): void;
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const searchInputRef = ref<HTMLInputElement | null>(null);
const searchQuery = ref('');
const activeFilter = ref<'all' | 'live' | 'movie' | 'series'>('all');
const isSearching = ref(false);
const recentSearches = ref<string[]>([]);
const favoritesSet = ref<Set<string>>(new Set());

const searchResults = ref<GlobalSearchResults>({
  live: [],
  movie: [],
  series: [],
  totalMatches: 0,
  counts: { live: 0, movie: 0, series: 0 }
});

// Movie details sub-modal
const moviePreviewDialog = ref(false);
const selectedMovie = ref<IPTVChannel | null>(null);

// Series hub sub-modal
const seriesHubDialog = ref(false);
const selectedSeries = ref<IPTVChannel | null>(null);
const loadingEpisodes = ref(false);
const seasonsData = ref<Record<number, XtreamEpisode[]>>({});
const activeSeason = ref<number>(1);

let debounceTimer: any = null;

const loadRecentSearches = async () => {
  try {
    const list = await db.getSetting('global_search_recent', []);
    recentSearches.value = Array.isArray(list) ? list : [];
  } catch (err) {
    console.error('Error loading recent searches:', err);
  }
};

const saveRecentSearch = async (term: string) => {
  const trimmed = term.trim();
  if (!trimmed || trimmed.length < 2) return;
  try {
    const current = recentSearches.value.filter(t => t.toLowerCase() !== trimmed.toLowerCase());
    current.unshift(trimmed);
    const updated = current.slice(0, 8);
    recentSearches.value = updated;
    await db.setSetting('global_search_recent', updated);
  } catch (err) {
    console.error('Error saving recent search:', err);
  }
};

const removeRecentSearch = async (term: string) => {
  try {
    const updated = recentSearches.value.filter(t => t !== term);
    recentSearches.value = updated;
    await db.setSetting('global_search_recent', updated);
  } catch (err) {
    console.error('Error removing recent search:', err);
  }
};

const clearRecentSearches = async () => {
  try {
    recentSearches.value = [];
    await db.setSetting('global_search_recent', []);
  } catch (err) {
    console.error('Error clearing recent searches:', err);
  }
};

const applyRecentSearch = (item: string) => {
  searchQuery.value = item;
  triggerSearch();
};

const loadFavorites = async () => {
  if (!props.playlistId) return;
  try {
    const list = await db.getFavorites(props.playlistId);
    favoritesSet.value = new Set(list);
  } catch (err) {
    console.error(err);
  }
};

const isFavorite = (id: string) => favoritesSet.value.has(id);

const toggleFavorite = async (id: string) => {
  if (!props.playlistId) return;
  try {
    if (isFavorite(id)) {
      await db.removeFavorite(props.playlistId, id);
      favoritesSet.value.delete(id);
    } else {
      await db.addFavorite(props.playlistId, id);
      favoritesSet.value.add(id);
    }
  } catch (err) {
    console.error(err);
  }
};

// Perform search
const triggerSearch = async () => {
  if (!props.playlistId || !searchQuery.value.trim()) {
    searchResults.value = {
      live: [],
      movie: [],
      series: [],
      totalMatches: 0,
      counts: { live: 0, movie: 0, series: 0 }
    };
    isSearching.value = false;
    return;
  }

  isSearching.value = true;
  try {
    const results = await db.searchChannels(props.playlistId, searchQuery.value, 60);
    searchResults.value = results;
  } catch (err) {
    console.error('Global search error:', err);
  } finally {
    isSearching.value = false;
  }
};

watch(searchQuery, (newVal) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  if (!newVal.trim()) {
    searchResults.value = {
      live: [],
      movie: [],
      series: [],
      totalMatches: 0,
      counts: { live: 0, movie: 0, series: 0 }
    };
    return;
  }
  debounceTimer = setTimeout(() => {
    triggerSearch();
  }, 150);
});

// Watch dialog open
watch(isOpen, async (open) => {
  if (open) {
    await loadRecentSearches();
    await loadFavorites();
    nextTick(() => {
      searchInputRef.value?.focus();
      searchInputRef.value?.select();
    });
  } else {
    moviePreviewDialog.value = false;
    seriesHubDialog.value = false;
  }
});

const clearSearch = () => {
  searchQuery.value = '';
  searchResults.value = {
    live: [],
    movie: [],
    series: [],
    totalMatches: 0,
    counts: { live: 0, movie: 0, series: 0 }
  };
  searchInputRef.value?.focus();
};

const closeModal = () => {
  isOpen.value = false;
};

// Action triggers
const playChannel = (channel: IPTVChannel) => {
  saveRecentSearch(searchQuery.value || channel.name);
  emit('play-stream', channel);
  closeModal();
};

const openMoviePreview = (movie: IPTVChannel) => {
  saveRecentSearch(searchQuery.value || movie.name);
  selectedMovie.value = movie;
  moviePreviewDialog.value = true;
};

const playMovie = (movie: IPTVChannel) => {
  moviePreviewDialog.value = false;
  playChannel(movie);
};

const openSeriesHub = async (series: IPTVChannel) => {
  saveRecentSearch(searchQuery.value || series.name);
  selectedSeries.value = series;
  seriesHubDialog.value = true;
  loadingEpisodes.value = true;
  seasonsData.value = {};
  activeSeason.value = 1;

  try {
    if (!props.playlistId) return;
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

      const seasonsKeys = Object.keys(epData).map(Number);
      if (seasonsKeys.length > 0) {
        activeSeason.value = Math.min(...seasonsKeys);
      }
    }
  } catch (err) {
    console.error('Error loading series episodes in search:', err);
  } finally {
    loadingEpisodes.value = false;
  }
};

const sortedSeasons = computed(() => {
  return Object.keys(seasonsData.value).map(Number).sort((a, b) => a - b);
});

const playEpisode = (ep: XtreamEpisode) => {
  if (!props.playlistId || !selectedSeries.value) return;
  const mockChannel: IPTVChannel = {
    id: `ep_${ep.id}`,
    playlistId: props.playlistId,
    name: `${selectedSeries.value.name} - S${ep.seasonNum}E${ep.episodeNum}: ${ep.title}`,
    logo: ep.logo || selectedSeries.value.logo || '',
    streamUrl: ep.streamUrl,
    category: selectedSeries.value.category || 'Série',
    type: 'series'
  };
  emit('play-stream', mockChannel);
  seriesHubDialog.value = false;
  closeModal();
};

const handleEnterPress = () => {
  if (searchResults.value.live.length > 0) {
    playChannel(searchResults.value.live[0]);
  } else if (searchResults.value.movie.length > 0) {
    playChannel(searchResults.value.movie[0]);
  } else if (searchResults.value.series.length > 0) {
    openSeriesHub(searchResults.value.series[0]);
  }
};

const focusNextItem = () => {};
const focusPrevItem = () => {};

onMounted(() => {
  loadRecentSearches();
});
</script>

<style scoped>
.search-modal-card {
  background: rgba(12, 12, 16, 0.94) !important;
  backdrop-filter: blur(28px) saturate(180%);
  border: 1px solid rgba(255, 215, 64, 0.15) !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 193, 7, 0.08) !important;
}

.search-native-input {
  background: transparent;
  border: none;
  outline: none;
  font-size: 1.15rem;
  color: #fff;
  font-weight: 500;
  width: 100%;
}

.search-native-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.border-glass {
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
}

.border-bottom {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
}

.border-top {
  border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
}

.glow-icon {
  filter: drop-shadow(0 0 8px rgba(255, 213, 79, 0.6));
}

.kbd-key {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 2px 7px;
  font-size: 0.72rem;
  font-family: inherit;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
}

.chip-active {
  box-shadow: 0 0 12px rgba(255, 213, 79, 0.25);
  font-weight: bold;
}

.recent-chip {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
}

.recent-chip:hover {
  background: rgba(255, 213, 79, 0.1);
  border-color: rgba(255, 213, 79, 0.4);
}

.live-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
}

.live-grid-full {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.live-result-card {
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: all 0.2s ease;
}

.live-result-card:hover {
  background: rgba(255, 213, 79, 0.08);
  border-color: rgba(255, 213, 79, 0.3) !important;
  transform: translateY(-2px);
}

.movie-poster-card {
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.movie-poster-card:hover {
  background: rgba(255, 213, 79, 0.06);
  border-color: rgba(255, 213, 79, 0.4) !important;
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.poster-placeholder {
  aspect-ratio: 0.67;
  background: rgba(255, 255, 255, 0.04);
}

.rating-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  background: rgba(0, 0, 0, 0.75) !important;
  backdrop-filter: blur(4px);
  z-index: 2;
}

.year-badge {
  position: absolute;
  bottom: 6px;
  left: 6px;
  background: rgba(0, 0, 0, 0.75) !important;
  backdrop-filter: blur(4px);
  z-index: 2;
}

.play-hover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 3;
}

.poster-wrapper:hover .play-hover-overlay {
  opacity: 1;
}

.play-btn-glow {
  box-shadow: 0 0 15px rgba(255, 179, 0, 0.6) !important;
  transition: transform 0.2s ease;
}

.play-btn-glow:hover {
  transform: scale(1.08);
}

.text-glow-small {
  background: linear-gradient(135deg, #FFB300 0%, #FFE082 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.letter-spacing-1 {
  letter-spacing: 1px;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.glass-dialog {
  background: rgba(14, 14, 18, 0.96) !important;
  backdrop-filter: blur(24px);
}
</style>
