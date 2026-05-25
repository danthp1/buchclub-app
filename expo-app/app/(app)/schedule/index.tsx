import { YStack, Text, Image } from 'tamagui';
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
      gap="$lg"
    >
      <Image
        source={require('../../../assets/illustrations/error-man.png')}
        width={220}
        height={220}
        resizeMode="contain"
      />
      <Text fontFamily="$heading" fontSize={24} color="$color">
        {isClient ? t('schedule') : 'Schedule'}
      </Text>
      <Text fontSize={13} color="$colorSecondary">
        Phase 5
      </Text>
    </YStack>
  );
}
