import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { FEATURE_KEYS, type FeatureKey } from '@/lib/feature-definitions';
import { setBillingFeatureEntitlement } from '@/lib/features';

export async function applyBillingState(input: {
  userId: string;
  provider: string;
  eventId: string;
  eventType: string;
  planCode: string;
  billingStatus: 'beta' | 'trialing' | 'active' | 'past_due' | 'cancelled';
  enabledAddons?: FeatureKey[];
  externalCustomerId?: string | null;
  externalSubscriptionId?: string | null;
  externalPriceId?: string | null;
  cancelAtPeriodEnd?: boolean;
  payload?: Record<string, unknown>;
}) {
  const admin = createAdminClient();

  const { data: existingEvent, error: existingError } = await admin
    .from('billing_webhook_events')
    .select('id, processed_at')
    .eq('provider', input.provider)
    .eq('external_event_id', input.eventId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existingEvent?.processed_at) {
    return { duplicated: true };
  }

  const { error: eventError } = await admin
    .from('billing_webhook_events')
    .upsert(
      {
        provider: input.provider,
        external_event_id: input.eventId,
        event_type: input.eventType,
        payload: input.payload ?? null,
        processing_error: null,
      },
      { onConflict: 'provider,external_event_id' },
    );

  if (eventError) throw new Error(eventError.message);

  try {
    const { error: planError } = await admin.rpc('apply_plan_to_account', {
      p_user_id: input.userId,
      p_plan_code: input.planCode,
      p_billing_status: input.billingStatus,
    });

    if (planError) throw new Error(planError.message);

    const { error: accountError } = await admin
      .from('billing_accounts')
      .upsert(
        {
          user_id: input.userId,
          provider: input.provider,
          external_customer_id: input.externalCustomerId ?? null,
          external_subscription_id: input.externalSubscriptionId ?? null,
          external_price_id: input.externalPriceId ?? null,
          status: input.billingStatus,
          cancel_at_period_end: Boolean(input.cancelAtPeriodEnd),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );

    if (accountError) throw new Error(accountError.message);

    const addons = new Set(input.enabledAddons ?? []);
    for (const featureKey of FEATURE_KEYS) {
      await setBillingFeatureEntitlement(
        input.userId,
        featureKey,
        addons.has(featureKey) ? true : null,
      );
    }

    const { error: processedError } = await admin
      .from('billing_webhook_events')
      .update({
        processed_at: new Date().toISOString(),
        processing_error: null,
      })
      .eq('provider', input.provider)
      .eq('external_event_id', input.eventId);

    if (processedError) throw new Error(processedError.message);

    return { duplicated: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'billing_processing_failed';
    await admin
      .from('billing_webhook_events')
      .update({ processing_error: message })
      .eq('provider', input.provider)
      .eq('external_event_id', input.eventId);

    throw error;
  }
}
