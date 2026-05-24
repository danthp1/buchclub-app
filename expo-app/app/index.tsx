import { useEffect, useState } from 'react';
import { YStack, Text, Spinner } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { useDidFinishSSR } from '@tamagui/use-did-finish-ssr';
import { supabase } from '../lib/supabase';

export default function SmokeScreen() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [detail, setDetail] = useState<string>('');
  const { t, i18n } = useTranslation(['common', 'nav']);
  const isClient = useDidFinishSSR();

  useEffect(() => {
    supabase.from('clubs')
      .select('id', { count: 'exact', head: true })
      .then(({ error, count }) => {
        if (error && error.code !== 'PGRST116') {
          setStatus('error');
          setDetail(error.message);
        } else {
          setStatus('ok');
          setDetail(`Supabase reachable. Visible clubs: ${count ?? 0}`);
        }
      });
  }, []);

  // SSR-safe: server renders English fallbacks; client hydrates with detected locale.
  const loadingLabel = isClient ? t('common:loading') : 'Loading…';
  const booksLabel = isClient ? t('nav:books') : 'Books';

  return (
    <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center" padding="$lg" gap="$md">
      <Text fontSize={28} fontWeight="600" color="$color">Buchclub</Text>
      <Text fontSize={14} color="$colorSecondary">Walking Skeleton</Text>
      {status === 'loading' && (
        <YStack gap="$xs" alignItems="center">
          <Spinner color="$accent" />
          <Text fontSize={14} color="$colorSecondary">{loadingLabel}</Text>
        </YStack>
      )}
      {status === 'ok' && (
        <YStack gap="$xs" alignItems="center">
          <Text fontSize={16} color="$success">✓ {detail}</Text>
          <Text fontSize={14} color="$colorSecondary">
            i18n active: {isClient ? i18n.language : 'en'} — {booksLabel}
          </Text>
          <Text fontSize={14} color="$colorSecondary">Tamagui tokens + Supabase + i18n OK</Text>
        </YStack>
      )}
      {status === 'error' && (
        <Text fontSize={14} color="$destructive">✗ {detail}</Text>
      )}
    </YStack>
  );
}
