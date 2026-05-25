import { YStack, Text, Image } from 'tamagui';
import { useTranslation } from 'react-i18next';

export default function Discover() {
  const { t } = useTranslation('nav');
  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      alignItems="center"
      justifyContent="center"
      padding="$lg"
      gap="$lg"
    >
      <Image
        source={require('../../../assets/illustrations/empty-man.png')}
        width={220}
        height={220}
        resizeMode="contain"
      />
      <Text fontFamily="$heading" fontSize={24} color="$color">
        {t('discover')}
      </Text>
      <Text fontSize={13} color="$colorSecondary">
        Phase 2
      </Text>
    </YStack>
  );
}
