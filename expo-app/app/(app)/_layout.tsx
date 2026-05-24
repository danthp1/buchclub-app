import { Slot } from 'expo-router';

// Fallback layout required by Expo Router web static bundler.
// The actual platform-specific layouts (_layout.native.tsx, _layout.web.tsx)
// take over on their respective platforms.
export default function AppLayout() {
  return <Slot />;
}
