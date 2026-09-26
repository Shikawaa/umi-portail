'use client';

import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, Clock, Zap, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { WorkingExercise } from '@/lib/onboarding-data';

interface ExerciseCarouselProps {
  exercises: WorkingExercise[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function ExerciseCarousel({
  exercises,
  selectedId,
  onSelect,
}: ExerciseCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  function checkScrollability() {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 8);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 8);

    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 0) {
      setActiveIndex(0);
      return;
    }

    // Boundary: at or near start
    if (scrollLeft <= 12) {
      setActiveIndex(0);
      return;
    }

    // Boundary: at or near end (guarantees the last card/dot is activated)
    if (scrollLeft + clientWidth >= scrollWidth - 16) {
      setActiveIndex(exercises.length - 1);
      return;
    }

    // Intermediate cards: find which card center is closest to viewport center
    const cards = Array.from(el.children) as HTMLElement[];
    if (cards.length > 0) {
      const containerRect = el.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;
      let closestIdx = 0;
      let minDiff = Infinity;

      cards.forEach((card, idx) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.left + rect.width / 2;
        const diff = Math.abs(cardCenter - containerCenter);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });
      setActiveIndex(closestIdx);
    }
  }

  useEffect(() => {
    checkScrollability();
    const handleResize = () => checkScrollability();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [exercises]);

  function scroll(direction: 'left' | 'right') {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const cards = Array.from(el.children) as HTMLElement[];
    const cardWidth = cards[0]?.offsetWidth ?? 255;
    const offset = direction === 'left' ? -(cardWidth + 12) : cardWidth + 12;
    el.scrollBy({ left: offset, behavior: 'smooth' });
    setTimeout(checkScrollability, 250);
  }

  function scrollToIndex(index: number) {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const cards = Array.from(el.children) as HTMLElement[];
    if (cards[index]) {
      if (index === 0) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else if (index === exercises.length - 1) {
        el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
      } else {
        cards[index].scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
      setActiveIndex(index);
    }
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-2.5 overflow-hidden">
      {/* Header avec titre & flèches de navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Premier exercice obligatoire <span className="text-destructive">*</span>
          </span>
          <span className="text-[11px] text-muted-foreground">
            (glissez ou utilisez les flèches)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={!canScrollLeft}
            className="h-6 w-6 rounded-full p-0 shadow-2xs hover:bg-muted disabled:opacity-30"
            onClick={() => scroll('left')}
            aria-label="Exercice précédent"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={!canScrollRight}
            className="h-6 w-6 rounded-full p-0 shadow-2xs hover:bg-muted disabled:opacity-30"
            onClick={() => scroll('right')}
            aria-label="Exercice suivant"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Track de carrousel horizontal isolé (ne fait JAMAIS scroller la modale) */}
      <div className="relative w-full min-w-0 max-w-full overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={checkScrollability}
          className="flex gap-3 overflow-x-auto w-full min-w-0 max-w-full py-1 px-0.5 scroll-smooth snap-x snap-mandatory focus:outline-none overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          tabIndex={0}
          role="radiogroup"
          aria-label="Carrousel des 4 exercices"
        >
          {exercises.map((ex) => {
            const isSelected = selectedId === ex.id;
            return (
              <div
                key={ex.id}
                onClick={() => onSelect(ex.id)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    onSelect(ex.id);
                  }
                }}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                style={{ backgroundColor: ex.color || '#F1F5F9' }}
                className={cn(
                  'relative shrink-0 w-[255px] sm:w-[270px] h-[158px] p-4 rounded-xl cursor-pointer transition-all duration-150 snap-start select-none border-2 flex flex-col justify-between shadow-xs',
                  isSelected
                    ? 'border-primary shadow-md'
                    : 'border-transparent hover:border-gray-300 hover:shadow-xs opacity-90 hover:opacity-100',
                )}
              >
                {/* En-tête : Titre & Checkmark */}
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-sm leading-snug text-gray-900 line-clamp-2">
                    {ex.titre}
                  </h4>
                  <div
                    className={cn(
                      'h-5 w-5 rounded-full flex items-center justify-center border shrink-0 transition-colors mt-0.5',
                      isSelected
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'bg-white/90 border-gray-300 text-transparent',
                    )}
                  >
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                </div>

                {/* Description courte 2 lignes */}
                <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">
                  {ex.description_courte}
                </p>

                {/* Badges de symptômes */}
                {ex.symptomes && ex.symptomes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {ex.symptomes.slice(0, 2).map((sym) => (
                      <span
                        key={sym}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-white/90 text-gray-800 font-medium leading-none shadow-2xs"
                      >
                        {sym}
                      </span>
                    ))}
                    {ex.symptomes.length > 2 ? (
                      <span className="text-[11px] text-gray-600 font-medium leading-none py-0.5">
                        +{ex.symptomes.length - 2}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {/* Footer métadonnées : durée & effort */}
                <div className="pt-2 border-t border-black/5 flex items-center justify-between text-xs text-gray-600 font-medium">
                  <span className="flex items-center gap-1.5">
                    {ex.isMultiDay ? (
                      <Calendar className="h-3.5 w-3.5 text-amber-700" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-gray-500" />
                    )}
                    <span>{ex.duree_moyenne}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-gray-500" />
                    <span>{ex.effort_cognitif}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination dots interactifs */}
      <div className="flex items-center justify-center gap-1.5 pt-0.5">
        {exercises.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => scrollToIndex(idx)}
            className={cn(
              'h-1.5 rounded-full transition-all duration-200 cursor-pointer focus:outline-none',
              activeIndex === idx
                ? 'w-5 bg-primary'
                : 'w-1.5 bg-gray-300 hover:bg-gray-400',
            )}
            aria-label={`Aller à la carte ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
