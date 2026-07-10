# Brief Mobile — J4 (Rattachement) & J5 (Traçage)

Pour la dev de l'app **React Native** UMi. Objectif : rattacher un patient à son psy via un **code à 4 chiffres**, et remonter les **exercices faits**.

## Contexte (rien à faire côté base)
- Même projet Supabase que le portail. Les **fonctions RPC sont déjà déployées** (migrations 0001 + 0003) : `redeem_seat_code`, `release_my_seat`, `record_completion`.
- L'app utilise déjà `@supabase/supabase-js` (auth + journaling) : on réutilise le **même client**.
- Le patient doit être **connecté** (compte email + mot de passe déjà géré par l'app) **avant** de saisir le code.
- Règles complètes : voir `PRD_Portail_Psy_UMi.md` (RG-5 à RG-14).

---

## J4 — Rattachement (code du psy)

### 1) Gate d'accès : au lancement de l'app et après connexion
Le patient n'accède aux exercices **que s'il a un siège actif**. Sinon, on affiche l'écran « code ».
```ts
const { data: seat } = await supabase
  .from('patient_seats')
  .select('id, practitioner_id, status, redeemed_at')
  .eq('status', 'active')
  .maybeSingle();          // RLS : le patient ne voit que SON siège

const hasAccess = !!seat;  // false -> écran "saisir le code", exercices bloqués
```

### 2) Écran « Code de ton psy » : PIN à **4 chiffres** (4 grosses cases)
- Un champ de type OTP/PIN : **4 cases**, clavier numérique, chiffres uniquement.
- Quand les 4 chiffres sont saisis, appeler la RPC (elle ne garde que les chiffres, donc envoyer « 1234 » ou même « 12 34 » fonctionne) :
```ts
const { data, error } = await supabase.rpc('redeem_seat_code', { p_code: code }); // code = "1234"
if (error) {
  // error.message : 'invalid_code' | 'code_expired' | 'too_many_attempts' | 'not_authenticated'
  // -> afficher le message correspondant (voir tableau)
} else {
  // succès -> siège actif -> débloquer l'app (afficher les exercices)
}
```

### 3) Changer de psy / se délier (dans les réglages de l'app)
- **Changer** : saisir un nouveau code -> `redeem_seat_code` (l'ancien siège est **libéré automatiquement**, bascule).
- **Se délier** : `await supabase.rpc('release_my_seat')` (erreur possible : `no_active_seat`). Après ça, plus de siège actif -> retour à l'écran « code ».

### Messages d'erreur (à traduire dans l'app)
| message technique | à afficher au patient |
|---|---|
| `invalid_code` | Code incorrect (inconnu ou déjà utilisé). Vérifie-le avec ton psy. |
| `code_expired` | Ce code a expiré. Demande-en un nouveau à ton psy. |
| `too_many_attempts` | Trop d'essais. Réessaie dans quelques minutes. |
| `not_authenticated` | (rediriger vers l'écran de connexion) |

> ⚠️ Sécurité : le code fait 4 chiffres (10 000 combinaisons). Verrouillage **progressif** côté base : 3 essais libres, puis **1 min**, puis **5 min** à chaque échec suivant (remis à zéro après un succès ou 30 min sans essai). Afficher un message d'attente simple ; l'erreur `too_many_attempts` signifie « réessaie plus tard ».

**Critère J4 validé** : un patient s'inscrit, saisit le code à 4 chiffres, obtient un siège actif, accède aux exercices.

---

## J5 — Traçage « exercice fait »

Quand le patient **termine un exercice**, appeler :
```ts
const { error } = await supabase.rpc('record_completion', { p_exercise_id: exerciseId });
// exerciseId = id (bigint) de la table `exercises`
// erreur possible : 'no_active_seat' (patient non rattaché)
```
- **Aucun contenu** envoyé (ni réponses au chat IA, ni texte) : uniquement l'événement « fait ».
- C'est ce qui alimente le suivi côté psy (J6).

**Critère J5 validé** : terminer un exercice crée une ligne dans `exercise_completions`.

---

## Points d'attention
- Le rattachement se fait par le **code**, pas par l'email : l'email d'inscription du patient peut différer de celui de l'invitation.
- Le chat de contextualisation IA reste **éphémère (RAM)**, jamais persisté (déjà le cas aujourd'hui).
- La RLS a été activée sur `exercises` avec une **lecture publique** (migration 0002) : vérifier que l'app **liste toujours les exercices** (ça doit fonctionner sans changement).
- Ordre d'onboarding : inscription/connexion Supabase -> écran « code » (4 cases) -> `redeem_seat_code` -> accès.

## Test bout-en-bout (avec le portail)
1. **Portail** : créer une invitation -> récupérer le **code à 4 chiffres** affiché.
2. **App** : inscrire un patient -> écran « code » -> saisir les 4 chiffres -> siège actif -> accès débloqué.
3. **App** : faire un exercice -> `record_completion`.
4. **Portail (J6)** : le patient et ses exercices faits apparaissent dans la patientèle.

## Effort estimé
Base de données : **0** (déjà fait). App : ~1 écran PIN 4 cases + 1 gate d'accès + 1 appel `record_completion` sur la fin d'exercice (+ option changer/retirer le code). Quelques heures pour qui connaît l'app.
