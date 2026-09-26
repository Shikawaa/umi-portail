'use server';

import { getCachedWorkingExercises, getCachedOnboardingCatalog } from '@/lib/exercises';

export async function fetchWorkingExercises() {
  return await getCachedWorkingExercises();
}

export async function fetchOnboardingCatalog() {
  return await getCachedOnboardingCatalog();
}
