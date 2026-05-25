import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDidFinishSSR } from '@tamagui/use-did-finish-ssr';
import { YStack, XStack, Text, ScrollView } from 'tamagui';
import { SafeAreaView, TouchableOpacity, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../lib/supabase';
import { useAuthStore } from '../../../../store/auth.store';
import { useClubStore } from '../../../../store/club.store';
import { ClubCard } from '../../../../components/ui/ClubCard';
import { Alert } from '../../../../components/ui/Alert';

export default function BrowseClubsScreen() {
  const { t } = useTranslation(['clubs', 'common']);
  const isClient = useDidFinishSSR();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data: clubs, isLoading } = useQuery({
    queryKey: ['clubs', 'public', debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from('clubs')
        .select('id, name, is_public, club_members(count)')
        .eq('is_public', true);
      if (search.trim()) {
        query = query.ilike('name', `%${debouncedSearch.trim()}%`);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data?.map((c) => ({
        ...c,
        member_count: (c.club_members as unknown as { count: number }[])?.[0]?.count ?? 0,
      })) ?? [];
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (clubId: string) => {
      if (!userId) throw new Error('No session');
      const { error } = await supabase
        .from('club_members')
        .insert({ club_id: clubId, user_id: userId, role: 'member' });
      if (error?.code === '23505') throw new Error('already_member');
      if (error) throw error;
      return clubId;
    },
    onSuccess: (clubId: string) => {
      useClubStore.getState().setActiveClubId(clubId);
      useClubStore.getState().setOnboardingCompleted(true);
      queryClient.invalidateQueries({ queryKey: ['clubs', 'my', userId] });
      router.replace(`/(app)/clubs/${clubId}` as never);
    },
    onError: (err: Error) => {
      if (err.message === 'already_member') {
        setJoinError(t('clubs:join_error_already_member'));
      } else {
        setJoinError(t('common:error_generic'));
      }
    },
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0EDE4' }}>
      <XStack paddingHorizontal="$lg" paddingTop="$md" paddingBottom="$sm" alignItems="center">
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
          <Feather name="arrow-left" size={24} color="#0D0D0D" />
        </TouchableOpacity>
        <Text fontFamily="$heading" fontSize={18} color="$color" flex={1} paddingLeft="$md">
          {isClient ? t('clubs:browse_heading') : 'Discover clubs'}
        </Text>
      </XStack>

      {/* Search bar */}
      <XStack
        paddingHorizontal="$lg"
        paddingVertical="$sm"
        backgroundColor="$background"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
        alignItems="center"
        gap="$sm"
      >
        <Feather name="search" size={18} color="#6B6B63" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={isClient ? t('clubs:browse_search_placeholder') : 'Search clubs…'}
          style={{ flex: 1, fontSize: 15, color: '#0D0D0D' }}
          placeholderTextColor="#6B6B63"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} accessibilityRole="button">
            <Feather name="x" size={16} color="#6B6B63" />
          </TouchableOpacity>
        )}
      </XStack>

      {joinError && (
        <YStack paddingHorizontal="$lg" paddingTop="$sm">
          <Alert type="error" message={joinError} />
        </YStack>
      )}

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, gap: 8, paddingBottom: 32 }}>
        {isLoading &&
          [1, 2, 3].map((i) => (
            <YStack
              key={i}
              height={80}
              backgroundColor="$backgroundStrong"
              borderRadius={16}
              opacity={0.5}
            />
          ))}

        {!isLoading && clubs?.length === 0 && (
          <YStack alignItems="center" paddingTop="$2xl" gap="$md">
            <Feather name="search" size={32} color="#6B6B63" />
            <Text fontSize={13} color="$colorSecondary" textAlign="center">
              {search
                ? (isClient ? t('clubs:browse_no_results', { query: search }) : `No clubs found for "${search}"`)
                : (isClient ? t('clubs:empty_subtext') : 'No public clubs yet.')}
            </Text>
          </YStack>
        )}

        {clubs?.map((club) => (
          <ClubCard
            key={club.id}
            club={club}
            showJoinButton
            onJoin={() => joinMutation.mutate(club.id)}
            onPress={() => {}}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
