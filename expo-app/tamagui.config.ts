import { createFont, createTamagui } from '@tamagui/core';
import { defaultConfig } from '@tamagui/config/v5';
import { createAnimations } from '@tamagui/animations-react-native';

const headingFont = createFont({
  family: 'ArchivoNarrow_700Bold',
  size: { 1: 12, 2: 14, 3: 18, 4: 24, 5: 32 },
  lineHeight: { 1: 16, 2: 20, 3: 24, 4: 28, 5: 36 },
  weight: { 1: '700', 2: '700', 3: '700', 4: '700', 5: '700' },
  letterSpacing: { 4: -0.3, 5: -0.5 },
  face: { 700: { normal: 'ArchivoNarrow_700Bold' } },
});

const bodyFont = createFont({
  family: 'IBMPlexSans_400Regular',
  size: { 1: 12, 2: 13, 3: 15, 4: 15, 5: 18 },
  lineHeight: { 1: 16, 2: 20, 3: 22, 4: 22, 5: 24 },
  weight: { 1: '400', 2: '400', 3: '400', 4: '400', 6: '600' },
  face: {
    400: { normal: 'IBMPlexSans_400Regular' },
    600: { normal: 'IBMPlexSans_600SemiBold' },
  },
});

const config = createTamagui({
  ...defaultConfig,

  animations: createAnimations({
    fast:   { type: 'spring', damping: 20, stiffness: 280 },
    medium: { type: 'spring', damping: 18, stiffness: 200 },
    slow:   { type: 'spring', damping: 15, stiffness: 120 },
  }),

  fonts: {
    heading: headingFont,
    body: bodyFont,
  },

  // Spacing tokens (UI-SPEC Spacing Scale)
  tokens: {
    ...defaultConfig.tokens,
    space: {
      ...defaultConfig.tokens.space,
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      '2xl': 48,
      '3xl': 64,
    },
    size: {
      ...defaultConfig.tokens.size,
      5: 52, // Form field height (UI-SPEC: $size.5 = 52px)
    },
  },

  // Themes — light + dark (light is Phase 1 default)
  themes: {
    ...defaultConfig.themes,
    light: {
      ...(defaultConfig.themes as any)?.light,
      background: '#F0EDE4',        // Papier — was '#FDFAF6'
      backgroundStrong: '#FAFAF7',  // Surface — was '#F2EDE4'
      accent: '#1A4FE0',            // Electric Blue — was '#7C4B2A'
      ink: '#0D0D0D',               // NEW — primary button fill, strong fills
      color: '#0D0D0D',             // Ink Black text — was '#1A1209'
      colorSecondary: '#6B6B63',   // Muted — was '#6B5C47'
      borderColor: '#E0DDD6',      // Border — was '#D6CBBC'
      destructive: '#D32F2F',      // was '#B33A3A'
      success: '#2A7A3A',          // was '#2E7D5A'
      orange: '#E85D1F',            // NEW — upvotes (Phase 4)
      backgroundPress: '#FFFFFF',
    },
    dark: {
      ...(defaultConfig.themes as any)?.dark,
      background: '#1A1A14',
      backgroundStrong: '#252520',
      accent: '#4D7BF3',
      ink: '#F0EDE4',
      color: '#F0EDE4',
      colorSecondary: '#9B9B93',
      borderColor: '#3A3830',
      destructive: '#E05555',
      success: '#4AB07A',
      orange: '#E85D1F',
      backgroundPress: '#1A1A14',
    },
  },

  // Media breakpoints (UI-SPEC Responsive Breakpoints)
  media: {
    sm: { maxWidth: 390 },
    md: { maxWidth: 768 },
    gtSm: { minWidth: 391 },
    gtMd: { minWidth: 769 },
  },

  // Override settings to allow full React Native style props (not just shorthands)
  settings: {
    ...defaultConfig.settings,
    onlyAllowShorthands: false,
    allowedStyleValues: 'somewhat-strict',
    styleCompat: 'react-native',
  },
});

type AppConfig = typeof config;
declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
