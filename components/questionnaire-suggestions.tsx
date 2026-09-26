'use client';

import { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Check,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  ONBOARDING_QUESTIONS_FALLBACK,
  ONBOARDING_OPTIONS_FALLBACK,
} from '@/lib/onboarding-data';
import type {
  OnboardingOption,
  OnboardingQuestion,
  OnboardingQuestionKey,
} from '@/lib/types';

interface QuestionnaireSuggestionsProps {
  questions?: OnboardingQuestion[];
  options?: OnboardingOption[];
  values: Record<string, string[]>;
  onChange: (values: Record<string, string[]>) => void;
}

const QUESTION_SHORT_TITLES: Record<OnboardingQuestionKey, string> = {
  q1_goals: '1. Objectifs',
  q2_impact: '2. Impact',
  q3_moments: '3. Moments',
  q4_experience: '4. Expérience',
  q5_tone: '5. Tonalité',
};

const QUESTION_TITLES: Record<OnboardingQuestionKey, string> = {
  q1_goals: 'Qu’est-ce qui t’amène ici ?',
  q2_impact: 'À quel point ça pèse au quotidien ?',
  q3_moments: 'À quel moment c’est le plus dur ?',
  q4_experience: 'Ton expérience avec les exercices TCC ?',
  q5_tone: 'Comment préfères-tu qu’on te parle ?',
};

