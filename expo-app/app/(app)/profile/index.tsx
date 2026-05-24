import { YStack, Text } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { useDidFinishSSR } from '@tamagui/use-did-finish-ssr';
import { supabase } from '../../../lib/supabase';
import { Button } from '../../../components/ui/Button';
import { useAuthStore } from '../../../store/auth.store';

export default function Profile() {
  const { t } = useTranslation(['nav', 'common']);
  const isClient = useDidFinishSSR();
  const session = useAuthStore((s) => s.session);

  async function handleSignOut() {
    await supabase.auth.signOut();
    // AuthProvider's onAuthStateChange clears the Zustand session →
    // InitialLayout's auth guard redirects to /(auth)/sign-in. No manual router.replace needed.
  }

  return (
    <YStack flex={1} backgroundColor="$background" padding="$lg" gap="$lg">
      <Text fontSize={22} fontWeight="600" color="$color">
        {isClient ? t('nav:profile') : 'Profile'}
      </Text>
      {session?.user?.email && (
        <Text fontSize={14} color="$colorSecondary">
          {session.user.email}
        </Text>
      )}
      <YStack marginTop="$xl">
        <Button variant="secondary" onPress={handleSignOut}>
          {isClient ? t('common:signOut') : 'Sign out'}
        </Button>
      </YStack>
    </YStack>
  );
}
