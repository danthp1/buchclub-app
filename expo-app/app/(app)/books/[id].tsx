import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDidFinishSSR } from '@tamagui/use-did-finish-ssr';
import { YStack, XStack, Text, ScrollView, Image } from 'tamagui';
import { SafeAreaView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/auth.store';
import { useClubStore } from '../../../store/club.store';
import { Alert } from '../../../components/ui/Alert';
import type { BookStatus } from '../../../components/ui/BookCard';

// Status color map (mirrors BookCard and BooksScreen)
const STATUS_COLORS: Record<BookStatus, string> = {
  planned: '#1A4FE0',
  reading: '#E85D1F',
  completed: '#2A7A3A',
};

function normalizeCoverUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace('http://', 'https://');
}

type SearchParams = {
  id: string;
  source?: string;
  googleBooksId?: string;
  title?: string;
  author?: string;
  coverUrl?: string;
  isbn?: string;
  year?: string;
  description?: string;
};

type BookRow = {
  id: string;
  google_books_id: string | null;
  title: string;
  author: string | null;
  cover_url: string | null;
  isbn: string | null;
};

export default function BookDetailScreen() {
  const { t } = useTranslation(['books', 'common', 'pool']);
  const isClient = useDidFinishSSR();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);
  const params = useLocalSearchParams<SearchParams>();
  const activeClubId = useClubStore((s) => s.activeClubId);

  const isFromSearch = params.source === 'search';
  const isFromList = params.source === 'list';
  // When source=list, params.id is the personal_books.id UUID
  const personalBookId = isFromList ? params.id : undefined;

  const [selectedStatus, setSelectedStatus] = useState<BookStatus>('planned');
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [alreadyInList, setAlreadyInList] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [proposeToClubSuccess, setProposeToClubSuccess] = useState(false);
  const [proposeToClubError, setProposeToClubError] = useState<string | null>(null);

  // Fetch personal book + book details (only when source=list)
  const { data: personalBook, isLoading } = useQuery({
    queryKey: ['personal_book', personalBookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personal_books')
        .select('id, status, books(id, google_books_id, title, author, cover_url, isbn)')
        .eq('id', personalBookId!)
        .eq('user_id', userId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isFromList && !!personalBookId && !!userId,
  });

  // Derive display data from either URL params (source=search) or DB fetch (source=list)
  const bookData: { title: string; author: string | null; cover_url: string | null; isbn: string | null } =
    isFromSearch
      ? {
          title: params.title ?? 'Unknown',
          author: params.author ?? null,
          cover_url: normalizeCoverUrl(params.coverUrl),
          isbn: params.isbn ?? null,
        }
      : (() => {
          const b = personalBook?.books as unknown as BookRow | null;
          return {
            title: b?.title ?? '',
            author: b?.author ?? null,
            cover_url: normalizeCoverUrl(b?.cover_url),
            isbn: b?.isbn ?? null,
          };
        })();

  const currentStatus = isFromList
    ? ((personalBook?.status as BookStatus | undefined) ?? 'planned')
    : selectedStatus;

  // Cover: prefer normalized cover_url, fall back to Open Library by ISBN
  const coverUri =
    bookData.cover_url ??
    (bookData.isbn ? `https://covers.openlibrary.org/b/isbn/${bookData.isbn}-M.jpg` : undefined);

  // Pool check: is this book already in the active club's pool?
  const bookId = isFromList
    ? (personalBook?.books as any)?.id
    : null;

  const { data: isInPool } = useQuery({
    queryKey: ['pool_check', activeClubId, bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pool_books')
        .select('id')
        .eq('club_id', activeClubId!)
        .eq('book_id', bookId!)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: isFromList && !!activeClubId && !!bookId,
  });

  // ─── Mutations ───────────────────────────────────────────────────────────────

  // Propose to club mutation (POOL-01, D-04 entry point 2)
  const proposeToClubMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('pool_books')
        .insert({
          club_id: activeClubId,
          book_id: bookId,
          proposed_by: userId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      setProposeToClubSuccess(true);
      setTimeout(() => setProposeToClubSuccess(false), 3000);
      queryClient.invalidateQueries({ queryKey: ['pool_books', activeClubId] });
      queryClient.invalidateQueries({ queryKey: ['pool_check', activeClubId, bookId] });
    },
    onError: () => setProposeToClubError(t('common:error_generic')),
  });

  // Status update mutation — LIST-04 (source=list only)
  const updateStatusMutation = useMutation({
    mutationFn: async (status: BookStatus) => {
      const { error } = await supabase
        .from('personal_books')
        .update({ status })
        .eq('id', personalBookId!)
        .eq('user_id', userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal_book', personalBookId] });
      queryClient.invalidateQueries({ queryKey: ['personal_books', userId] });
    },
    onError: () => setActionError(t('common:error_generic')),
  });

  // Delete mutation — LIST-06 (source=list only)
  // CRITICAL: Only deletes from personal_books — NEVER from public.books (shared append-only cache)
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('personal_books')
        .delete()
        .eq('id', personalBookId!)
        .eq('user_id', userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal_books', userId] });
      router.back();
    },
    onError: () => setActionError(t('common:error_generic')),
  });

  // Add to list mutation — LIST-03 (source=search only)
  // Two-step: upsert global books row → insert personal_books row
  const addMutation = useMutation({
    mutationFn: async (status: BookStatus) => {
      // Step 1: Upsert global book record (idempotent on google_books_id)
      const { data: bookRow, error: bookError } = await supabase
        .from('books')
        .upsert(
          {
            google_books_id: params.googleBooksId ?? params.id,
            isbn: params.isbn ?? null,
            title: bookData.title,
            author: bookData.author,
            cover_url: bookData.cover_url,
          },
          { onConflict: 'google_books_id', ignoreDuplicates: false }
        )
        .select('id')
        .single();
      if (bookError) throw bookError;

      // Step 2: Insert into personal_books
      const { error: personalError } = await supabase
        .from('personal_books')
        .insert({ user_id: userId!, book_id: bookRow.id, status });

      if (personalError) {
        // 23505 = unique_violation: book already in personal list
        if (personalError.code === '23505') {
          setAlreadyInList(true);
          return;
        }
        throw personalError;
      }

      setAddSuccess(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal_books', userId] });
      if (!alreadyInList) {
        // Brief pause so user sees the success state, then navigate back
        setTimeout(() => router.back(), 800);
      }
    },
    onError: () => setActionError(t('common:error_generic')),
  });

  // ─── Loading skeleton (source=list only) ─────────────────────────────────────
  if (isFromList && isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F0EDE4' }}>
        <YStack flex={1} padding="$lg" gap="$md">
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
            <Feather name="arrow-left" size={24} color="#0D0D0D" />
          </TouchableOpacity>
          {[1, 2, 3].map((i) => (
            <YStack
              key={i}
              height={80}
              backgroundColor="$backgroundStrong"
              borderRadius={16}
              opacity={0.5}
              // @ts-expect-error Tamagui 2.x animation prop requires config registration
              animation="slow"
            />
          ))}
        </YStack>
      </SafeAreaView>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0EDE4' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>

        {/* Header — back button */}
        <XStack paddingHorizontal="$lg" paddingTop="$md" paddingBottom="$sm" alignItems="center">
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            style={{ padding: 4 }}
          >
            <Feather name="arrow-left" size={24} color="#0D0D0D" />
          </TouchableOpacity>
        </XStack>

        {/* Error banner */}
        {actionError && (
          <YStack paddingHorizontal="$lg" paddingBottom="$sm">
            <Alert type="error" message={actionError} />
          </YStack>
        )}

        {/* Already-in-list notice */}
        {alreadyInList && (
          <YStack paddingHorizontal="$lg" paddingBottom="$sm">
            <Alert
              type="info"
              message={isClient ? t('books:already_in_list') : 'Already in your list'}
            />
          </YStack>
        )}

        {/* Cover + title section */}
        <YStack
          alignItems="center"
          paddingHorizontal="$lg"
          paddingTop="$sm"
          paddingBottom="$lg"
          gap="$md"
        >
          {/* Cover image */}
          <YStack
            width={160}
            height={240}
            borderRadius={12}
            overflow="hidden"
            backgroundColor="$borderColor"
            shadowColor="rgba(0,0,0,0.12)"
            shadowOffset={{ width: 0, height: 4 }}
            shadowRadius={16}
            elevation={4}
          >
            {coverUri ? (
              <Image
                source={{ uri: coverUri }}
                width={160}
                height={240}
                resizeMode="cover"
                accessibilityLabel={
                  isClient
                    ? t('books:cover_alt', { title: bookData.title })
                    : bookData.title
                }
              />
            ) : (
              <YStack flex={1} alignItems="center" justifyContent="center">
                <Feather name="book-open" size={48} color="#E0DDD6" />
              </YStack>
            )}
          </YStack>

          {/* Title / author / year */}
          <YStack alignItems="center" gap="$xs">
            <Text
              fontFamily="$heading"
              fontSize={24}
              color="$color"
              textAlign="center"
              lineHeight={28}
            >
              {bookData.title}
            </Text>
            {bookData.author && (
              <Text fontSize={15} color="$colorSecondary" textAlign="center">
                {bookData.author}
              </Text>
            )}
            {params.year && (
              <Text fontSize={13} color="$colorSecondary">
                {isClient
                  ? t('books:detail_published', { year: params.year })
                  : params.year}
              </Text>
            )}
          </YStack>
        </YStack>

        {/* Description — 3-line collapse with Read more toggle */}
        {params.description ? (
          <YStack paddingHorizontal="$lg" gap="$sm" marginBottom="$lg">
            <Text
              fontSize={15}
              color="$colorSecondary"
              lineHeight={22}
              numberOfLines={descriptionExpanded ? undefined : 3}
            >
              {params.description}
            </Text>
            <TouchableOpacity
              onPress={() => setDescriptionExpanded((v) => !v)}
              accessibilityRole="button"
            >
              <Text fontSize={13} color="#1A4FE0" fontWeight="600">
                {isClient
                  ? (descriptionExpanded
                      ? t('books:detail_read_less')
                      : t('books:detail_read_more'))
                  : (descriptionExpanded ? 'Show less' : 'Read more')}
              </Text>
            </TouchableOpacity>
          </YStack>
        ) : null}

        {/* Divider */}
        <YStack
          height={1}
          backgroundColor="$borderColor"
          marginHorizontal="$lg"
          marginBottom="$lg"
        />

        {/* Status / action section */}
        <YStack paddingHorizontal="$lg" gap="$md">
          <Text fontSize={13} fontWeight="600" color="$colorSecondary">
            {isClient
              ? (isFromSearch
                  ? t('books:add_to_list_heading')
                  : t('books:change_status_heading'))
              : (isFromSearch ? 'Add to my list' : 'Change status')}
          </Text>

          {/* Status button group (planned / reading / completed) */}
          <XStack gap="$sm">
            {(['planned', 'reading', 'completed'] as const).map((s) => {
              const isActive = isFromSearch ? selectedStatus === s : currentStatus === s;
              return (
                <YStack
                  key={s}
                  flex={1}
                  height={44}
                  borderRadius={12}
                  alignItems="center"
                  justifyContent="center"
                  // @ts-expect-error Tamagui 2.x: dynamic hex string not assignable to color token type
                  backgroundColor={isActive ? STATUS_COLORS[s] : '$backgroundStrong'}
                  borderWidth={1.5}
                  // @ts-expect-error Tamagui 2.x: dynamic hex string not assignable to color token type
                  borderColor={isActive ? STATUS_COLORS[s] : '$borderColor'}
                  pressStyle={{ opacity: 0.85 }}
                  accessibilityState={{ selected: isActive }}
                  onPress={() => {
                    if (isFromSearch) {
                      setSelectedStatus(s);
                    } else {
                      // source=list: immediately persist the new status
                      updateStatusMutation.mutate(s);
                    }
                  }}
                >
                  <Text
                    fontSize={13}
                    fontWeight="600"
                    color={isActive ? 'white' : '$colorSecondary'}
                  >
                    {isClient ? t(`books:status_${s}` as any) : s}
                  </Text>
                </YStack>
              );
            })}
          </XStack>

          {/* Add to list CTA — source=search only, hidden after successful add */}
          {isFromSearch && !addSuccess && (
            <TouchableOpacity
              onPress={() => addMutation.mutate(selectedStatus)}
              disabled={addMutation.isPending}
              accessibilityRole="button"
              style={{
                height: 52,
                borderRadius: 12,
                backgroundColor: '#0D0D0D',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: addMutation.isPending ? 0.6 : 1,
              }}
            >
              <Text color="white" fontSize={15} fontWeight="600">
                {addMutation.isPending
                  ? (isClient ? t('common:loading') : 'Loading…')
                  : (isClient ? t('books:add_to_list_cta') : 'Add to list')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Success state — shown briefly after a successful add */}
          {isFromSearch && addSuccess && (
            <YStack
              height={52}
              borderRadius={12}
              backgroundColor="$backgroundStrong"
              alignItems="center"
              justifyContent="center"
              borderWidth={1.5}
              borderColor="#2A7A3A"
            >
              <XStack gap="$xs" alignItems="center">
                <Feather name="check" size={16} color="#2A7A3A" />
                <Text fontSize={15} fontWeight="600" color="#2A7A3A">
                  {isClient ? t('books:add_to_list_cta') : 'Added!'}
                </Text>
              </XStack>
            </YStack>
          )}

          {/* Remove from list — source=list only, destructive text action */}
          {isFromList && (
            <YStack marginTop="$xl" alignItems="center">
              <TouchableOpacity
                onPress={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                accessibilityRole="button"
              >
                <Text
                  fontSize={15}
                  color="#D32F2F"
                  fontWeight="600"
                  opacity={deleteMutation.isPending ? 0.6 : 1}
                >
                  {deleteMutation.isPending
                    ? (isClient ? t('common:loading') : 'Removing…')
                    : (isClient ? t('books:remove_from_list') : 'Remove from list')}
                </Text>
              </TouchableOpacity>
            </YStack>
          )}

          {/* Propose to Club section — source=list only, when activeClubId is set */}
          {isFromList && !!activeClubId && !!bookId && (
            <>
              {/* Divider */}
              <YStack height={1} backgroundColor="$borderColor" marginHorizontal="$lg" marginVertical="$sm" />

              {/* Propose to Club section */}
              <YStack paddingHorizontal="$lg" gap="$sm" paddingBottom="$xl">
                <Text fontSize={13} fontWeight="600" color="$colorSecondary">
                  {isClient ? t('pool:propose_section_heading') : 'Club Pool'}
                </Text>

                {proposeToClubError && (
                  <Alert type="error" message={proposeToClubError} />
                )}

                {proposeToClubSuccess && (
                  <Alert
                    type="success"
                    message={isClient ? t('pool:propose_success_toast') : 'Book proposed!'}
                  />
                )}

                <TouchableOpacity
                  onPress={() => !isInPool && proposeToClubMutation.mutate()}
                  disabled={!!isInPool || proposeToClubMutation.isPending}
                  accessibilityRole="button"
                  style={{
                    height: 52,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: '#0D0D0D',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isInPool || proposeToClubMutation.isPending ? 0.5 : 1,
                  }}
                >
                  <Text fontSize={15} fontWeight="600" color="$color">
                    {proposeToClubMutation.isPending
                      ? (isClient ? t('common:loading') : 'Proposing…')
                      : isInPool
                        ? (isClient ? t('pool:already_in_pool') : 'Already in pool')
                        : (isClient ? t('pool:propose_to_club_cta') : 'Propose to club')}
                  </Text>
                </TouchableOpacity>
              </YStack>
            </>
          )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
