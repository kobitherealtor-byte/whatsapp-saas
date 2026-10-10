import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFeatureEntitlements } from '@/lib/features';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const entitlements = await getFeatureEntitlements(user.id);

  return NextResponse.json({
    features: Object.fromEntries(
      Object.entries(entitlements).map(([key, value]) => [key, value.enabled]),
    ),
  });
}
