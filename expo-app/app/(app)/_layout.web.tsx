import { Slot, Link, usePathname } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { YStack, XStack, Text } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { useDidFinishSSR } from '@tamagui/use-did-finish-ssr';

type NavItem = {
  href: '/(app)/books' | '/(app)/schedule' | '/(app)/clubs' | '/(app)/profile';
  key: 'books' | 'schedule' | 'community' | 'profile';
};

const ITEMS: NavItem[] = [
  { href: '/(app)/books',    key: 'books' },
  { href: '/(app)/schedule', key: 'schedule' },
  { href: '/(app)/clubs',    key: 'community' },
  { href: '/(app)/profile',  key: 'profile' },
];

export default function AppLayoutWeb() {
  const { t } = useTranslation('nav');
  const isClient = useDidFinishSSR();
  const pathname = usePathname();

  return (
    <YStack flex={1} backgroundColor="$background">
      <XStack
        height={56}
        backgroundColor="$background"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
        alignItems="center"
        paddingHorizontal="$lg"
        maxWidth={1024}
        width="100%"
        alignSelf="center"
      >
        <XStack alignItems="center" gap="$sm" flex={1}>
          <Feather name="book-open" size={24} color="#1A4FE0" />
          <Text fontSize={16} fontWeight="600" color="$color">
            Buchclub
          </Text>
        </XStack>
        <XStack gap="$md" alignItems="center">
          {ITEMS.map((item) => {
            const active = pathname.startsWith(item.href.replace('/(app)', ''));
            return (
              <Link key={item.key} href={item.href as never} asChild>
                <YStack
                  paddingVertical="$sm"
                  paddingHorizontal="$md"
                  alignItems="center"
                  cursor="pointer"
                >
                  <Text fontSize={14} color={active ? '$color' : '$colorSecondary'}>
                    {isClient ? t(item.key) : item.key}
                  </Text>
                  {active && (
                    <YStack
                      height={2}
                      backgroundColor="$accent"
                      alignSelf="stretch"
                      marginTop="$xs"
                    />
                  )}
                </YStack>
              </Link>
            );
          })}
        </XStack>
      </XStack>
      <YStack flex={1}>
        <Slot />
      </YStack>
    </YStack>
  );
}
