# Phase 2: Clubs & Onboarding — Pattern Map

**Mapped:** 2026-05-24
**Files analyzed:** 26 new/modified files
**Analogs found:** 22 / 26 (4 have no codebase analog — use RESEARCH.md patterns)

---

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------------|------|-----------|----------------|---------------|
| `expo-app/app/_layout.tsx` | layout/provider | event-driven | `expo-app/app/_layout.tsx` (self — extend) | exact |
| `expo-app/app/_layout.web.tsx` | layout/provider (web) | event-driven | `expo-app/app/_layout.web.tsx` (self — extend) | exact |
| `expo-app/app/(onboarding)/_layout.tsx` | layout | request-response | `expo-app/app/(auth)/_layout.tsx` | exact |
| `expo-app/app/(onboarding)/username.tsx` | screen/component | request-response | `expo-app/app/(auth)/sign-up.tsx` | role-match |
| `expo-app/app/(onboarding)/avatar.tsx` | screen/component | request-response | `expo-app/app/(auth)/sign-up.tsx` | role-match |
| `expo-app/store/club.store.ts` | store | event-driven | `expo-app/store/auth.store.ts` | role-match |
| `expo-app/app/(app)/clubs/index.tsx` | screen/component | CRUD | `expo-app/app/(app)/clubs/index.tsx` (self — replace) | exact |
| `expo-app/app/(app)/clubs/[id]/index.tsx` | screen/component | CRUD | `expo-app/app/(app)/profile/index.tsx` | role-match |
| `expo-app/app/(app)/clubs/[id]/settings.tsx` | screen/component | CRUD | `expo-app/app/(app)/app/(auth)/sign-up.tsx` | role-match |
| `expo-app/app/(app)/clubs/create/index.tsx` | screen/component | CRUD | `expo-app/app/(auth)/sign-up.tsx` | role-match |
| `expo-app/app/(app)/clubs/join/index.tsx` | screen/component | CRUD | `expo-app/app/(auth)/sign-in.tsx` | role-match |
| `expo-app/app/(app)/clubs/browse/index.tsx` | screen/component | CRUD | `expo-app/app/(app)/clubs/index.tsx` | role-match |
| `expo-app/app/(app)/profile/index.tsx` | screen/component | CRUD | `expo-app/app/(app)/profile/index.tsx` (self — extend) | exact |
| `expo-app/app/(app)/profile/edit.tsx` | screen/component | CRUD | `expo-app/app/(auth)/sign-up.tsx` | role-match |
| `expo-app/app/(app)/_layout.native.tsx` | layout/navigator | request-response | `expo-app/app/(app)/_layout.native.tsx` (self — extend) | exact |
| `expo-app/app/(app)/_layout.web.tsx` | layout/navigator (web) | request-response | `expo-app/app/(app)/_layout.web.tsx` (self — extend) | exact |
| `expo-app/components/ui/ClubBanner.tsx` | component | request-response | `expo-app/components/ui/Alert.tsx` | role-match |
| `expo-app/components/ui/ClubCard.tsx` | component | request-response | `expo-app/components/ui/Alert.tsx` | role-match |
| `expo-app/components/ui/MemberRow.tsx` | component | request-response | `expo-app/components/ui/Alert.tsx` | role-match |
| `expo-app/components/ui/AvatarPicker.tsx` | component | request-response | `expo-app/components/ui/Input.tsx` | role-match |
| `expo-app/components/ui/WizardSteps.tsx` | component | — | `expo-app/components/ui/Alert.tsx` | role-match |
| `expo-app/components/ui/CodeInput.tsx` | component | request-response | `expo-app/components/ui/Input.tsx` | role-match |
| `expo-app/lib/i18n/index.ts` | utility/config | transform | `expo-app/lib/i18n/index.ts` (self — extend) | exact |
| `expo-app/lib/i18n/en.json` + `de.json` | config | — | `expo-app/lib/i18n/en.json` (self — extend) | exact |
| `supabase/migrations/0002_delete_account_rpc.sql` | migration | — | none | none |
| `expo-app/constants/avatars.ts` | utility | — | none | none |

---

## Pattern Assignments

### `expo-app/app/_layout.tsx` (layout/provider, event-driven) — MODIFY

**Analog:** `expo-app/app/_layout.tsx` (self — extend existing file)

**Current imports block** (lines 1–12):
```typescript
import '../lib/i18n';
import { useEffect } from 'react';
import { TamaguiProvider } from 'tamagui';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { createAnimations } from '@tamagui/animations-react-native';
import config from '../tamagui.config';
import { AuthProvider } from '../providers/AuthProvider';
import { useAuthStore } from '../store/auth.store';
import { supabase } from '../lib/supabase';
```

**Changes required:**
1. Replace Inter font loading with Archivo Narrow + IBM Plex Sans (RESEARCH Pattern 7).
2. Replace `Linking.useURL()` with `Linking.useLinkingURL()` (deprecated in SDK 56 — RESEARCH Pitfall 6).
3. Add `QueryClientProvider` wrapping inside `RootLayout` (RESEARCH Pattern 2).
4. Add `useClubStore` reads (`onboardingCompleted`, `_hasHydrated`) to `InitialLayout`.
5. Extend `useEffect` to gate on `hasHydrated` and add onboarding redirect logic.
6. Extend deep link `useEffect` to handle `buchclub://join?code=XXXXXXXX` (RESEARCH Pattern 10).

**Current `InitialLayout` core pattern** (lines 22–53):
```typescript
function InitialLayout() {
  const session = useAuthStore((s) => s.session);
  const initialized = useAuthStore((s) => s.initialized);
  const segments = useSegments();
  const router = useRouter();
  const url = Linking.useURL();   // ← MUST change to Linking.useLinkingURL()

  useEffect(() => {
    if (!initialized) return;
    SplashScreen.hideAsync();
    const inAuthGroup = segments[0] === '(auth)';
    if (session && inAuthGroup) {
      router.replace('/(app)/books');
    } else if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    }
  }, [session, initialized, segments, router]);
  // ...
  return <Slot />;
}
```

