'use client';

import { useState, useTransition } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { signUp } from '@/actions/auth';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { ArrowLeft, ArrowRight, Check, GraduationCap, Plus, Trash2, X, Sparkles } from 'lucide-react';
import type { AppErrorKey } from '@/lib/errors';
import type { EducationItem } from '@/lib/types';

export default function SignupPage() {
  const t = useTranslations('signup');
  const tErrors = useTranslations('errors');

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Account credentials
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);

  // Step 2: Professional profile (optional / skippable)
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [languages, setLanguages] = useState<string[]>(['Français']);
  const [newLang, setNewLang] = useState('');
  const [education, setEducation] = useState<EducationItem[]>([
    { title: '', institution: '' },
  ]);

  const [error, setError] = useState<AppErrorKey | null>(null);
  const [pending, startTransition] = useTransition();

  function validateStep1(): boolean {
    setError(null);
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError('required');
      return false;
    }
    if (password.length < 8) {
      setError('weakPassword');
      return false;
    }
    if (!accepted) {
      setTermsError(true);
      return false;
    }
    setTermsError(false);
    return true;
  }

  function handleGoToStep2() {
    if (validateStep1()) {
      setStep(2);
    }
  }

  function addLanguage() {
    const trimmed = newLang.trim();
    if (!trimmed) return;
    if (!languages.includes(trimmed)) {
      setLanguages([...languages, trimmed]);
    }
    setNewLang('');
  }

  function removeLanguage(lang: string) {
    setLanguages(languages.filter((l) => l !== lang));
  }

  function addEducation() {
    setEducation([...education, { title: '', institution: '' }]);
  }

  function updateEducation(index: number, field: 'title' | 'institution', value: string) {
    const updated = [...education];
    updated[index] = { ...updated[index], [field]: value };
    setEducation(updated);
  }

  function removeEducation(index: number) {
    if (education.length === 1) {
      setEducation([{ title: '', institution: '' }]);
      return;
    }
    setEducation(education.filter((_, i) => i !== index));
  }

  function submitSignup(withProfileDetails = true) {
    if (!validateStep1()) return;

    startTransition(async () => {
      const filteredEdu = withProfileDetails
        ? education.filter((e) => e.title.trim() || e.institution.trim())
        : [];

      const res = await signUp({
        email,
        password,
        firstName,
        lastName,
        city: withProfileDetails ? city : undefined,
        description: withProfileDetails ? description : undefined,
        languages: withProfileDetails ? languages : undefined,
        education: filteredEdu,
      });

      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <Card className="max-w-xl mx-auto shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {step === 1 ? t('title') : 'Compléter mon profil praticien'}
          </CardTitle>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
            Étape {step} sur 2
          </span>
        </div>
        <CardDescription>
          {step === 1
            ? t('subtitle')
            : 'Ces détails apparaîtront sur votre fiche lors du rattachement patient. Vous pouvez passer cette étape.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 1 ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleGoToStep2();
            }}
            className="space-y-4"
            noValidate
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t('firstNameLabel')}</Label>
                <Input
                  id="firstName"
                  autoComplete="given-name"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Alexandre"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t('lastNameLabel')}</Label>
                <Input
                  id="lastName"
                  autoComplete="family-name"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Andurand"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('emailLabel')}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alexandre@cabinet.fr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('passwordLabel')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t('passwordHint')}</p>
            </div>

            <div className="flex items-start gap-2 pt-1">
              <Checkbox
                id="terms"
                className="mt-0.5"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
              />
              <Label htmlFor="terms" className="text-sm font-normal leading-snug">
                {t('terms')}
              </Label>
            </div>
            {termsError ? (
              <p className="text-sm text-destructive" role="alert">
                {t('termsRequired')}
              </p>
            ) : null}

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {tErrors(error)}
              </p>
            ) : null}

            <div className="space-y-2 pt-2">
              <Button type="submit" className="w-full">
                <span>Personnaliser mon profil</span>
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>

              {/* Bouton de bypass immédiat pour les démos d'Alexandre */}
              <Button
                type="button"
                variant="outline"
                className="w-full text-muted-foreground hover:text-foreground"
                disabled={pending}
                onClick={() => submitSignup(false)}
              >
                {pending ? <Spinner /> : <Sparkles className="h-4 w-4 mr-2 text-primary" />}
                <span>Créer mon compte directement (Passer le profil / Démo)</span>
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-5">
            {/* Step 2 Form */}
            <div className="space-y-2">
              <Label htmlFor="city">Lieu d&apos;exercice</Label>
              <Input
                id="city"
                placeholder="Ex. Paris 11e, Cabinet République ou Téléconsultation"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Présentation / Description</Label>
              <Textarea
                id="description"
                rows={3}
                placeholder="Psychologue clinicien spécialisé en TCC..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Langues parlées</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {languages.map((lang) => (
                  <Badge
                    key={lang}
                    className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 text-sm bg-accent/30 border-border"
                  >
                    <span>{lang}</span>
                    <button
                      type="button"
                      onClick={() => removeLanguage(lang)}
                      className="ml-1 rounded-full p-0.5 hover:bg-muted"
                    >
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Ajouter une langue..."
                  value={newLang}
                  onChange={(e) => setNewLang(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addLanguage();
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={addLanguage}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Formations & Diplômes avec option de skip */}
            <div className="space-y-2.5 rounded-lg border border-border p-3.5 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Diplômes & Formations</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setEducation([{ title: '', institution: '' }])}
                >
                  Passer les diplômes
                </Button>
              </div>
              {education.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="Intitulé (ex. Master 2 TCC)"
                    value={item.title}
                    onChange={(e) => updateEducation(idx, 'title', e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Établissement (ex. Paris)"
                    value={item.institution}
                    onChange={(e) => updateEducation(idx, 'institution', e.target.value)}
                    className="text-sm"
                  />
                  {education.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeEducation(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs h-7 gap-1 text-primary hover:text-primary"
                onClick={addEducation}
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter une formation
              </Button>
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {tErrors(error)}
              </p>
            ) : null}

            <div className="flex flex-col gap-2 pt-2">
              <div className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep(1)}
                  disabled={pending}
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Retour
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => submitSignup(false)}
                    disabled={pending}
                  >
                    Passer cette étape
                  </Button>
                  <Button
                    type="button"
                    onClick={() => submitSignup(true)}
                    disabled={pending}
                  >
                    {pending ? <Spinner /> : <Check className="h-4 w-4 mr-1.5" />}
                    <span>Finaliser mon compte</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('hasAccount')}{' '}
          <Link href="/login" className="text-primary hover:underline">
            {t('loginLink')}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
