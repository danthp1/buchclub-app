import '../tamagui.generated.css';
import '../lib/i18n';
import { useEffect } from 'react';
import { TamaguiProvider } from 'tamagui';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { createAnimations } from '@tamagui/animations-css';
import config from '../tamagui.config';
import { AuthProvider } from '../providers/AuthProvider';
import { useAuthStore } from '../store/auth.store';
import { supabase } from '../lib/supabase';

SplashScreen.preventAutoHideAsync();

const animations = createAnimations({
  fast:   '120ms ease-in',
  medium: '220ms ease-in',
  slow:   '350ms ease-in',
});

function InitialLayout() {
  const session = useAuthStore((s) => s.session);
  const initialized = useAuthStore((s) => s.initialized);
  const segments = useSegments();
  const router = useRouter();
  const url = Linking.useURL();

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
