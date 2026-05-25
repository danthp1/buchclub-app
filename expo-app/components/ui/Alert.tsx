import { XStack, Text } from 'tamagui';
import { Feather } from '@expo/vector-icons';

type AlertProps = {
  type: 'success' | 'error';
  message: string;
};

export function Alert({ type, message }: AlertProps) {
  const isSuccess = type === 'success';
  return (
    <XStack
      backgroundColor={isSuccess ? '$success' : '$destructive'}
      opacity={isSuccess ? 0.12 : 0.1}
      borderLeftWidth={3}
      borderLeftColor={isSuccess ? '$success' : '$destructive'}
      borderRadius={8}
      paddingVertical="$sm"
      paddingHorizontal="$md"
      gap="$xs"
      alignItems="center"
      accessibilityRole="alert"
      enterStyle={{ opacity: 0, y: 4 }}
    >
      <Feather
        name={isSuccess ? 'check-circle' : 'alert-circle'}
        size={16}
        color={isSuccess ? '#2A7A3A' : '#D32F2F'}
      />
      <Text flex={1} fontSize={14} color="$color">
        {message}
      </Text>
    </XStack>
  );
}
