import { YStack, Text } from 'tamagui';
import { useTranslation } from 'react-i18next';

export default function Clubs() {
  const { t } = useTranslation('nav');
  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      alignItems="center"
      justifyContent="center"
      padding="$lg"
    >
      <Text fontSize={22} fontWeight="600" color="$color">
        {t('clubs')}
      </Text>
      <Text fontSize={14} color="$colorSecondary">
        Phase 2
      </Text>
    </YStack>
  );
}
