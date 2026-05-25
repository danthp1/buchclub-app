import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDidFinishSSR } from '@tamagui/use-did-finish-ssr';
import { YStack, XStack, Text, ScrollView, Dialog, Image } from 'tamagui';
import { SafeAreaView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/auth.store';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import { AVATAR_SOURCES, AVATAR_DEFAULT_KEY } from '../../../constants/avatars';

export default function ProfileScreen() {
  const { t } = useTranslation(['profile', 'common']);
  const isClient = useDidFinishSSR();
  const userId = useAuthStore((s) => s.session?.user.id);
  const createdAt = useAuthStore((s) => s.session?.user.created_at);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error: qError } = await supabase
        .from('profiles')
        .select('username, avatar_url, created_at')
        .eq('id', userId!)
        .single();
      if (qError) throw qError;
      return data;
    },
    enabled: !!userId,
  });

  // Count clubs (PROF-01 stats)
  const { data: memberships } = useQuery({
    queryKey: ['clubs', 'my', userId],
    queryFn: async () => {
      const { data, error: qError } = await supabase
        .from('club_members')
        .select('club_id, clubs(id, name)')
        .eq('user_id', userId!);
      if (qError) throw qError;
      return data;
    },
    enabled: !!userId,
  });

  const memberYear = createdAt
    ? new Date(createdAt).getFullYear().toString()
    : new Date().getFullYear().toString();

  const avatarKey = profile?.avatar_url ?? null;
  const avatarSource =
    avatarKey && AVATAR_SOURCES[avatarKey]
      ? AVATAR_SOURCES[avatarKey]
      : AVATAR_SOURCES[AVATAR_DEFAULT_KEY];

  async function handleSignOut() {
    await supabase.auth.signOut();
    // AuthProvider onAuthStateChange fires → InitialLayout redirects to sign-in
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('delete_account');
      if (rpcError) throw rpcError;
      // Session invalidated by RPC → AuthProvider fires → redirect to sign-in
    } catch {
      setError(t('common:error_generic'));
      setDeleteLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0EDE4' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        {error && (
          <YStack paddingHorizontal="$lg" paddingTop="$sm">
            <Alert type="error" message={error} />
          </YStack>
        )}

        {/* Header section */}
        <XStack paddingHorizontal="$lg" paddingTop="$lg" paddingBottom="$md" gap="$md" alignItems="center">
          <Image source={avatarSource} width={64} height={64} borderRadius={32} />
          <YStack flex={1}>
            <Text fontFamily="$heading" fontSize={24} color="$color">
              {profile?.username ?? ''}
            </Text>
            <Text fontSize={13} color="$colorSecondary">
              @{profile?.username ?? ''}
            </Text>
            <Text fontSize={13} color="$colorSecondary">
              {isClient
                ? t('profile:member_since', { year: memberYear })
                : `Member since ${memberYear}`}
            </Text>
          </YStack>
          <TouchableOpacity
            onPress={() => router.push('/(app)/profile/edit' as never)}
            accessibilityRole="button"
            accessibilityLabel={isClient ? t('profile:edit_heading') : 'Edit'}
          >
            <Text fontSize={15} color="$accent">
              {isClient ? t('common:edit') : 'Edit'}
            </Text>
          </TouchableOpacity>
        </XStack>

        {/* Stats card */}
        <YStack paddingHorizontal="$lg" marginBottom="$lg">
          <XStack
            backgroundColor="$ink"
            borderRadius={16}
            padding="$md"
            justifyContent="space-around"
          >
            <YStack alignItems="center" gap="$xs">
              <Text fontFamily="$heading" fontSize={24} color="$backgroundPress">
                {memberships?.length ?? 0}
              </Text>
              <Text fontSize={13} color="$backgroundPress" opacity={0.7}>
                {isClient ? t('profile:stats_clubs') : 'Clubs'}
              </Text>
            </YStack>
            <YStack alignItems="center" gap="$xs">
              <Text fontFamily="$heading" fontSize={24} color="$backgroundPress">
                0
              </Text>
              <Text fontSize={13} color="$backgroundPress" opacity={0.7}>
                {isClient ? t('profile:stats_read') : 'Read'}
              </Text>
            </YStack>
            <YStack alignItems="center" gap="$xs">
              <Text fontFamily="$heading" fontSize={24} color="$backgroundPress">
                0
              </Text>
              <Text fontSize={13} color="$backgroundPress" opacity={0.7}>
                {isClient ? t('profile:stats_votes') : 'Votes'}
              </Text>
            </YStack>
          </XStack>
        </YStack>

        {/* My Clubs chips */}
        {memberships && memberships.length > 0 && (
          <YStack paddingHorizontal="$lg" marginBottom="$lg">
            <Text fontSize={13} fontWeight="600" color="$colorSecondary" marginBottom="$sm">
              {isClient ? t('profile:my_clubs') : 'MY CLUBS'}
            </Text>
            <XStack flexWrap="wrap" gap="$sm">
              {memberships.map((m) => {
                const club = m.clubs as unknown as { id: string; name: string } | null;
                if (!club) return null;
                return (
                  <TouchableOpacity
                    key={club.id}
                    onPress={() => router.push(`/(app)/clubs/${club.id}` as never)}
                  >
                    <YStack
                      backgroundColor="$backgroundStrong"
                      borderRadius={20}
                      paddingHorizontal="$md"
                      paddingVertical="$sm"
                      borderWidth={1}
                      borderColor="$borderColor"
                    >
                      <Text fontSize={13} fontWeight="600" color="$color">
                        {club.name}
                      </Text>
                    </YStack>
                  </TouchableOpacity>
                );
              })}
            </XStack>
          </YStack>
        )}

        {/* Settings section */}
        <YStack paddingHorizontal="$lg">
          <Text fontSize={13} fontWeight="600" color="$colorSecondary" marginBottom="$sm">
            {isClient ? t('profile:settings_heading') : 'SETTINGS'}
          </Text>

          <YStack backgroundColor="$backgroundStrong" borderRadius={16} overflow="hidden">
            {/* Sign out */}
            <TouchableOpacity
              onPress={handleSignOut}
              accessibilityRole="button"
              style={{ padding: 16 }}
            >
              <XStack alignItems="center" justifyContent="space-between">
                <Text fontSize={15} color="$destructive">
                  {isClient ? t('profile:sign_out') : 'Sign out'}
                </Text>
                <Feather name="log-out" size={18} color="#B33A3A" />
              </XStack>
            </TouchableOpacity>

            <YStack height={1} backgroundColor="$borderColor" marginHorizontal="$md" />

            {/* Delete account (PROF-03) */}
            <TouchableOpacity
              onPress={() => setDeleteDialogOpen(true)}
              accessibilityRole="button"
              style={{ padding: 16 }}
            >
              <Text fontSize={15} color="$destructive">
                {isClient ? t('profile:delete_account') : 'Delete account'}
              </Text>
            </TouchableOpacity>
          </YStack>
        </YStack>
      </ScrollView>

      {/* Delete account confirmation dialog (PROF-03) */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay
            key="delete-overlay"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
            backgroundColor="rgba(0,0,0,0.5)"
          />
          <Dialog.Content
            key="delete-content"
            backgroundColor="$backgroundStrong"
            borderRadius={16}
            padding="$lg"
            gap="$md"
            maxWidth={320}
            width="90%"
          >
            <Dialog.Title>
              <Text fontFamily="$heading" fontSize={18} color="$color">
                {isClient ? t('profile:delete_confirm_heading') : 'Really delete account?'}
              </Text>
            </Dialog.Title>
            <Dialog.Description>
              <Text fontSize={15} color="$colorSecondary">
                {isClient
                  ? t('profile:delete_confirm_body')
                  : 'All your data will be permanently deleted. This action cannot be undone.'}
              </Text>
            </Dialog.Description>
            <Button
              variant="primary"
              loading={deleteLoading}
              onPress={handleDeleteAccount}
              style={{ backgroundColor: '#D32F2F' }}
            >
              {isClient ? t('profile:delete_confirm_cta') : 'Delete account'}
            </Button>
            <Dialog.Close asChild>
              <Button variant="text" onPress={() => setDeleteDialogOpen(false)}>
                {isClient ? t('common:cancel', { defaultValue: 'Cancel' }) : 'Cancel'}
              </Button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </SafeAreaView>
  );
}
