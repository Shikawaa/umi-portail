// Maps Supabase / PostgREST / RPC errors to i18n keys under the `errors`
// namespace (PRD Annexe C + operation errors §11). Callers render the message
// with `t('errors.<key>')`.

export type AppErrorKey =
  | 'notPractitioner'
  | 'notOwner'
  | 'seatNotInvited'
  | 'seatNotActiveOrInvited'
  | 'seatNotDeletable'
  | 'alreadyRecommended'
  | 'codeGenerationFailed'
  | 'invalidCredentials'
  | 'emailNotConfirmed'
  | 'userAlreadyExists'
  | 'weakPassword'
  | 'rateLimited'
  | 'generic';

interface SupabaseLikeError {
  message?: string;
  code?: string;
  status?: number;
  name?: string;
}

export function mapSupabaseError(error: unknown): AppErrorKey {
  const e = (error ?? {}) as SupabaseLikeError;
  const msg = (e.message ?? '').toLowerCase();
  const code = (e.code ?? '').toLowerCase();

  // Business RPC exceptions (the raised text is surfaced in `message`).
  if (msg.includes('not_practitioner')) return 'notPractitioner';
  if (msg.includes('not_owner')) return 'notOwner';
  if (msg.includes('seat_not_active_or_invited')) return 'seatNotActiveOrInvited';
  if (msg.includes('seat_not_deletable')) return 'seatNotDeletable';
  if (msg.includes('seat_not_invited')) return 'seatNotInvited';
  if (msg.includes('code_generation_failed')) return 'codeGenerationFailed';

  // Supabase Auth.
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
    return 'invalidCredentials';
  }
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
    return 'emailNotConfirmed';
  }
  if (
    code === 'user_already_exists' ||
    msg.includes('already registered') ||
    msg.includes('already been registered')
  ) {
    return 'userAlreadyExists';
  }
  if (code === 'weak_password' || msg.includes('password should be')) {
    return 'weakPassword';
  }
  if (
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    e.status === 429 ||
    msg.includes('rate limit')
  ) {
    return 'rateLimited';
  }

  return 'generic';
}
