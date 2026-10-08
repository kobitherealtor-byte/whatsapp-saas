import 'server-only';

import { timingSafeEqual } from 'crypto';

export function assertAutomationSecret(request: Request) {
  const expected = process.env.AUTOMATION_SHARED_SECRET;
  const supplied = request.headers.get('x-automation-secret');

  if (!expected || !supplied) {
    throw new Error('unauthorized');
  }

  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);

  if (
    expectedBuffer.length !== suppliedBuffer.length ||
    !timingSafeEqual(expectedBuffer, suppliedBuffer)
  ) {
    throw new Error('unauthorized');
  }
}
