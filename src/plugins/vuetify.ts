/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Composables
import { createVuetify } from 'vuetify'
// Styles
import '@mdi/font/css/materialdesignicons.css'

import 'vuetify/styles'

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
const midnightGlowTheme = {
  dark: true,
  colors: {
    background: '#0d0b14',
    surface: '#151322',
    'surface-variant': '#1f1c30',
    primary: '#9c27b0', // Vibrant Neon Purple
    'primary-darken-1': '#7b1fa2',
    secondary: '#00f5d4', // Electric Cyan
    'secondary-darken-1': '#00c4aa',
    error: '#ff3366',
    info: '#00b0ff',
    success: '#00e676',
    warning: '#ffd600',
  },
}

export default createVuetify({
  theme: {
    defaultTheme: 'midnightGlow',
    themes: {
      midnightGlow: midnightGlowTheme,
    },
  },
})
