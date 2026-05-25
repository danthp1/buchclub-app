import { XStack, Text } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useClubStore } from '../../store/club.store';
import { supabase } from '../../lib/supabase';

export function ClubBanner() {
  const { t } = useTranslation('nav');
  const activeClubId = useClubStore((s) => s.activeClubId);

  const { data: club } = useQuery({
    queryKey: ['club', activeClubId, 'banner'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clubs')
        .select('name')
        .eq('id', activeClubId!)
        .single();
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
    >
      <Text
        flex={1}
        fontSize={13}
        fontWeight="600"
        color="$backgroundPress"
        numberOfLines={1}
      >
        {club.name}
      </Text>
      <Feather name="chevron-down" size={16} color="#F0EDE4" />
    </XStack>
  );
}
