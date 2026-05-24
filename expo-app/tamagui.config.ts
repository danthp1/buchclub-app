import { createFont, createTamagui, isWeb } from '@tamagui/core';
import { defaultConfig } from '@tamagui/config/v5';
import { animations as animationsCSS } from '@tamagui/animations-css';
import { animations as animationsReanimated } from '@tamagui/animations-react-native';
import { createInterFont } from '@tamagui/font-inter';

const headingFont = createInterFont({
  size: {
    6: 14,
    7: 16,
    8: 22,
    9: 28,
  },
  transform: {
    6: 'none',
    7: 'none',
  },
  weight: {
    6: '400',
    7: '400',
    8: '600',
    9: '600',
  },
  letterSpacing: {
    8: -0.3,
    9: -0.5,
  },
  face: {
    400: { normal: 'Inter' },
    600: { normal: 'InterBold' },
  },
});

const bodyFont = createInterFont(
  {
    size: {
      4: 14,
      5: 16,
    },
    weight: {
      4: '400',
      5: '400',
    },
    letterSpacing: {
      4: 0,
      5: 0,
    },
    face: {
      400: { normal: 'Inter' },
      600: { normal: 'InterBold' },
    },
  },
  {
    sizeSize: (size) => Math.round(size * 1.1),
    sizeLineHeight: (size) => Math.round(size * 1.5),
  }
);

const config = createTamagui({
  ...defaultConfig,

  // Platform-conditional animation driver (UI-SPEC Motion contract)
  animations: isWeb ? animationsCSS : animationsReanimated,

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
    color: {
      ...defaultConfig.tokens.color,
      // Light palette
      background_light: '#FDFAF6',
      backgroundStrong_light: '#F2EDE4',
      accent_light: '#7C4B2A',
      color_light: '#1A1209',
      colorSecondary_light: '#6B5C47',
      borderColor_light: '#D6CBBC',
      destructive_light: '#B33A3A',
      success_light: '#2E7D5A',
      backgroundPress_light: '#FFFFFF',
      // Dark palette
      background_dark: '#1A1209',
      backgroundStrong_dark: '#2A1F14',
      accent_dark: '#C47A3D',
      color_dark: '#F2EDE4',
      colorSecondary_dark: '#9E8A74',
      borderColor_dark: '#3D2E20',
      destructive_dark: '#E05555',
      success_dark: '#4AB07A',
    },
  },

  // Themes — light + dark (light is Phase 1 default)
  themes: {
    ...defaultConfig.themes,
    light: {
      ...defaultConfig.themes?.light,
      background: '#FDFAF6',
      backgroundStrong: '#F2EDE4',
      accent: '#7C4B2A',
      color: '#1A1209',
      colorSecondary: '#6B5C47',
      borderColor: '#D6CBBC',
      destructive: '#B33A3A',
      success: '#2E7D5A',
      backgroundPress: '#FFFFFF',
    },
    dark: {
      ...defaultConfig.themes?.dark,
      background: '#1A1209',
      backgroundStrong: '#2A1F14',
      accent: '#C47A3D',
      color: '#F2EDE4',
      colorSecondary: '#9E8A74',
      borderColor: '#3D2E20',
      destructive: '#E05555',
      success: '#4AB07A',
    },
  },

  // Media breakpoints (UI-SPEC Responsive Breakpoints)
  media: {
    sm: { maxWidth: 390 },
    md: { maxWidth: 768 },
    gtSm: { minWidth: 391 },
    gtMd: { minWidth: 769 },
  },
});

type AppConfig = typeof config;
declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
