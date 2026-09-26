'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Plus, Trash2, X, GraduationCap, Globe, MapPin, User, FileText, Image } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { LanguageSwitcher } from '@/components/language-switcher';
import { updateProfile, sendMyPasswordReset } from '@/actions/settings';
import type { EducationItem, Practitioner } from '@/lib/types';

export function SettingsView({
  practitioner,
  email,
}: {
  practitioner: Practitioner | null;
  email: string;
}) {
  const t = useTranslations('settings');
  const tErrors = useTranslations('errors');

  const [first, setFirst] = useState(practitioner?.first_name ?? '');
  const [last, setLast] = useState(practitioner?.last_name ?? '');
  const [city, setCity] = useState(practitioner?.city ?? '');
  const [description, setDescription] = useState(practitioner?.description ?? '');
  const [photoUrl, setPhotoUrl] = useState(practitioner?.photo_url ?? '');
  
  const [languages, setLanguages] = useState<string[]>(
    Array.isArray(practitioner?.languages) && practitioner.languages.length > 0
      ? practitioner.languages
      : ['Français'],
  );
  const [newLangInput, setNewLangInput] = useState('');

  const [education, setEducation] = useState<EducationItem[]>(
    Array.isArray(practitioner?.education) && practitioner.education.length > 0
      ? practitioner.education
      : [{ title: '', institution: '' }],
  );

  const [savingProfile, startSaveProfile] = useTransition();
  const [sendingReset, startReset] = useTransition();

  function addLanguage() {
    const trimmed = newLangInput.trim();
    if (!trimmed) return;
    if (!languages.includes(trimmed)) {
      setLanguages([...languages, trimmed]);
    }
    setNewLangInput('');
  }

  function removeLanguage(lang: string) {
    setLanguages(languages.filter((l) => l !== lang));
  }

  function addEducation() {
    setEducation([...education, { title: '', institution: '' }]);
  }

  function updateEducationItem(index: number, field: 'title' | 'institution', value: string) {
    const updated = [...education];
    updated[index] = { ...updated[index], [field]: value };
    setEducation(updated);
  }

  function removeEducationItem(index: number) {
    if (education.length === 1) {
      setEducation([{ title: '', institution: '' }]);
      return;
    }
    setEducation(education.filter((_, i) => i !== index));
  }

  function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    startSaveProfile(async () => {
      const res = await updateProfile({
        firstName: first,
        lastName: last,
        city,
        description,
        languages,
        education: education.filter((e) => e.title.trim() || e.institution.trim()),
        photoUrl,
      });
      if (res.ok) {
        toast.success(t('profile.saved'));
      } else {
        toast.error(tErrors(res.error));
      }
    });
  }

  function onResetPassword() {
    startReset(async () => {
      const res = await sendMyPasswordReset();
      if (res.ok) toast.success(t('account.resetPasswordSent'));
      else toast.error(tErrors(res.error));
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{t('title')}</h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      {/* Profil Praticien & Fiche Patient */}
      <Card className="rounded-2xl border border-border/80 shadow-2xs overflow-hidden">
        <CardHeader className="p-6 pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2.5">
            <User className="h-5 w-5 text-primary" />
            {t('profile.title')}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-1">
            Ces informations sont présentées à vos patients dans l&apos;application UMi lors de leur confirmation de rattachement.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <form onSubmit={onSaveProfile} className="space-y-6">
            {/* Prénom & Nom */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first" className="text-sm font-semibold">{t('profile.firstNameLabel')}</Label>
                <Input
                  id="first"
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                  autoComplete="given-name"
                  required
                  className="h-11 text-sm rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last" className="text-sm font-semibold">{t('profile.lastNameLabel')}</Label>
                <Input
                  id="last"
                  value={last}
                  onChange={(e) => setLast(e.target.value)}
                  autoComplete="family-name"
                  required
                  className="h-11 text-sm rounded-xl"
                />
              </div>
            </div>

            {/* Lieu / Ville */}
            <div className="space-y-2">
              <Label htmlFor="city" className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Lieu d&apos;exercice
              </Label>
              <Input
                id="city"
                placeholder="Ex. Paris 11e, Cabinet République ou Téléconsultation"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-11 text-sm rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                Texte libre indiquant votre ville, quartier ou mode d&apos;exercice.
              </p>
            </div>

            {/* Description / Présentation */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Description / Présentation
              </Label>
              <Textarea
                id="description"
                rows={3}
                placeholder="Présentez votre approche thérapeutique (TCC, accompagnement...), votre parcours..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[85px] text-sm rounded-xl p-3.5"
              />
            </div>

            {/* Langues parlées */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Langues parlées
              </Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {languages.map((lang) => (
                  <Badge
                    key={lang}
                    className="flex items-center gap-1.5 pl-3 pr-2 py-1 text-sm bg-accent/40 border-border rounded-xl font-medium"
                  >
                    <span>{lang}</span>
                    <button
                      type="button"
                      onClick={() => removeLanguage(lang)}
                      className="ml-1 rounded-full p-0.5 hover:bg-muted focus:outline-none"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="sr-only">Retirer {lang}</span>
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Ajouter une langue (ex. Français, Anglais...)"
                  value={newLangInput}
                  onChange={(e) => setNewLangInput(e.target.value)}
                  className="h-11 text-sm rounded-xl"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addLanguage();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addLanguage} className="h-11 px-4 text-sm rounded-xl">
                  <Plus className="h-4 w-4 mr-1.5" />
                  Ajouter
                </Button>
              </div>
            </div>

            {/* Formations & Diplômes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  Diplômes & Formations
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-8 gap-1.5 text-primary hover:text-primary font-semibold"
                  onClick={addEducation}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter une formation
                </Button>
              </div>
              <div className="space-y-3">
                {education.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <Input
                      placeholder="Intitulé (ex. Master 2 Psychologie Clinique & TCC)"
                      value={item.title}
                      onChange={(e) => updateEducationItem(idx, 'title', e.target.value)}
                      className="flex-1 h-11 text-sm rounded-xl"
                    />
                    <Input
                      placeholder="Établissement (ex. Université Paris Cité)"
                      value={item.institution}
                      onChange={(e) => updateEducationItem(idx, 'institution', e.target.value)}
                      className="flex-1 h-11 text-sm rounded-xl"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 rounded-xl text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => removeEducationItem(idx)}
                      title="Supprimer cette formation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Renseignez vos diplômes et certifications pour valoriser votre profil auprès des patients.
              </p>
            </div>

            {/* Photo de profil (facultative) */}
            <div className="space-y-2">
              <Label htmlFor="photoUrl" className="text-sm font-semibold flex items-center gap-2">
                <Image className="h-4 w-4 text-muted-foreground" />
                Photo de profil (URL)
              </Label>
              <Input
                id="photoUrl"
                type="url"
                placeholder="https://..."
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="h-11 text-sm rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                Facultative. Si absente, un avatar de remplacement soigné sera affiché.
              </p>
            </div>

            <Button type="submit" disabled={savingProfile} className="w-full sm:w-auto h-11 px-6 text-sm font-semibold rounded-xl">
              {savingProfile ? <Spinner /> : null}
              {savingProfile ? t('profile.saving') : t('profile.save')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Compte & Sécurité */}
      <Card className="rounded-2xl border border-border/80 shadow-2xs overflow-hidden">
        <CardHeader className="p-6 pb-4">
          <CardTitle className="text-lg font-bold">{t('account.title')}</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold">{t('account.emailLabel')}</Label>
            <Input id="email" value={email} readOnly disabled className="h-11 text-sm rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="practitioner-number" className="text-sm font-semibold">
              {t('account.practitionerNumberLabel')}
            </Label>
            <Input
              id="practitioner-number"
              value={practitioner?.practitioner_number != null ? `#${practitioner.practitioner_number}` : ''}
              readOnly
              disabled
              className="h-11 text-sm rounded-xl font-mono font-medium"
            />
          </div>
          <Button
            variant="outline"
            onClick={onResetPassword}
            disabled={sendingReset}
            className="h-10 text-sm rounded-xl"
          >
            {sendingReset ? <Spinner /> : null}
            {sendingReset
              ? t('account.resetPasswordSending')
              : t('account.resetPassword')}
          </Button>
        </CardContent>
      </Card>

      {/* Langue du portail */}
      <Card className="rounded-2xl border border-border/80 shadow-2xs overflow-hidden">
        <CardHeader className="p-6 pb-4">
          <CardTitle className="text-lg font-bold">{t('language.title')}</CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-1">{t('language.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <LanguageSwitcher withLabel />
        </CardContent>
      </Card>

      {/* Abonnement */}
      <Card className="opacity-75 rounded-2xl border border-border/80 shadow-2xs overflow-hidden">
        <CardHeader className="p-6">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg font-bold">
              {t('subscription.title')}
            </CardTitle>
            <Badge className="border-border bg-muted text-muted-foreground font-semibold">
              {t('subscription.badge')}
            </Badge>
          </div>
          <CardDescription className="text-sm text-muted-foreground mt-1">{t('subscription.body')}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
