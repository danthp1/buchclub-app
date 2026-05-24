# Phase 01: Foundation - Pattern Map

**Mapped:** 2026-05-24
**Files analyzed:** 21 new files to create
**Analogs found:** 0 / 21 — greenfield Expo app; existing repo is a bare Next.js scaffold with no Expo, Supabase, Tamagui, or i18next code

> **Analog strategy for greenfield:** Because no real-codebase analogs exist, every pattern below is drawn from the verified research in `01-RESEARCH.md` (sources: Supabase Expo quickstart, Tamagui Expo guide, Context7, npm registry — all HIGH confidence). The planner MUST copy these patterns verbatim; they encode anti-patterns and ordering requirements that are not obvious.

---

## File Classification

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `expo-app/app/_layout.tsx` | layout/provider | request-response | RESEARCH.md Pattern 2 + 3 | spec-only |
| `expo-app/app/_layout.web.tsx` | layout/provider (web variant) | request-response | RESEARCH.md Pattern 3 + Pitfall 4 | spec-only |
| `expo-app/app/(auth)/_layout.tsx` | layout | request-response | RESEARCH.md Pattern 2 | spec-only |
| `expo-app/app/(auth)/sign-in.tsx` | screen/component | request-response | RESEARCH.md Pattern 2; UI-SPEC Screen A | spec-only |
| `expo-app/app/(auth)/sign-up.tsx` | screen/component | request-response | RESEARCH.md Pattern 2; UI-SPEC Screen B | spec-only |
| `expo-app/app/(auth)/forgot-password.tsx` | screen/component | request-response | RESEARCH.md Pattern 5; UI-SPEC Screen C | spec-only |
| `expo-app/app/(auth)/update-password.tsx` | screen/component | request-response | RESEARCH.md Pattern 5 | spec-only |
| `expo-app/app/(app)/_layout.tsx` | layout/navigator | request-response | UI-SPEC Navigation contract | spec-only |
| `expo-app/app/(app)/_layout.native.tsx` | layout/navigator (native) | request-response | UI-SPEC Tab bar (native) | spec-only |
| `expo-app/app/(app)/_layout.web.tsx` | layout/navigator (web) | request-response | UI-SPEC Tab bar (web) | spec-only |
| `expo-app/app/(app)/books/index.tsx` | screen (placeholder) | — | — | none |
| `expo-app/app/(app)/clubs/index.tsx` | screen (placeholder) | — | — | none |
| `expo-app/app/(app)/discover/index.tsx` | screen (placeholder) | — | — | none |
| `expo-app/app/(app)/profile/index.tsx` | screen/component | request-response | UI-SPEC Logout contract | spec-only |
| `expo-app/lib/supabase.ts` | service/utility | request-response | RESEARCH.md Pattern 1 | spec-only |
| `expo-app/lib/i18n/index.ts` | utility/config | transform | RESEARCH.md Pattern 4 | spec-only |
| `expo-app/lib/i18n/en.json` | config | — | UI-SPEC i18n keys | spec-only |
| `expo-app/lib/i18n/de.json` | config | — | UI-SPEC i18n keys | spec-only |
| `expo-app/providers/AuthProvider.tsx` | provider | event-driven | RESEARCH.md Pattern 2 | spec-only |
| `expo-app/store/auth.store.ts` | store | event-driven | RESEARCH.md Pattern 2 | spec-only |
| `expo-app/components/ui/Input.tsx` | component | — | UI-SPEC Component 1 | spec-only |
| `expo-app/components/ui/Button.tsx` | component | — | UI-SPEC Components 2–4 | spec-only |
| `expo-app/components/ui/Alert.tsx` | component | — | UI-SPEC Component 8 | spec-only |
| `expo-app/tamagui.config.ts` | config | — | RESEARCH.md Pattern 6; UI-SPEC Config contract | spec-only |
| `expo-app/tamagui.build.ts` | config | — | RESEARCH.md Pattern 6 | spec-only |
| `expo-app/babel.config.js` | config | — | RESEARCH.md Code Examples | spec-only |
| `expo-app/metro.config.js` | config | — | RESEARCH.md Code Examples | spec-only |
| `expo-app/app.json` | config | — | RESEARCH.md Pattern 5 | spec-only |
| `expo-app/.env` | config | — | RESEARCH.md Standard Stack | spec-only |

