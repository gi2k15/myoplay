# 📺 MyoPlay

**MyoPlay** is a modern, elegant, and high-performance web-based IPTV player built with the latest **Vue 3**, **Vite**, and **Vuetify 4** ecosystem. It delivers a complete and seamless entertainment experience directly in your browser, combining robust media playback with a premium, highly responsive user interface.

---

## ✨ Key Features

### 📺 Intelligent Hybrid Video Engine

- **HLS Support (.m3u8)**: Fully integrated with `hls.js` for smooth, low-latency playback of live HTTP Live Streaming feeds.
- **MPEG-TS Support (.ts)**: Powered by `mpegts.js` to ensure support for high-fidelity MPEG-TS video streams.
- **Picture-in-Picture (PiP) Mini-Player**: A persistent, floating mini-player at the bottom corner that lets you continue watching your current channel while browsing other categories, editing playlists, checking EPG guides, or configuring settings.
- **Buffer & Stability Modes**: Three configurable buffer modes (Low Latency, Balanced, or High Stability) to adapt to unstable streams or slow connections.
- **Screen Aspect Ratio Controls**: Options to Fit Screen, Stretch (Fill), 16:9 widescreen, and classic 4:3.
- **Auto-Play**: Configurable setting to start playing channels immediately upon selection.

### 🗂️ Multi-Client Playlist Manager

- **Xtream Codes API Integration**: Direct connection with Xtream Codes servers supporting authentication via Host (URL), Username, and Password.
- **M3U / M3U8 Import**: Supports loading local files (`.m3u` / `.m3u8` / `.txt`) via Drag & Drop or importing directly from remote URLs.
- **High-Performance Parser**: Optimized playlist parser featuring a real-time visual progress percentage and status indicator.

### 📅 Integrated EPG TV Guide (XMLTV)

- Full support for XMLTV program guides imported from local files or remote URLs.
- Automatic EPG detection from M3U playlists and Xtream Codes servers.
- **"🔴 NOW PLAYING"** panel displaying the current program name, time range, description, and an active progress bar.
- **"UPCOMING PROGRAM"** preview with descriptions and start times.
- **EPG Time Shift**: Adjust EPG guide timezone offset from -12h to +12h directly in settings to perfectly synchronize scheduling with your local system clock.
- Dedicated **EPG TV Guide** view for a consolidated schedule of each channel.

### 🎬 Movies & Series Metadata (VOD)

- Automatic retrieval of high-resolution covers, plots, directors, ratings, genres, and release years to enrich the Movies and Series (VOD) catalog.
- Native integration with **TMDB (The Movie Database)** API supporting multiple languages (Portuguese-BR, Portuguese-PT, English, and Spanish) and optional support for **OMDb API**.
- Use your own API key or fallback to a public API key.

### 🗄️ High-Performance Local Database (IndexedDB)

- 100% client-side data persistence utilizing a custom wrapper for the browser's native `IndexedDB`.
- High-efficiency database operations writing channels and programs in smart batches (5,000 items) to prevent any UI freezing or lagging during synchronization.
- Automated cleanup of expired EPG guide records older than 24 hours to preserve local disk space.
- Local saving of user preferences (Volume, Autoplay, Floating Player Mode, Aspect Ratio, Buffer Mode, Last Selected Playlist, Favorites, and Streaming History).

### 🔄 Built-in Local CORS Proxy

- Dedicated local Node.js proxy server (`scripts/cors-proxy.js`) designed to bypass strict Cross-Origin Resource Sharing (CORS) blocks enforced by IPTV providers.
- Runs concurrently with the development server on port `8088`.
- Supports automatic redirect resolution (up to 5 redirects) and efficient response streaming to avoid high memory overhead.
- Client connection closure detection to immediately abort requests, saving network bandwidth.
- Configurable Proxy presets for Data (M3U, APIs) and Video Streams (HLS/TS).

### 🕒 Sidebar with History & Favorites

- **Favorites**: Mark channels as favorites for instant access.
- **Recent Streams**: A historical feed of the last 10 sintonized streams pinned to the sidebar, with quick individual removal support.

---

## 🛠️ Tech Stack

