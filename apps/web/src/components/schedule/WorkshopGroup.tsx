import CableCard from '@/components/CableCard';
import { cn } from '@/lib/utils';
import { resolveSpeakers, useSpeakers } from '@/lib/content';
import { pick, useLocale } from '@/lib/locale';
import Avatar from './Avatar';
import { speakerName, trackById } from './data';
import type { Session } from './data';

/**
 * 同一时段的 Workshop 合成一张卡：顶部是共同时段，里面逐个列出 topic
 * （标题 + 讲者），点任一 topic 打开它自己的场次详情。
 */
export default function WorkshopGroup({
  sessions,
  onSelect,
  startIndex = 0,
  className,
}: {
  sessions: Session[];
  onSelect: (s: Session) => void;
  /** 本卡第一个 topic 的序号偏移——同一列里多张分组卡连续编号（TOPIC 01…04） */
  startIndex?: number;
  className?: string;
}) {
  const locale = useLocale();
  const all = useSpeakers();
  const track = trackById('workshop');
  const { start, end } = sessions[0];
  return (
    <CableCard className={cn('overflow-hidden', className)}>
      <div className="flex h-full">
        <span className="w-[6px] shrink-0" style={{ backgroundColor: track.color }} aria-hidden="true" />
        <div className="min-w-0 flex-1 pb-2 pt-7">
          <div className="flex items-center justify-between gap-2 px-4 font-mono text-[13px] font-medium tracking-wide text-ink/70">
            <span className="whitespace-nowrap">
              {start}–{end}
            </span>
            <span className="hidden whitespace-nowrap xl:inline">×{sessions.length}</span>
          </div>
          <ul className="mt-2">
            {sessions.map((s, i) => {
              const speakers = resolveSpeakers(all, s.speakerIds);
              const label = s.speakerLabel ?? speakers.map((sp) => speakerName(sp, locale)).join(' · ');
              return (
                <li key={s.id} className={cn(i > 0 && 'border-t-2 border-dashed border-ink/15')}>
                  <button
                    type="button"
                    onClick={() => onSelect(s)}
                    className="block w-full px-4 py-3 text-left outline-none transition-colors hover:bg-signal/25 focus-visible:bg-signal/25"
                  >
                    <span className="font-mono text-[11px] font-medium tracking-[0.14em] text-ink/50">
                      TOPIC {String(startIndex + i + 1).padStart(2, '0')}
                    </span>
                    <span className="mt-1 block font-sans text-[15px] font-bold leading-snug text-ink">{pick(s.title, locale)}</span>
                    {label && (
                      <span className="mt-2 flex min-w-0 items-center gap-2">
                        {speakers.length > 0 && (
                          <span className="flex shrink-0">
                            {speakers.slice(0, 3).map((sp, j) => (
                              <Avatar
                                key={sp.id}
                                initials={sp.initials}
                                photo={sp.photo}
                                color={track.color}
                                size={36}
                                className={cn('border-2', j > 0 && '-ml-3')}
                              />
                            ))}
                          </span>
                        )}
                        <span className="line-clamp-2 text-sm leading-snug text-paper-dim">{label}</span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </CableCard>
  );
}

