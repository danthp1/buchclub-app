import { YStack, Text } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { useDidFinishSSR } from '@tamagui/use-did-finish-ssr';

export default function Schedule() {
  const { t } = useTranslation('nav');
  const isClient = useDidFinishSSR();
  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      alignItems="center"
      justifyContent="center"
      padding="$lg"
    >
      <Text fontFamily="$heading" fontSize={24} color="$color">
        {isClient ? t('schedule') : 'Schedule'}
      </Text>
      <Text fontSize={13} color="$colorSecondary">
        Phase 5
      </Text>
    </YStack>
  );
}
