import { useTranslation } from 'react-i18next';
import { useDidFinishSSR } from '@tamagui/use-did-finish-ssr';
import { YStack, XStack, Text, ScrollView } from 'tamagui';
import { SafeAreaView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/auth.store';
import { useClubStore } from '../../../store/club.store';
import { ClubCard } from '../../../components/ui/ClubCard';
import { Button } from '../../../components/ui/Button';

export default function ClubsScreen() {
  const { t } = useTranslation('clubs');
  const isClient = useDidFinishSSR();
  const userId = useAuthStore((s) => s.session?.user.id);
  const activeClubId = useClubStore((s) => s.activeClubId);
  const setActiveClubId = useClubStore((s) => s.setActiveClubId);

  const { data: memberships, isLoading } = useQuery({
    queryKey: ['clubs', 'my', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_members')
        .select('club_id, role, clubs(id, name, is_public, created_by)')
        .eq('user_id', userId!);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Skeleton: show 2 placeholder cards while loading
  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F0EDE4' }}>
        <YStack flex={1} paddingHorizontal="$lg" paddingTop="$md" gap="$sm">
          <Text fontFamily="$heading" fontSize={24} color="$color">
            {isClient ? t('my_clubs_heading') : 'My Clubs'}
          </Text>
          {[1, 2].map((i) => (
            <YStack
              key={i}
              height={80}
              backgroundColor="$backgroundStrong"
              borderRadius={16}
              opacity={0.5}
              animation="slow"
              accessibilityLabel={isClient ? t('loading', { ns: 'common' }) : 'Loading'}
            />
          ))}
        </YStack>
      </SafeAreaView>
    );
  }

  const clubs = memberships?.map((m) => ({
    ...(m.clubs as { id: string; name: string; is_public: boolean; created_by: string }),
    member_count: 0, // populated in Club Detail; not fetched here for performance
  })) ?? [];

  // Empty state
  if (clubs.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F0EDE4' }}>
        <YStack flex={1} alignItems="center" justifyContent="center" paddingHorizontal="$lg" gap="$md">
          <Text fontFamily="$heading" fontSize={32} color="$color" textAlign="center">
            {isClient ? t('empty_heading') : 'No club yet.'}
          </Text>
          <Text fontSize={15} color="$colorSecondary" textAlign="center" marginBottom="$xl">
            {isClient ? t('empty_subtext') : 'Create your first club or join an existing one.'}
          </Text>
          <Button variant="primary" onPress={() => router.push('/(app)/clubs/create' as never)}>
            {isClient ? t('empty_create_cta') : 'Create a club'}
          </Button>
          <Button variant="secondary" onPress={() => router.push('/(app)/clubs/join' as never)}>
            {isClient ? t('empty_join_cta') : 'Join a club'}
          </Button>
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0EDE4' }}>
      <YStack flex={1}>
        <XStack
          paddingHorizontal="$lg"
          paddingTop="$md"
          paddingBottom="$sm"
          alignItems="center"
        >
          <Text fontFamily="$heading" fontSize={24} color="$color" flex={1}>
            {isClient ? t('my_clubs_heading') : 'My Clubs'}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(app)/clubs/create' as never)}
            accessibilityRole="button"
            accessibilityLabel={isClient ? t('new_club_options') : 'Add club'}
            style={{ padding: 10 }}
          >
            <Feather name="plus" size={24} color="#0D0D0D" />
          </TouchableOpacity>
        </XStack>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, gap: 8, paddingBottom: 32 }}>
          {clubs.map((club) => (
            <ClubCard
              key={club.id}
              club={club}
              isActive={club.id === activeClubId}
              onPress={() => {
                setActiveClubId(club.id);
                router.push(`/(app)/clubs/${club.id}` as never);
              }}
            />
          ))}
        </ScrollView>
      </YStack>
    </SafeAreaView>
  );
}
