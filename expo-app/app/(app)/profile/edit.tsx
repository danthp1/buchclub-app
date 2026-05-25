import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDidFinishSSR } from '@tamagui/use-did-finish-ssr';
import { YStack, XStack, Text, Form, Sheet, Image } from 'tamagui';
import { KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/auth.store';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import { AvatarPicker } from '../../../components/ui/AvatarPicker';
import { AVATAR_SOURCES, AVATAR_DEFAULT_KEY } from '../../../constants/avatars';

export default function ProfileEditScreen() {
  const { t } = useTranslation(['profile', 'onboarding', 'common']);
  const isClient = useDidFinishSSR();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);
  const [validating, setValidating] = useState(false);
  const [usernameAvailable, setAvailable] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [originalUsername, setOriginalUsername] = useState('');
  const [error, setError] = useState<string | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkGeneration = useRef(0);

  // Load current profile data — TanStack Query v5 dropped onSuccess from useQuery
  const { data: profile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error: qError } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', userId!)
        .single();
      if (qError) throw qError;
      return data;
    },
    enabled: !!userId,
  });

  // Pre-fill form when profile loads (useEffect instead of onSuccess — TanStack Query v5)
  useEffect(() => {
    if (profile) {
      setUsername(profile.username ?? '');
      setOriginalUsername(profile.username ?? '');
      setSelectedAvatar(profile.avatar_url);
      setAvailable(true); // current username is available (it's theirs)
    }
  }, [profile]);

  function handleUsernameChange(text: string) {
    setUsername(text);
    setUsernameError(null);

    // If unchanged from original, it is valid — no uniqueness check needed
    if (text === originalUsername) {
      setAvailable(true);
      return;
    }

    setAvailable(false);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (text.length < 3) return;
    if (!/^[a-zA-Z0-9_]+$/.test(text)) {
      setUsernameError(t('onboarding:username_error_format'));
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      const generation = ++checkGeneration.current;
      setValidating(true);
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', text)
        .maybeSingle();
      if (generation !== checkGeneration.current) return; // discard stale response
      setValidating(false);
      if (data) setUsernameError(t('onboarding:username_error_taken'));
      else setAvailable(true);
    }, 500);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('No session');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ username: username.trim(), avatar_url: selectedAvatar })
        .eq('id', userId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] });
      router.back();
    },
    onError: () => setError(t('common:error_generic')),
  });

  const currentAvatarSource =
    selectedAvatar && AVATAR_SOURCES[selectedAvatar]
      ? AVATAR_SOURCES[selectedAvatar]
      : AVATAR_SOURCES[AVATAR_DEFAULT_KEY];

  const canSave = username.trim().length >= 3 && usernameAvailable && !validating;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0EDE4' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <XStack paddingHorizontal="$lg" paddingTop="$md" paddingBottom="$sm" alignItems="center">
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
            <Feather name="arrow-left" size={24} color="#0D0D0D" />
          </TouchableOpacity>
          <Text fontFamily="$heading" fontSize={18} color="$color" flex={1} paddingHorizontal="$sm">
            {isClient ? t('profile:edit_heading') : 'Edit profile'}
          </Text>
        </XStack>

        <YStack
          flex={1}
          paddingHorizontal="$lg"
          paddingTop="$lg"
          gap="$lg"
          $gtSm={{ maxWidth: 420, alignSelf: 'center', width: '100%' }}
        >
          {error && <Alert type="error" message={error} />}

          {/* Avatar section */}
          <YStack alignItems="center" gap="$sm">
            <Image source={currentAvatarSource} width={80} height={80} borderRadius={40} />
            <TouchableOpacity
              onPress={() => setAvatarSheetOpen(true)}
              accessibilityRole="button"
            >
              <Text fontSize={15} color="$accent">
                {isClient ? t('profile:avatar_change') : 'Change avatar'}
              </Text>
            </TouchableOpacity>
          </YStack>

          {/* Username field */}
          <Form onSubmit={() => canSave && saveMutation.mutate()}>
            <YStack gap="$md">
              <Input
                label={isClient ? t('profile:username_label') : 'Username'}
                value={username}
                onChangeText={handleUsernameChange}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={30}
                error={usernameError ?? undefined}
              />

              <YStack marginTop="$xl" gap="$sm">
                <Form.Trigger asChild disabled={!canSave || saveMutation.isPending}>
                  <Button variant="primary" loading={saveMutation.isPending}>
                    {isClient ? t('profile:save_profile') : 'Save profile'}
                  </Button>
                </Form.Trigger>
                <Button variant="text" onPress={() => router.back()}>
                  {isClient ? t('common:cancel', { defaultValue: 'Cancel' }) : 'Cancel'}
                </Button>
              </YStack>
            </YStack>
          </Form>
        </YStack>
      </KeyboardAvoidingView>

      {/* Avatar picker sheet */}
      <Sheet
        modal
        open={avatarSheetOpen}
        onOpenChange={setAvatarSheetOpen}
        snapPoints={[70]}
        dismissOnSnapToBottom
        // @ts-expect-error Tamagui 2.x animation prop requires config registration
        animation="slow"
      >
        {/* @ts-expect-error Tamagui 2.x Sheet.Overlay animation requires config */}
        <Sheet.Overlay animation="medium" enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
        <Sheet.Handle />
        <Sheet.Frame
          borderTopLeftRadius={24}
          borderTopRightRadius={24}
          backgroundColor="$backgroundStrong"
          paddingHorizontal="$lg"
          paddingTop="$md"
        >
          <Text fontFamily="$heading" fontSize={18} color="$color" marginBottom="$md">
            {isClient ? t('profile:avatar_change') : 'Change avatar'}
          </Text>
          <AvatarPicker
            selected={selectedAvatar}
            onSelect={(key) => {
              setSelectedAvatar(key);
              setAvatarSheetOpen(false);
            }}
          />
        </Sheet.Frame>
      </Sheet>
    </SafeAreaView>
  );
}
