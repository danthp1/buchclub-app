import { YStack, XStack, Text, Image } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { TouchableOpacity } from 'react-native';

export type BookStatus = 'planned' | 'reading' | 'completed';

export type BookCardBook = {
  title: string;
  author: string | null;
  cover_url: string | null;
  isbn: string | null;
};

export type BookCardProps = {
  personalBookId: string;
  book: BookCardBook;
  status: BookStatus;
  onPress?: () => void;
  onLongPress?: () => void;
};

const STATUS_COLORS: Record<BookStatus, string> = {
  planned: '#1A4FE0',
  reading: '#E85D1F',
  completed: '#2A7A3A',
};

function getCoverUrl(coverUrl: string | null, isbn: string | null): string | undefined {
  if (coverUrl) return coverUrl;
  if (isbn) return `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
  return undefined;
}

export function BookCard({ personalBookId: _personalBookId, book, status, onPress, onLongPress }: BookCardProps) {
  const { t } = useTranslation('books');
  const coverUri = getCoverUrl(book.cover_url, book.isbn);

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={book.title}
      accessibilityHint={t('change_status_heading')}
      activeOpacity={0.9}
    >
      <YStack
        backgroundColor="$backgroundStrong"
        borderRadius={16}
        overflow="hidden"
        shadowColor="rgba(0,0,0,0.06)"
        shadowOffset={{ width: 0, height: 2 }}
        shadowRadius={12}
        elevation={2}
        // @ts-expect-error Tamagui 2.x animation prop requires config registration
        animation="fast"
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
            {coverUri ? (
              <Image
                source={{ uri: coverUri }}
                width={72}
                height={108}
                resizeMode="cover"
                accessibilityLabel={t('cover_alt', { title: book.title })}
              />
            ) : (
              <Image
                source={require('../../assets/illustrations/empty-man.png')}
                width={72}
                height={108}
                resizeMode="cover"
              />
            )}
          </YStack>

          {/* Book info */}
          <YStack flex={1} gap="$xs" minHeight={108} justifyContent="space-between">
            <YStack gap="$xs">
              <Text
                fontFamily="$heading"
                fontSize={18}
                color="$color"
                numberOfLines={2}
                lineHeight={22}
              >
                {book.title}
              </Text>
              {book.author && (
                <Text fontSize={13} color="$colorSecondary" numberOfLines={1}>
                  {book.author}
                </Text>
              )}
            </YStack>

            {/* Status badge */}
            <YStack
              backgroundColor={STATUS_COLORS[status]}
              paddingVertical={4}
              paddingHorizontal={10}
              borderRadius={9999}
              alignSelf="flex-start"
            >
              <Text color="white" fontSize={11} fontWeight="600">
                {t(`status_${status}` as Parameters<typeof t>[0])}
              </Text>
            </YStack>
          </YStack>
        </XStack>
      </YStack>
    </TouchableOpacity>
  );
}
