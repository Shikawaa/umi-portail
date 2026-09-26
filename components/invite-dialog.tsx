'use client';

import { useState, useTransition, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Link as LinkIcon,
  Mail,
  RotateCcw,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { ExerciseCarousel } from '@/components/exercise-carousel';
import { QuestionnaireSuggestions } from '@/components/questionnaire-suggestions';
import { createInvitation, type CreateInvitationData } from '@/actions/invitations';
import { sendInviteEmail } from '@/actions/email';
import { fetchWorkingExercises } from '@/actions/exercises';
import { WORKING_EXERCISES, type WorkingExercise } from '@/lib/onboarding-data';
import { formatDate } from '@/lib/format';
import type { AppErrorKey } from '@/lib/errors';

export function InviteDialog({ trigger }: { trigger: React.ReactNode }) {
  const t = useTranslations('invite');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const locale = useLocale();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Seat Info
  const [label, setLabel] = useState('');
  const [email, setEmail] = useState('');
  const [sendEmail, setSendEmail] = useState(false);

  // Step 2: Onboarding Personalization
  const [exercises, setExercises] = useState<WorkingExercise[]>(WORKING_EXERCISES);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(1); // Default to Cercles de contrôle
  const [personalNote, setPersonalNote] = useState('');
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});

  // Result & Pending State
  const [result, setResult] = useState<CreateInvitationData | null>(null);
  const [error, setError] = useState<AppErrorKey | null>(null);
  const [pending, startTransition] = useTransition();
  const [resendingEmail, startResendEmail] = useTransition();
  const [emailStatus, setEmailStatus] = useState<'sent' | 'failed' | 'skipped'>('skipped');

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Fetch updated exercises if available
  useEffect(() => {
    if (open) {
      fetchWorkingExercises().then((list) => {
        if (list && list.length > 0) {
          setExercises(list);
          if (!selectedExerciseId) {
            setSelectedExerciseId(list[0].id);
          }
        }
      });
    }
  }, [open, selectedExerciseId]);

  function reset() {
    setStep(1);
    setLabel('');
    setEmail('');
    setSendEmail(false);
    setSelectedExerciseId(1);
    setPersonalNote('');
    setSuggestions({});
    setResult(null);
    setError(null);
    setEmailStatus('skipped');
    setCopiedCode(false);
    setCopiedLink(false);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setTimeout(reset, 200);
    }
  }

  function handleGoToStep2(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    if (sendEmail && !email.trim()) return;
    setStep(2);
  }

  function handleFinalSubmit() {
    if (!label.trim() || !selectedExerciseId) return;

    setError(null);
    startTransition(async () => {
      const res = await createInvitation({
        label,
        email: email || undefined,
        sendEmail: sendEmail && !!email,
        firstExerciseId: selectedExerciseId,
        personalNote: personalNote || undefined,
        suggestions,
      });

      if (!res.ok) {
        setError(res.error);
        return;
      }

      setResult(res.data);
      setEmailStatus(res.data.emailStatus);

      if (res.data.emailStatus === 'failed') {
        toast.error(t('success.emailFailed'));
      } else if (res.data.emailStatus === 'sent') {
        toast.success(t('success.emailSent', { email }));
      }
    });
  }

  function handleResendEmail() {
    if (!result || !email) return;
    startResendEmail(async () => {
      const status = await sendInviteEmail({
        to: email,
        code: result.seat.invite_code,
        expiresAt: result.seat.expires_at,
        locale,
        link: result.joinUrl,
      });
      setEmailStatus(status);
      if (status === 'sent') {
        toast.success('Email envoyé avec succès.');
      } else {
        toast.error("Impossible d'envoyer l'email pour le moment.");
      }
    });
  }

  function copyCode() {
    if (!result?.seat.invite_code) return;
    navigator.clipboard.writeText(result.seat.invite_code);
    setCopiedCode(true);
    toast.success('Code copié dans le presse-papiers');
    setTimeout(() => setCopiedCode(false), 2000);
  }

  function copyLink() {
    if (!result?.joinUrl) return;
    navigator.clipboard.writeText(result.joinUrl);
    setCopiedLink(true);
    toast.success('Lien d’invitation copié');
    setTimeout(() => setCopiedLink(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        closeLabel={tCommon('close')}
        className="sm:max-w-4xl w-full flex flex-col p-6 sm:p-8 overflow-hidden max-h-[94vh] sm:max-h-[90vh] gap-0 shadow-2xl"
      >
        {result ? (
          /* Écran de Succès post-création */
          <div className="flex flex-col h-full min-h-0">
            <DialogHeader className="text-center sm:text-center pb-5 shrink-0">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                <Check className="h-6 w-6 stroke-[2.5]" />
              </div>
              <DialogTitle className="text-2xl font-bold">Le siège a été créé avec succès</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Votre patient peut scanner le QR code ou saisir son code à 4 chiffres dans l&apos;application UMi.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-5 py-2 px-1">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 p-6 rounded-2xl border border-border bg-muted/20">
                {/* QR Code SVG */}
                <div className="p-4 bg-white rounded-2xl shadow-xs border border-gray-200 shrink-0">
                  <QRCodeSVG
                    value={result.joinUrl}
                    size={170}
                    level="M"
                    includeMargin={false}
                  />
                </div>

                {/* Code PIN & Boutons de copie rapide */}
                <div className="space-y-4 text-center sm:text-left flex-1 min-w-0">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Code de liaison patient
                    </span>
                    <div className="inline-block px-5 py-2.5 rounded-xl bg-primary/10 border border-primary/25 text-3xl font-mono font-bold tracking-widest text-primary">
                      {result.seat.invite_code}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2.5 justify-center sm:justify-start">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={copyCode}
                      className="gap-2 text-xs sm:text-sm h-9 px-3.5"
                    >
                      {copiedCode ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                      {copiedCode ? 'Code copié !' : 'Copier le code'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={copyLink}
                      className="gap-2 text-xs sm:text-sm h-9 px-3.5"
                    >
                      {copiedLink ? <Check className="h-4 w-4 text-primary" /> : <LinkIcon className="h-4 w-4" />}
                      {copiedLink ? 'Lien copié !' : 'Copier le lien'}
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {t('success.expiresOn', {
                      date: formatDate(result.seat.expires_at, locale) ?? '',
                    })}
                  </p>
                </div>
              </div>

              {/* État d'envoi de l'email */}
              {email ? (
                <div className="rounded-xl border border-border p-4 bg-background flex items-center justify-between gap-4 text-sm">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0 text-primary" />
                    {emailStatus === 'sent' ? (
                      <span>Email d&apos;invitation envoyé à <strong className="text-foreground">{email}</strong></span>
                    ) : emailStatus === 'failed' ? (
                      <span className="text-destructive font-medium">L&apos;envoi de l&apos;email à {email} a échoué</span>
                    ) : (
                      <span>Invitation préparée pour <strong className="text-foreground">{email}</strong></span>
                    )}
                  </div>
                  {emailStatus === 'failed' ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResendEmail}
                      disabled={resendingEmail}
                      className="h-8 text-xs gap-1.5"
                    >
                      {resendingEmail ? <Spinner /> : <RotateCcw className="h-3.5 w-3.5" />}
                      Réessayer
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <DialogFooter className="pt-4 border-t border-border shrink-0 flex-col sm:flex-row gap-2.5">
              <Button variant="outline" onClick={reset} className="w-full sm:w-auto h-10 px-4 text-sm">
                Inviter un autre patient
              </Button>
              <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto h-10 px-5 text-sm">
                {tCommon('close')}
              </Button>
            </DialogFooter>
          </div>
        ) : step === 1 ? (
          /* Étape 1 sur 2 : Informations du Siège */
          <form onSubmit={handleGoToStep2} className="flex flex-col h-full min-h-0">
            <DialogHeader className="pb-4 shrink-0">
              <div className="flex items-center justify-between pr-6">
                <DialogTitle className="text-xl font-bold">{t('title')}</DialogTitle>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent text-accent-foreground">
                  Étape 1 sur 2
                </span>
              </div>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                {t('description')}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto min-h-0 py-3 px-1.5 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="invite-label" className="text-sm font-semibold text-foreground">
                  Libellé du siège <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="invite-label"
                  placeholder="Ex. M. D., Patient #4"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  autoFocus
                  required
                  className="h-11 text-sm"
                />
                <p className="text-xs text-muted-foreground">{t('labelHint')}</p>
              </div>

              <div className="space-y-3.5 pt-4 border-t border-border">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="invite-send"
                    className="mt-0.5"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor="invite-send" className="text-sm font-medium text-foreground cursor-pointer">
                      Envoyer l&apos;invitation par e-mail
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Le patient recevra un lien direct avec le code pour installer l&apos;app et se relier.
                    </p>
                  </div>
                </div>

                {sendEmail ? (
                  <div className="space-y-1.5 pl-7 pt-1">
                    <Label htmlFor="invite-email" className="text-xs font-semibold text-foreground">E-mail du patient</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="patient@exemple.fr"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required={sendEmail}
                      autoFocus
                      className="h-10.5 text-sm"
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border shrink-0">
              <Button
                type="submit"
                disabled={!label.trim() || (sendEmail && !email.trim())}
                className="w-full sm:w-auto h-10 px-5 text-sm gap-2"
              >
                <span>Suivant : Personnaliser l&apos;onboarding</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </form>
        ) : (
          /* Étape 2 sur 2 : Personnalisation Onboarding */
          <div className="flex flex-col h-full min-h-0">
            {/* Header fixe en haut — la croix X ne bouge jamais */}
            <DialogHeader className="pb-4 shrink-0">
              <div className="flex items-center justify-between pr-6">
                <DialogTitle className="text-xl font-bold">Personnaliser l&apos;onboarding</DialogTitle>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent text-accent-foreground">
                  Étape 2 sur 2
                </span>
              </div>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Sélectionnez le premier exercice, ajoutez un mot d&apos;accueil et suggérez des réponses au questionnaire.
              </DialogDescription>
            </DialogHeader>

            {/* Corps du formulaire : le seul qui peut défiler */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-1.5 py-1.5 space-y-6">
              {/* 1. Premier exercice obligatoire (Carrousel horizontal Instagram-like) */}
              <ExerciseCarousel
                exercises={exercises}
                selectedId={selectedExerciseId}
                onSelect={(id) => setSelectedExerciseId(id)}
              />

              {/* 2. Mot personnel facultatif */}
              <div className="space-y-2">
                <Label htmlFor="personal-note" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Mot personnel pour votre patient{' '}
                  <span className="text-xs font-normal text-muted-foreground">({tCommon('optional')})</span>
                </Label>
                <Textarea
                  id="personal-note"
                  rows={3}
                  className="min-h-[72px] max-h-[110px] text-sm resize-none p-3.5"
                  placeholder="Ex. : Bonjour, je vous propose de commencer par cet exercice d'ici notre prochaine séance..."
                  value={personalNote}
                  onChange={(e) => setPersonalNote(e.target.value)}
                />
              </div>

              {/* 3. Suggestions facultatives pour le questionnaire (Carrousel de 5 colonnes) */}
              <QuestionnaireSuggestions
                values={suggestions}
                onChange={setSuggestions}
              />

              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {tErrors(error)}
                </p>
              ) : null}
            </div>

            {/* Footer fixe en bas — toujours visible */}
            <DialogFooter className="pt-4 border-t border-border shrink-0 flex items-center justify-between sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(1)}
                disabled={pending}
                className="gap-2 text-sm h-10 px-4"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>

              <Button
                type="button"
                onClick={handleFinalSubmit}
                disabled={pending || !selectedExerciseId}
                className="gap-2 text-sm h-10 px-5"
              >
                {pending ? <Spinner /> : <Check className="h-4 w-4" />}
                <span>Créer le siège</span>
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
