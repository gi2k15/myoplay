/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Composables
import { createVuetify } from 'vuetify'

import 'vuetify/styles'

// Design tokens: see the "Sistema visual" board of the redesign canvas
const stageTheme = {
  dark: true,
  colors: {
    background: '#0A0A0C',
    surface: '#131316',
    'surface-light': '#1B1B20',
    'surface-bright': '#24242B',
    'surface-variant': '#1B1B20',
    'on-surface-variant': '#F4F4F5',
    'on-background': '#F4F4F5',
    'on-surface': '#F4F4F5',
    primary: '#5EDB97',
    'primary-lighten-1': '#9AF0C0',
    'primary-darken-1': '#3FBF7B',
    'on-primary': '#0A0A0C',
    secondary: '#D4D4D8',
    'secondary-darken-1': '#A1A1AA',
    'on-secondary': '#0A0A0C',
    error: '#FF5D5D',
    'on-error': '#0A0A0C',
    info: '#7AB8FF',
    success: '#5EDB97',
    warning: '#F5C451',
  },
  variables: {
    'border-color': '#FFFFFF',
    'border-opacity': 0.1,
    'medium-emphasis-opacity': 0.68,
    'theme-kbd': '#24242B',
    'theme-on-kbd': '#F4F4F5',
  },
}

const field = { variant: 'outlined', density: 'comfortable', rounded: 'lg', bgColor: 'surface-light', color: 'primary' }

export default createVuetify({
  theme: {
    defaultTheme: 'stage',
    themes: {
      stage: stageTheme,
    },
  },
  defaults: {
    VBtn: { variant: 'flat', rounded: 'lg', class: 'text-none' },
    VCard: { variant: 'flat', rounded: 'xl', border: true },
    VChip: { variant: 'outlined', rounded: 'pill' },
    VTextField: field,
    VSelect: field,
    VAutocomplete: field,
    VCombobox: field,
    VTextarea: field,
    VList: { bgColor: 'transparent' },
    VListItem: { rounded: 'lg', color: 'primary' },
    VMenu: { offset: 8 },
    VDialog: { scrollable: true },
    VSwitch: { color: 'primary', inset: true, hideDetails: 'auto' },
    VCheckbox: { color: 'primary' },
    VRadioGroup: { color: 'primary' },
    VSlider: { color: 'primary' },
    VProgressLinear: { color: 'primary', rounded: true },
    VProgressCircular: { color: 'primary' },
    VTabs: { color: 'primary' },
    VAlert: { variant: 'tonal', rounded: 'lg' },
    VTooltip: { openDelay: 300 },
  },
})
