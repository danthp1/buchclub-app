import { XStack, YStack, Text, Image } from 'tamagui';
import { TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AVATAR_SOURCES, AVATAR_DEFAULT_KEY } from '../../constants/avatars';

type MemberRowProps = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: 'admin' | 'member';
  isCurrentUserAdmin: boolean;
  isCurrentUser: boolean;
  isLastItem?: boolean;
  onMorePress?: () => void;
};

export function MemberRow({
  userId: _userId,
  username,
  avatarUrl,
  role,
  isCurrentUserAdmin,
  isCurrentUser,
  isLastItem,
  onMorePress,
}: MemberRowProps) {
  // Resolve avatar: preset key → static asset; null → initials fallback
  const avatarSource =
    avatarUrl && AVATAR_SOURCES[avatarUrl] ? AVATAR_SOURCES[avatarUrl] : null;

  const initials = username.slice(0, 2).toUpperCase();

  return (
    <XStack
      minHeight={56}
      alignItems="center"
      paddingHorizontal="$md"
      gap="$sm"
      backgroundColor="$backgroundStrong"
      borderBottomWidth={isLastItem ? 0 : 1}
      borderBottomColor="$borderColor"
    >
      {/* Avatar: preset image OR initials circle */}
      {avatarSource ? (
        <Image
          source={avatarSource}
          width={36}
          height={36}
          borderRadius={18}
        />
      ) : (
        <YStack
          width={36}
          height={36}
          borderRadius={18}
          backgroundColor="$ink"
          alignItems="center"
          justifyContent="center"
        >
          <Text fontSize={13} fontWeight="600" color="$backgroundPress">
            {initials}
          </Text>
        </YStack>
      )}

      {/* Username + role */}
      <YStack flex={1}>
        <Text fontSize={15} fontWeight="600" color="$color">
          {username}
          {isCurrentUser ? ' (You)' : ''}
        </Text>
        {role === 'admin' && (
          <XStack
            backgroundColor="rgba(26,79,224,0.10)"
            borderRadius={20}
            paddingHorizontal="$sm"
            paddingVertical="$xs"
            alignSelf="flex-start"
            marginTop={4}
          >
            <Text fontSize={12} fontWeight="600" color="$accent">
              Admin
            </Text>
          </XStack>
        )}
      </YStack>

      {/* Admin actions button (shown to admins for non-self members) */}
      {isCurrentUserAdmin && !isCurrentUser && (
        <TouchableOpacity
          onPress={onMorePress}
          accessibilityRole="button"
          accessibilityLabel="More options"
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Feather name="more-vertical" size={20} color="#6B6B63" />
        </TouchableOpacity>
      )}
    </XStack>
  );
}
