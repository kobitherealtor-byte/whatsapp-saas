import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export async function assertUserRateLimit(input: {
  userId: string;
  bucket: string;
  limit: number;
  windowSeconds: number;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('consume_api_rate_limit', {
    p_key: `${input.userId}:${input.bucket}`,
    p_limit: input.limit,
    p_window_seconds: input.windowSeconds,
  });

  if (error) throw new Error(error.message);
  if (data !== true) throw new Error('rate_limited');
}