**Extended `InitialLayout` pattern** — copy this exact logic (RESEARCH Pattern 5):
```typescript
// Add to existing imports:
import { useClubStore } from '../store/club.store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 2 } },
});

function InitialLayout() {
  const session      = useAuthStore((s) => s.session);
  const initialized  = useAuthStore((s) => s.initialized);
  const onboardingCompleted = useClubStore((s) => s.onboardingCompleted);
  const hasHydrated  = useClubStore((s) => s._hasHydrated);
  const setPendingInviteCode = useClubStore((s) => s.setPendingInviteCode);
  const segments = useSegments();
  const router   = useRouter();
  const url = Linking.useLinkingURL();  // NOT useURL() — deprecated in SDK 56

  useEffect(() => {
    if (!initialized || !hasHydrated) return;  // gate on BOTH flags
    SplashScreen.hideAsync();
    const inAuthGroup       = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (session && inAuthGroup) {
      router.replace(onboardingCompleted ? '/(app)/clubs' : '/(onboarding)/username');
    } else if (session && !onboardingCompleted && !inOnboardingGroup) {
      router.replace('/(onboarding)/username');
    } else if (session && onboardingCompleted && inOnboardingGroup) {
      router.replace('/(app)/clubs');
    }
  }, [session, initialized, hasHydrated, onboardingCompleted, segments, router]);

  useEffect(() => {
    if (!url) return;
    const { queryParams, hostname, path } = Linking.parse(url);
    // Existing: password reset
    const accessToken = queryParams?.access_token;
    const refreshToken = queryParams?.refresh_token;
    if (typeof accessToken === 'string' && typeof refreshToken === 'string') {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(() => router.replace('/(auth)/update-password'));
      return;
    }
    // New: invite code join link
    const isJoinLink = hostname === 'join' || path?.startsWith('join');
    const code = (queryParams?.code as string) ?? path?.split('/')[1];
    if (isJoinLink && code) {
      if (!onboardingCompleted) {
        setPendingInviteCode(code);
      } else {
        router.replace(`/(app)/clubs/join?code=${code}`);
      }
    }
  }, [url, onboardingCompleted, router, setPendingInviteCode]);

  return <Slot />;
}

// In RootLayout — add QueryClientProvider:
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ArchivoNarrow_700Bold,       // from @expo-google-fonts/archivo-narrow
    IBMPlexSans_400Regular,      // from @expo-google-fonts/ibm-plex-sans
    IBMPlexSans_600SemiBold,
  });
  if (!fontsLoaded) return null;
  return (
    <TamaguiProvider config={config} defaultTheme="light" animations={animations}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <InitialLayout />
        </AuthProvider>
      </QueryClientProvider>
    </TamaguiProvider>
  );
}
```

---

### `expo-app/app/_layout.web.tsx` (layout/provider web, event-driven) — MODIFY

**Analog:** `expo-app/app/_layout.web.tsx` (self)

Mirror all changes from `_layout.tsx` above. The only difference is:
- Line 1: `import '../tamagui.generated.css';` must stay (web CSS)
- Line 9: `import { createAnimations } from '@tamagui/animations-css';` stays (CSS animations on web)
- Same `QueryClientProvider`, `useClubStore`, `useLinkingURL()`, and font changes apply identically.

**Current web-specific animation pattern** (lines 9–21):
```typescript
import { createAnimations } from '@tamagui/animations-css';

const animations = createAnimations({
  fast:   '120ms ease-in',
  medium: '220ms ease-in',
  slow:   '350ms ease-in',
});
```

---

### `expo-app/app/(onboarding)/_layout.tsx` (layout, request-response) — CREATE

**Analog:** `expo-app/app/(auth)/_layout.tsx`

Exact copy pattern — Stack navigator, `headerShown: false`:
```typescript
// expo-app/app/(auth)/_layout.tsx — full file (5 lines)
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Onboarding layout is identical. Name the export `OnboardingLayout`.

---

### `expo-app/app/(onboarding)/username.tsx` (screen/component, request-response) — CREATE

**Analog:** `expo-app/app/(auth)/sign-up.tsx`

**Imports pattern** (from sign-up.tsx lines 1–13):
```typescript
import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDidFinishSSR } from '@tamagui/use-did-finish-ssr';
import { YStack, Text, Form, ScrollView } from 'tamagui';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth.store';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';
// Additional for Phase 2:
import { WizardSteps } from '../../components/ui/WizardSteps';
```

**Screen layout structure** (from sign-in.tsx lines 41–101):
```typescript
return (
  <SafeAreaView style={{ flex: 1, backgroundColor: '#F0EDE4' }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <YStack flex={1} paddingHorizontal="$lg" paddingTop="$2xl" gap="$xl"
          $gtSm={{ maxWidth: 420, alignSelf: 'center', width: '100%' }}>
          {/* illustration */}
          {/* heading + subtext */}
          {error && <Alert type="error" message={error} />}
          <Form onSubmit={handleSubmit}>
            <YStack gap="$md">
              <Input ... />
              <Form.Trigger asChild disabled={loading || !canSubmit}>
                <Button variant="primary" loading={loading}>
                  {isClient ? t('onboarding:continue_cta') : 'Continue'}
                </Button>
              </Form.Trigger>
            </YStack>
          </Form>
          <WizardSteps total={2} current={1} />
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
);
```

**Debounced uniqueness check pattern** (RESEARCH Pattern 6):
```typescript
const checkGeneration = useRef(0);
const debounceTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

function handleUsernameChange(text: string) {
  setUsername(text);
  setUsernameError(null);
  setUsernameAvailable(false);
  if (debounceTimer.current) clearTimeout(debounceTimer.current);
  if (text.length < 3 || !/^[a-zA-Z0-9_]+$/.test(text)) return;
  debounceTimer.current = setTimeout(async () => {
    const generation = ++checkGeneration.current;
    setValidating(true);
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', text)
      .maybeSingle();
    if (generation !== checkGeneration.current) return; // stale — discard
    setValidating(false);
    if (data) setUsernameError(t('onboarding:username_error_taken'));
    else setUsernameAvailable(true);
  }, 500);
}
```

**Submit — UPDATE profiles row** (RESEARCH Open Question 2 answer — always UPDATE, trigger creates row):
```typescript
async function handleSubmit() {
  if (loading || !usernameAvailable) return;
  setLoading(true);
  setError(null);
  try {
    const userId = useAuthStore.getState().session?.user.id;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username })
      .eq('id', userId);
    if (updateError) {
      setError(t('common:error_generic'));
      return;
    }
    router.push('/(onboarding)/avatar');
  } catch {
    setError(t('common:error_network'));
  } finally {
    setLoading(false);
  }
}
```

**SSR guard** — every `t()` call visible above-the-fold:
```typescript
const isClient = useDidFinishSSR();
// Usage: {isClient ? t('onboarding:username_heading') : 'What should we call you?'}
```

---

### `expo-app/app/(onboarding)/avatar.tsx` (screen/component, request-response) — CREATE

**Analog:** `expo-app/app/(auth)/sign-up.tsx`

Same screen scaffold as username.tsx. Key differences:

**AvatarPicker integration + Sheet trigger:**
```typescript
import { Sheet } from 'tamagui';
import { AvatarPicker } from '../../components/ui/AvatarPicker';
import { WizardSteps } from '../../components/ui/WizardSteps';
import { useClubStore } from '../../store/club.store';

