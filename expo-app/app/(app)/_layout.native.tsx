import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from 'tamagui';
import { useTranslation } from 'react-i18next';

export default function AppLayoutNative() {
  const theme = useTheme();
  const { t } = useTranslation('nav');
  const accent = (theme.accent as { val?: string } | undefined)?.val ?? '#7C4B2A';
  const colorSecondary = (theme.colorSecondary as { val?: string } | undefined)?.val ?? '#6B5C47';
  const background = (theme.background as { val?: string } | undefined)?.val ?? '#FDFAF6';
  const borderColor = (theme.borderColor as { val?: string } | undefined)?.val ?? '#D6CBBC';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: colorSecondary,
        tabBarStyle: {
          backgroundColor: background,
          borderTopColor: borderColor,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontSize: 14 },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="books/index"
        options={{
          title: t('books'),
          tabBarIcon: ({ color }) => <Feather name="book-open" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="clubs/index"
        options={{
          title: t('clubs'),
          tabBarIcon: ({ color }) => <Feather name="users" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="discover/index"
        options={{
          title: t('discover'),
          tabBarIcon: ({ color }) => <Feather name="compass" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: t('profile'),
          tabBarIcon: ({ color }) => <Feather name="user" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