---

## Pattern Assignments

### `expo-app/lib/supabase.ts` (service/utility, request-response)

**Source:** RESEARCH.md Pattern 1 + Code Examples (verified: Context7 Supabase Expo quickstart)

**Critical import ordering** — `expo-sqlite/localStorage/install` MUST be the first import (Pitfall 8: wrong order causes `ReferenceError: localStorage is not defined`):

```typescript
// expo-app/lib/supabase.ts
import 'react-native-url-polyfill/auto'       // polyfill URL global FIRST
import 'expo-sqlite/localStorage/install'      // polyfill localStorage SECOND — must precede createClient
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,  // CRITICAL: true causes redirect loops on native (Pitfall 2)
  },
})
```

**Anti-patterns to avoid:**
- Do NOT use `EXPO_PUBLIC_SUPABASE_ANON_KEY` — the current Supabase quickstart uses `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Do NOT set `detectSessionInUrl: true` — native redirect loop (Pitfall 2 in RESEARCH.md)
- Do NOT use `@react-native-async-storage` — superseded by `expo-sqlite/localStorage` for SDK 56

---

### `expo-app/store/auth.store.ts` (store, event-driven)

**Source:** RESEARCH.md Pattern 2 (Zustand auth state design)

```typescript
// expo-app/store/auth.store.ts
import { create } from 'zustand'
import { Session } from '@supabase/supabase-js'

type AuthState = {
  session: Session | null
  initialized: boolean
  isLoggedIn: boolean
  setSession: (session: Session | null) => void
  setInitialized: (initialized: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  initialized: false,
  isLoggedIn: false,
  setSession: (session) => set({ session, isLoggedIn: !!session }),
  setInitialized: (initialized) => set({ initialized }),
}))
```

**Key fields required by auth guard in `_layout.tsx`:** `session`, `initialized`, `isLoggedIn`. Planner must not reduce these — all three are consumed by different parts of the auth guard pattern.

---

### `expo-app/providers/AuthProvider.tsx` (provider, event-driven)

**Source:** RESEARCH.md Pattern 2 (verified: Context7 Supabase react-native-storage.mdx)

```typescript
// expo-app/providers/AuthProvider.tsx
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/auth.store'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession, setInitialized } = useAuthStore()

  useEffect(() => {
    // Load existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setInitialized(true)
    })

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()  // cleanup prevents StrictMode double-fire (Pitfall 9)
  }, [])

  return <>{children}</>
}
```

**Ordering constraint:** `getSession()` must fire before `setInitialized(true)`. The splash screen is held until `initialized = true` — calling `setInitialized(true)` in the wrong callback causes auth flash (Pitfall 1).

---

### `expo-app/app/_layout.tsx` (layout/provider, request-response)

**Source:** RESEARCH.md Patterns 2, 3, 5; UI-SPEC SSR hydration contract

This is the most complex file in Phase 1. It must:
1. Prevent the splash screen from hiding until fonts + auth are initialized
2. Provide TamaguiProvider, AuthProvider, and I18nProvider in the correct nesting order
3. Guard routes based on auth state via `useSegments` + `useRouter`
4. Intercept password-reset deep links via `Linking.useURL()`

```typescript
// expo-app/app/_layout.tsx  (NATIVE version — no CSS import)
// app/_layout.web.tsx has the CSS import added (see below)
import '../lib/i18n'            // side-effect: initializes i18next before any render
import { TamaguiProvider } from 'tamagui'
import { Slot, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import * as SplashScreen from 'expo-splash-screen'
import * as Linking from 'expo-linking'
import { useFonts } from 'expo-font'
import config from '../tamagui.config'
import { AuthProvider } from '../providers/AuthProvider'
import { useAuthStore } from '../store/auth.store'
import { supabase } from '../lib/supabase'

SplashScreen.preventAutoHideAsync()  // called at module level, before any render

function InitialLayout() {
  const { session, initialized } = useAuthStore()
  const segments = useSegments()
  const router = useRouter()
  const url = Linking.useURL()

  // Auth guard — redirect only after initialized (Pitfall 1)
  useEffect(() => {
    if (!initialized) return
    SplashScreen.hideAsync()
    const inAuthGroup = segments[0] === '(auth)'
    if (session && inAuthGroup) {
      router.replace('/(app)/books')
    } else if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in')
    }
  }, [session, initialized])

  // Deep link handler for password reset (Pattern 5)
  useEffect(() => {
    if (!url) return
    const { queryParams } = Linking.parse(url)
    if (!queryParams?.access_token) return
    supabase.auth.setSession({
      access_token: queryParams.access_token as string,
      refresh_token: queryParams.refresh_token as string,
    }).then(() => {
      router.replace('/(auth)/update-password')
    })
  }, [url])

  return <Slot />
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
    InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf'),
  })

  if (!fontsLoaded) return null  // hold until fonts loaded (Pitfall 6)

  return (
    <TamaguiProvider config={config} defaultTheme="light">
      <AuthProvider>
        <InitialLayout />
      </AuthProvider>
    </TamaguiProvider>
  )
}
```

---

### `expo-app/app/_layout.web.tsx` (layout/provider web variant)

**Source:** RESEARCH.md Pitfall 4; Pattern 3

```typescript
// expo-app/app/_layout.web.tsx
// Identical to _layout.tsx but adds the CSS import required for Tamagui web hydration.
// Platform file extension (.web.tsx) prevents this import from reaching native bundler (Pitfall 4).
import '../tamagui.generated.css'
// ...rest is identical to _layout.tsx
```

**Why a separate file:** `import '../tamagui.generated.css'` causes Metro bundler error on native — CSS imports are not supported in React Native. The `.web.tsx` extension gates this import to web only.

---

### `expo-app/app/(auth)/_layout.tsx` (layout)

**Source:** RESEARCH.md Pattern 2; UI-SPEC Navigation contract

```typescript
// expo-app/app/(auth)/_layout.tsx
import { Stack } from 'expo-router'

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
    // headerShown: false on all (auth) screens per UI-SPEC Navigation contract
  )
}
```

---

### `expo-app/app/(auth)/sign-in.tsx` (screen/component, request-response)

**Source:** RESEARCH.md Pattern 2; UI-SPEC Screen A

**Core pattern — form submission with Supabase auth:**

```typescript
// expo-app/app/(auth)/sign-in.tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDidFinishSSR } from '@tamagui/use-did-finish-ssr'
import { YStack, Form, Button, Input, Text } from 'tamagui'
import { supabase } from '../../lib/supabase'
import { Alert } from '../../components/ui/Alert'
import { router } from 'expo-router'

