import { useRef } from 'react';
import { XStack, YStack, Text } from 'tamagui';
import { TextInput } from 'react-native';

const CODE_LENGTH = 8;

type CodeInputProps = {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
};

export function CodeInput({ value, onChange, onComplete }: CodeInputProps) {
  const inputRef = useRef<TextInput>(null);

  function handleChange(text: string) {
    const upper = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
    onChange(upper);
    if (upper.length === CODE_LENGTH) onComplete?.(upper);
  }

  return (
    <XStack
      gap={4}
      onPress={() => inputRef.current?.focus()}
      accessibilityLabel="Invite code input"
      accessibilityHint="8-character code"
    >
      {/* Hidden real input — captures all keyboard events */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        maxLength={CODE_LENGTH}
        autoCapitalize="characters"
        keyboardType="default"
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
      />
      {/* Visual cells */}
      {Array.from({ length: CODE_LENGTH }, (_, i) => {
        const char = value[i] ?? '';
        const isActive = i === value.length;
        return (
          <YStack
            key={i}
            width={40}
            height={52}
            backgroundColor="$backgroundStrong"
            borderWidth={1.5}
            borderColor={isActive ? '$accent' : '$borderColor'}
            borderRadius={8}
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize={18} fontWeight="600" color="$color">
              {char}
            </Text>
          </YStack>
        );
      })}
    </XStack>
  );
}
