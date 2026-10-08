import { fileURLToPath, URL } from 'node:url'
import Vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('package.json', import.meta.url), 'utf-8'))

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    Vue({
      template: { transformAssetUrls },
    }),
    // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
    Vuetify({
      autoImport: true,
      styles: {
        configFile: 'src/styles/settings.scss',
      },
    }),
    viteSingleFile(),
  ],
  define: { 'process.env': {}, __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url)),
    },
    extensions: [
      '.js',
      '.json',
      '.jsx',
      '.mjs',
      '.ts',
      '.tsx',
      '.vue',
    ],
  },
  server: {
    port: 3000,
  },
})
