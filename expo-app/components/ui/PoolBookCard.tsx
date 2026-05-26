import { YStack, XStack, Text, Image } from 'tamagui';
import { TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export type PoolBook = {
  id: string;
  vote_count: number;
  books: {
    title: string;
    author: string | null;
    cover_url: string | null;
    isbn: string | null;
  } | null;
};

export type PoolBookCardProps = {
  poolBook: PoolBook;
  hasVoted: boolean;
  isAdmin: boolean;
  onVote: (poolBook: PoolBook) => void;
  onAdminDelete?: (poolBook: PoolBook) => void;
};

function getCoverUrl(coverUrl: string | null, isbn: string | null): string | undefined {
  if (coverUrl) return coverUrl;
  if (isbn) return `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
  return undefined;
}

export function PoolBookCard({
  poolBook,
  hasVoted,
  isAdmin,
  onVote,
  onAdminDelete,
}: PoolBookCardProps) {
  const { t } = useTranslation('pool');
  const book = poolBook.books;
  const coverUri = getCoverUrl(book?.cover_url ?? null, book?.isbn ?? null);

  return (
    <TouchableOpacity
      onLongPress={isAdmin && onAdminDelete ? () => onAdminDelete(poolBook) : undefined}
      accessibilityRole="none"
      accessibilityHint={isAdmin ? t('admin_remove_hint') : undefined}
      activeOpacity={1}
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
        <XStack padding="$md" gap="$md" alignItems="center">
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
                accessibilityLabel={book?.title ?? ''}
              />
            ) : (
              <YStack
                flex={1}
                alignItems="center"
                justifyContent="center"
                backgroundColor="$borderColor"
              >
                <Feather name="book-open" size={28} color="#E0DDD6" />
              </YStack>
            )}
          </YStack>

          {/* Book metadata */}
          <YStack flex={1} gap="$xs">
            <Text
              fontFamily="$heading"
              fontSize={18}
              color="$color"
              numberOfLines={2}
              lineHeight={22}
            >
              {book?.title ?? ''}
            </Text>
            {book?.author && (
              <Text fontSize={13} color="$colorSecondary" numberOfLines={1}>
                {book.author}
              </Text>
            )}
          </YStack>

          {/* Vote column */}
          <YStack alignItems="center" gap={4}>
            <TouchableOpacity
              onPress={() => onVote(poolBook)}
              accessibilityRole="button"
              accessibilityLabel={hasVoted ? t('remove_vote') : t('upvote')}
              accessibilityState={{ checked: hasVoted }}
            >
              <YStack
                width={40}
                height={40}
                borderRadius={12}
                backgroundColor={hasVoted ? '#E85D1F' : '$backgroundStrong'}
                borderWidth={1.5}
                borderColor={hasVoted ? '#E85D1F' : '$borderColor'}
                alignItems="center"
                justifyContent="center"
                // @ts-expect-error Tamagui 2.x animation prop requires config registration
                animation="fast"
                pressStyle={{ opacity: 0.8 }}
              >
                <Feather
                  name="chevron-up"
                  size={18}
                  color={hasVoted ? 'white' : '#6B6B63'}
                />
              </YStack>
            </TouchableOpacity>
            <Text
              fontFamily="$body"
              fontSize={15}
              fontWeight="600"
              color="$color"
            >
              {poolBook.vote_count}
            </Text>
          </YStack>
        </XStack>
      </YStack>
    </TouchableOpacity>
  );
}
