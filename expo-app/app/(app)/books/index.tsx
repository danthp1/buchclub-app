import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDidFinishSSR } from '@tamagui/use-did-finish-ssr';
import { YStack, XStack, Text, ScrollView, Sheet, Image } from 'tamagui';
import { SafeAreaView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/auth.store';
import { BookCard } from '../../../components/ui/BookCard';
import type { BookStatus } from '../../../components/ui/BookCard';

type Tab = 'reading' | 'planned' | 'completed';

const TABS: { key: Tab; i18nKey: string }[] = [
  { key: 'reading', i18nKey: 'tab_reading' },
  { key: 'planned', i18nKey: 'tab_planned' },
  { key: 'completed', i18nKey: 'tab_done' },
];

type PersonalBook = {
  id: string;
  status: BookStatus;
  added_at: string;
  books: {
    id: string;
    title: string;
    author: string | null;
    cover_url: string | null;
    isbn: string | null;
  } | null;
};

export default function BooksScreen() {
  const { t } = useTranslation('books');
  const isClient = useDidFinishSSR();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.session?.user.id);

  const [activeTab, setActiveTab] = useState<Tab>('reading');
  const [statusSheetBook, setStatusSheetBook] = useState<PersonalBook | null>(null);

  const { data: allBooks, isLoading } = useQuery({
    queryKey: ['personal_books', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personal_books')
        .select('id, status, added_at, books(id, title, author, cover_url, isbn)')
        .eq('user_id', userId!)
        .order('added_at', { ascending: false });
      if (error) throw error;
      return data as unknown as PersonalBook[];
    },
    enabled: !!userId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ personalBookId, status }: { personalBookId: string; status: BookStatus }) => {
      const { error } = await supabase
        .from('personal_books')
        .update({ status })
        .eq('id', personalBookId)
        .eq('user_id', userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal_books', userId] });
      setStatusSheetBook(null);
    },
  });

  const filtered = (allBooks ?? []).filter((b) => b.status === activeTab);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F0EDE4' }}>
        <YStack flex={1} paddingHorizontal="$lg" paddingTop="$md" gap="$sm">
          <XStack alignItems="center">
            <Text fontFamily="$heading" fontSize={24} color="$color" flex={1}>
              {isClient ? t('tab_reading') : 'Books'}
            </Text>
          </XStack>
          {[1, 2, 3].map((i) => (
            <YStack
              key={i}
              height={124}
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0EDE4' }}>
      <YStack flex={1}>
        {/* Header */}
        <XStack paddingHorizontal="$lg" paddingTop="$md" paddingBottom="$sm" alignItems="center">
          <Text fontFamily="$heading" fontSize={24} color="$color" flex={1}>
            {isClient ? t('tab_reading') : 'Books'}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(app)/books/search' as never)}
            accessibilityRole="button"
            accessibilityLabel={isClient ? t('add_book_fab') : 'Add book'}
            style={{ padding: 10 }}
          >
            <Feather name="plus" size={24} color="#0D0D0D" />
          </TouchableOpacity>
        </XStack>

        {/* Segmented tab control */}
        <XStack
          marginHorizontal="$lg"
          marginBottom="$md"
          backgroundColor="$backgroundStrong"
          borderRadius={12}
          padding={4}
          gap="$xs"
        >
          {TABS.map(({ key, i18nKey }) => (
            <YStack
              key={key}
              flex={1}
              height={36}
              borderRadius={9999}
              alignItems="center"
              justifyContent="center"
              backgroundColor={activeTab === key ? '#0D0D0D' : 'transparent'}
              onPress={() => setActiveTab(key)}
            >
              <Text
                fontSize={13}
                fontWeight="600"
                color={activeTab === key ? 'white' : '$colorSecondary'}
              >
                {isClient ? t(i18nKey as Parameters<typeof t>[0]) : key}
              </Text>
            </YStack>
          ))}
        </XStack>

        {/* Book list */}
        {filtered.length === 0 ? (
          <YStack flex={1} alignItems="center" justifyContent="center" paddingHorizontal="$lg" gap="$md">
            <Image
              source={require('../../../assets/illustrations/empty-man.png')}
              width={220}
              height={220}
              resizeMode="contain"
            />
            <Text fontFamily="$heading" fontSize={24} color="$color" textAlign="center">
              {isClient ? t('empty_list_heading') : 'Your list is empty.'}
            </Text>
            <Text fontSize={15} color="$colorSecondary" textAlign="center">
              {isClient ? t('empty_list_subtext') : 'Search for books and add them to your reading list.'}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(app)/books/search' as never)}
              accessibilityRole="button"
              style={{
                backgroundColor: '#0D0D0D',
                height: 52,
                paddingHorizontal: 24,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text color="white" fontSize={15} fontWeight="600">
                {isClient ? t('empty_search_cta') : 'Search books'}
              </Text>
            </TouchableOpacity>
          </YStack>
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 24, gap: 8, paddingBottom: 32 }}>
            {filtered.map((pb) => {
              const book = pb.books as unknown as { title: string; author: string | null; cover_url: string | null; isbn: string | null } | null;
              if (!book) return null;
              return (
                <BookCard
                  key={pb.id}
                  personalBookId={pb.id}
                  book={book}
                  status={pb.status}
                  onPress={() => router.push(`/(app)/books/${pb.id}?source=list` as never)}
                  onLongPress={() => setStatusSheetBook(pb)}
                />
              );
            })}
          </ScrollView>
        )}
      </YStack>

      {/* Long-press status change sheet */}
      <Sheet
        modal
        open={!!statusSheetBook}
        onOpenChange={(open) => { if (!open) setStatusSheetBook(null); }}
        snapPoints={[40]}
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
            {isClient ? t('change_status_heading') : 'Change status'}
          </Text>
          <XStack gap="$sm">
            {(['planned', 'reading', 'completed'] as const).map((s) => {
              const statusColors: Record<BookStatus, string> = {
                planned: '#1A4FE0',
                reading: '#E85D1F',
                completed: '#2A7A3A',
              };
              const isActive = statusSheetBook?.status === s;
              return (
                <YStack
                  key={s}
                  flex={1}
                  height={44}
                  borderRadius={12}
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor={isActive ? statusColors[s] : '$backgroundStrong'}
                  borderWidth={1.5}
                  borderColor={isActive ? statusColors[s] : '$borderColor'}
                  pressStyle={{ opacity: 0.85 }}
                  onPress={() => {
                    if (statusSheetBook) {
                      updateStatusMutation.mutate({ personalBookId: statusSheetBook.id, status: s });
                    }
                  }}
                >
                  <Text
                    fontSize={13}
                    fontWeight="600"
                    color={isActive ? 'white' : '$colorSecondary'}
                  >
                    {isClient ? t(`status_${s}` as Parameters<typeof t>[0]) : s}
                  </Text>
                </YStack>
              );
            })}
          </XStack>
        </Sheet.Frame>
      </Sheet>
    </SafeAreaView>
  );
}
