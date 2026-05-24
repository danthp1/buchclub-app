---
type: quick
id: 260524-rav
title: Fix Tamagui "Missing themes" / "Got empty config" static-extraction error
autonomous: true
files_modified:
  - expo-app/tamagui.config.ts
  - expo-app/app/_layout.tsx
  - expo-app/app/_layout.web.tsx

must_haves:
  truths:
    - "Static evaluation of tamagui.config.ts succeeds without proxyWorm contamination"
    - "TamaguiProvider on native receives the RN spring animation driver at runtime"
    - "TamaguiProvider on web receives the CSS animation driver at runtime"
    - "Animation presets fast/medium/slow are identical to the values removed from config"
  artifacts:
    - path: expo-app/tamagui.config.ts
      provides: "Static Tamagui config — themes, tokens, fonts, media, settings only"
      must_not_contain: "createAnimations"
    - path: expo-app/app/_layout.tsx
      provides: "Native root layout with runtime animation injection"
      contains: "@tamagui/animations-react-native"
    - path: expo-app/app/_layout.web.tsx
      provides: "Web root layout with runtime animation injection"
      contains: "@tamagui/animations-css"
  key_links:
    - from: "expo-app/app/_layout.tsx"
      to: "TamaguiProvider"
      via: "animations prop"
      pattern: "animations=\\{animations\\}"
    - from: "expo-app/app/_layout.web.tsx"
      to: "TamaguiProvider"
      via: "animations prop"
      pattern: "animations=\\{animations\\}"
---

<objective>
Remove animation driver imports from tamagui.config.ts so the static evaluator
(used by @tamagui/babel-plugin and @tamagui/metro-plugin at build time) never
encounters createAnimations calls that return proxyWorm objects. Inject the same
animation presets at runtime via the TamaguiProvider animations prop in the root
layout files, where a real JS context is available.

Purpose: Eliminate the "Got a empty / proxied config!" / "Missing themes" build
error that blocks Metro bundling and Expo start.
Output: Three edited files; no new dependencies; no behaviour change at runtime.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: Strip animation imports and the animations key from tamagui.config.ts</name>
  <files>expo-app/tamagui.config.ts</files>
  <action>
Remove the following three lines from the top of the file:

  import { createFont, createTamagui, isWeb } from '@tamagui/core';
  import { createAnimations as createCSSAnimations } from '@tamagui/animations-css';
  import { createAnimations as createRNAnimations } from '@tamagui/animations-react-native';

Replace line 1 with:

  import { createFont, createTamagui } from '@tamagui/core';

(Drop `isWeb` — it was only used to select animations.)

Remove the two animation-preset const blocks (lines 59-85 in the current file):

  const animationPresetsCSS = createCSSAnimations({ ... });
  const animationPresetsRN  = createRNAnimations({ ... });

Remove the `animations` key from the createTamagui call (the line reads):

  animations: isWeb ? animationPresetsCSS : animationPresetsRN,

The comment block above it ("Animation presets (UI-SPEC Motion contract)") can
also be removed since it is no longer relevant to this file. Do NOT touch fonts,
tokens, themes, media, or settings.
  </action>
  <verify>
    <automated>grep -c 'createAnimations\|animationPresets\|isWeb' /Users/I570118/Downloads/buchclub-app/expo-app/tamagui.config.ts</automated>
  </verify>
  <done>
grep count is 0 — no animation or isWeb references remain in tamagui.config.ts.
  </done>
</task>

<task type="auto">
  <name>Task 2: Inject RN animation driver in the native root layout</name>
  <files>expo-app/app/_layout.tsx</files>
  <action>
Add the import immediately after the existing import block (before the
SplashScreen.preventAutoHideAsync() call):

  import { createAnimations } from '@tamagui/animations-react-native';

Add the animations const before the RootLayout function definition:

  const animations = createAnimations({
    fast:   { type: 'spring', damping: 20, stiffness: 280 },
    medium: { type: 'spring', damping: 18, stiffness: 200 },
    slow:   { type: 'spring', damping: 15, stiffness: 120 },
  });

Update the TamaguiProvider JSX element (currently line 58) to pass the prop:

  <TamaguiProvider config={config} defaultTheme="light" animations={animations}>

No other changes to this file.
  </action>
  <verify>
    <automated>grep -c 'animations-react-native\|animations={animations}' /Users/I570118/Downloads/buchclub-app/expo-app/app/_layout.tsx</automated>
  </verify>
  <done>
grep count is 2 — both the import line and the prop are present.
  </done>
</task>

<task type="auto">
  <name>Task 3: Inject CSS animation driver in the web root layout</name>
  <files>expo-app/app/_layout.web.tsx</files>
  <action>
Add the import immediately after the existing import block (before the
SplashScreen.preventAutoHideAsync() call):

  import { createAnimations } from '@tamagui/animations-css';

Add the animations const before the RootLayout function definition:

  const animations = createAnimations({
    fast:   '120ms ease-in',
    medium: '220ms ease-in',
    slow:   '350ms ease-in',
  });

Update the TamaguiProvider JSX element (currently line 55) to pass the prop:

  <TamaguiProvider config={config} defaultTheme="light" animations={animations}>

No other changes to this file.
  </action>
  <verify>
    <automated>grep -c 'animations-css\|animations={animations}' /Users/I570118/Downloads/buchclub-app/expo-app/app/_layout.web.tsx</automated>
  </verify>
  <done>
grep count is 2 — both the import line and the prop are present.
  </done>
</task>

</tasks>

<verification>
Run the static-evaluation smoke test from expo-app/:

  cd /Users/I570118/Downloads/buchclub-app/expo-app && \
  DEBUG=tamagui node -e "
    const Static = require('@tamagui/static');
    const r = Static.loadTamaguiSync({
      config: './tamagui.config.ts',
      components: ['tamagui'],
    });
    console.log('themes:', !!r?.tamaguiConfig?.themes);
  "

Expected output: `themes: true` with no "skipped" or "Got empty config" warnings.
</verification>

<success_criteria>
- tamagui.config.ts contains zero references to createAnimations, animationPresets, or isWeb
- _layout.tsx passes animations from @tamagui/animations-react-native to TamaguiProvider
- _layout.web.tsx passes animations from @tamagui/animations-css to TamaguiProvider
- Static smoke test prints "themes: true" without proxy warnings
- Animation preset values (damping/stiffness/duration) are identical to those removed from config
</success_criteria>
