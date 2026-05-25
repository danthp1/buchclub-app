import { Button as TamaguiButton, Spinner } from 'tamagui';

type ButtonVariant = 'primary' | 'secondary' | 'text';

type ButtonProps = Omit<React.ComponentProps<typeof TamaguiButton>, 'variant'> & {
  variant?: ButtonVariant;
  loading?: boolean;
};

export function Button({
  variant = 'primary',
  loading,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  if (variant === 'secondary') {
    return (
      <TamaguiButton
        backgroundColor="transparent"
        borderColor="$borderColor"
        borderWidth={1.5}
        color="$color"
        height={48}
        borderRadius={12}
        fontSize={16}
        fontWeight="600"
        width="100%"
        pressStyle={{ backgroundColor: '$backgroundStrong' }}
        disabled={isDisabled}
        opacity={isDisabled && !loading ? 0.6 : 1}
        transition="fast"
        {...rest}
      >
        {loading ? <Spinner color="$color" size="small" /> : children}
      </TamaguiButton>
    );
  }

  if (variant === 'text') {
    return (
      <TamaguiButton
        backgroundColor="transparent"
        color="$accent"
        fontSize={14}
        paddingVertical="$sm"
        paddingHorizontal={0}
        height="auto"
        borderRadius={0}
        borderWidth={0}
        disabled={isDisabled}
        opacity={isDisabled && !loading ? 0.6 : 1}
        transition="fast"
        {...rest}
      >
        {loading ? <Spinner color="$accent" size="small" /> : children}
      </TamaguiButton>
    );
  }

  // variant === 'primary' (default)
  return (
    <TamaguiButton
      backgroundColor="$ink"
      color="$backgroundPress"
      height="$size.5"
      borderRadius={12}
      fontSize={16}
      fontWeight="600"
      width="100%"
      pressStyle={{ opacity: 0.85, scale: 0.98 }}
      disabled={isDisabled}
      opacity={isDisabled && !loading ? 0.6 : 1}
      transition="fast"
      {...rest}
    >
      {loading ? <Spinner color="$backgroundPress" size="small" /> : children}
    </TamaguiButton>
  );
}
