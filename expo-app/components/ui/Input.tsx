import { useState, forwardRef } from 'react';
import { Input as TamaguiInput, YStack, XStack, Text } from 'tamagui';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { TextInput } from 'react-native';

type InputProps = React.ComponentProps<typeof TamaguiInput> & {
  label?: string;
  error?: string;
  helper?: string;
  isPassword?: boolean;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, helper, isPassword, ...rest },
  ref
) {
  const { t } = useTranslation('common');
  const [showPassword, setShowPassword] = useState(false);
  const message = error ?? helper;

  return (
    <YStack gap="$xs">
      {label && (
        <Text fontSize={14} color="$colorSecondary">
          {label}
        </Text>
      )}
      <XStack alignItems="center">
        <TamaguiInput
          ref={ref as never}
          flex={1}
          height="$size.5"
          backgroundColor="$backgroundStrong"
          borderColor={error ? '$destructive' : '$borderColor'}
          borderWidth={1}
          borderRadius={8}
          paddingHorizontal="$md"
          fontSize={16}
          color="$color"
          placeholderTextColor="$colorSecondary"
          secureTextEntry={isPassword && !showPassword}
          focusStyle={{ borderColor: '$accent', borderWidth: 1.5 }}
          transition="fast"
          {...rest}
        />
        {isPassword && (
          <YStack
            position="absolute"
            right={0}
            width={44}
            height={44}
            alignItems="center"
            justifyContent="center"
            onPress={() => setShowPassword((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? t('hide_password') : t('show_password')}
            cursor="pointer"
          >
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="#6B5C47" />
          </YStack>
        )}
      </XStack>
      {message && (
        <Text fontSize={14} color={error ? '$destructive' : '$colorSecondary'}>
          {message}
        </Text>
      )}
    </YStack>
  );
});
