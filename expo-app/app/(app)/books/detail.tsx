import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDidFinishSSR } from '@tamagui/use-did-finish-ssr';
import { YStack, XStack, Text, ScrollView, Image } from 'tamagui';
import { SafeAreaView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/auth.store';
import { Alert } from '../../../components/ui/Alert';
import type { BookStatus } from '../../../components/ui/BookCard';

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
  googleBooksId?: string;
  title?: string;
  author?: string;
  coverUrl?: string;
  isbn?: string;
  year?: string;
  description?: string;
};

export default function BookDetailSearchScreen() {
  const { t } = useTranslation(['books', 'common']);
  const isClient = useDidFinishSSR();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);
  const params = useLocalSearchParams<SearchParams>();

  const [selectedStatus, setSelectedStatus] = useState<BookStatus>('planned');
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [alreadyInList, setAlreadyInList] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);

  const coverUri = normalizeCoverUrl(params.coverUrl) ??
    (params.isbn ? `https://covers.openlibrary.org/b/isbn/${params.isbn}-M.jpg` : undefined);

  const addMutation = useMutation({
    mutationFn: async (status: BookStatus) => {
      const { data: bookRow, error: bookError } = await supabase
        .from('books')
        .upsert(
          {
            google_books_id: params.googleBooksId ?? null,
            isbn: params.isbn ?? null,
            title: params.title ?? '',
            author: params.author ?? null,
            cover_url: normalizeCoverUrl(params.coverUrl),
          },
          { onConflict: 'google_books_id', ignoreDuplicates: false }
        )
        .select('id')
        .single();
      if (bookError) throw bookError;

      const { error: personalError } = await supabase
        .from('personal_books')
        .insert({ user_id: userId!, book_id: bookRow.id, status });

      if (personalError) {
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
        setTimeout(() => router.back(), 800);
      }
    },
    onError: () => setActionError(t('common:error_generic')),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0EDE4' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>

        <XStack paddingHorizontal="$lg" paddingTop="$md" paddingBottom="$sm" alignItems="center">
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" style={{ padding: 4 }}>
            <Feather name="arrow-left" size={24} color="#0D0D0D" />
          </TouchableOpacity>
        </XStack>

        {actionError && (
          <YStack paddingHorizontal="$lg" paddingBottom="$sm">
            <Alert type="error" message={actionError} />
          </YStack>
        )}
        {alreadyInList && (
          <YStack paddingHorizontal="$lg" paddingBottom="$sm">
            <Alert type="info" message={isClient ? t('books:already_in_list') : 'Already in your list'} />
          </YStack>
        )}

        {/* Cover + title */}
        <YStack alignItems="center" paddingHorizontal="$lg" paddingTop="$sm" paddingBottom="$lg" gap="$md">
          <YStack
            width={160} height={240} borderRadius={12} overflow="hidden"
            backgroundColor="$borderColor"
            shadowColor="rgba(0,0,0,0.12)" shadowOffset={{ width: 0, height: 4 }}
            shadowRadius={16} elevation={4}
          >
            {coverUri ? (
              <Image
                source={{ uri: coverUri }}
                width={160} height={240} resizeMode="cover"
                accessibilityLabel={isClient ? t('books:cover_alt', { title: params.title }) : params.title}
              />
            ) : (
              <YStack flex={1} alignItems="center" justifyContent="center">
                <Feather name="book-open" size={48} color="#E0DDD6" />
              </YStack>
            )}
          </YStack>

          <YStack alignItems="center" gap="$xs">
            <Text fontFamily="$heading" fontSize={24} color="$color" textAlign="center" lineHeight={28}>
              {params.title}
            </Text>
            {params.author && (
              <Text fontSize={15} color="$colorSecondary" textAlign="center">{params.author}</Text>
            )}
            {params.year && (
              <Text fontSize={13} color="$colorSecondary">
                {isClient ? t('books:detail_published', { year: params.year }) : params.year}
              </Text>
            )}
          </YStack>
        </YStack>

        {/* Description */}
        {params.description ? (
          <YStack paddingHorizontal="$lg" gap="$sm" marginBottom="$lg">
            <Text
              fontSize={15} color="$colorSecondary" lineHeight={22}
              numberOfLines={descriptionExpanded ? undefined : 3}
            >
              {params.description}
            </Text>
            <TouchableOpacity onPress={() => setDescriptionExpanded((v) => !v)} accessibilityRole="button">
              <Text fontSize={13} color="#1A4FE0" fontWeight="600">
                {isClient
                  ? (descriptionExpanded ? t('books:detail_read_less') : t('books:detail_read_more'))
                  : (descriptionExpanded ? 'Show less' : 'Read more')}
              </Text>
            </TouchableOpacity>
          </YStack>
        ) : null}

        <YStack height={1} backgroundColor="$borderColor" marginHorizontal="$lg" marginBottom="$lg" />

        {/* Status + Add CTA */}
        <YStack paddingHorizontal="$lg" gap="$md">
          <Text fontSize={13} fontWeight="600" color="$colorSecondary">
            {isClient ? t('books:add_to_list_heading') : 'Add to my list'}
          </Text>

          <XStack gap="$sm">
            {(['planned', 'reading', 'completed'] as const).map((s) => {
              const isActive = selectedStatus === s;
              return (
                <YStack
                  key={s} flex={1} height={44} borderRadius={12}
                  alignItems="center" justifyContent="center"
                  // @ts-expect-error Tamagui 2.x: dynamic hex string not assignable to color token type
                  backgroundColor={isActive ? STATUS_COLORS[s] : '$backgroundStrong'}
                  borderWidth={1.5}
                  // @ts-expect-error Tamagui 2.x: dynamic hex string not assignable to color token type
                  borderColor={isActive ? STATUS_COLORS[s] : '$borderColor'}
                  pressStyle={{ opacity: 0.85 }}
                  accessibilityState={{ selected: isActive }}
                  onPress={() => setSelectedStatus(s)}
                >
                  <Text fontSize={13} fontWeight="600" color={isActive ? 'white' : '$colorSecondary'}>
                    {isClient ? t(`books:status_${s}` as any) : s}
                  </Text>
                </YStack>
              );
            })}
          </XStack>

          {!addSuccess ? (
            <TouchableOpacity
              onPress={() => addMutation.mutate(selectedStatus)}
              disabled={addMutation.isPending}
              accessibilityRole="button"
              style={{
                height: 52, borderRadius: 12, backgroundColor: '#0D0D0D',
                alignItems: 'center', justifyContent: 'center',
                opacity: addMutation.isPending ? 0.6 : 1,
              }}
            >
              <Text color="white" fontSize={15} fontWeight="600">
                {addMutation.isPending
                  ? (isClient ? t('common:loading') : 'Loading…')
                  : (isClient ? t('books:add_to_list_cta') : 'Add to list')}
              </Text>
            </TouchableOpacity>
          ) : (
            <YStack
              height={52} borderRadius={12} backgroundColor="$backgroundStrong"
              alignItems="center" justifyContent="center"
              borderWidth={1.5} borderColor="#2A7A3A"
            >
              <XStack gap="$xs" alignItems="center">
                <Feather name="check" size={16} color="#2A7A3A" />
                <Text fontSize={15} fontWeight="600" color="#2A7A3A">
                  {isClient ? t('books:add_success') : 'Added!'}
                </Text>
              </XStack>
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
