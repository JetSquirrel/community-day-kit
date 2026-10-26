import { useAnimationControls, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { KeyboardEvent } from 'react';
import CableCard from '@/components/CableCard';
import { cn } from '@/lib/utils';
import { resolveSpeakers, useSpeakers } from '@/lib/content';
import { pick, useLocale } from '@/lib/locale';
import Avatar from './Avatar';
import { speakerName, trackById } from './data';
import type { Session, SessionType } from './data';

/** Type chip tones — neutral on track cards; KEYNOTE gets the ink/yellow pair,
 * SOCIAL only appears on the color-free main bridge (design.md §1 配色纪律). */
const TYPE_CHIP: Record<SessionType, string> = {
  KEYNOTE: 'bg-ink text-signal',
  SESSION: 'bg-paper text-ink',
  WORKSHOP: 'bg-paper text-ink',
  LIGHTNING: 'bg-paper text-ink',
  PANEL: 'bg-paper text-ink',
  BREAK: 'bg-paper text-ink',
  SOCIAL: 'bg-growth text-ink',
};

interface SessionCardProps {
  session: Session;
  onSelect: (session: Session) => void;
  className?: string;
}

/**
 * Session card (schedule.md S4): white base card + rivets, 6px track color bar
 * on the left edge, mono time → 2-line title → speaker → type chip.
 * Hover: lift + Cable Pluck (CableCard) + the color bar flashes once —
 * one signal crossing the bridge deck.
 */
export default function SessionCard({ session, onSelect, className }: SessionCardProps) {
  const locale = useLocale();
  const { t } = useTranslation('schedule');
  const track = trackById(session.track);
  const speakers = resolveSpeakers(useSpeakers(), session.speakerIds);
  const flash = useAnimationControls();

  const activate = () => onSelect(session);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activate();
    }
  };

  return (
    <CableCard className={cn('cursor-pointer overflow-hidden', className)}>
      <div
        role="button"
        tabIndex={0}
        onClick={activate}
        onKeyDown={onKeyDown}
        onMouseEnter={() => {
          void flash.start({ opacity: [1, 0.25, 1], transition: { duration: 0.5, times: [0, 0.45, 1] } });
        }}
        className="flex h-full outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
        aria-label={t('card.detailsAria', { time: `${session.start}–${session.end}`, title: pick(session.title, locale) })}
      >
        <motion.span
          animate={flash}
          className="w-[6px] shrink-0"
          style={{ backgroundColor: track.color }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1 px-4 pb-4 pt-7">
          <div className="flex items-center justify-between gap-2 font-mono text-[13px] font-medium tracking-wide text-ink/70">
            <span className="whitespace-nowrap">
              {session.start}–{session.end}
            </span>
            {/* 桥名已在列头；窄列（4 列并排）里省掉，免得和时间挤成两行 */}
            <span className="hidden whitespace-nowrap xl:inline">{track.no}</span>
          </div>
          <h4 className="mt-2 line-clamp-2 font-sans text-base font-bold leading-snug text-ink">{pick(session.title, locale)}</h4>
          <div className="mt-2 flex min-w-0 items-center gap-2">
            {/* 讲者头像：嘉宾表里有照片就用照片，否则几何字母头像 */}
            {speakers.length > 0 && (
              <span className="flex shrink-0">
                {speakers.slice(0, 3).map((sp, i) => (
                  <Avatar
                    key={sp.id}
                    initials={sp.initials}
                    photo={sp.photo}
                    color={trackById(sp.track).color}
                    size={44}
                    className={cn('border-2', i > 0 && '-ml-3')}
                  />
                ))}
              </span>
            )}
            <p className="min-w-0 truncate text-sm text-paper-dim">
              {session.speakerLabel ??
                (speakers.length > 0 ? speakers.map((s) => speakerName(s, locale)).join(' · ') : pick(session.room, locale))}
            </p>
          </div>
          <div className="mt-3 flex justify-end">
            <span
              className={cn(
                'rounded-full border-2 border-ink px-2.5 py-0.5 font-mono text-[11px] font-medium tracking-wider',
                TYPE_CHIP[session.type],
              )}
            >
              {session.type}
            </span>
          </div>
        </div>
      </div>
    </CableCard>
  );
}
