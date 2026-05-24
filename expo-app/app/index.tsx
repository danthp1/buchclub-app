import { useEffect, useState } from 'react';
import { YStack, Text, Spinner } from 'tamagui';
import { supabase } from '../lib/supabase';

export default function SmokeScreen() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [detail, setDetail] = useState<string>('');

  useEffect(() => {
    // Round-trip a count query against the clubs table.
    // RLS will deny rows for unauthenticated users — that's fine; we only need the request/response cycle to complete.
    supabase
      .from('clubs')
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

  return (
    <YStack flex={1} backgroundColor="$background" alignItems="center" justifyContent="center" padding="$lg" gap="$md">
      <Text fontSize={28} fontWeight="600" color="$color">Buchclub</Text>
      <Text fontSize={14} color="$colorSecondary">Walking Skeleton</Text>
      {status === 'loading' && <Spinner color="$accent" />}
      {status === 'ok' && (
        <YStack gap="$xs" alignItems="center">
          <Text fontSize={16} color="$success">✓ {detail}</Text>
          <Text fontSize={14} color="$colorSecondary">Tamagui tokens + Supabase round-trip OK</Text>
        </YStack>
      )}
      {status === 'error' && (
        <Text fontSize={14} color="$destructive">✗ {detail}</Text>
      )}
    </YStack>
  );
}
