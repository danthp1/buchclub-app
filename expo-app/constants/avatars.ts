import type { ImageSourcePropType } from 'react-native';

// Static require map — Metro resolves these at bundle time.
// Dynamic require('../assets/avatars/avatar-' + n + '.png') is NOT supported by Metro.
export const AVATAR_SOURCES: Record<string, ImageSourcePropType> = {
  'preset:01': require('../assets/avatars/avatar-01.png'),
  'preset:02': require('../assets/avatars/avatar-02.png'),
  'preset:03': require('../assets/avatars/avatar-03.png'),
  'preset:04': require('../assets/avatars/avatar-04.png'),
  'preset:05': require('../assets/avatars/avatar-05.png'),
  'preset:06': require('../assets/avatars/avatar-06.png'),
  'preset:07': require('../assets/avatars/avatar-07.png'),
  'preset:08': require('../assets/avatars/avatar-08.png'),
};

export const AVATAR_KEYS = Object.keys(AVATAR_SOURCES);

// Default key used when a user has no avatar set
export const AVATAR_DEFAULT_KEY = 'preset:01';
