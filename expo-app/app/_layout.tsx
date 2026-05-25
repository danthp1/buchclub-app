import '../lib/i18n';
import '@tamagui/native/setup-gesture-handler';
import { useEffect } from 'react';
import { TamaguiProvider } from 'tamagui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArchivoNarrow_700Bold } from '@expo-google-fonts/archivo-narrow';
import { IBMPlexSans_400Regular, IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans';
import config from '../tamagui.config';
import { AuthProvider } from '../providers/AuthProvider';
import { useAuthStore } from '../store/auth.store';
import { useClubStore } from '../store/club.store';
import { supabase } from '../lib/supabase';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 2 },
  },
});

function InitialLayout() {
  const session               = useAuthStore((s) => s.session);
  const initialized           = useAuthStore((s) => s.initialized);
  const onboardingCompleted   = useClubStore((s) => s.onboardingCompleted);
  const hasHydrated           = useClubStore((s) => s._hasHydrated);
  const setPendingInviteCode  = useClubStore((s) => s.setPendingInviteCode);
  const segments = useSegments();
  const router   = useRouter();
  const url = Linking.useLinkingURL();  // NOT useURL() — deprecated in SDK 56

  // Auth + onboarding guard — waits for BOTH initialized AND hasHydrated (Pitfall 1).
  useEffect(() => {
    if (!initialized || !hasHydrated) return;
    SplashScreen.hideAsync();
    const inAuthGroup       = segments[0] === '(auth)';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inOnboardingGroup = (segments as any)[0] === '(onboarding)';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inAppGroup        = (segments as any)[0] === '(app)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (session && inAuthGroup) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace((onboardingCompleted ? '/(app)/clubs' : '/(onboarding)/username') as any);
    } else if (session && !onboardingCompleted && !inOnboardingGroup && !inAppGroup) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace('/(onboarding)/username' as any);
    } else if (session && onboardingCompleted && inOnboardingGroup) {
      router.replace('/(app)/clubs');
    }
  }, [session, initialized, hasHydrated, onboardingCompleted, segments, router]);

  // Deep link handler — password reset + invite code join links.
  useEffect(() => {
    if (!url) return;
    const { queryParams, hostname, path } = Linking.parse(url);

    // Existing: password reset
    const accessToken  = queryParams?.access_token;
    const refreshToken = queryParams?.refresh_token;
    if (typeof accessToken === 'string' && typeof refreshToken === 'string') {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(() => {
        router.replace('/(auth)/update-password');
      });
      return;
    }

    // New: invite code join link — buchclub://join?code=XXXXXXXX
    const isJoinLink = hostname === 'join' || path?.startsWith('join');
    const code = (queryParams?.code as string) ?? path?.split('/')[1];
    if (isJoinLink && code) {
      if (!onboardingCompleted) {
        setPendingInviteCode(code);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.replace(`/(app)/clubs/join?code=${code}` as any);
      }
    }
  }, [url, onboardingCompleted, router, setPendingInviteCode]);

  return <Slot />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ArchivoNarrow_700Bold,
    IBMPlexSans_400Regular,
    IBMPlexSans_600SemiBold,
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TamaguiProvider config={config} defaultTheme="light">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <InitialLayout />
          </AuthProvider>
        </QueryClientProvider>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}