const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
const [sheetOpen, setSheetOpen] = useState(false);

async function handleContinue() {
  // Update avatar_url if selection was made
  if (selectedAvatar) {
    const userId = useAuthStore.getState().session?.user.id;
    await supabase.from('profiles').update({ avatar_url: selectedAvatar }).eq('id', userId);
  }
  // Open the create-or-join sheet (non-dismissable)
  setSheetOpen(true);
}
```

**Create-or-join Sheet pattern** (RESEARCH Pattern 4):
```typescript
<Sheet
  modal={true}
  open={sheetOpen}
  onOpenChange={setSheetOpen}
  snapPoints={[35]}
  dismissOnSnapToBottom={false}   // user MUST choose — cannot dismiss
  animation="slow"
>
  <Sheet.Overlay animation="medium" enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
  <Sheet.Handle />
  <Sheet.Frame borderTopLeftRadius={24} borderTopRightRadius={24} backgroundColor="$backgroundStrong"
    paddingHorizontal="$lg" paddingVertical="$md" gap="$md">
    <Text fontFamily="$heading" fontSize={18} color="$color">
      {isClient ? t('onboarding:create_or_join_heading') : 'What would you like to do?'}
    </Text>
    <Button variant="primary" onPress={() => { setSheetOpen(false); router.push('/(app)/clubs/create'); }}>
      {isClient ? t('onboarding:create_club_cta') : 'Create a club'}
    </Button>
    <Button variant="secondary" onPress={() => { setSheetOpen(false); router.push('/(app)/clubs/join'); }}>
      {isClient ? t('onboarding:join_club_cta') : 'Join a club'}
    </Button>
  </Sheet.Frame>
</Sheet>
```

---

### `expo-app/store/club.store.ts` (store, event-driven) — CREATE

**Analog:** `expo-app/store/auth.store.ts` (lines 1–18) — same `create<T>` Zustand pattern, but with `persist` middleware added.

**Exact auth.store.ts pattern to mirror:**
```typescript
// expo-app/store/auth.store.ts
import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

type AuthState = {
  session: Session | null;
  initialized: boolean;
  isLoggedIn: boolean;
  setSession: (session: Session | null) => void;
  setInitialized: (initialized: boolean) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  initialized: false,
  isLoggedIn: false,
  setSession: (session) => set({ session, isLoggedIn: !!session }),
  setInitialized: (initialized) => set({ initialized }),
}));
```

**Club store — extend with persist middleware** (RESEARCH Pattern 1 complete implementation):
```typescript
// expo-app/store/club.store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Storage from 'expo-sqlite/kv-store';

type ClubState = {
  activeClubId: string | null;
  onboardingCompleted: boolean;
  pendingInviteCode: string | null;
  _hasHydrated: boolean;
  setActiveClubId: (id: string | null) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  setPendingInviteCode: (code: string | null) => void;
  _setHasHydrated: (v: boolean) => void;
};

export const useClubStore = create<ClubState>()(
  persist(
    (set) => ({
      activeClubId: null,
      onboardingCompleted: false,
      pendingInviteCode: null,
      _hasHydrated: false,
      setActiveClubId: (id) => set({ activeClubId: id }),
      setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),
      setPendingInviteCode: (code) => set({ pendingInviteCode: code }),
      _setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'club-store',
      storage: createJSONStorage(() => Storage),
      partialize: (state) => ({
        // _hasHydrated and _setHasHydrated are EXCLUDED — must not be persisted (RESEARCH Pitfall 7)
        activeClubId: state.activeClubId,
        onboardingCompleted: state.onboardingCompleted,
        pendingInviteCode: state.pendingInviteCode,
      }),
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated(true);
      },
    }
  )
);
```

---

### `expo-app/app/(app)/clubs/index.tsx` (screen/component, CRUD) — REPLACE

**Analog:** `expo-app/app/(app)/profile/index.tsx` (Supabase read + auth store access pattern)

**Current stub pattern to replace entirely** (clubs/index.tsx lines 1–22):
```typescript
// Full stub — discard and write new implementation
import { YStack, Text } from 'tamagui';
import { useTranslation } from 'react-i18next';
export default function Clubs() { ... }
```

**TanStack Query data fetch pattern** (RESEARCH Pattern 2):
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/auth.store';
import { useClubStore } from '../../../store/club.store';
import { ClubCard } from '../../../components/ui/ClubCard';

export default function Clubs() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const { activeClubId, setActiveClubId } = useClubStore();

  const { data: memberships, isLoading } = useQuery({
    queryKey: ['clubs', 'my', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_members')
        .select('club_id, role, clubs(*)')
        .eq('user_id', userId!);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Empty state / loading state / list rendering
}
```

**Profile/stores access pattern** (from profile/index.tsx lines 1–7):
```typescript
// Establishes the pattern for reading session + using Zustand in a screen:
import { useAuthStore } from '../../../store/auth.store';
const session = useAuthStore((s) => s.session);
```

---

