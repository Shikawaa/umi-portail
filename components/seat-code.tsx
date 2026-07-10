'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

/**
 * Displays a seat's attachment code with a copy button, on the patient fiche.
 * Lets the practitioner retrieve the code once the patient is attached (e.g. to
 * share it again so a mistakenly unlinked patient can resume their follow-up).
 */
export function SeatCode({ code, label }: { code: string; label: string }) {
  const tCommon = useTranslations('common');
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(tCommon('copied'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable: the code stays visible for manual copy.
    }
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <code className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono tracking-widest text-foreground">
        {code}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={tCommon('copy')}
        className="inline-flex items-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
