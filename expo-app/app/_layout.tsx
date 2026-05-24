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

SplashScreen.preventAutoHideAsync();

const animations = createAnimations({
  fast:   { type: 'spring', damping: 20, stiffness: 280 },
  medium: { type: 'spring', damping: 18, stiffness: 200 },
  slow:   { type: 'spring', damping: 15, stiffness: 120 },
});

function InitialLayout() {
  const session = useAuthStore((s) => s.session);
  const initialized = useAuthStore((s) => s.initialized);
  const segments = useSegments();
  const router = useRouter();
  const url = Linking.useURL();

  // Auth guard — redirect only after auth is initialized (Pitfall 1).
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

  // Password reset deep link handler — RESEARCH Pattern 5.
  useEffect(() => {
    if (!url) return;
    const { queryParams } = Linking.parse(url);
    const accessToken = queryParams?.access_token;
    const refreshToken = queryParams?.refresh_token;
    if (typeof accessToken !== 'string' || typeof refreshToken !== 'string') return;
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(() => {
      router.replace('/(auth)/update-password');
    });
  }, [url, router]);

  return <Slot />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
    InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf'),
  });

  if (!fontsLoaded) return null;

  return (
    <TamaguiProvider config={config} defaultTheme="light" animations={animations}>
      <AuthProvider>
        <InitialLayout />
      </AuthProvider>
    </TamaguiProvider>
  );
}