### `expo-app/app/(app)/clubs/[id]/index.tsx` (screen/component, CRUD) — CREATE

**Analog:** `expo-app/app/(app)/profile/index.tsx` + TanStack Query pattern

**Dynamic route param access:**
```typescript
import { useLocalSearchParams } from 'expo-router';
const { id } = useLocalSearchParams<{ id: string }>();
```

**Member list query:**
```typescript
const { data: members } = useQuery({
  queryKey: ['club', id, 'members'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('club_members')
      .select('user_id, role, profiles(username, avatar_url)')
      .eq('club_id', id);
    if (error) throw error;
    return data;
  },
  enabled: !!id,
});
```

**Admin action mutation** (remove member):
```typescript
const { mutate: removeMember } = useMutation({
  mutationFn: async (userId: string) => {
    const { error } = await supabase
      .from('club_members')
      .delete()
      .eq('club_id', id)
      .eq('user_id', userId);
    if (error) throw error;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['club', id, 'members'] }),
});
```

---

### `expo-app/app/(app)/clubs/create/index.tsx` (screen/component, CRUD) — CREATE

**Analog:** `expo-app/app/(auth)/sign-up.tsx` (multi-state form with loading + error)

**Wizard step state pattern** (RESEARCH Pattern 11):
```typescript
const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
const [name, setName] = useState('');
const [description, setDescription] = useState('');
const [isPublic, setIsPublic] = useState(true);
const [createdClub, setCreatedClub] = useState<{ id: string; invite_code: string } | null>(null);

function goNext() { setStep((s) => (s + 1) as 1 | 2 | 3 | 4); }
function goBack() { setStep((s) => (s - 1) as 1 | 2 | 3 | 4); }
```

**Invite code generation + collision-safe INSERT** (RESEARCH Pattern 3 + Pitfall 3):
```typescript
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function generateInviteCode(): string {
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  return Array.from(array).map((b) => CHARS[b % CHARS.length]).join('');
}

async function createClub() {
  for (let attempt = 0; attempt < 3; attempt++) {
    const invite_code = generateInviteCode();
    const { data, error } = await supabase
      .from('clubs')
      .insert({ name, description, is_public: isPublic, invite_code,
                created_by: userId })
      .select()
      .single();
    if (!error) {
      // Insert self as admin
      await supabase.from('club_members')
        .insert({ club_id: data.id, user_id: userId, role: 'admin' });
      return data;
    }
    if (error.code !== '23505') throw error; // non-collision error: rethrow
  }
  throw new Error('Failed to generate unique invite code after 3 attempts');
}
```

**Post-create — set onboarding complete + active club:**
```typescript
onSuccess: (club) => {
  useClubStore.getState().setActiveClubId(club.id);
  useClubStore.getState().setOnboardingCompleted(true);
  // navigate to success state or club detail
}
```

**Form submission pattern** from sign-up.tsx (lines 111–152):
```typescript
// submit via Form.Trigger asChild + Form onSubmit — not button onPress directly
<Form onSubmit={handleSubmit}>
  <YStack gap="$md">
    <Input label="..." value={name} onChangeText={setName} ... />
    <Form.Trigger asChild disabled={loading || !name.trim()}>
      <Button variant="primary" loading={loading}>
        {isClient ? t('clubs:next_cta') : 'Next'}
      </Button>
    </Form.Trigger>
  </YStack>
</Form>
```

---

### `expo-app/app/(app)/clubs/join/index.tsx` (screen/component, CRUD) — CREATE

**Analog:** `expo-app/app/(auth)/sign-in.tsx` (form with async validation + loading)

**Code lookup + join mutation:**
```typescript
async function handleJoin() {
  if (loading || code.length !== 8) return;
  setLoading(true);
  setError(null);
  try {
    const { data: club, error: lookupError } = await supabase
      .from('clubs')
      .select('id, name')
      .eq('invite_code', code.toUpperCase())
      .single();
    if (lookupError || !club) {
      setError(t('clubs:join_error_invalid'));
      return;
    }
    const { error: joinError } = await supabase
      .from('club_members')
      .insert({ club_id: club.id, user_id: userId, role: 'member' });
    if (joinError?.code === '23505') {
      setError(t('clubs:join_error_already_member'));
      return;
    }
    if (joinError) throw joinError;
    useClubStore.getState().setActiveClubId(club.id);
    useClubStore.getState().setOnboardingCompleted(true);
    router.replace(`/(app)/clubs/${club.id}`);
  } catch {
    setError(t('common:error_generic'));
  } finally {
    setLoading(false);
  }
}
```

**Pre-fill from deep link query param:**
```typescript
const { code: initialCode } = useLocalSearchParams<{ code?: string }>();
const [code, setCode] = useState(initialCode?.toUpperCase() ?? '');
// CodeInput will receive this as initialValue and auto-trigger validation
```

**Share link pattern** (RESEARCH Pattern 12):
```typescript
import { Share } from 'react-native';
async function handleShareLink() {
  const url = Linking.createURL('join', { queryParams: { code } });
  await Share.share({ message: `Join my book club: ${url}`, url });
}
```

---

### `expo-app/app/(app)/clubs/browse/index.tsx` (screen/component, CRUD) — CREATE

**Analog:** `expo-app/app/(app)/clubs/index.tsx` (same list + TanStack Query)

**Search + paginated query:**
```typescript
const [search, setSearch] = useState('');

const { data: clubs, isLoading } = useQuery({
  queryKey: ['clubs', 'public', search],
  queryFn: async () => {
    let query = supabase
      .from('clubs')
      .select('id, name, is_public, club_members(count)')
      .eq('is_public', true);
    if (search.trim()) query = query.ilike('name', `%${search}%`);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
});
```

---

### `expo-app/app/(app)/profile/index.tsx` (screen/component, CRUD) — EXTEND

**Analog:** `expo-app/app/(app)/profile/index.tsx` (self — extend)

**Current sign-out pattern to retain** (lines 13–17):
```typescript
async function handleSignOut() {
  await supabase.auth.signOut();
  // AuthProvider's onAuthStateChange clears Zustand session → InitialLayout redirects
}
```