export default function SignIn() {
  const { t } = useTranslation(['auth', 'common'])
  const isClient = useDidFinishSSR()  // SSR hydration guard (UI-SPEC i18n contract)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignIn() {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(t('auth.error_invalid_credentials'))  // never expose which field is wrong
    }
    // Success: AuthProvider onAuthStateChange fires → Zustand updates → InitialLayout redirects
  }

  return (
    <Form onSubmit={handleSignIn}>
      <YStack paddingHorizontal="$lg" paddingTop="$2xl" gap="$md">
        {/* Logo + Heading */}
        {error && <Alert type="error" message={error} />}
        <Input
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          placeholder={isClient ? t('auth.email_label') : 'Email'}
        />
        <Input
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder={isClient ? t('auth.password_label') : 'Password'}
        />
        <Form.Trigger asChild disabled={loading}>
          <Button>{isClient ? t('auth.signIn_cta') : 'Sign In'}</Button>
        </Form.Trigger>
      </YStack>
    </Form>
  )
}
```

**Key patterns to carry into sign-up and forgot-password:**
- `useDidFinishSSR()` guard on every `t()` call visible above-the-fold (UI-SPEC SSR contract)
- Error messages do NOT distinguish which field is wrong (security: prevents user enumeration)
- `setLoading(true)` before call, `setLoading(false)` in all exit paths
- Form submission via `Form.Trigger asChild` + `Form onSubmit`, not via button `onPress`

---

### `expo-app/app/(auth)/sign-up.tsx` (screen/component, request-response)

**Source:** RESEARCH.md Pattern 2; UI-SPEC Screen B

**Additional validation pattern (password mismatch):**

```typescript
// expo-app/app/(auth)/sign-up.tsx — validation logic
const [passwordError, setPasswordError] = useState<string | null>(null)