- **Core Framework**: [Vue 3](https://vuejs.org/) (Composition API using `<script setup>` with TypeScript)
- **Build Tool & Bundler**: [Vite](https://vite.dev/)
- **UI Library**: [Vuetify 4](https://vuetifyjs.com/) (configured with Material Design Icons and Google Fonts)
- **Player Engines**: [Hls.js](https://github.com/video-dev/hls.js/) and [Mpegts.js](https://github.com/xqq/mpegts.js/)
- **Styling**: Native CSS & SASS (with custom gradients and glassmorphism styling)
- **Package Manager**: `pnpm`

---

## 📂 Project Structure

```
├── public/                # Static public assets
├── scripts/
│   └── cors-proxy.js      # Custom Node.js CORS Proxy script
├── src/
│   ├── assets/            # App graphics, media, and global styles
│   ├── components/        # Vue 3 UI Components
│   │   ├── PlaylistManager.vue # Handles M3U/M3U8 files, URLs, Xtream API, and EPG wizard
│   │   ├── Sidebar.vue         # Sidebar navigation, favorites, and recent streams
│   │   ├── StreamBrowser.vue   # Category & stream browser (Live, Movies, Series, Favorites)
│   │   ├── TVGuide.vue         # Aggregated XMLTV EPG program guide
│   │   ├── VideoPlayer.vue     # HTML5 media player (HLS/MPEG-TS) + floating PiP mini-player
│   │   └── Settings.vue        # Proxy URLs, playback options, EPG offset, metadata, and DB cleanup
│   ├── plugins/           # Application plugin configurations (Vuetify, Fonts)
│   ├── services/          # Core client logic & database services
│   │   ├── db.ts               # Custom client-side IndexedDB wrapper
│   │   ├── epgParser.ts        # XMLTV EPG file parser
│   │   ├── m3uParser.ts        # M3U/M3U8 file parser
│   │   ├── playlistUpdater.ts  # Auto-update manager for playlists and EPG
│   │   └── xtreamClient.ts     # HTTP client for Xtream Codes REST APIs
│   ├── styles/            # Variable settings, themes, and global stylesheets
│   ├── App.vue            # Root Vue application layout
│   └── main.ts            # Application TypeScript entry point
├── eslint.config.js       # ESLint configurations
├── vite.config.mts        # Vite configuration and plugins
└── package.json           # Scripts, dependencies, and configuration
```

---

## 🚀 Installation & Local Setup

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed and the **pnpm** package manager configured globally.

### 1. Clone the project and install dependencies

```bash
pnpm install
```

### 2. Start the development server

This command starts both the Vite dev server and the local CORS proxy **concurrently** on port `8088`:

```bash
pnpm dev
```

### 3. Build for production

To build a highly optimized, type-checked production bundle:

```bash
pnpm build
```

### 4. Preview production build locally

```bash
pnpm preview
```

---

## ⚙️ Available Commands

| Command           | Description                                                                            |
| ----------------- | -------------------------------------------------------------------------------------- |
| `pnpm dev`        | Starts Vite developer server and the local CORS proxy concurrently                     |
| `pnpm build`      | Validates TypeScript types and compiles source files to a static distribution (`dist`) |
| `pnpm preview`    | Launches a local web server to test the production build from`dist`                    |
| `pnpm build-only` | Builds the application bypassing TypeScript type verification                          |
| `pnpm type-check` | Runs the TypeScript compiler (`vue-tsc --build`) to validate code types                |
| `pnpm proxy`      | Launches only the custom Node.js CORS proxy server on port`8088`                       |

---

## 🌐 Configuring the Local CORS Proxy

The IPTV player uses a local CORS proxy server to resolve resource access problems caused by rigid CORS filters on provider streams.

By default, launching the project with `pnpm dev` routes traffic through:
`http://localhost:8088/?url=`

You can adjust or switch the CORS proxy URL at any time via the **Settings** view in the application interface, including public presets (AllOrigins, Corsproxy.io, etc.), and control usage policy (Auto, Always, or Never).

---

## 🔒 Security & Privacy

All your playlists, stream URLs, Xtream Codes credentials (usernames and passwords), favorites, and viewing history are stored **100% locally inside your web browser** using `IndexedDB`. No private information is sent to third-party database servers or remote tracking systems. The application operates in a fully decentralized and secure manner.

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0** (GPL-3.0-or-later). See the [LICENSE](file:///d:/GitHub/iptv-player-gemini2/LICENSE) file for the full license text and terms.
