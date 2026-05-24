---
status: complete
---
# Summary: Fix Tamagui Animation Static Extraction

## What was done

Removed all animation driver imports and runtime calls from `tamagui.config.ts` so the
Tamagui static evaluator (`@tamagui/babel-plugin` / `@tamagui/metro-plugin`) never
encounters `createAnimations` calls that return `proxyWorm` sentinel objects at build
time. The identical animation presets (fast/medium/slow) are now injected at runtime via
the `animations` prop on `TamaguiProvider` in each platform's root layout file:
native uses `@tamagui/animations-react-native` (spring driver) and web uses
`@tamagui/animations-css` (CSS transition driver). No new dependencies were added;
no runtime behaviour changed.

## Changes

- `expo-app/tamagui.config.ts` — removed `isWeb`, `createCSSAnimations`, `createRNAnimations`
  imports; removed `animationPresetsCSS` and `animationPresetsRN` const blocks; removed
  `animations: isWeb ? animationPresetsCSS : animationPresetsRN` key from `createTamagui` call.

- `expo-app/app/_layout.tsx` — added `import { createAnimations } from '@tamagui/animations-react-native'`;
  added `const animations = createAnimations({ fast, medium, slow })` module-level const;
  added `animations={animations}` prop to `<TamaguiProvider>`.

- `expo-app/app/_layout.web.tsx` — added `import { createAnimations } from '@tamagui/animations-css'`;
  added `const animations = createAnimations({ fast, medium, slow })` module-level const;
  added `animations={animations}` prop to `<TamaguiProvider>`.

## Verification

All three per-task grep checks passed (counts 0, 2, 2 respectively).

Static-evaluation smoke test result:

```
themes: true
```

No "Got a empty / proxied config!" or "Missing themes" warnings — static extraction
now succeeds cleanly. The expected `skipped` lines for native-only components
(AlertDialog, Popper, Sheet, etc.) are unrelated to this fix and can be silenced
via `TAMAGUI_IGNORE_BUNDLE_ERRORS` if desired.

## Commit

`d4aa5f5` — fix(tamagui): move animation drivers from config to runtime layout