function validateOnBlur() {
  // Validated on blur, not on keystroke (UI-SPEC Screen B specification)
  if (password.length > 0 && password.length < 8) {
    setPasswordError(t('auth.password_helper'))
  } else if (confirmPassword && password !== confirmPassword) {
    setPasswordError(t('auth.password_mismatch'))
  } else {
    setPasswordError(null)
  }
}

async function handleSignUp() {
  if (password !== confirmPassword) {
    setPasswordError(t('auth.password_mismatch'))
    return
  }
  setLoading(true)
  const { error } = await supabase.auth.signUp({ email, password })
  setLoading(false)
  if (error) {
    setError(error.message)
  } else {
    setShowSuccess(true)  // Replace form with success banner (UI-SPEC Screen B success state)
  }
}
```

**Success state:** Replace the entire form with the "Almost there!" banner — do not navigate away. Use a `showSuccess` boolean to conditional-render the banner vs the form.

---

### `expo-app/app/(auth)/forgot-password.tsx` (screen/component, request-response)

**Source:** RESEARCH.md Pattern 5; UI-SPEC Screen C

```typescript
// expo-app/app/(auth)/forgot-password.tsx — core submit logic
async function handleResetPassword() {
  setLoading(true)
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'buchclub://reset-password',  // must match app.json scheme + Supabase dashboard allowlist
  })
  setLoading(false)
  if (error) {
    // Privacy-safe copy — do NOT say "email not found" (UI-SPEC error states, security domain)
    setMessage(t('auth.error_privacy_safe_reset'))
  } else {
    setLinkSent(true)  // Replace form with "Link sent!" success state
  }
}
```

---

### `expo-app/app/(auth)/update-password.tsx` (screen/component, request-response)

**Source:** RESEARCH.md Pattern 5 (deep link target)

```typescript
// expo-app/app/(auth)/update-password.tsx
async function handleUpdatePassword() {
  setLoading(true)
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  setLoading(false)
  if (!error) {
    router.replace('/(app)/books')
  }
}
```

This screen is only reachable via the deep link flow in `_layout.tsx` that calls `supabase.auth.setSession()` first.

---

### `expo-app/app/(app)/_layout.native.tsx` (layout/navigator, native tab bar)

**Source:** UI-SPEC Navigation contract (Tab bar — native)

```typescript
// expo-app/app/(app)/_layout.native.tsx
import { Tabs } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useTheme } from 'tamagui'
import { useTranslation } from 'react-i18next'

export default function AppLayout() {
  const theme = useTheme()
  const { t } = useTranslation('nav')

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.accent?.val,      // $accent from tamagui.config
        tabBarInactiveTintColor: theme.colorSecondary?.val,
        tabBarStyle: {
          backgroundColor: theme.background?.val,
          borderTopColor: theme.borderColor?.val,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontSize: 14 },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="books/index"
        options={{
          title: t('nav.books'),
          tabBarIcon: ({ color }) => <Feather name="book-open" size={24} color={color} />,
        }}
      />
      {/* clubs, discover, profile screens follow same pattern */}
    </Tabs>
  )
}
```

---

### `expo-app/app/(app)/_layout.web.tsx` (layout/navigator, web nav bar)

**Source:** UI-SPEC Navigation contract (Tab bar — web)

The web layout renders a horizontal top nav bar (not a bottom tab bar). It is a fully custom component, not a Tabs navigator. Pattern: `XStack` at top, `height: 56`, logo left, nav items right, active item has `$accent` underline.

---

### `expo-app/app/(app)/profile/index.tsx` (screen/component, logout)

**Source:** UI-SPEC Logout contract (AUTH-05)

```typescript
// expo-app/app/(app)/profile/index.tsx — logout action
import { supabase } from '../../../lib/supabase'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/Button'

async function handleSignOut() {
  await supabase.auth.signOut()
  // AuthProvider onAuthStateChange fires → setSession(null) → isLoggedIn=false
  // InitialLayout redirects to (auth)/sign-in automatically — no manual router.replace needed
}
```

No destructive confirmation required (AUTH-05 is fully reversible per UI-SPEC).

---

### `expo-app/lib/i18n/index.ts` (utility/config, transform)

**Source:** RESEARCH.md Pattern 4 (verified: Context7 react-i18next + expo-localization)

```typescript
// expo-app/lib/i18n/index.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { getLocales } from 'expo-localization'
import en from './en.json'
import de from './de.json'

