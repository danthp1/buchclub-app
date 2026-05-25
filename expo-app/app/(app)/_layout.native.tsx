import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from 'tamagui';
import { useTranslation } from 'react-i18next';

export default function AppLayoutNative() {
  const theme = useTheme();
  const { t } = useTranslation('nav');
  const accent       = (theme.accent       as { val?: string } | undefined)?.val ?? '#1A4FE0';
  const colorSecondary = (theme.colorSecondary as { val?: string } | undefined)?.val ?? '#6B6B63';
  const background   = (theme.background   as { val?: string } | undefined)?.val ?? '#F0EDE4';
  const borderColor  = (theme.borderColor  as { val?: string } | undefined)?.val ?? '#E0DDD6';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: colorSecondary,
        tabBarStyle: {
          backgroundColor: background,
          borderTopColor: borderColor,
          borderTopWidth: 1,
          height: 80,
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
        name="schedule/index"
        options={{
          title: t('schedule'),
          tabBarIcon: ({ color }) => <Feather name="calendar" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="clubs/index"
        options={{
          title: t('community'),
          tabBarIcon: ({ color }) => <Feather name="users" size={24} color={color} />,
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
