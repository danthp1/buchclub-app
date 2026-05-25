import { XStack, YStack } from 'tamagui';

type WizardStepsProps = {
  total: number;
  current: number;
};

export function WizardSteps({ total, current }: WizardStepsProps) {
  return (
    <XStack
      gap="$sm"
      justifyContent="center"
      marginBottom="$xl"
      accessibilityRole="progressbar"
      accessibilityValue={{ now: current, min: 1, max: total }}
    >
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isCompleted = step < current;
        return (
          <YStack
            key={step}
            width={8}
            height={8}
            borderRadius={4}
            backgroundColor={
              isActive ? '$accent' : isCompleted ? '$ink' : '$borderColor'
            }
          />
        );
      })}
    </XStack>
  );
}