const deviceLang = getLocales()[0]?.languageCode ?? 'en'
const supportedLang = ['en', 'de'].includes(deviceLang) ? deviceLang : 'en'

i18n
  .use(initReactI18next)
  .init({
    lng: supportedLang,
    fallbackLng: 'en',
    supportedLngs: ['en', 'de'],
    resources: {
      en: { common: en.common, auth: en.auth, nav: en.nav },
      de: { common: de.common, auth: de.auth, nav: de.nav },
    },
    ns: ['common', 'auth', 'nav'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    pluralSeparator: '_',
    compatibilityJSON: 'v4',   // Phase 2+ plural keys work without config changes
    react: { useSuspense: false },  // CRITICAL: React Native has no Suspense (Pitfall 5)
  })

export default i18n
```

**Import this file as a side effect** in `app/_layout.tsx` with `import '../lib/i18n'` before any component that calls `useTranslation()`.

---

### `expo-app/lib/i18n/en.json` and `expo-app/lib/i18n/de.json` (config)

**Source:** UI-SPEC i18n Visual Contract (complete key sets)

All keys are fully defined in `01-UI-SPEC.md` lines 509–595. Copy them verbatim — the planner should reference those exact JSON blocks.

The JSON structure uses three top-level namespaces matching the i18n init: `common`, `auth`, `nav`.

---

### `expo-app/components/ui/Input.tsx` (component)

**Source:** UI-SPEC Component Contract 1

Key implementation requirements:
- Height: `$size.5` (52px)
- Background: `$backgroundStrong`
- Border: `1px solid $borderColor`, `borderRadius: 8`
- Focus border: `1.5px solid $accent` (via `focusStyle` prop in Tamagui)
- Placeholder: `$colorSecondary`
- Error state: `$destructive` border + red helper text below
- Eye toggle for password fields: Feather `eye` / `eye-off`, 20px, touch target 44px
- `accessibilityLabel` required on eye toggle: `t('auth.show_password')` / `t('auth.hide_password')`

```typescript
// expo-app/components/ui/Input.tsx — structure
import { Input as TamaguiInput, YStack, Text, XStack } from 'tamagui'
import { Feather } from '@expo/vector-icons'
import { useState } from 'react'

type InputProps = {
  label?: string
  error?: string
  helper?: string
  isPassword?: boolean
  // ...rest of TamaguiInput props
}

export function Input({ label, error, helper, isPassword, ...props }: InputProps) {
  const [showPassword, setShowPassword] = useState(false)
  return (
    <YStack gap="$xs">
      {label && <Text fontSize={14} color="$colorSecondary">{label}</Text>}
      <XStack>
        <TamaguiInput
          height="$size.5"
          backgroundColor="$backgroundStrong"
          borderColor={error ? '$destructive' : '$borderColor'}
          borderWidth={1}
          borderRadius={8}
          focusStyle={{ borderColor: '$accent', borderWidth: 1.5 }}
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />
        {isPassword && (
          <Feather
            name={showPassword ? 'eye-off' : 'eye'}
            size={20}
            onPress={() => setShowPassword(v => !v)}
            // accessibilityLabel required
          />
        )}
      </XStack>
      {(error || helper) && (
        <Text fontSize={14} color={error ? '$destructive' : '$colorSecondary'}>
          {error ?? helper}
        </Text>
      )}
    </YStack>
  )
}
```

---

### `expo-app/components/ui/Button.tsx` (component)

**Source:** UI-SPEC Component Contracts 2, 3, 4

Three variants from a single component:

```typescript
// expo-app/components/ui/Button.tsx — variant pattern
import { Button as TamaguiButton } from 'tamagui'
import { ActivityIndicator } from 'react-native'

type ButtonVariant = 'primary' | 'secondary' | 'text'

type ButtonProps = {
  variant?: ButtonVariant
  loading?: boolean
  // ...TamaguiButton props
}

// Primary:   backgroundColor="$accent", height="$size.5", borderRadius={12}
// Secondary: backgroundColor="transparent", borderWidth={1.5}, borderColor="$borderColor"
// Text:      backgroundColor="transparent", no border, color="$accent", fontSize={14}

export function Button({ variant = 'primary', loading, children, ...props }: ButtonProps) {
  const variantProps = {
    primary: { backgroundColor: '$accent', color: '$backgroundPress' },
    secondary: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '$borderColor' },
    text: { backgroundColor: 'transparent', color: '$accent', fontSize: 14 },
  }[variant]

  return (
    <TamaguiButton
      height={variant === 'text' ? 'auto' : variant === 'secondary' ? 48 : '$size.5'}
      borderRadius={variant === 'text' ? 0 : 12}
      pressStyle={{ opacity: 0.85, scale: 0.98 }}  // UI-SPEC animation inventory
      animation="fast"
      disabled={loading}
      {...variantProps}
      {...props}
    >
      {loading ? <ActivityIndicator color="white" size="small" /> : children}
    </TamaguiButton>
  )
}
```

---

### `expo-app/components/ui/Alert.tsx` (component)

**Source:** UI-SPEC Component Contract 8

```typescript
// expo-app/components/ui/Alert.tsx
import { XStack, Text } from 'tamagui'
import { Feather } from '@expo/vector-icons'

