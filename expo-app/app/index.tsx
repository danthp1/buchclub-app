import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/auth.store';

export default function Index() {
  const session = useAuthStore((s) => s.session);
  const initialized = useAuthStore((s) => s.initialized);
  // While auth bootstraps, render nothing (splash screen still visible).
  if (!initialized) return null;
  return <Redirect href={session ? '/(app)/books' : '/(auth)/sign-in'} />;
}
