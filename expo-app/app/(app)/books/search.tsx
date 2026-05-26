import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDidFinishSSR } from '@tamagui/use-did-finish-ssr';
import { YStack, XStack, Text, ScrollView, Image } from 'tamagui';
import { SafeAreaView, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useDebounce } from '../../../lib/hooks/useDebounce';
import { Alert } from '../../../components/ui/Alert';

// Google Books API types
type GoogleBookItem = {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publishedDate?: string;
    description?: string;
    imageLinks?: {
      smallThumbnail?: string;
      thumbnail?: string;
    };
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
  };
};

type GoogleBooksResponse = {
  kind: string;
  totalItems: number;
  items?: GoogleBookItem[];
};

function extractIsbn(identifiers?: GoogleBookItem['volumeInfo']['industryIdentifiers']): string | null {
  if (!identifiers) return null;
  return (
    identifiers.find((i) => i.type === 'ISBN_13')?.identifier ??
    identifiers.find((i) => i.type === 'ISBN_10')?.identifier ??
    null
  );
}

function normalizeCoverUrl(url?: string): string | null {
  if (!url) return null;
  return url.replace('http://', 'https://');
}

// 1. Direct Google Books (primary — free, no key, 1000 req/day per IP)
async function fetchFromGoogle(query: string, startIndex: number): Promise<GoogleBooksResponse> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&startIndex=${startIndex}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`google:${res.status}`);
  return res.json();
}

// 2. Edge Function proxy (fallback — avoids CORS issues if they arise)
async function fetchFromEdgeFunction(query: string, startIndex: number): Promise<GoogleBooksResponse> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const url = `${supabaseUrl}/functions/v1/google-books-search?q=${encodeURIComponent(query)}&maxResults=10&startIndex=${startIndex}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${supabaseKey}` } });
  if (!res.ok) throw new Error(`edge:${res.status}`);
  return res.json();
}