type AlertProps = {
  type: 'success' | 'error'
  message: string
}

export function Alert({ type, message }: AlertProps) {
  const isSuccess = type === 'success'
  return (
    <XStack
      backgroundColor={isSuccess ? '$success' : '$destructive'}
      opacity={isSuccess ? 0.12 : 0.10}
      borderLeftWidth={3}
      borderLeftColor={isSuccess ? '$success' : '$destructive'}
      borderRadius={8}
      padding="$sm"
      paddingHorizontal="$md"
      gap="$xs"
      accessibilityRole="alert"   // screen reader announces on appearance (UI-SPEC accessibility)
      animation="medium"
      enterStyle={{ opacity: 0, y: 4 }}  // UI-SPEC animation: error banner appear
    >
      <Feather name={isSuccess ? 'check-circle' : 'alert-circle'} size={16} />
      <Text fontSize={14} color="$color" flex={1}>{message}</Text>
    </XStack>
  )
}
```

---

### `expo-app/tamagui.config.ts` (config)

**Source:** RESEARCH.md Pattern 6; UI-SPEC Tamagui Config File Contract; UI-SPEC Design System

```typescript
// expo-app/tamagui.config.ts
import { createFont, createTamagui, createTokens, isWeb } from '@tamagui/core'
import { defaultConfig } from '@tamagui/config/v5'      // NOT /v4 or plain @tamagui/config (Pitfall 3)
import { animations as animationsCSS } from '@tamagui/animations-css'
import { animations as animationsReanimated } from '@tamagui/animations-react-native'

const config = createTamagui({
  ...defaultConfig,

  animations: isWeb ? animationsCSS : animationsReanimated,  // platform-conditional (Pitfall 10)

  // Animation presets (UI-SPEC Motion contract)
  // fast:   damping 20, stiffness 280, 120ms — button press, input focus
  // medium: damping 18, stiffness 200, 220ms — banners, screen transitions
  // slow:   damping 15, stiffness 120, 350ms — sheets/dialogs (Phase 2+)

  // Spacing tokens (UI-SPEC Spacing Scale)
  // xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48, '3xl': 64

  // Color tokens (UI-SPEC Color palette)
  // Light: background #FDFAF6, backgroundStrong #F2EDE4, accent #7C4B2A,
  //        color #1A1209, colorSecondary #6B5C47, borderColor #D6CBBC,
  //        destructive #B33A3A, success #2E7D5A, backgroundPress #FFFFFF
  // Dark:  background #1A1209, backgroundStrong #2A1F14, accent #C47A3D,
  //        color #F2EDE4, colorSecondary #9E8A74, borderColor #3D2E20,
  //        destructive #E05555, success #4AB07A

  // Media breakpoints (UI-SPEC Responsive Breakpoints)
  // sm: { maxWidth: 390 }, md: { maxWidth: 768 },
  // gtSm: { minWidth: 391 }, gtMd: { minWidth: 769 }
})

type AppConfig = typeof config
declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config  // default export, not named (Assumption A5 in RESEARCH.md)
```

---

### `expo-app/tamagui.build.ts` (config)

**Source:** RESEARCH.md Pattern 6

```typescript
// expo-app/tamagui.build.ts
import type { TamaguiBuildOptions } from 'tamagui'

