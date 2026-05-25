import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDidFinishSSR } from '@tamagui/use-did-finish-ssr';
import { YStack, XStack, Text, ScrollView, Sheet, Dialog } from 'tamagui';
import { SafeAreaView, TouchableOpacity, Share } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../../../../lib/supabase';
import { useAuthStore } from '../../../../store/auth.store';
import { useClubStore } from '../../../../store/club.store';
import { MemberRow } from '../../../../components/ui/MemberRow';
import { Button } from '../../../../components/ui/Button';
import { Alert } from '../../../../components/ui/Alert';

export default function ClubDetailScreen() {
  const { t } = useTranslation(['clubs', 'common']);
  const isClient = useDidFinishSSR();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [inviteSheetOpen, setInviteSheetOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [targetMember, setTargetMember] = useState<{ userId: string; username: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch club details
  const { data: club } = useQuery({
    queryKey: ['club', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clubs')
        .select('id, name, invite_code, is_public, created_by')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch member list
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['club', id, 'members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_members')
        .select('user_id, role, profiles(username, avatar_url)')
        .eq('club_id', id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const currentUserMembership = members?.find((m) => m.user_id === userId);
  const isAdmin = currentUserMembership?.role === 'admin';

  // Promote to admin mutation (CLUB-02)
  const promoteMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('club_members')
        .update({ role: 'admin' })
        .eq('club_id', id)
        .eq('user_id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['club', id, 'members'] });
    },
    onError: () => setActionError(t('common:error_generic')),
  });

  // Remove member mutation (CLUB-03)
  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('club_members')
        .delete()
        .eq('club_id', id)
        .eq('user_id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      setRemoveDialogOpen(false);
      setTargetMember(null);
      queryClient.invalidateQueries({ queryKey: ['club', id, 'members'] });
    },
    onError: () => setActionError(t('common:error_generic')),
  });

  // Leave club mutation — self delete (CLUB-05)
  const leaveMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('No session');
      const { error } = await supabase
        .from('club_members')
        .delete()
        .eq('club_id', id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      const store = useClubStore.getState();
      if (store.activeClubId === id) store.setActiveClubId(null);
      queryClient.invalidateQueries({ queryKey: ['clubs', 'my', userId] });
      router.replace('/(app)/clubs' as never);
    },
    onError: () => setActionError(t('common:error_generic')),
  });

  async function handleShareInviteLink() {
    if (!club) return;
    const url = Linking.createURL('join', { queryParams: { code: club.invite_code } });
    await Share.share({ message: `Join my book club: ${url}`, url });
  }

  async function handleCopyCode() {
    if (!club) return;
    await Clipboard.setStringAsync(club.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleMemberMorePress(member: { userId: string; username: string }) {
    setTargetMember(member);
    setRemoveDialogOpen(true);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0EDE4' }}>
      {/* Header */}
      <XStack paddingHorizontal="$lg" paddingTop="$md" paddingBottom="$sm" alignItems="center">
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
          <Feather name="arrow-left" size={24} color="#0D0D0D" />
        </TouchableOpacity>
        <Text fontFamily="$heading" fontSize={24} color="$color" flex={1} paddingHorizontal="$sm">
          {club?.name ?? ''}
        </Text>
        {isAdmin && (
          <TouchableOpacity
            onPress={() => router.push(`/(app)/clubs/${id}/settings` as never)}
            accessibilityRole="button"
            accessibilityLabel={isClient ? t('clubs:settings_tab') : 'Settings'}
          >
            <Feather name="settings" size={24} color="#0D0D0D" />
          </TouchableOpacity>
        )}
      </XStack>

      {actionError && (
        <YStack paddingHorizontal="$lg">
          <Alert type="error" message={actionError} />
        </YStack>
      )}

      {/* Member list */}
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <YStack paddingHorizontal="$lg" paddingTop="$sm">
          <Text fontSize={13} fontWeight="600" color="$colorSecondary" marginBottom="$sm">
            {isClient ? t('clubs:members_tab') : 'MEMBERS'}
            {members ? ` · ${members.length}` : ''}
          </Text>
        </YStack>

        {membersLoading &&
          [1, 2, 3, 4].map((i) => (
            <YStack
              key={i}
              height={56}
              backgroundColor="$backgroundStrong"
              opacity={0.5}
              borderBottomWidth={1}
              borderBottomColor="$borderColor"
            />
          ))}

        {members?.map((member, index) => {
          const profile = member.profiles as unknown as { username: string; avatar_url: string | null } | null;
          const username = profile?.username ?? 'Unknown';
          return (
            <MemberRow
              key={member.user_id}
              userId={member.user_id}
              username={username}
              avatarUrl={profile?.avatar_url ?? null}
              role={member.role as 'admin' | 'member'}
              isCurrentUserAdmin={!!isAdmin}
              isCurrentUser={member.user_id === userId}
              isLastItem={index === (members.length - 1)}
              onMorePress={() =>
                handleMemberMorePress({ userId: member.user_id, username })
              }
            />
          );
        })}
      </ScrollView>

      {/* Admin invite bar (bottom) */}
      {isAdmin && (
        <YStack
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          paddingHorizontal="$lg"
          paddingVertical="$md"
          backgroundColor="$backgroundStrong"
          borderTopWidth={1}
          borderTopColor="$borderColor"
          gap="$sm"
        >
          <Button variant="primary" onPress={() => setInviteSheetOpen(true)}>
            {isClient ? t('clubs:invite_heading') : 'Invite'}
          </Button>
        </YStack>
      )}

      {/* Non-admin: Leave club link */}
      {!isAdmin && (
        <YStack
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          paddingHorizontal="$lg"
          paddingVertical="$md"
          alignItems="center"
        >
          <TouchableOpacity onPress={() => setLeaveDialogOpen(true)} accessibilityRole="button">
            <Text fontSize={15} color="$destructive">
              {isClient ? t('clubs:leave_club_action') : 'Leave club'}
            </Text>
          </TouchableOpacity>
        </YStack>
      )}

      {/* Invite Sheet */}
      <Sheet
        modal
        open={inviteSheetOpen}
        onOpenChange={setInviteSheetOpen}
        snapPoints={[50]}
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
          paddingVertical="$md"
          gap="$md"
        >
          <Text fontFamily="$heading" fontSize={18} color="$color">
            {isClient ? t('clubs:invite_heading') : 'Invite members'}
          </Text>
          <YStack backgroundColor="$background" borderRadius={8} padding="$md" alignItems="center">
            <Text fontSize={18} fontWeight="600" color="$color" letterSpacing={2}>
              {club?.invite_code ?? ''}
            </Text>
          </YStack>
          <Button variant="primary" onPress={handleShareInviteLink}>
            {isClient ? t('clubs:invite_share_cta') : 'Share link'}
          </Button>
          <Button variant="secondary" onPress={handleCopyCode}>
            {copied
              ? (isClient ? t('common:copied') : 'Copied!')
              : (isClient ? t('clubs:invite_copy_cta') : 'Copy code')}
          </Button>
        </Sheet.Frame>
      </Sheet>

      {/* Remove member Dialog (CLUB-03) */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay
            key="remove-overlay"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
            backgroundColor="rgba(0,0,0,0.5)"
          />
          <Dialog.Content
            key="remove-content"
            backgroundColor="$backgroundStrong"
            borderRadius={16}
            padding="$lg"
            gap="$md"
            maxWidth={320}
            width="90%"
          >
            <Dialog.Title>
              <Text fontFamily="$heading" fontSize={18} color="$color">
                {isClient ? t('clubs:remove_confirm_heading') : 'Remove member?'}
              </Text>
            </Dialog.Title>
            <Dialog.Description>
              <Text fontSize={15} color="$colorSecondary">
                {targetMember
                  ? (isClient
                    ? t('clubs:remove_confirm_body', { username: targetMember.username })
                    : `${targetMember.username} will be removed from the club and lose access.`)
                  : ''}
              </Text>
            </Dialog.Description>
            <XStack gap="$sm" justifyContent="flex-end">
              {/* Promote to admin option */}
              <Button
                variant="secondary"
                onPress={() => {
                  if (targetMember) {
                    promoteMutation.mutate(targetMember.userId);
                    setRemoveDialogOpen(false);
                  }
                }}
              >
                {isClient ? t('clubs:make_admin_action') : 'Make admin'}
              </Button>
              {/* Remove — destructive */}
              <YStack>
                <Button
                  variant="primary"
                  onPress={() => targetMember && removeMutation.mutate(targetMember.userId)}
                  loading={removeMutation.isPending}
                  style={{ backgroundColor: '#D32F2F' }}
                >
                  {isClient ? t('clubs:remove_confirm_cta') : 'Remove'}
                </Button>
              </YStack>
            </XStack>
            <Dialog.Close asChild>
              <Button variant="text" onPress={() => setRemoveDialogOpen(false)}>
                {isClient ? t('common:cancel', { defaultValue: 'Cancel' }) : 'Cancel'}
              </Button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>

      {/* Leave club Dialog (CLUB-05) */}
      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay
            key="leave-overlay"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
            backgroundColor="rgba(0,0,0,0.5)"
          />
          <Dialog.Content
            key="leave-content"
            backgroundColor="$backgroundStrong"
            borderRadius={16}
            padding="$lg"
            gap="$md"
            maxWidth={320}
            width="90%"
          >
            <Dialog.Title>
              <Text fontFamily="$heading" fontSize={18} color="$color">
                {isClient ? t('clubs:leave_confirm_heading') : 'Leave club?'}
              </Text>
            </Dialog.Title>
            <Dialog.Description>
              <Text fontSize={15} color="$colorSecondary">
                {isClient ? t('clubs:leave_confirm_body') : 'You can only rejoin if you are invited again.'}
              </Text>
            </Dialog.Description>
            <Button
              variant="primary"
              loading={leaveMutation.isPending}
              onPress={() => leaveMutation.mutate()}
              style={{ backgroundColor: '#D32F2F' }}
            >
              {isClient ? t('clubs:leave_confirm_cta') : 'Leave'}
            </Button>
            <Dialog.Close asChild>
              <Button variant="text" onPress={() => setLeaveDialogOpen(false)}>
                {isClient ? t('common:cancel', { defaultValue: 'Cancel' }) : 'Cancel'}
              </Button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </SafeAreaView>
  );
}
