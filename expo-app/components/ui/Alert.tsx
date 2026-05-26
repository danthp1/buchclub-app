import { XStack, Text } from 'tamagui';
import { Feather } from '@expo/vector-icons';

type AlertProps = {
  type: 'success' | 'error' | 'info';
  message: string;
};

// Static config so each type maps to concrete values (no dynamic token lookup)
const ALERT_STYLES = {
  success:  { icon: 'check-circle' as const, iconColor: '#2A7A3A', borderColor: '#2A7A3A', bg: 'rgba(42, 122, 58, 0.12)' },
  error:    { icon: 'alert-circle' as const, iconColor: '#D32F2F', borderColor: '#D32F2F', bg: 'rgba(211, 47, 47, 0.1)' },
  info:     { icon: 'info' as const,         iconColor: '#1A4FE0', borderColor: '#1A4FE0', bg: 'rgba(26, 79, 224, 0.1)' },
};

export function Alert({ type, message }: AlertProps) {
  const s = ALERT_STYLES[type];
  return (
    <XStack
      borderLeftWidth={3}
      borderRadius={8}
      paddingVertical="$sm"
      paddingHorizontal="$md"
      gap="$xs"
      alignItems="center"
      accessibilityRole="alert"
      enterStyle={{ opacity: 0, y: 4 }}
      style={{ backgroundColor: s.bg, borderLeftColor: s.borderColor }}
    >
      <Feather name={s.icon} size={16} color={s.iconColor} />
      <Text flex={1} fontSize={14} color="$color">
        {message}
      </Text>
    </XStack>
  );
}