**Profile data query — add above sign-out:**
```typescript
const { data: profile } = useQuery({
  queryKey: ['profile', userId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('username, avatar_url, created_at')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  },
  enabled: !!userId,
});
```

**Account deletion via RPC** (RESEARCH Pattern 9):
```typescript
async function handleDeleteAccount() {
  const { error } = await supabase.rpc('delete_account');
  if (!error) {
    // Session invalidated automatically; AuthProvider fires → redirect to sign-in
  }
}
```

---

### `expo-app/app/(app)/profile/edit.tsx` (screen/component, CRUD) — CREATE

**Analog:** `expo-app/app/(auth)/sign-up.tsx` (form with validation + submit)

**Profile update mutation:**
```typescript
const { mutate: saveProfile, isPending } = useMutation({
  mutationFn: async ({ username, avatar_url }: { username: string; avatar_url: string | null }) => {
    const { error } = await supabase
      .from('profiles')
      .update({ username, avatar_url })
      .eq('id', userId);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['profile', userId] });
    router.back();
  },
});
```

Same username uniqueness check as `username.tsx` (debounced, generation counter, Supabase query).

---

### `expo-app/app/(app)/_layout.native.tsx` (layout/navigator, native) — MODIFY

**Analog:** `expo-app/app/(app)/_layout.native.tsx` (self — update tabs)

**Current tab pattern** (lines 1–58 — complete file):
```typescript
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from 'tamagui';
import { useTranslation } from 'react-i18next';

export default function AppLayoutNative() {
  const theme = useTheme();
  const { t } = useTranslation('nav');
  const accent = (theme.accent as { val?: string } | undefined)?.val ?? '#1A4FE0';
  const colorSecondary = (theme.colorSecondary as { val?: string } | undefined)?.val ?? '#6B6B63';
  const background = (theme.background as { val?: string } | undefined)?.val ?? '#F0EDE4';
  const borderColor = (theme.borderColor as { val?: string } | undefined)?.val ?? '#E0DDD6';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: colorSecondary,
        tabBarStyle: {
          backgroundColor: background,
          borderTopColor: borderColor,
          borderTopWidth: 1,
          height: 80,            // updated from Phase 1's implicit default
        },
        tabBarLabelStyle: { fontSize: 14 },
        headerShown: false,
      }}
    >
      <Tabs.Screen name="books/index"   options={{ title: t('books'),     tabBarIcon: ({ color }) => <Feather name="book-open" size={24} color={color} /> }} />
      <Tabs.Screen name="schedule/index" options={{ title: t('schedule'), tabBarIcon: ({ color }) => <Feather name="calendar" size={24} color={color} /> }} />
      <Tabs.Screen name="clubs/index"   options={{ title: t('community'), tabBarIcon: ({ color }) => <Feather name="users" size={24} color={color} /> }} />
      <Tabs.Screen name="profile/index" options={{ title: t('profile'),   tabBarIcon: ({ color }) => <Feather name="user" size={24} color={color} /> }} />
    </Tabs>
  );
}
```

Note: `discover/` folder renamed to `schedule/` (RESEARCH Pitfall 4 + Open Question 1 recommendation). Both layout files must be updated simultaneously.

---

### `expo-app/app/(app)/_layout.web.tsx` (layout/navigator, web) — MODIFY

**Analog:** `expo-app/app/(app)/_layout.web.tsx` (self)

**Current NavItem array pattern to update** (lines 8–17):
```typescript
type NavItem = {
  href: '/(app)/books' | '/(app)/clubs' | '/(app)/discover' | '/(app)/profile';
  key: 'books' | 'clubs' | 'discover' | 'profile';
};
const ITEMS: NavItem[] = [
  { href: '/(app)/books',    key: 'books' },
  { href: '/(app)/clubs',    key: 'clubs' },
  { href: '/(app)/discover', key: 'discover' },
  { href: '/(app)/profile',  key: 'profile' },
];
```

Replace `discover` → `schedule` (both the href and the key), and rename `clubs` key to `community`:
```typescript
type NavItem = {
  href: '/(app)/books' | '/(app)/schedule' | '/(app)/clubs' | '/(app)/profile';
  key: 'books' | 'schedule' | 'community' | 'profile';
};
const ITEMS: NavItem[] = [
  { href: '/(app)/books',    key: 'books' },
  { href: '/(app)/schedule', key: 'schedule' },
  { href: '/(app)/clubs',    key: 'community' },
  { href: '/(app)/profile',  key: 'profile' },
];
```

**Active link rendering pattern** (lines 44–67 — unchanged):
```typescript
{ITEMS.map((item) => {
  const active = pathname.startsWith(item.href.replace('/(app)', ''));
  return (
    <Link key={item.key} href={item.href as never} asChild>
      <YStack paddingVertical="$sm" paddingHorizontal="$md" alignItems="center" cursor="pointer">
        <Text fontSize={14} color={active ? '$color' : '$colorSecondary'}>
          {isClient ? t(item.key) : item.key}
        </Text>
        {active && <YStack height={2} backgroundColor="$accent" alignSelf="stretch" marginTop="$xs" />}
      </YStack>
    </Link>
  );
})}
```

---

### `expo-app/components/ui/ClubBanner.tsx` (component, request-response) — CREATE

**Analog:** `expo-app/components/ui/Alert.tsx` (XStack layout, icon + text)

**Alert.tsx layout pattern** (lines 1–36):
```typescript
import { XStack, Text } from 'tamagui';
import { Feather } from '@expo/vector-icons';
// ... XStack with horizontal layout, icon + text
```

**ClubBanner copies this XStack pattern:**
```typescript
import { XStack, Text } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useClubStore } from '../../store/club.store';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export function ClubBanner() {
  const { t } = useTranslation('nav');
  const activeClubId = useClubStore((s) => s.activeClubId);
  const setActiveClubId = useClubStore((s) => s.setActiveClubId);
  // [optional sheet state for club switcher]

  const { data: club } = useQuery({
    queryKey: ['club', activeClubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clubs').select('name').eq('id', activeClubId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!activeClubId,
  });

  if (!activeClubId || !club) return null;

  return (
    <XStack
      height={40}
      backgroundColor="$ink"
      paddingHorizontal="$lg"
      alignItems="center"
      accessibilityRole="button"
      accessibilityLabel={t('switch_club')}
      // onPress: open club switcher sheet
    >
      <Text flex={1} fontSize={13} fontWeight="600" color="$backgroundPress"
        numberOfLines={1}>
        {club.name}
      </Text>
      <Feather name="chevron-down" size={16} color="#FFFFFF" />
    </XStack>
  );
}
```

