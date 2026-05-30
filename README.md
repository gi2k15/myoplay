# 📺 IPTV Player Gemini 2

**IPTV Player Gemini 2** is a modern, elegant, and high-performance web-based IPTV player built with the latest **Vue 3**, **Vite**, and **Vuetify 4** ecosystem. It delivers a complete and seamless entertainment experience directly in your browser, combining robust media playback with a premium, highly responsive user interface.

---

## 🎨 Premium Design & Visual Experience

The application is crafted with visual excellence at its core, featuring:
- **Optimized Dark Mode (Dark Yellow Theme)**: A sophisticated color palette combining deep blacks (`#080808`) and vibrant golden yellow accents (`#FFB300`) to create a premium, cinematic feel.
- **Glassmorphism**: Elegant background blur effects (`backdrop-filter: blur`) and translucent borders that add modern depth and layers to the UI.
- **Fluid Micro-Animations**: Smooth transitions when navigating between pages and elegant hover effects on buttons, list items, and channel cards.
- **Modern Typography**: Integrated Google Fonts including `Outfit`, `Inter`, and `Roboto` for maximum readability and a premium layout.
- **Tailored Scrollbars**: Sleek, custom-designed scrollbars that match the application's gold and black visual identity.

---

## ✨ Key Features

### 📺 Intelligent Hybrid Video Engine
- **HLS (.m3u8)**: Fully integrated with `hls.js` for smooth, low-latency playback of live HTTP Live Streaming feeds.
- **MPEG-TS (.ts)**: Powered by `mpegts.js` to ensure support for high-fidelity MPEG-TS video streams.
- **Picture-in-Picture (PiP) Mini-Player**: A persistent, floating mini-player that lets you continue watching your current channel while browsing other playlists, EPG guides, or settings.

### 🗂️ Multi-Client Playlist Manager
- **Xtream Codes API**: Direct integration with Xtream Codes servers, supporting authentication via URL, username, and password.
- **M3U / M3U8 Playlists**: Fast import from local files or remote URLs for traditional IPTV playlists.
- **High-Performance Parser**: Extremely fast list processing with a responsive visual loading percentage indicator.

### 📅 Integrated EPG TV Guide (XMLTV)
- Full support for XMLTV program guides.
- Real-time "🔴 NOW PLAYING" indicator displaying the current program name, time range, and an active progress bar.
- "UPCOMING PROGRAM" preview with descriptions and start times.
- A fully consolidated **TV Guide** view for an aggregated EPG experience.

### 🗄️ High-Performance Local Database (IndexedDB)
- 100% client-side data persistence utilizing a custom, high-speed IndexedDB wrapper.
- High-efficiency database operations writing channels and EPG details in smart batches (5,000 items) to prevent any UI freezing.
- Automated cleanup of expired EPG guide records older than 24 hours to preserve local disk space.
- Local saving of user preferences (Volume, PiP Floating Player Mode, Last Selected Playlist, Favorites, and Streaming History).

### 🔄 Built-in CORS Proxy
- A powerful local Node.js proxy server (`scripts/cors-proxy.js`) designed to bypass strict Cross-Origin Resource Sharing (CORS) blocks enforced by IPTV providers.
- Supports automatic redirect resolution (up to 5 redirects) and efficient response streaming with low memory overhead.

### 🕒 Sidebar with History & Favorites
- **Favorites**: Mark channels as favorites for instant access.
- **Recent Streams**: A historical feed of the last 10 played streams pinned to the sidebar, with quick individual removal support.

---

## 🛠️ Tech Stack

- **Core Framework**: [Vue 3](https://vuejs.org/) (Composition API using `<script setup>` in TS)
- **Build Tool & Bundler**: [Vite](https://vite.dev/)
- **UI Library**: [Vuetify 4](https://vuetifyjs.com/) (configured with Material Design Icons and Web Fonts)
- **Player Engines**: [Hls.js](https://github.com/video-dev/hls.js/) and [Mpegts.js](https://github.com/xqq/mpegts.js/)
- **Styling**: Native CSS & SASS (with custom gradients, glassmorphism, and neon-glow details)
- **Package Manager**: `pnpm`

---

## 📂 Project Structure

```
├── public/                # Static public assets
├── scripts/
│   └── cors-proxy.js      # Custom Node.js CORS Proxy script
├── src/
│   ├── assets/            # App graphics and media
│   ├── components/        # Vue 3 UI Components
│   │   ├── PlaylistManager.vue # Handles M3U/M3U8 files, URLs, and Xtream APIs
│   │   ├── Sidebar.vue         # Sidebar navigation and recent streams list
│   │   ├── StreamBrowser.vue   # Category & stream browser (Live, Movies, Series)
│   │   ├── TVGuide.vue         # Aggregated XMLTV EPG program guide
│   │   ├── VideoPlayer.vue     # HTML5 media player (HLS/MPEG-TS) + floating PiP
│   │   └── Settings.vue        # Proxy URLs, PiP settings, EPG database controls
│   ├── plugins/           # Application plugin configurations (Vuetify, Fonts)
│   ├── services/          # Core client logic & database services
│   │   ├── db.ts               # Custom client-side IndexedDB wrapper
│   │   ├── epgParser.ts        # XMLTV EPG file parser
│   │   ├── m3uParser.ts        # M3U/M3U8 file parser
│   │   └── xtreamClient.ts     # Http client for Xtream Codes REST APIs
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
Make sure you have [Node.js](https://nodejs.org/) installed and the **pnpm** package manager set up globally.

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

| Command | Description |
|---|---|
| `pnpm dev` | Starts Vite developer server and the local CORS proxy concurrently |
| `pnpm build` | Validates TypeScript types and compiles source files to a static distribution (`dist`) |
| `pnpm preview` | Launches a local web server to test the production build from `dist` |
| `pnpm build-only` | Builds the application bypassing TypeScript type verification |
| `pnpm type-check` | Runs the TypeScript compiler (`vue-tsc --build`) to validate code types |
| `pnpm proxy` | Launches only the custom Node.js CORS proxy server on port `8088` |

---

## 🌐 Configuring the Local CORS Proxy

The IPTV player uses a local CORS proxy server to resolve resource access problems caused by rigid CORS filters on provider streams.

By default, launching the project with `pnpm dev` routes traffic through:
`http://localhost:8088/?url=`

You can adjust or switch the CORS proxy URL at any time via the **Settings** view in the application interface.

---

## 🔒 Security & Privacy

All your playlists, stream URLs, Xtream Codes credentials (usernames and passwords), and viewing history are stored **100% locally inside your web browser** using `IndexedDB`. No information is sent to third-party database servers (except, of course, direct streams fetched from your configured IPTV server or routed through the local proxy server running on your own computer).

---

## 📄 Licença

Este projeto está licenciado sob a **GNU General Public License v3.0** (GPL-3.0-or-later). Consulte o arquivo [LICENSE](file:///d:/GitHub/iptv-player-gemini2/LICENSE) para obter o texto completo da licença e seus termos.