// 3. Open Library (last resort — different shape, normalised to GoogleBooksResponse)
async function fetchFromOpenLibrary(query: string, startIndex: number): Promise<GoogleBooksResponse> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10&offset=${startIndex}&fields=key,title,author_name,first_publish_year,isbn,cover_i`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`openlibrary:${res.status}`);
  const data = await res.json();
  const items: GoogleBookItem[] = (data.docs ?? []).map((doc: any) => {
    const isbn = doc.isbn?.[0] ?? null;
    const coverId = doc.cover_i;
    return {
      id: doc.key,
      volumeInfo: {
        title: doc.title ?? '',
        authors: doc.author_name ?? [],
        publishedDate: doc.first_publish_year?.toString(),
        imageLinks: coverId
          ? { thumbnail: `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` }
          : undefined,
        industryIdentifiers: isbn
          ? [{ type: 'ISBN_13', identifier: isbn }]
          : undefined,
      },
    };
  });
  return { kind: 'books#volumes', totalItems: data.numFound ?? items.length, items };
}

async function fetchBooks(query: string, startIndex: number): Promise<GoogleBooksResponse> {
  try {
    return await fetchFromGoogle(query, startIndex);
  } catch {
    try {
      return await fetchFromEdgeFunction(query, startIndex);
    } catch {
      return await fetchFromOpenLibrary(query, startIndex);
    }
  }
}

export default function BookSearchScreen() {
  const { t } = useTranslation('books');
  const isClient = useDidFinishSSR();
  const [searchText, setSearchText] = useState('');

  const debouncedQuery = useDebounce(searchText, 300);
  const isQueryEnabled = debouncedQuery.length >= 2;

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    isError,
  } = useInfiniteQuery({
    queryKey: ['books-search', debouncedQuery],
    queryFn: ({ pageParam }) => fetchBooks(debouncedQuery, pageParam as number),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + (p.items?.length ?? 0), 0);
      return loaded < lastPage.totalItems ? loaded : undefined;
    },
    enabled: isQueryEnabled,
    initialPageParam: 0,
  });

  const allItems = data?.pages.flatMap((p) => p.items ?? []) ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0EDE4' }}>
      <YStack flex={1}>
        {/* Header with back + search input */}
        <XStack
          paddingHorizontal="$lg"
          paddingTop="$md"
          paddingBottom="$sm"
          alignItems="center"
          gap="$sm"
        >
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={{ padding: 4 }}
          >
            <Feather name="arrow-left" size={24} color="#0D0D0D" />
          </TouchableOpacity>

          <YStack
            flex={1}
            height={52}
            backgroundColor="$backgroundStrong"
            borderRadius={8}
            borderWidth={1.5}
            borderColor="$borderColor"
            paddingHorizontal="$md"
            justifyContent="center"
          >
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder={isClient ? t('search_placeholder') : 'Title, author or ISBN…'}
              placeholderTextColor="#6B6B63"
              autoFocus
              returnKeyType="search"
              clearButtonMode="while-editing"
              style={styles.searchInput}
              accessibilityLabel={isClient ? t('search_heading') : 'Search books'}
            />
          </YStack>
        </XStack>

        {/* Error banner */}
        {isError ? (
          <YStack paddingHorizontal="$lg" paddingTop="$sm">
            <Alert type="error" message={isClient ? t('error_search_failed') : 'Search failed. Please try again.'} />
          </YStack>
        ) : null}

        {/* Skeleton loading */}
        {isLoading && isQueryEnabled ? (
          <YStack paddingHorizontal="$lg" paddingTop="$sm" gap="$sm">
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
        ) : null}

        {/* Empty state */}
        {!isLoading && isQueryEnabled && allItems.length === 0 && !isError ? (
          <YStack flex={1} alignItems="center" justifyContent="center" paddingHorizontal="$lg" gap="$md">
            <Image
              source={require('../../../assets/illustrations/empty-man.png')}
              width={200}
              height={200}
              resizeMode="contain"
            />
            <Text fontFamily="$heading" fontSize={20} color="$color" textAlign="center">
              {isClient ? t('search_no_results', { query: debouncedQuery }) : `No results for "${debouncedQuery}"`}
            </Text>
          </YStack>
        ) : null}

        {/* Idle state (query too short or empty) */}
        {!isQueryEnabled && searchText.length === 0 ? (
          <YStack flex={1} alignItems="center" justifyContent="center" paddingHorizontal="$lg">
            <Feather name="search" size={40} color="#E0DDD6" />
            <Text fontSize={15} color="$colorSecondary" marginTop="$md" textAlign="center">
              {isClient ? t('search_placeholder') : 'Title, author or ISBN…'}
            </Text>
          </YStack>
        ) : null}

        {/* Results list */}
        {allItems.length > 0 ? (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32, gap: 8 }}>
            {allItems.map((item) => {
              const coverUrl = normalizeCoverUrl(item.volumeInfo.imageLinks?.thumbnail);
              const author = item.volumeInfo.authors?.[0] ?? null;
              const isbn = extractIsbn(item.volumeInfo.industryIdentifiers);
              const year = item.volumeInfo.publishedDate?.substring(0, 4) ?? null;

              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => {
                    const queryParts: string[] = [
                      `source=search`,
                      `googleBooksId=${encodeURIComponent(item.id)}`,
                      `title=${encodeURIComponent(item.volumeInfo.title)}`,
                    ];
                    if (author) queryParts.push(`author=${encodeURIComponent(author)}`);
                    if (coverUrl) queryParts.push(`coverUrl=${encodeURIComponent(coverUrl)}`);
                    if (isbn) queryParts.push(`isbn=${encodeURIComponent(isbn)}`);
                    if (year) queryParts.push(`year=${encodeURIComponent(year)}`);
                    if (item.volumeInfo.description) {
                      queryParts.push(`description=${encodeURIComponent(item.volumeInfo.description.substring(0, 500))}`);
                    }
                    router.push(`/(app)/books/detail?${queryParts.join('&')}` as never);
                  }}
                  accessibilityRole="button"
                  activeOpacity={0.85}
                >
                  <YStack
                    backgroundColor="$backgroundStrong"
                    borderRadius={16}
                    shadowColor="rgba(0,0,0,0.06)"
                    shadowOffset={{ width: 0, height: 2 }}
                    shadowRadius={12}
                    elevation={2}
                  >
                    <XStack padding="$md" gap="$md" alignItems="flex-start">
                      {/* Cover image */}
                      <YStack
                        width={72}
                        height={108}
                        borderRadius={8}
                        overflow="hidden"
                        backgroundColor="$borderColor"
                      >
                        {coverUrl ? (
                          <Image
                            source={{ uri: coverUrl }}
                            width={72}
                            height={108}
                            resizeMode="cover"
                            accessibilityLabel={isClient ? t('cover_alt', { title: item.volumeInfo.title }) : item.volumeInfo.title}
                          />
                        ) : (
                          <YStack flex={1} alignItems="center" justifyContent="center">
                            <Feather name="book" size={24} color="#E0DDD6" />
                          </YStack>
                        )}
                      </YStack>

                      {/* Info */}
                      <YStack flex={1} gap="$xs">
                        <Text fontFamily="$heading" fontSize={18} color="$color" numberOfLines={2} lineHeight={22}>
                          {item.volumeInfo.title}
                        </Text>
                        {author && (
                          <Text fontSize={13} color="$colorSecondary" numberOfLines={1}>
                            {author}
                          </Text>
                        )}
                        {year && (
                          <Text fontSize={12} color="$colorSecondary">
                            {isClient ? t('detail_published', { year }) : year}
                          </Text>
                        )}
                      </YStack>
                    </XStack>
                  </YStack>
                </TouchableOpacity>
              );
            })}

            {/* Load more */}
            {hasNextPage && (
              <YStack paddingTop="$md">
                <TouchableOpacity
                  onPress={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  accessibilityRole="button"
                  style={{
                    height: 52,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: '#0D0D0D',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isFetchingNextPage ? (
                    <ActivityIndicator color="#0D0D0D" />
                  ) : (
                    <Text fontSize={15} fontWeight="600" color="$color">
                      {isClient ? t('search_load_more') : 'Load more'}
                    </Text>
                  )}
                </TouchableOpacity>
              </YStack>
            )}
          </ScrollView>
        ) : null}
      </YStack>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0D0D0D',
    fontFamily: 'IBMPlexSans_400Regular',
  },
});