---

### `expo-app/components/ui/ClubCard.tsx` (component, request-response) — CREATE

**Analog:** `expo-app/components/ui/Alert.tsx` (XStack/YStack composition, design tokens)

**Alert.tsx token pattern to mirror** (lines 9–36):
```typescript
// Token usage: $backgroundStrong, $borderColor, $color, $colorSecondary, $accent
// Spacing: $space.md, $space.xs, $space.sm
// All values via token strings — no raw pixel values
```

**ClubCard implementation:**
```typescript
import { YStack, XStack, Text } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

type Club = { id: string; name: string; is_public: boolean; member_count: number };
type ClubCardProps = { club: Club; isActive?: boolean; showJoinButton?: boolean; onJoin?: () => void; onPress?: () => void };

export function ClubCard({ club, isActive, showJoinButton, onJoin, onPress }: ClubCardProps) {
  const { t } = useTranslation('clubs');
  return (
    <YStack
      backgroundColor="$backgroundStrong"
      borderRadius={16}
      padding="$md"
      gap="$xs"
      borderLeftWidth={isActive ? 3 : 0}
      borderLeftColor={isActive ? '$accent' : 'transparent'}
      pressStyle={{ opacity: 0.9 }}
      animation="fast"
      onPress={onPress}
      // shadow via style prop (boxShadow not supported in RN — use elevation or shadowColor)
    >
      <Text fontFamily="$heading" fontSize={24} color="$color" numberOfLines={1}>
        {club.name}
      </Text>
      <XStack gap="$sm" alignItems="center">
        <Feather name="users" size={14} color="#6B6B63" />
        <Text fontSize={13} color="$colorSecondary">
          {t('member_count', { count: club.member_count })}
        </Text>
        {/* separator + visibility chip */}
      </XStack>
      {showJoinButton && (
        <Button variant="secondary" onPress={onJoin} marginTop="$sm">
          {t('join_cta')}
        </Button>
      )}
    </YStack>
  );
}
```

---

### `expo-app/components/ui/MemberRow.tsx` (component, request-response) — CREATE

**Analog:** `expo-app/components/ui/Alert.tsx` (XStack layout pattern)

```typescript
import { XStack, YStack, Text } from 'tamagui';
import { Feather } from '@expo/vector-icons';

type MemberRowProps = {
  username: string;
  avatarUrl: string | null;
  role: 'admin' | 'member';
  isCurrentUserAdmin?: boolean;
  isLastItem?: boolean;
  onMorePress?: () => void;
};

export function MemberRow({ username, avatarUrl, role, isCurrentUserAdmin, isLastItem, onMorePress }: MemberRowProps) {
  return (
    <XStack
      minHeight={56}
      alignItems="center"
      paddingHorizontal="$md"
      gap="$sm"
      backgroundColor="$backgroundStrong"
      borderBottomWidth={isLastItem ? 0 : 1}
      borderBottomColor="$borderColor"
    >
      {/* Avatar: 36×36 image OR initials circle */}
      <YStack width={36} height={36} borderRadius={18} backgroundColor="$ink"
        alignItems="center" justifyContent="center">
        <Text fontSize={13} fontWeight="600" color="$backgroundPress">
          {username.slice(0, 2).toUpperCase()}
        </Text>
      </YStack>
      <YStack flex={1}>
        <Text fontSize={15} fontWeight="600" color="$color">{username}</Text>
        {role === 'admin' && (
          <XStack backgroundColor="$accent" opacity={0.1} borderRadius={20}
            paddingHorizontal="$sm" paddingVertical="$xs" alignSelf="flex-start" marginTop={4}>
            <Text fontSize={12} fontWeight="600" color="$accent">Admin</Text>
          </XStack>
        )}
      </YStack>
      {isCurrentUserAdmin && (
        <YStack width={44} height={44} alignItems="center" justifyContent="center"
          onPress={onMorePress} accessibilityRole="button">
          <Feather name="more-vertical" size={20} color="#6B6B63" />
        </YStack>
      )}
    </XStack>
  );
}
```

---

### `expo-app/components/ui/AvatarPicker.tsx` (component, request-response) — CREATE

**Analog:** `expo-app/components/ui/Input.tsx` (controlled component with state, forwardRef-able)

**Input.tsx controlled pattern** (lines 14–71):
```typescript
// Controlled: value + onChangeText props
// forwardRef for external focus control
// Internal toggle state (_showPassword) — AvatarPicker mirrors with _selected state
```

```typescript
import { YStack, XStack, ScrollView, Image } from 'tamagui';
import { AVATAR_SOURCES, AVATAR_KEYS } from '../../constants/avatars';

type AvatarPickerProps = {
  selected: string | null;
  onSelect: (key: string) => void;
};

export function AvatarPicker({ selected, onSelect }: AvatarPickerProps) {
  return (
    <ScrollView>
      {/* 3-column grid using XStack wrapping */}
      <XStack flexWrap="wrap" gap="$sm" justifyContent="center">
        {AVATAR_KEYS.map((key, i) => (
          <YStack
            key={key}
            width={80}
            height={80}
            borderRadius={12}
            borderWidth={selected === key ? 2 : 0}
            borderColor="$ink"
            backgroundColor={selected === key ? 'rgba(13,13,13,0.08)' : 'transparent'}
            alignItems="center"
            justifyContent="center"
            pressStyle={{ scale: 1.06 }}
            animation="fast"
            onPress={() => onSelect(key)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected === key }}
          >
            <Image source={AVATAR_SOURCES[key]} width={64} height={64} />
          </YStack>
        ))}
      </XStack>
    </ScrollView>
  );
}
```

---

### `expo-app/components/ui/WizardSteps.tsx` (component) — CREATE

