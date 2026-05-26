import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDidFinishSSR } from '@tamagui/use-did-finish-ssr';
import { YStack, XStack, Text, ScrollView, Sheet, Dialog, Image } from 'tamagui';
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
import { PoolBookCard, type PoolBook } from '../../../../components/ui/PoolBookCard';

export default function ClubDetailScreen() {
  const { t } = useTranslation(['clubs', 'common', 'pool']);
  const isClient = useDidFinishSSR();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.session?.user.id);

  // Tab state
  const [activeTab, setActiveTab] = useState<'members' | 'pool' | 'settings'>('members');

  // Member tab state
  const [inviteSheetOpen, setInviteSheetOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [targetMember, setTargetMember] = useState<{ userId: string; username: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Pool tab state
  const [voteError, setVoteError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PoolBook | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [proposeSheetOpen, setProposeSheetOpen] = useState(false);
  const [proposeSuccess, setProposeSuccess] = useState(false);
  const [proposeError, setProposeError] = useState<string | null>(null);

  // ─── Queries ──────────────────────────────────────────────────────────────────

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

  // Fetch pool books (sorted by vote_count DESC)
  const { data: poolBooks, isLoading: poolLoading } = useQuery({
    queryKey: ['pool_books', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pool_books')
        .select('id, vote_count, books(title, author, cover_url, isbn)')
        .eq('club_id', id)
        .order('vote_count', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id && activeTab === 'pool',
  });

  // Fetch user's own votes for current club pool
  const { data: userVotes } = useQuery({
    queryKey: ['pool_votes', id, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('votes')
        .select('pool_book_id')
        .in('pool_book_id', (poolBooks ?? []).map((pb) => pb.id));
      if (error) throw error;
      return data?.map((v) => v.pool_book_id) ?? [];
    },
    enabled: !!id && !!userId && (poolBooks?.length ?? 0) > 0,
  });

  const votedBookIds = new Set(userVotes ?? []);

  // Fetch personal books eligible for proposal (D-05: exclude books already in pool)
  const { data: eligibleBooks, isLoading: eligibleLoading } = useQuery({
    queryKey: ['eligible_propose', id, userId],
    queryFn: async () => {
      // Get all books in the club pool
      const { data: poolBookIds, error: poolError } = await supabase
        .from('pool_books')
        .select('book_id')
        .eq('club_id', id);
      if (poolError) throw poolError;

      const pooledBookIds = new Set((poolBookIds ?? []).map((pb: any) => pb.book_id));

      // Get user's personal books
      const { data: personal, error: personalError } = await supabase
        .from('personal_books')
        .select('id, book_id, books(id, title, author, cover_url, isbn)')
        .eq('user_id', userId!);
      if (personalError) throw personalError;

      // Filter out books already in the pool
      return (personal ?? []).filter((pb: any) => !pooledBookIds.has(pb.book_id));
    },
    enabled: proposeSheetOpen && !!id && !!userId,
  });

  // ─── Mutations ────────────────────────────────────────────────────────────────

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

  // Vote mutation with optimistic update (D-09)
  const voteMutation = useMutation({
    mutationFn: async ({ poolBookId, isRemoving }: { poolBookId: string; isRemoving: boolean }) => {
      const rpcName = isRemoving ? 'decrement_book_vote' : 'increment_book_vote';
      const { error } = await supabase.rpc(rpcName, { p_pool_book_id: poolBookId });
      if (error) throw error;
    },
    onMutate: async ({ poolBookId, isRemoving }) => {
      await queryClient.cancelQueries({ queryKey: ['pool_books', id] });
      await queryClient.cancelQueries({ queryKey: ['pool_votes', id, userId] });
      const prevBooks = queryClient.getQueryData(['pool_books', id]);
      const prevVotes = queryClient.getQueryData(['pool_votes', id, userId]);
      // Optimistically update vote_count
      queryClient.setQueryData(['pool_books', id], (old: any) =>
        (old ?? []).map((pb: any) =>
          pb.id === poolBookId
            ? { ...pb, vote_count: pb.vote_count + (isRemoving ? -1 : 1) }
            : pb
        )
      );
      // Optimistically update voted set
      queryClient.setQueryData(['pool_votes', id, userId], (old: string[] | undefined) => {
        const arr = old ?? [];
        return isRemoving ? arr.filter((vid) => vid !== poolBookId) : [...arr, poolBookId];
      });
      return { prevBooks, prevVotes };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevBooks) queryClient.setQueryData(['pool_books', id], context.prevBooks);
      if (context?.prevVotes) queryClient.setQueryData(['pool_votes', id, userId], context.prevVotes);
      setVoteError(isClient ? t('pool:vote_error') : 'Vote failed. Please try again.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pool_books', id] });
      queryClient.invalidateQueries({ queryKey: ['pool_votes', id, userId] });
    },
  });

  // Admin delete pool book mutation (POOL-03)
  const removeBookMutation = useMutation({
    mutationFn: async (poolBookId: string) => {
      const { error } = await supabase
        .from('pool_books')
        .delete()
        .eq('id', poolBookId);
      if (error) throw error;
    },
    onSuccess: () => {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['pool_books', id] });
    },
    onError: () => setActionError(t('common:error_generic')),
  });

  // Propose book to club mutation
  const proposeMutation = useMutation({
    mutationFn: async (personalBook: { book_id: string }) => {
      const { error } = await supabase
        .from('pool_books')
        .insert({
          club_id: id,
          book_id: personalBook.book_id,
          proposed_by: userId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      setProposeSheetOpen(false);
      setProposeSuccess(true);
      setTimeout(() => setProposeSuccess(false), 3000);
      queryClient.invalidateQueries({ queryKey: ['pool_books', id] });
      queryClient.invalidateQueries({ queryKey: ['eligible_propose', id, userId] });
    },
    onError: () => setProposeError(t('common:error_generic')),
  });

  // ─── Realtime subscription (D-10, D-11, VOTE-03) ─────────────────────────────
  // Subscribe when pool tab is active; unsubscribe when tab changes or component unmounts.
  useEffect(() => {
    if (activeTab !== 'pool' || !id) return;

    const channel = supabase
      .channel(`pool-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pool_books',
          filter: `club_id=eq.${id}`,
        },
        () => {
          // Any pool_books row update (vote_count changed) → invalidate pool query.
          queryClient.invalidateQueries({ queryKey: ['pool_books', id] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [id, activeTab, queryClient]);

  // ─── Handlers ────────────────────────────────────────────────────────────────

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

  function handleVote(poolBook: PoolBook) {
    const isRemoving = votedBookIds.has(poolBook.id);
    setVoteError(null);
    voteMutation.mutate({ poolBookId: poolBook.id, isRemoving });
  }

  function handleAdminDeleteRequest(poolBook: PoolBook) {
    setDeleteTarget(poolBook);
    setDeleteDialogOpen(true);
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

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

      {/* Top Tab Bar */}
      <XStack
        backgroundColor="$backgroundStrong"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
        paddingHorizontal="$lg"
      >
        {(['members', 'pool', 'settings'] as const).map((tab) => {
          const labels: Record<string, string> = {
            members: isClient ? t('pool:tab_members') : 'Members',
            pool: isClient ? t('pool:tab_pool') : 'Pool',
            settings: isClient ? t('pool:tab_settings') : 'Settings',
          };
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === tab }}
            >
              <YStack
                paddingHorizontal={12}
                paddingVertical={10}
                borderBottomWidth={2}
                borderBottomColor={activeTab === tab ? '#1A4FE0' : 'transparent'}
              >
                <Text
                  fontFamily="$body"
                  fontSize={13}
                  fontWeight="600"
                  color={activeTab === tab ? '#1A4FE0' : '#6B6B63'}
                >
                  {labels[tab]}
                </Text>
              </YStack>
            </TouchableOpacity>
          );
        })}
      </XStack>

      {/* ── Members Tab ─────────────────────────────────────────────────────────── */}
      {activeTab === 'members' && (
        <>
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
        </>
      )}

      {/* ── Pool Tab ────────────────────────────────────────────────────────────── */}
      {activeTab === 'pool' && (
        <YStack flex={1}>
          {/* Vote error banner */}
          {voteError && (
            <YStack paddingHorizontal="$lg" paddingTop="$sm">
              <Alert type="error" message={voteError} />
            </YStack>
          )}

          {/* Success toast */}
          {proposeSuccess && (
            <YStack paddingHorizontal="$lg" paddingBottom="$sm" paddingTop="$sm">
              <Alert
                type="success"
                message={isClient ? t('pool:propose_success_toast') : 'Book proposed!'}
              />
            </YStack>
          )}

          {/* Loading skeleton */}
          {poolLoading && (
            <YStack padding="$lg" gap="$sm">
              {[1, 2, 3].map((i) => (
                <YStack
                  key={i}
                  height={120}
                  backgroundColor="$backgroundStrong"
                  borderRadius={16}
                  opacity={0.5}
                  // @ts-expect-error Tamagui 2.x animation prop requires config registration
                  animation="slow"
                />
              ))}
            </YStack>
          )}

          {/* Empty state */}
          {!poolLoading && (poolBooks?.length ?? 0) === 0 && (
            <YStack alignItems="center" justifyContent="center" flex={1} gap="$md" paddingHorizontal="$lg">
              <Image
                source={require('../../../../assets/illustrations/empty-man.png')}
                width={220}
                height={220}
                resizeMode="contain"
              />
              <Text fontFamily="$heading" fontSize={24} color="$color" textAlign="center">
                {isClient ? t('pool:empty_heading') : 'No books yet.'}
              </Text>
              <Text fontSize={15} color="$colorSecondary" textAlign="center">
                {isClient ? t('pool:empty_subtext') : 'Propose the first book to the club and start the discussion.'}
              </Text>
              <Button variant="primary" onPress={() => setProposeSheetOpen(true)}>
                {isClient ? t('pool:propose_fab_label') : 'Propose a book'}
              </Button>
            </YStack>
          )}

          {/* Pool leaderboard list */}
          {!poolLoading && (poolBooks?.length ?? 0) > 0 && (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
              <YStack gap="$sm">
                {(poolBooks ?? []).map((pb) => (
                  <PoolBookCard
                    key={pb.id}
                    poolBook={pb as PoolBook}
                    hasVoted={votedBookIds.has(pb.id)}
                    isAdmin={!!isAdmin}
                    onVote={handleVote}
                    onAdminDelete={isAdmin ? handleAdminDeleteRequest : undefined}
                  />
                ))}
              </YStack>
            </ScrollView>
          )}

          {/* FAB button */}
          <TouchableOpacity
            style={{
              position: 'absolute',
              bottom: 24,
              right: 24,
              width: 56,
              height: 56,
              borderRadius: 9999,
              backgroundColor: '#0D0D0D',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: 'rgba(0,0,0,0.15)',
              shadowOffset: { width: 0, height: 4 },
              shadowRadius: 16,
              elevation: 8,
            }}
            onPress={() => setProposeSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={isClient ? t('pool:propose_fab_label') : 'Propose a book'}
          >
            <Feather name="plus" size={24} color="white" />
          </TouchableOpacity>
        </YStack>
      )}

      {/* ── Settings Tab ────────────────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <YStack flex={1} padding="$lg" alignItems="center" justifyContent="center">
          <Button variant="secondary" onPress={() => router.push(`/(app)/clubs/${id}/settings` as never)}>
            {isClient ? t('clubs:settings_tab') : 'Settings'}
          </Button>
        </YStack>
      )}

      {/* ── Sheets & Dialogs ─────────────────────────────────────────────────────── */}

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

      {/* ProposePicker Sheet */}
      <Sheet
        modal
        open={proposeSheetOpen}
        onOpenChange={setProposeSheetOpen}
        snapPoints={[75]}
        dismissOnSnapToBottom
        // @ts-expect-error Tamagui 2.x animation prop requires config registration
        animation="slow"
      >
        {/* @ts-expect-error */}
        <Sheet.Overlay animation="medium" enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
        <Sheet.Handle />
        <Sheet.Frame
          borderTopLeftRadius={24}
          borderTopRightRadius={24}
          backgroundColor="$backgroundStrong"
          paddingHorizontal="$lg"
          paddingVertical="$md"
          gap="$sm"
        >
          <Text fontFamily="$heading" fontSize={18} color="$color">
            {isClient ? t('pool:propose_sheet_heading') : 'Propose a book'}
          </Text>

          {proposeError && (
            <Alert type="error" message={proposeError} />
          )}

          {eligibleLoading && (
            <YStack gap="$sm">
              {[1, 2, 3].map((i) => (
                <YStack
                  key={i}
                  height={72}
                  backgroundColor="$background"
                  borderRadius={12}
                  opacity={0.5}
                  // @ts-expect-error Tamagui 2.x animation prop
                  animation="slow"
                />
              ))}
            </YStack>
          )}

          {!eligibleLoading && (eligibleBooks ?? []).length === 0 && (
            <YStack alignItems="center" gap="$md" paddingVertical="$xl">
              <Text fontSize={15} color="$colorSecondary" textAlign="center">
                {isClient ? t('pool:propose_empty_reading_list') : 'Your reading list is empty. Add books first.'}
              </Text>
              <Button
                variant="secondary"
                onPress={() => {
                  setProposeSheetOpen(false);
                  router.push('/(app)/books/search' as never);
                }}
              >
                {isClient ? t('pool:propose_add_books_cta') : 'Find books'}
              </Button>
            </YStack>
          )}

          {!eligibleLoading && (eligibleBooks ?? []).length > 0 && (
            <ScrollView style={{ maxHeight: 400 }}>
              {(eligibleBooks ?? []).map((pb: any) => {
                const book = pb.books as { title: string; author: string | null; cover_url: string | null; isbn: string | null } | null;
                if (!book) return null;
                const coverUri = book.cover_url
                  ?? (book.isbn ? `https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg` : undefined);
                return (
                  <TouchableOpacity
                    key={pb.id}
                    onPress={() => proposeMutation.mutate({ book_id: pb.book_id })}
                    accessibilityRole="button"
                    disabled={proposeMutation.isPending}
                  >
                    <XStack
                      paddingVertical="$sm"
                      paddingHorizontal="$sm"
                      gap="$md"
                      alignItems="center"
                      borderBottomWidth={1}
                      borderBottomColor="$borderColor"
                      opacity={proposeMutation.isPending ? 0.6 : 1}
                      pressStyle={{ backgroundColor: '$background' }}
                    >
                      <YStack
                        width={48}
                        height={72}
                        borderRadius={8}
                        overflow="hidden"
                        backgroundColor="$borderColor"
                      >
                        {coverUri ? (
                          <Image
                            source={{ uri: coverUri }}
                            width={48}
                            height={72}
                            resizeMode="cover"
                          />
                        ) : (
                          <YStack flex={1} alignItems="center" justifyContent="center">
                            <Feather name="book-open" size={20} color="#E0DDD6" />
                          </YStack>
                        )}
                      </YStack>
                      <YStack flex={1} gap={2}>
                        <Text fontFamily="$heading" fontSize={16} color="$color" numberOfLines={1}>
                          {book.title}
                        </Text>
                        {book.author && (
                          <Text fontSize={13} color="$colorSecondary" numberOfLines={1}>
                            {book.author}
                          </Text>
                        )}
                      </YStack>
                    </XStack>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
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

      {/* Admin delete pool book Dialog (POOL-03) */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay
            key="delete-overlay"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
            backgroundColor="rgba(0,0,0,0.5)"
          />
          <Dialog.Content
            key="delete-content"
            backgroundColor="$backgroundStrong"
            borderRadius={16}
            padding="$lg"
            gap="$md"
            maxWidth={320}
            width="90%"
          >
            <Dialog.Title>
              <Text fontFamily="$heading" fontSize={18} color="$color">
                {isClient ? t('pool:remove_book_heading') : 'Remove book?'}
              </Text>
            </Dialog.Title>
            <Dialog.Description>
              <Text fontSize={15} color="$colorSecondary">
                {deleteTarget
                  ? (isClient
                    ? t('pool:remove_book_body', { title: deleteTarget.books?.title ?? '' })
                    : `Remove "${deleteTarget.books?.title ?? ''}" from the club pool? This cannot be undone.`)
                  : ''}
              </Text>
            </Dialog.Description>
            <Button
              variant="primary"
              loading={removeBookMutation.isPending}
              onPress={() => deleteTarget && removeBookMutation.mutate(deleteTarget.id)}
              style={{ backgroundColor: '#D32F2F' }}
            >
              {isClient ? t('pool:remove_book_cta') : 'Remove'}
            </Button>
            <Dialog.Close asChild>
              <Button variant="text" onPress={() => { setDeleteDialogOpen(false); setDeleteTarget(null); }}>
                {isClient ? t('common:cancel', { defaultValue: 'Cancel' }) : 'Cancel'}
              </Button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </SafeAreaView>
  );
}
