import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export async function writeAuditEvent(input: {
  userId: string;
  eventType: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from('audit_events').insert({
    user_id: input.userId,
    event_type: input.eventType,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? null,
  });

  if (error) {
    // Audit logging should never break a user action.
    console.error('audit_event_failed', error.message);
  }
}
