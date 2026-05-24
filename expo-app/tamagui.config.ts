import { createFont, createTamagui, isWeb } from '@tamagui/core';
import { createAnimations as createCSSAnimations } from '@tamagui/animations-css';
import { createAnimations as createRNAnimations } from '@tamagui/animations-react-native';
import { createInterFont } from '@tamagui/font-inter';
import { defaultConfig } from '@tamagui/config/v5';

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

// Animation presets (UI-SPEC Motion contract)
// fast:   damping 20, stiffness 280, 120ms — button press, input focus
// medium: damping 18, stiffness 200, 220ms — banners, screen transitions
// slow:   damping 15, stiffness 120, 350ms — sheets/dialogs (Phase 2+)
const animationPresetsCSS = createCSSAnimations({
  fast: '120ms ease-in',
  medium: '220ms ease-in',
  slow: '350ms ease-in',
});

const animationPresetsRN = createRNAnimations({
  fast: {
    type: 'spring',
    damping: 20,
    stiffness: 280,
  },
  medium: {
    type: 'spring',
    damping: 18,
    stiffness: 200,
  },
  slow: {
    type: 'spring',
    damping: 15,
    stiffness: 120,
  },
});

const config = createTamagui({
  ...defaultConfig,

  // Platform-conditional animation driver (UI-SPEC Motion contract, PITFALL 10)
  animations: isWeb ? animationPresetsCSS : animationPresetsRN,

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
      // UI-SPEC Light Theme
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
      ...(defaultConfig.themes as any)?.dark,
      // UI-SPEC Dark Theme (declared for Phase 5 toggle)
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
