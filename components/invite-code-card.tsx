'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function InviteCodeCard({ code }: { code: string }) {
  const t = useTranslations('invite');
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — the code stays visible for manual copy.
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-accent px-4 py-4">
      <span className="font-mono text-2xl font-bold tracking-widest text-primary">
        {code}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={copy}
        className="bg-background"
      >
        {copied ? (
          <Check className="h-4 w-4" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
        {copied ? t('success.copied') : t('success.copy')}
      </Button>
    </div>
  );
}
