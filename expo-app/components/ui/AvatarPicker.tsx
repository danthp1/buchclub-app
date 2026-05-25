import { XStack, YStack } from 'tamagui';
import { Image, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AVATAR_SOURCES, AVATAR_KEYS } from '../../constants/avatars';

type AvatarPickerProps = {
  selected: string | null;
  onSelect: (key: string) => void;
};

export function AvatarPicker({ selected, onSelect }: AvatarPickerProps) {
  const { t } = useTranslation('onboarding');
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <XStack flexWrap="wrap" gap="$sm" justifyContent="center" paddingBottom="$lg">
        {AVATAR_KEYS.map((key, i) => {
          const isSelected = selected === key;
          const avatarNumber = i + 1;
          return (
            <YStack
              key={key}
              width={80}
              height={80}
              borderRadius={12}
              borderWidth={isSelected ? 2 : 0}
              borderColor={isSelected ? '$ink' : 'transparent'}
              backgroundColor={isSelected ? 'rgba(13,13,13,0.08)' : 'transparent'}
              alignItems="center"
              justifyContent="center"
              pressStyle={{ scale: 1.06 }}
              animation="fast"
              onPress={() => onSelect(key)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={t('avatar_option', { number: avatarNumber })}
            >
              <Image
                source={AVATAR_SOURCES[key]}
                style={{ width: 64, height: 64 }}
                resizeMode="contain"
              />
            </YStack>
          );
        })}
      </XStack>
    </ScrollView>
  );
}
