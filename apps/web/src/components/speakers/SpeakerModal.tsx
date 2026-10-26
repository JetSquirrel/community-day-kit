import { Github, Globe, MessageCircle, Twitter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/schedule/Modal';
import Avatar from '@/components/schedule/Avatar';
import { GhostLink } from '@/components/Button';
import { sessionsBySpeaker, speakerName, trackById } from '@/components/schedule/data';
import type { Speaker } from '@/components/schedule/data';
import { pick, useLocale, useLocalePath } from '@/lib/locale';

const SOCIAL_ICON: Record<string, typeof Globe> = {
  GitHub: Github,
  X: Twitter,
  微信: MessageCircle,
  个人站: Globe,
};

interface SpeakerModalProps {
  /** the speaker to show — the parent keeps it set while the exit animation plays */
  speaker: Speaker | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Speaker detail modal (speakers.md S3 → design.md §5.8): left = 160px avatar
 * + track chip + social links; right = name / role / bio / talk + session
 * info + link to the filtered schedule.
 */
export default function SpeakerModal({ speaker, open, onClose }: SpeakerModalProps) {
  const locale = useLocale();
  const { t } = useTranslation('speakers');
  return (
    <Modal
      open={open}
      onClose={onClose}
      label={speaker ? t('modal.titleWithName', { name: speakerName(speaker, locale) }) : t('modal.title')}
    >
      {speaker ? <SpeakerDetail speaker={speaker} /> : null}
    </Modal>
  );
}

function SpeakerDetail({ speaker }: { speaker: Speaker }) {
  const locale = useLocale();
  const { t } = useTranslation('speakers');
  const localePath = useLocalePath();
  const track = trackById(speaker.track);
  const sessions = sessionsBySpeaker(speaker.id);
  const primary = sessions[0];
  const name = speakerName(speaker, locale);

  return (
    <div className="flex flex-col gap-8 sm:flex-row">
      {/* left column */}
      <div className="shrink-0 sm:w-[180px]">
        <Avatar initials={speaker.initials} photo={speaker.photo} color={track.color} size={160} pier />
        <span
          className="mt-5 inline-block rounded-full border-2 border-ink px-3 py-1 font-mono text-[11px] font-medium tracking-wider"
          style={{ backgroundColor: track.color, color: track.textOn }}
        >
          {pick(track.bridge, locale)} · {track.signal}
        </span>
        <ul className="mt-5 space-y-2.5">
          {speaker.socials.map((s) => {
            // icon lookup stays keyed on the zh label; display follows locale
            const Icon = SOCIAL_ICON[pick(s.label, 'zh')] ?? Globe;
            return (
              <li key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 font-mono text-sm font-medium text-ink underline decoration-2 underline-offset-4 transition-colors hover:text-pulse"
                >
                  <Icon size={14} strokeWidth={2.5} aria-hidden="true" />
                  {pick(s.label, locale)}
                </a>
              </li>
            );
          })}
        </ul>
      </div>

      {/* right column */}
      <div className="min-w-0 flex-1">
        <h3 className="pr-8 font-sans text-2xl font-black text-ink md:text-[28px]">{name}</h3>
        {speaker.nameEn !== name && (
          <p className="mt-1 font-mono text-xs font-medium uppercase tracking-[0.12em] text-ink/50">{speaker.nameEn}</p>
        )}
        <p className="mt-2 text-sm text-paper-dim">
          {[pick(speaker.company, locale), pick(speaker.role, locale)].filter(Boolean).join(' · ')}
        </p>
        <p className="mt-4 leading-[1.75] text-paper-dim">{pick(speaker.bio, locale)}</p>

        <div className="mt-6 border-t-[3px] border-ink/10 pt-5">
          <p className="font-sans text-lg font-bold leading-snug text-ink">{pick(speaker.talk, locale)}</p>
          {primary ? <p className="mt-2 text-sm leading-[1.75] text-paper-dim">{pick(primary.abstract, locale)}</p> : null}
          <ul className="mt-4 space-y-1.5">
            {sessions.map((s) => (
              <li key={s.id} className="font-mono text-[13px] font-medium tracking-wide text-ink/70">
                {s.start}–{s.end} · {pick(s.room, locale)}
              </li>
            ))}
          </ul>
          <GhostLink to={localePath(`/schedule?track=${speaker.track}`)} className="mt-5">
            {t('modal.viewSession')}
          </GhostLink>
        </div>
      </div>
    </div>
  );
}
