import { YStack, XStack, Text } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';

type Club = {
  id: string;
  name: string;
  is_public: boolean;
  member_count: number;
};

type ClubCardProps = {
  club: Club;
  isActive?: boolean;
  showJoinButton?: boolean;
  onJoin?: () => void;
  onPress?: () => void;
};

export function ClubCard({ club, isActive, showJoinButton, onJoin, onPress }: ClubCardProps) {
  const { t } = useTranslation('clubs');

  return (
    <YStack
      backgroundColor="$backgroundStrong"
      borderRadius={16}
      padding="$md"
      gap="$xs"
      borderLeftWidth={isActive ? 3 : 0}
      borderLeftColor={isActive ? '$accent' : 'transparent'}
      pressStyle={{ opacity: 0.9 }}
      animation="fast"
      onPress={onPress}
      shadowColor="rgba(0,0,0,0.06)"
      shadowOffset={{ width: 0, height: 2 }}
      shadowRadius={12}
      elevation={2}
    >
      <Text
        fontFamily="$heading"
        fontSize={24}
        color="$color"
        numberOfLines={1}
      >
        {club.name}
      </Text>

      <XStack gap="$xs" alignItems="center">
        <Feather name="users" size={14} color="#6B6B63" />
        <Text fontSize={13} color="$colorSecondary">
          {t('member_count', { count: club.member_count })}
        </Text>
        <YStack width={1} height={12} backgroundColor="$borderColor" marginHorizontal="$xs" />
        <Text
          fontSize={12}
          fontWeight="600"
          color="$colorSecondary"
        >
          {club.is_public
            ? t('visibility_public')
            : t('visibility_private')}
        </Text>
      </XStack>

      {showJoinButton && (
        <YStack marginTop="$sm">
          <Button variant="secondary" onPress={onJoin}>
            {t('join_cta')}
          </Button>
        </YStack>
      )}
    </YStack>
  );
}
