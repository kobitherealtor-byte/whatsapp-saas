import { NextResponse } from 'next/server';
import { assertAutomationSecret } from '@/lib/automation-auth';
import { getNextAutomationRunAt } from '@/lib/automation-next';

export async function POST(request: Request) {
  try {
    assertAutomationSecret(request);
    const nextRunAt = await getNextAutomationRunAt();
    return NextResponse.json({ nextRunAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    return NextResponse.json(
      { error: message },
      { status: message === 'unauthorized' ? 401 : 500 },
    );
  }
}