**Analog:** `expo-app/components/ui/Alert.tsx` (XStack layout with Tamagui tokens only)

```typescript
import { XStack, YStack } from 'tamagui';

type WizardStepsProps = { total: number; current: number };

export function WizardSteps({ total, current }: WizardStepsProps) {
  return (
    <XStack gap="$sm" justifyContent="center" marginBottom="$xl"
      accessibilityRole="progressbar"
      accessibilityValue={{ now: current, min: 1, max: total }}>
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const isActive    = step === current;
        const isCompleted = step < current;
        return (
          <YStack
            key={step}
            width={8}
            height={8}
            borderRadius={4}
            backgroundColor={isActive ? '$accent' : isCompleted ? '$ink' : '$borderColor'}
          />
        );
      })}
    </XStack>
  );
}
```

---

### `expo-app/components/ui/CodeInput.tsx` (component, request-response) — CREATE

**Analog:** `expo-app/components/ui/Input.tsx` (wraps a native TextInput, controlled)

**Input.tsx forwardRef + controlled pattern** (lines 14–71):
```typescript
// forwardRef wrapping TamaguiInput; controlled via value + onChangeText
// Error state changes border color; focusStyle changes border
```

**CodeInput adapts this to segmented display:**
```typescript
import { useRef } from 'react';
import { XStack, YStack, Text } from 'tamagui';
import { TextInput } from 'react-native';

const CODE_LENGTH = 8;

type CodeInputProps = {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
};

export function CodeInput({ value, onChange, onComplete }: CodeInputProps) {
  const inputRef = useRef<TextInput>(null);

  function handleChange(text: string) {
    const upper = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
    onChange(upper);
    if (upper.length === CODE_LENGTH) onComplete?.(upper);
  }

  return (
    <XStack gap={4} onPress={() => inputRef.current?.focus()}>
      {/* Hidden real input */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        maxLength={CODE_LENGTH}
        autoCapitalize="characters"
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
      />
      {/* Visual cells */}
      {Array.from({ length: CODE_LENGTH }, (_, i) => {
        const char  = value[i] ?? '';
        const isActive = i === value.length;
        return (
          <YStack
            key={i}
            width={40}
            height={52}
            backgroundColor="$backgroundStrong"
            borderWidth={1.5}
            borderColor={isActive ? '$accent' : '$borderColor'}
            borderRadius={8}
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize={18} fontWeight="600" color="$color">{char}</Text>
          </YStack>
        );
      })}
    </XStack>
  );
}
```

---

### `expo-app/lib/i18n/index.ts` (utility/config, transform) — MODIFY

**Analog:** `expo-app/lib/i18n/index.ts` (self — extend)

**Current init block** (lines 16–37):
```typescript
void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: en.common, auth: en.auth, nav: en.nav },
      de: { common: de.common, auth: de.auth, nav: de.nav },
    },
    ns: ['common', 'auth', 'nav'],
    // ...
  });
```

**Phase 2 update — add 3 new namespaces:**
```typescript
void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: en.common, auth: en.auth, nav: en.nav,
            onboarding: en.onboarding, clubs: en.clubs, profile: en.profile },
      de: { common: de.common, auth: de.auth, nav: de.nav,
            onboarding: de.onboarding, clubs: de.clubs, profile: de.profile },
    },
    ns: ['common', 'auth', 'nav', 'onboarding', 'clubs', 'profile'],
    // all other options unchanged
  });
```

---

### `expo-app/lib/i18n/en.json` + `de.json` (config) — EXTEND

**Analog:** `expo-app/lib/i18n/en.json` (self — extend)

**Current top-level structure** (en.json lines 1–47):
```json
{ "common": { ... }, "auth": { ... }, "nav": { ... } }
```

Add top-level keys for the 3 new namespaces. The complete key sets are defined in `02-UI-SPEC.md` lines 1097–1252. Keys include:
- `"onboarding"` namespace: `username_heading`, `username_error_taken`, `avatar_heading`, `create_or_join_heading`, etc.
- `"clubs"` namespace: `my_clubs_heading`, `create_heading`, `join_cta`, `member_count_one`, `member_count_other`, etc.
- `"profile"` namespace: `heading`, `edit_heading`, `delete_account`, `delete_confirm_heading`, etc.
- `"common"` extensions: `skip`, `done`, `edit`, `share`, `copy`, `confirm`, `delete`, `leave`, `remove`, `search`, `close`, `danger_zone`
- `"nav"` extensions: `switch_club`, `club_detail`, `profile_edit`, `discover_clubs`, `schedule`, `community`

---

### `expo-app/tamagui.config.ts` (config) — MODIFY

**Analog:** `expo-app/tamagui.config.ts` (self — extend)

**Current font section to REPLACE** (lines 1–55):
```typescript
import { createInterFont } from '@tamagui/font-inter';
const headingFont = createInterFont({ ... face: { 400: { normal: 'Inter' }, 600: { normal: 'InterBold' } } });
const bodyFont    = createInterFont({ ... });
```

**Replace with** (RESEARCH Pattern 7):
```typescript
import { createFont } from '@tamagui/core';

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
```

**Current theme tokens to REPLACE** (lines 86–111 — old warm-brown palette):
```typescript
light: { background: '#FDFAF6', backgroundStrong: '#F2EDE4', accent: '#7C4B2A', color: '#1A1209', ... }
```

**Replace with Phase 2 corrected palette** (UI-SPEC Color section):
```typescript
light: {
  ...(defaultConfig.themes as any)?.light,
  background: '#F0EDE4',      // Papier
  backgroundStrong: '#FAFAF7', // Surface
  accent: '#1A4FE0',           // Electric Blue (CTAs, links, active states)
  ink: '#0D0D0D',              // Primary button fill, strong fills
  color: '#0D0D0D',            // Ink Black text
  colorSecondary: '#6B6B63',  // Muted
  borderColor: '#E0DDD6',     // Border
  destructive: '#D32F2F',
  success: '#2A7A3A',
  orange: '#E85D1F',
  backgroundPress: '#FFFFFF',
},
```

Note: The `Button.tsx` `primary` variant must also update `backgroundColor` from `'$accent'` to `'$ink'` per UI-SPEC Component contract.