export default {
  config: './tamagui.config.ts',
  components: ['tamagui'],
  outputCSS: './tamagui.generated.css',
  disableExtraction: process.env.NODE_ENV === 'development',  // faster hot-reload in dev
} satisfies TamaguiBuildOptions
```

---

### `expo-app/babel.config.js` (config)

**Source:** RESEARCH.md Code Examples (verified: Context7 Tamagui compiler-install.mdx)

```javascript
// expo-app/babel.config.js
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    '@tamagui/babel-plugin',  // reads tamagui.build.ts automatically
  ],
}
```

---

### `expo-app/metro.config.js` (config)

**Source:** RESEARCH.md Code Examples (verified: Context7 Tamagui metro.mdx)

```javascript
// expo-app/metro.config.js
const { getDefaultConfig } = require('expo/metro-config')
const { withTamagui } = require('@tamagui/metro-plugin')

const config = getDefaultConfig(__dirname)
module.exports = withTamagui(config)  // reads tamagui.build.ts automatically
```

---

### `expo-app/app.json` (config)

**Source:** RESEARCH.md Pattern 5 (deep link scheme requirement)

```json
{
  "expo": {
    "name": "Buchclub",
    "slug": "buchclub",
    "scheme": "buchclub",
    "version": "1.0.0",
    "platforms": ["ios", "android", "web"]
  }
}
```

`scheme: "buchclub"` is required for `resetPasswordForEmail({ redirectTo: 'buchclub://reset-password' })` to open the app from the email link (verified: Context7 Supabase native-mobile-deep-linking.mdx).

---

### Placeholder tab screens (books, clubs, discover)

`expo-app/app/(app)/books/index.tsx`, `clubs/index.tsx`, `discover/index.tsx` — minimal scaffolds only:

```typescript
// expo-app/app/(app)/books/index.tsx (same pattern for clubs and discover)
import { YStack, Text } from 'tamagui'

export default function Books() {
  return (
    <YStack flex={1} alignItems="center" justifyContent="center">
      <Text>Books — Phase 3</Text>
    </YStack>
  )
}
```

---

## Shared Patterns

### SSR Hydration Guard for i18n (applies to all screens)

**Source:** UI-SPEC i18n Visual Contract; `@tamagui/use-did-finish-ssr`
**Apply to:** All screen components that call `t()` for text visible above-the-fold on web

```typescript
import { useDidFinishSSR } from '@tamagui/use-did-finish-ssr'

const isClient = useDidFinishSSR()
// Usage:
<Text>{isClient ? t('auth.signIn') : 'Sign In'}</Text>
```

Server renders English default; client hydrates with device locale. Prevents hydration mismatch on web.

---

### Error Handling Pattern (applies to all auth screens)

**Source:** UI-SPEC Error States; RESEARCH.md Security Domain
**Apply to:** `sign-in.tsx`, `sign-up.tsx`, `forgot-password.tsx`, `update-password.tsx`

```typescript
const [error, setError] = useState<string | null>(null)
const [loading, setLoading] = useState(false)

async function handleSubmit() {
  setLoading(true)
  setError(null)  // clear previous error on new submission
  try {
    const { error } = await supabase.auth.[action](...)
    if (error) setError(t('auth.error_[key]'))
  } finally {
    setLoading(false)  // always reset loading in finally
  }
}
```

Error messages must NEVER distinguish which field is wrong (security: prevents user enumeration). Use the generic credential error for all sign-in failures.

---

### Form Submission Pattern (applies to all auth screen forms)

**Source:** UI-SPEC Component Contract 6 (Form Container)
**Apply to:** `sign-in.tsx`, `sign-up.tsx`, `forgot-password.tsx`

```typescript
// Submit via Form.Trigger + Form onSubmit — NOT via button onPress directly
<Form onSubmit={handleSubmit}>
  <YStack gap="$md">
    {/* fields */}
    <Form.Trigger asChild disabled={loading}>
      <Button variant="primary" loading={loading}>
        {t('auth.cta_key')}
      </Button>
    </Form.Trigger>
  </YStack>
</Form>
```

`Form.Trigger asChild` ensures the submit button integrates with the native keyboard's return key.

---

### Accessibility Pattern (applies to all interactive components)

**Source:** UI-SPEC Accessibility Contract
**Apply to:** All components with interactive elements

```typescript
// Eye toggle on password input
<Feather
  name={showPassword ? 'eye-off' : 'eye'}
  accessibilityLabel={t('auth.show_password')}
  accessibilityRole="button"
