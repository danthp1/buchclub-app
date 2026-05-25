import { YStack, Text, Image } from 'tamagui';
import { useTranslation } from 'react-i18next';

export default function Books() {
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
        width={240}
        height={240}
        resizeMode="contain"
      />
      <Text fontFamily="$heading" fontSize={24} color="$color" textAlign="center">
        {t('books')}
      </Text>
      <Text fontSize={13} color="$colorSecondary">
        Phase 3
      </Text>
    </YStack>
  );
}
