import { getTranslations, setRequestLocale } from 'next-intl/server';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, Download, CheckCircle } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default async function JoinPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { code?: string };
}) {
  setRequestLocale(locale);
  const code = searchParams.code?.trim() || '';

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/50 via-background to-background flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full space-y-6 text-center">
        {/* Logo UMi */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl shadow-md">
            U
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">UMi</span>
        </div>

        <Card className="border border-border/80 shadow-lg bg-card/90 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                Invitation Patient
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-foreground pt-1">
                Rejoignez votre suivi sur UMi
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Votre psychologue vous a préparé un espace personnalisé et des exercices ciblés pour prolonger vos séances.
              </p>
            </div>

            {code ? (
              <div className="p-4 rounded-xl bg-accent/30 border border-accent flex flex-col items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Votre code d&apos;accès à 4 chiffres
                </span>
                <span className="text-3xl font-mono font-bold tracking-widest text-primary">
                  {code}
                </span>
              </div>
            ) : null}

            {/* QR Code pour scanner depuis un ordinateur */}
            <div className="p-4 bg-white rounded-xl border border-gray-200 inline-block shadow-sm">
              <QRCodeSVG
                value={code ? `umi://invite?code=${code}` : 'https://umi.app'}
                size={180}
                level="M"
              />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Smartphone className="h-4 w-4 text-primary" />
                <span>Scannez ce QR code avec votre téléphone ou téléchargez l&apos;application</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <a
                  href="https://apps.apple.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({
                    variant: 'outline',
                    className: 'w-full text-xs h-10 gap-1.5',
                  })}
                >
                  <Download className="h-3.5 w-3.5" />
                  App Store
                </a>
                <a
                  href="https://play.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({
                    variant: 'outline',
                    className: 'w-full text-xs h-10 gap-1.5',
                  })}
                >
                  <Download className="h-3.5 w-3.5" />
                  Google Play
                </a>
              </div>
            </div>

            <div className="pt-4 border-t border-border text-left space-y-2 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Vos réponses restent strictement confidentielles et privées.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Retrouvez le premier exercice recommandé par votre praticien dès la fin de l&apos;onboarding.</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          UMi · Accompagnement psychologique et thérapies cognitives et comportementales (TCC).
        </p>
      </div>
    </div>
  );
}
