-- ============================================================================
-- Migration 0005 - Portail Psy UMi : durcissement search_path (advisor Supabase)
-- Fige le search_path des 2 fonctions internes non security-definer restantes.
-- Severite FAIBLE : ces fonctions s'executent avec les droits de l'appelant
-- (RLS s'applique), mais l'advisor `function_search_path_mutable` les signale.
-- ALTER FUNCTION ne modifie que la config, PAS le corps : aucun risque logique.
-- Appliquer via Studio > SQL Editor. Idempotent. Rollback en bas.
-- Prerequis : migrations 0001 a 0004 appliquees.
-- ============================================================================

alter function public.set_updated_at()  set search_path = public;
alter function public.gen_invite_code() set search_path = public;

-- ============================================================================
-- ROLLBACK (manuel) - retire le search_path fige (revient au comportement par defaut)
-- alter function public.set_updated_at()  reset search_path;
-- alter function public.gen_invite_code() reset search_path;
-- ============================================================================
