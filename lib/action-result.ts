import type { AppErrorKey } from '@/lib/errors';

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: AppErrorKey };
