import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import Avatar, { EmptyAvatar } from './Avatar';
import Button, { GhostLink } from '@/components/Button';
import { resolveSpeakers, useSpeakers } from '@/lib/content';
import { pick, useLocale, useLocalePath } from '@/lib/locale';
import { downloadIcs, speakerName, trackById } from './data';
import type { Session } from './data';

interface SessionModalProps {
  /** the session to show — the parent keeps it set while the exit animation plays */
  session: Session | null;
  open: boolean;
  onClose: () => void;
}

/** Session detail modal (schedule.md S4 → design.md §5.8). */
export default function SessionModal({ session, open, onClose }: SessionModalProps) {
  const locale = useLocale();
  const { t } = useTranslation('schedule');
  return (
    <Modal open={open} onClose={onClose} label={session ? t('modal.labelWithTitle', { title: pick(session.title, locale) }) : t('modal.label')}>
      {session ? <SessionDetail session={session} /> : null}
    </Modal>
  );
}

function SessionDetail({ session }: { session: Session }) {
  const locale = useLocale();
  const { t } = useTranslation('schedule');
  const lp = useLocalePath();
  const track = trackById(session.track);
  const speakers = resolveSpeakers(useSpeakers(), session.speakerIds);

  return (
    <div>
      {/* big track chip */}
      <span
        className="inline-block rounded-full border-[3px] border-ink px-3.5 py-1 font-mono text-xs font-medium tracking-[0.14em]"
        style={{ backgroundColor: track.color, color: track.textOn }}
      >
        {pick(track.bridge, locale)} · {track.signal}
      </span>
      <p className="mt-4 font-mono text-sm font-medium tracking-wide text-ink/70">
        {session.start}–{session.end} · {pick(session.room, locale)}
      </p>
      <h3 className="mt-3 pr-10 font-sans text-2xl font-black leading-snug text-ink md:text-[28px]">{pick(session.title, locale)}</h3>
      <p className="mt-4 leading-[1.75] text-paper-dim">{pick(session.abstract, locale)}</p>

      {/* speaker area */}
      <div className="mt-6 border-t-[3px] border-ink/10 pt-5">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-ink/60">
          {speakers.length > 1 ? t('modal.speakersHeading') : t('modal.speakerHeading')}
        </p>
        {speakers.length > 0 ? (
          <ul className="mt-4 space-y-4">
            {speakers.map((sp) => {
              const spTrack = trackById(sp.track);
              return (
                <li key={sp.id} className="flex items-center gap-4">
                  <Avatar initials={sp.initials} photo={sp.photo} color={spTrack.color} size={56} />
                  <div className="min-w-0">
                    <p className="font-sans font-bold text-ink">
                      {speakerName(sp, locale)}
                      {sp.nameEn !== speakerName(sp, locale) && (
                        <span className="ml-2 font-mono text-xs font-medium uppercase text-ink/50">{sp.nameEn}</span>
                      )}
                    </p>
                    <p className="truncate text-sm text-paper-dim">
                      {[pick(sp.company, locale), pick(sp.role, locale)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {speakers.length > 1 && (
                    <GhostLink to={lp(`/speakers#${sp.id}`)} className="ml-auto shrink-0">
                      {t('modal.viewSpeaker')}
                    </GhostLink>
                  )}
                </li>
              );
            })}
          </ul>
        ) : session.speakerLabel ? (
          // 讲者还没上嘉宾墙（不在嘉宾表或未勾「展示」）——先按议程署名显示
          <div className="mt-4 flex items-center gap-4">
            <EmptyAvatar size={56} />
            <p className="font-sans font-bold text-ink">{session.speakerLabel}</p>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-4">
            <EmptyAvatar size={56} />
            <p className="text-sm leading-relaxed text-paper-dim">{t('modal.tbaBody')}</p>
          </div>
        )}
      </div>

      {/* actions */}
      <div className="mt-8 flex flex-wrap items-center gap-5">
        <Button variant="secondary" onClick={() => downloadIcs(session)}>
          {t('modal.addToCalendar')}
        </Button>
        {speakers[0] ? (
          <GhostLink to={lp(`/speakers#${speakers[0].id}`)}>{t('modal.viewSpeaker')}</GhostLink>
        ) : (
          <GhostLink to={lp('/speakers')}>{t('modal.allSpeakers')}</GhostLink>
        )}
      </div>
    </div>
  );
}