---

## Shared Patterns

### SSR Hydration Guard (applies to ALL screens)

**Source:** `expo-app/app/(auth)/sign-in.tsx` line 3 + lines 49, 55, 63, 66, 82
**Apply to:** Every screen that calls `t()` for text visible above-the-fold on web

```typescript
import { useDidFinishSSR } from '@tamagui/use-did-finish-ssr';
const isClient = useDidFinishSSR();
// Usage: {isClient ? t('namespace:key') : 'English fallback'}
```

---

### Loading / Error State Pattern (applies to all screens with async submit)

**Source:** `expo-app/app/(auth)/sign-in.tsx` lines 21–38

```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

async function handleSubmit() {
  if (loading) return;
  setLoading(true);
  setError(null);
  try {
    // ... async operation
  } catch {
    setError(t('common:error_network'));
  } finally {
    setLoading(false);  // always resets in finally — never leaves loading=true
  }
}
```

---

### Form Submission Pattern (applies to all form screens)

**Source:** `expo-app/app/(auth)/sign-in.tsx` lines 52–87; `sign-up.tsx` lines 111–152

```typescript
<Form onSubmit={handleSubmit}>
  <YStack gap="$md">
    <Input ... />
    <Form.Trigger asChild disabled={loading || !canSubmit}>
      <Button variant="primary" loading={loading}>
        {isClient ? t('namespace:cta_key') : 'English fallback'}
      </Button>
    </Form.Trigger>
  </YStack>
</Form>
```

`Form.Trigger asChild` ensures native keyboard return key integrates with submit. Never use `onPress` directly on submit buttons.

---

### Keyboard Avoidance Pattern (applies to all screens with inputs)

**Source:** `expo-app/app/(auth)/sign-in.tsx` lines 41–44

```typescript
import { KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

return (
  <SafeAreaView style={{ flex: 1, backgroundColor: '#F0EDE4' }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* screen content */}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
);
```

For inputs inside a Tamagui `<Sheet>`, use `<Sheet.ScrollView>` instead of this pattern.

---

### TanStack Query Data Fetch Pattern (applies to all CRUD screens)

**Source:** RESEARCH.md Pattern 2 (no existing codebase analog — `QueryClientProvider` is new in Phase 2)
**Apply to:** All screens that fetch from Supabase: `clubs/index.tsx`, `clubs/[id]/index.tsx`, `clubs/browse/index.tsx`, `profile/index.tsx`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

const queryClient = useQueryClient();

const { data, isLoading, error } = useQuery({
  queryKey: ['resource', id],
  queryFn: async () => {
    const { data, error } = await supabase.from('table').select('...').eq('id', id);
    if (error) throw error;
    return data;
  },
  enabled: !!id,
});

const { mutate, isPending } = useMutation({
  mutationFn: async (input) => {
    const { error } = await supabase.from('table').insert(input);
    if (error) throw error;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resource'] }),
});
```

---

### Supabase Direct Call Pattern (applies to mutations not using TanStack Query)

**Source:** `expo-app/app/(auth)/sign-in.tsx` lines 26–28; `expo-app/app/(app)/profile/index.tsx` lines 13–17

```typescript
// Pattern: direct supabase client call in handler, no abstraction layer
import { supabase } from '../../lib/supabase';  // (adjust relative path per file depth)

const { data, error } = await supabase.from('profiles').update({ username }).eq('id', userId);
if (error) { setError(t('common:error_generic')); return; }
```

No service layer abstraction — CONTEXT.md "Established Patterns" confirms direct calls from components/hooks.

---

### Zustand Store Read Pattern (applies to all files that need auth/club state)

**Source:** `expo-app/app/(app)/profile/index.tsx` lines 11–12; `expo-app/app/_layout.tsx` lines 23–24

```typescript
// Selector pattern — read only what you need (prevents unnecessary re-renders)
const session      = useAuthStore((s) => s.session);
const activeClubId = useClubStore((s) => s.activeClubId);
// For one-off reads outside a component (e.g., in async handlers):
const userId = useAuthStore.getState().session?.user.id;
```

---

### Token Usage Enforcement (applies to every new file)

**Source:** `expo-app/components/ui/Input.tsx` lines 33–43; `expo-app/components/ui/Button.tsx` lines 21–35

```typescript
// CORRECT — compile-time tokens
<YStack padding="$lg" gap="$md" backgroundColor="$backgroundStrong" borderRadius={16} />
<Text color="$colorSecondary" fontSize={13} />

// WRONG — raw values defeat Tamagui compiler (never do this for spacing/color)
<YStack padding={24} backgroundColor="#FAFAF7" />
```

Exception: `backgroundColor` on `SafeAreaView` (uses RN `style` prop, not Tamagui) must use the raw hex value `'#F0EDE4'` matching the `$background` token.

---

## No Analog Found

Files with no close codebase analog — use RESEARCH.md patterns directly:

| File | Role | Data Flow | Pattern Source |
|------|------|-----------|----------------|
| `supabase/migrations/0002_delete_account_rpc.sql` | migration | — | RESEARCH.md Pattern 9 (SQL verbatim) |
| `expo-app/constants/avatars.ts` | utility | — | RESEARCH.md Pattern 8 (static require map) |
| `expo-app/app/(app)/clubs/[id]/settings.tsx` | screen | CRUD | RESEARCH.md Pattern 11 (wizard state) + UI-SPEC Screen 8 |
| `expo-app/app/(app)/schedule/index.tsx` | screen (placeholder) | — | Copy from existing `discover/index.tsx` stub pattern |

---

## Metadata

**Analog search scope:** `expo-app/app/`, `expo-app/store/`, `expo-app/components/`, `expo-app/lib/`, `expo-app/providers/`, `expo-app/tamagui.config.ts`
**Files scanned:** 22 TypeScript/TSX source files (Phase 1 implementation)
**Pattern extraction date:** 2026-05-24
**Primary pattern sources:** Phase 1 codebase (HIGH confidence — all files verified by direct Read)
**Secondary pattern sources:** RESEARCH.md Patterns 1–12 (HIGH confidence — verified via Context7 in Phase 2 research)