export function QuestionnaireSuggestions({
  questions = ONBOARDING_QUESTIONS_FALLBACK,
  options = ONBOARDING_OPTIONS_FALLBACK.filter((o) => o.suggestable),
  values,
  onChange,
}: QuestionnaireSuggestionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Compute number of questions where at least one suggestion is set
  const activeQuestionsCount = Object.values(values).filter(
    (opts) => Array.isArray(opts) && opts.length > 0,
  ).length;

  function checkScrollability() {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);

    const cards = Array.from(el.children) as HTMLElement[];
    if (cards.length > 0) {
      if (scrollLeft <= 15) {
        setActiveQuestionIndex(0);
        return;
      }
      if (scrollLeft + clientWidth >= scrollWidth - 20) {
        setActiveQuestionIndex(cards.length - 1);
        return;
      }
      const containerLeft = el.getBoundingClientRect().left;
      let closestIdx = 0;
      let minDiff = Infinity;
      cards.forEach((card, idx) => {
        const diff = Math.abs(card.getBoundingClientRect().left - containerLeft);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });
      setActiveQuestionIndex(closestIdx);
    }
  }

  useEffect(() => {
    if (isOpen) {
      setTimeout(checkScrollability, 100);
    }
  }, [isOpen]);

  function scroll(direction: 'left' | 'right') {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const cards = Array.from(el.children) as HTMLElement[];
    const colWidth = cards[0]?.offsetWidth ?? 320;
    const offset = direction === 'left' ? -(colWidth + 14) : colWidth + 14;
    el.scrollBy({ left: offset, behavior: 'smooth' });
    setTimeout(checkScrollability, 250);
  }

  function scrollToQuestion(index: number) {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const cards = Array.from(el.children) as HTMLElement[];
    if (cards[index]) {
      cards[index].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'start',
      });
      setActiveQuestionIndex(index);
      setTimeout(checkScrollability, 300);
    }
  }

  function toggleOption(
    qKey: string,
    optKey: string,
    isExclusive: boolean,
    maxChoices: number,
  ) {
    const current = values[qKey] ?? [];
    const isSelected = current.includes(optKey);

    let next: string[];

    if (isSelected) {
      next = current.filter((k) => k !== optKey);
    } else {
      if (maxChoices === 1) {
        next = [optKey];
      } else {
        if (isExclusive) {
          next = [optKey];
        } else {
          const exclusiveKeys = options
            .filter((o) => o.question_key === qKey && o.is_exclusive)
            .map((o) => o.option_key);

          const nonExclusive = current.filter((k) => !exclusiveKeys.includes(k));

          if (nonExclusive.length >= maxChoices) {
            return;
          }
          next = [...nonExclusive, optKey];
        }
      }
    }

    onChange({
      ...values,
      [qKey]: next,
    });
  }

  function clearQuestion(qKey: string) {
    onChange({
      ...values,
      [qKey]: [],
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden transition-all shadow-xs">
      {/* Accordion header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between text-left hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                Suggérer des réponses au questionnaire
              </span>
              <span className="text-xs text-muted-foreground font-normal">(optionnel)</span>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Pré-oriente le patient sur les 5 questions clés de son onboarding
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeQuestionsCount > 0 ? (
            <Badge className="text-xs bg-primary/10 text-primary border-primary/20 font-medium px-2.5 py-0.5">
              {activeQuestionsCount} / {questions.length} renseignée{activeQuestionsCount > 1 ? 's' : ''}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">0 renseignée</span>
          )}
          <div className="w-6 h-6 rounded-full flex items-center justify-center bg-muted/60 text-muted-foreground">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </button>

      {/* Accordion content : Carrousel horizontal de 5 colonnes */}
      {isOpen ? (
        <div className="p-4 sm:p-5 pt-2 border-t border-border space-y-4 bg-background/60">
          {/* Header du carrousel avec navigation par questions et flèches */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
              Les options choisies apparaîtront comme recommandations du praticien. Le patient reste entièrement libre de valider ou modifier.
            </p>

            {/* Flèches de défilement horizontal */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={!canScrollLeft}
                className="h-7 w-7 rounded-full p-0 shadow-2xs hover:bg-muted disabled:opacity-30"
                onClick={() => scroll('left')}
                aria-label="Question précédente"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={!canScrollRight}
                className="h-7 w-7 rounded-full p-0 shadow-2xs hover:bg-muted disabled:opacity-30"
                onClick={() => scroll('right')}
                aria-label="Question suivante"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Onglets rapides vers chacune des 5 questions */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {questions.map((q, idx) => {
              const count = (values[q.key] ?? []).length;
              const isActive = activeQuestionIndex === idx;
              return (
                <button
                  key={q.key}
                  type="button"
                  onClick={() => scrollToQuestion(idx)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-all cursor-pointer flex items-center gap-1.5 border',
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : count > 0
                      ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15'
                      : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground',
                  )}
                >
                  <span>{QUESTION_SHORT_TITLES[q.key]}</span>
                  {count > 0 ? (
                    <span
                      className={cn(
                        'w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center leading-none',
                        isActive
                          ? 'bg-primary-foreground text-primary'
                          : 'bg-primary text-primary-foreground',
                      )}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Track horizontal des 5 colonnes (~40% de largeur chacune) */}
          <div className="relative w-full min-w-0 max-w-full overflow-hidden">
            <div
              ref={scrollRef}
              onScroll={checkScrollability}
              className="flex gap-3.5 overflow-x-auto w-full min-w-0 max-w-full py-1.5 px-0.5 scroll-smooth snap-x snap-mandatory focus:outline-none overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {questions.map((q, qIndex) => {
                const qOptions = options.filter((o) => o.question_key === q.key);
                const selected = values[q.key] ?? [];
                const isSingleChoice = q.max_choices === 1;

                return (
                  <div
                    key={q.key}
                    className="w-[85%] sm:w-[42%] shrink-0 snap-start flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 shadow-2xs hover:border-gray-300 transition-colors"
                  >
                    {/* Header de la colonne Question */}
                    <div className="space-y-2 pb-3 border-b border-border/60">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                          Question {qIndex + 1} / {questions.length}
                        </span>
                        {selected.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => clearQuestion(q.key)}
                            className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Effacer
                          </button>
                        ) : null}
                      </div>

                      <h4 className="text-sm font-semibold text-foreground leading-snug">
                        {QUESTION_TITLES[q.key]}
                      </h4>

                      <p className="text-xs text-muted-foreground">
                        {isSingleChoice
                          ? '1 seule réponse recommandée'
                          : `Jusqu’à ${q.max_choices} réponses recommandées`}
                      </p>
                    </div>

                    {/* Liste verticale des options : 100% visibles sans scroll interne */}
                    <div className="py-3 space-y-2 flex-1">
                      {qOptions.map((opt) => {
                        const isChecked = selected.includes(opt.option_key);
                        const isAtLimit =
                          !isChecked && !isSingleChoice && selected.length >= q.max_choices;

                        return (
                          <div
                            key={opt.option_key}
                            onClick={() => {
                              if (!isAtLimit) {
                                toggleOption(
                                  q.key,
                                  opt.option_key,
                                  opt.is_exclusive,
                                  q.max_choices,
                                );
                              }
                            }}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-lg border text-sm cursor-pointer select-none transition-all',
                              isChecked
                                ? 'border-primary bg-primary/5 font-medium text-foreground ring-1 ring-primary/20 shadow-2xs'
                                : isAtLimit
                                ? 'opacity-40 cursor-not-allowed border-border/50 text-muted-foreground'
                                : 'border-border/70 hover:border-gray-300 hover:bg-muted/40 text-muted-foreground hover:text-foreground',
                            )}
                          >
                            <div
                              className={cn(
                                'h-5 w-5 shrink-0 flex items-center justify-center border transition-colors',
                                isSingleChoice ? 'rounded-full' : 'rounded-md',
                                isChecked
                                  ? 'bg-primary border-primary text-primary-foreground'
                                  : 'border-gray-300 bg-background',
                              )}
                            >
                              {isChecked ? (
                                <Check
                                  className={cn(
                                    'h-3 w-3 stroke-[3]',
                                    isSingleChoice ? 'h-2.5 w-2.5' : '',
                                  )}
                                />
                              ) : null}
                            </div>
                            <span className="leading-snug">{opt.label_fr}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer statut de la colonne */}
                    <div className="pt-2.5 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Statut</span>
                      {selected.length > 0 ? (
                        <span className="font-semibold text-primary">
                          {selected.length} / {q.max_choices} suggéré{selected.length > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="italic text-muted-foreground/80">Aucune suggestion</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
