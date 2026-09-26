import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  WORKING_EXERCISES,
  ONBOARDING_QUESTIONS_FALLBACK,
  ONBOARDING_OPTIONS_FALLBACK,
  type WorkingExercise,
} from '@/lib/onboarding-data';
import type {
  OnboardingOption,
  OnboardingQuestion,
} from '@/lib/types';

/**
 * Normalises a string for matching exercise titles regardless of accents/case.
 */
function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Returns the list of the 4 working exercises, matching database IDs where possible.
 * Cached via unstable_cache so subsequent calls take 0ms.
 */
export const getCachedWorkingExercises = unstable_cache(
  async (): Promise<WorkingExercise[]> => {
    try {
      const supabase = createClient();
      const { data: dbExercises, error } = await supabase
        .from('exercises')
        .select('id, titre, titre_en, description_courte, duree_moyenne, effort_cognitif');

      if (error || !dbExercises || dbExercises.length === 0) {
        return WORKING_EXERCISES;
      }

      // Match each of the 4 functional exercises to a database record
      return WORKING_EXERCISES.map((workEx) => {
        const workNorm = normalizeTitle(workEx.titre ?? '');
        const matched = dbExercises.find((dbEx) => {
          const dbNorm = normalizeTitle(dbEx.titre ?? '');
          return dbNorm.includes(workNorm) || workNorm.includes(dbNorm);
        });

        if (matched) {
          return {
            ...workEx,
            id: matched.id,
            titre: matched.titre || workEx.titre,
            titre_en: matched.titre_en || workEx.titre_en,
            description_courte: matched.description_courte || workEx.description_courte,
            duree_moyenne: matched.duree_moyenne || workEx.duree_moyenne,
            effort_cognitif: matched.effort_cognitif || workEx.effort_cognitif,
          };
        }
        return workEx;
      });
    } catch {
      return WORKING_EXERCISES;
    }
  },
  ['working-exercises-v1'],
  { revalidate: 3600, tags: ['exercises'] },
);

/**
 * Fetches onboarding questions and options for the psychologist's suggestions.
 * Suggestable options only (filters out patient-only escape hatches).
 */
export const getCachedOnboardingCatalog = unstable_cache(
  async (): Promise<{
    questions: OnboardingQuestion[];
    options: OnboardingOption[];
  }> => {
    try {
      const supabase = createClient();
      const [{ data: dbQuestions }, { data: dbOptions }] = await Promise.all([
        supabase
          .from('onboarding_questions')
          .select('*')
          .order('display_order', { ascending: true }),
        supabase
          .from('onboarding_options')
          .select('*')
          .eq('suggestable', true)
          .order('display_order', { ascending: true }),
      ]);

      const questions = (dbQuestions && dbQuestions.length > 0)
        ? (dbQuestions as OnboardingQuestion[])
        : ONBOARDING_QUESTIONS_FALLBACK;

      const options = (dbOptions && dbOptions.length > 0)
        ? (dbOptions as OnboardingOption[])
        : ONBOARDING_OPTIONS_FALLBACK.filter((o) => o.suggestable);

      return { questions, options };
    } catch {
      return {
        questions: ONBOARDING_QUESTIONS_FALLBACK,
        options: ONBOARDING_OPTIONS_FALLBACK.filter((o) => o.suggestable),
      };
    }
  },
  ['onboarding-catalog-v1'],
  { revalidate: 3600, tags: ['onboarding-catalog'] },
);