/>

// Error banners
<XStack accessibilityRole="alert">  {/* announced immediately by screen reader */}

// returnKeyType on form fields
<Input returnKeyType="next" onSubmitEditing={() => nextFieldRef.current?.focus()} />
// Last field in form:
<Input returnKeyType="done" />
```

---

### Token Usage Pattern (applies to ALL files)

**Source:** UI-SPEC Design System; RESEARCH.md Anti-Patterns
**Apply to:** Every component that uses visual styling

```typescript
// CORRECT — compile-time token
<YStack padding="$lg" gap="$md" backgroundColor="$backgroundStrong" />
<Text color="$colorSecondary" fontSize={14} />

// WRONG — inline pixel values defeat Tamagui compiler optimization
<YStack padding={24} gap={16} />   // never do this
```

All spacing, color, and size values must use `$token` syntax referencing tokens defined in `tamagui.config.ts`.

---

### RTL Readiness Pattern (applies to all layout components)

**Source:** UI-SPEC i18n Visual Contract
**Apply to:** All components using directional spacing

```typescript
// CORRECT — RTL-safe
<XStack gap="$sm" />               // gap is direction-neutral
<Text marginStart="$sm" />         // marginStart = marginLeft in LTR, marginRight in RTL

// WRONG — breaks RTL
<Text marginLeft={8} />            // never use marginLeft/marginRight for icon-to-text offsets
<Text textAlign="left" />          // never hard-code; use 'start' or omit
```

---

## No Analog Found

All 29 files in this phase have no close analog in the existing codebase. The existing repo is a bare `create-next-app` scaffold using Next.js App Router, Tailwind CSS, and shadcn/ui — none of which apply to the Expo/Tamagui/Supabase stack.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| All 29 files listed in Classification table | Various | Various | Greenfield Expo app; existing Next.js code in repo root uses incompatible stack (Tailwind/shadcn vs Tamagui; Next.js vs Expo Router) |

**Planner action:** Use the `## Pattern Assignments` sections above as the sole pattern source. Do not reference the existing `app/layout.tsx` or `components/` from the Next.js app — they are architecturally incompatible.

---

## Critical Ordering and Dependencies

The planner must respect this build order — each group depends on the previous:

```
Group 1 (config files, no dependencies):
  app.json, .env, babel.config.js, metro.config.js,
  tamagui.build.ts, tamagui.config.ts

Group 2 (depends on Group 1):
  lib/supabase.ts                    (requires .env vars)
  lib/i18n/index.ts + en.json + de.json  (self-contained)

Group 3 (depends on Group 2):
  store/auth.store.ts                (no deps, but used by AuthProvider)
  providers/AuthProvider.tsx         (requires supabase.ts + auth.store.ts)
  components/ui/Input.tsx            (requires tamagui.config.ts tokens)
  components/ui/Button.tsx           (requires tamagui.config.ts tokens)
  components/ui/Alert.tsx            (requires tamagui.config.ts tokens)

Group 4 (depends on Group 3):
  app/(auth)/_layout.tsx
  app/(auth)/sign-in.tsx
  app/(auth)/sign-up.tsx
  app/(auth)/forgot-password.tsx
  app/(auth)/update-password.tsx
  app/(app)/_layout.native.tsx
  app/(app)/_layout.web.tsx
  app/(app)/books/index.tsx, clubs/index.tsx, discover/index.tsx, profile/index.tsx

Group 5 (root layout — depends on everything):
  app/_layout.tsx                    (imports all providers + uses all hooks)
  app/_layout.web.tsx                (variant of _layout.tsx + CSS import)
```

---

## Metadata

**Analog search scope:** `/Users/I570118/Downloads/buchclub-app/app/`, `/Users/I570118/Downloads/buchclub-app/lib/`, `/Users/I570118/Downloads/buchclub-app/components/`
**Files scanned:** 4 TypeScript files in existing Next.js app (`app/layout.tsx`, `app/page.tsx`, `lib/utils.ts`, plus empty `components/`)
**Result:** 0 applicable analogs — existing code is a bare Next.js/Tailwind scaffold
**Pattern extraction date:** 2026-05-24
**Pattern sources confidence:** HIGH (Supabase Expo quickstart, Tamagui Expo guide, expo-localization docs — all verified via Context7 in RESEARCH.md)
