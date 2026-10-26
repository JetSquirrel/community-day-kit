import { useAnimationControls, motion } from 'framer-motion';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import CableCard from '@/components/CableCard';
import Avatar from '@/components/schedule/Avatar';
import { speakerName, trackById } from '@/components/schedule/data';
import type { Speaker } from '@/components/schedule/data';
import { pick, useLocale } from '@/lib/locale';
import { cn } from '@/lib/utils';

interface SpeakerCardProps {
  speaker: Speaker;
  onSelect: (speaker: Speaker) => void;
}

/** Elastic -5° avatar tilt + one-shot chip flash, shared by both card sizes. */
function useCardHover() {
  const flash = useAnimationControls();
  const onMouseEnter = () => {
    void flash.start({ opacity: [1, 0.3, 1], transition: { duration: 0.5, times: [0, 0.45, 1] } });
  };
  return { flash, onMouseEnter };
}

function cardKeyboard(onSelect: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };
}

/**
 * Speaker card (speakers.md S3): centered document layout — 96px geometric
 * initial avatar standing on a 6px pier, name + pinyin, company · role,
 * talk title, track chip. Hover: avatar tilts -5° with elastic return,
 * card lifts + Cable Pluck, chip pulses once.
 */
export default function SpeakerCard({ speaker, onSelect }: SpeakerCardProps) {
  const locale = useLocale();
  const { t } = useTranslation('speakers');
  const track = trackById(speaker.track);
  const { flash, onMouseEnter } = useCardHover();
  const name = speakerName(speaker, locale);

  return (
    <CableCard className="h-full cursor-pointer p-6 pt-9 text-center">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(speaker)}
        onKeyDown={cardKeyboard(() => onSelect(speaker))}
        onMouseEnter={onMouseEnter}
        className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ink"
        aria-label={t('card.detailsAria', { name })}
      >
        <motion.div
          className="mx-auto w-fit"
          whileHover={{ rotate: -5 }}
          transition={{ type: 'spring', stiffness: 320, damping: 7 }}
        >
          <Avatar initials={speaker.initials} photo={speaker.photo} color={track.color} size={96} pier />
        </motion.div>
        <h3 className="mt-5 font-sans text-lg font-black text-ink">{name}</h3>
        {speaker.nameEn !== name && (
          <p className="mt-1 font-mono text-xs font-medium uppercase tracking-[0.12em] text-ink/50">{speaker.nameEn}</p>
        )}
        <p className="mt-2 truncate text-sm text-paper-dim">
          {[pick(speaker.company, locale), pick(speaker.role, locale)].filter(Boolean).join(' · ')}
        </p>
        <p className="mt-3 line-clamp-2 text-sm leading-snug text-ink">
                    {pick(speaker.talk, locale)}
        </p>
        <motion.span
          animate={flash}
          className="mt-4 inline-block rounded-full border-2 border-ink px-2.5 py-0.5 font-mono text-[10px] font-medium tracking-wider"
          style={{ backgroundColor: track.color, color: track.textOn }}
        >
          {track.signal}
        </motion.span>
      </div>
    </CableCard>
  );
}

/**
 * Featured headliner card (speakers.md S3: 前 4 位) — spans 2 columns, 120px
 * avatar, extra talk title line, horizontal layout on ≥sm.
 */
export function FeaturedSpeakerCard({ speaker, onSelect }: SpeakerCardProps) {
  const locale = useLocale();
  const { t } = useTranslation('speakers');
  const track = trackById(speaker.track);
  const { flash, onMouseEnter } = useCardHover();
  const name = speakerName(speaker, locale);

  return (
    <CableCard className={cn('h-full cursor-pointer p-6 sm:col-span-2 md:p-7')}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(speaker)}
        onKeyDown={cardKeyboard(() => onSelect(speaker))}
        onMouseEnter={onMouseEnter}
        className="flex h-full flex-col items-center gap-6 rounded-md text-center outline-none focus-visible:ring-2 focus-visible:ring-ink sm:flex-row sm:text-left"
        aria-label={t('card.detailsAria', { name })}
      >
        <motion.div
          className="shrink-0"
          whileHover={{ rotate: -5 }}
          transition={{ type: 'spring', stiffness: 320, damping: 7 }}
        >
          <Avatar initials={speaker.initials} photo={speaker.photo} color={track.color} size={120} pier />
        </motion.div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-center gap-x-3 sm:justify-start">
            <h3 className="font-sans text-2xl font-black text-ink">{name}</h3>
            {speaker.nameEn !== name && (
              <span className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-ink/50">{speaker.nameEn}</span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-paper-dim">
            {[pick(speaker.company, locale), pick(speaker.role, locale)].filter(Boolean).join(' · ')}
          </p>
          <p className="mt-3 line-clamp-2 font-sans text-[15px] font-bold leading-snug text-ink">
                        {pick(speaker.talk, locale)}
          </p>
          <motion.span
            animate={flash}
            className="mt-4 inline-block rounded-full border-2 border-ink px-3 py-1 font-mono text-[11px] font-medium tracking-wider"
            style={{ backgroundColor: track.color, color: track.textOn }}
          >
            {pick(track.bridge, locale)} · {track.signal}
          </motion.span>
        </div>
      </div>
    </CableCard>
  );
}
