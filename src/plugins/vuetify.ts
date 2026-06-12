/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Composables
import { createVuetify } from 'vuetify'

import 'vuetify/styles'

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
const midnightGlowTheme = {
  dark: true,
  colors: {
    background: '#080808',
    surface: '#141414',
    'surface-variant': '#202020',
    primary: '#FFC107', // Premium Amber/Yellow
    'primary-darken-1': '#FFA000',
    secondary: '#FFD54F', // Lighter Golden-Yellow
    'secondary-darken-1': '#FFB300',
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
