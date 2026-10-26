import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { MemphisId } from '@/components/Memphis';
import Memphis from '@/components/Memphis';
import { GhostLink } from '@/components/Button';
import { useLocalePath } from '@/lib/locale';

interface PlaceholderPageProps {
  sig: string;
  label: string;
  title: ReactNode;
  note: string;
  accent?: string;
  memphis?: MemphisId;
}

/**
 * Temporary scaffold page — page agents replace these with the real designs
 * (see /mnt/agents/output/design/*.md). Keeps the shared look: kicker, huge
 * mixed title, one Memphis piece, way-finding back home.
 */
export default function PlaceholderPage({ sig, label, title, note, accent = '#6C3FD4', memphis = 'wave-1' }: PlaceholderPageProps) {
  const { t } = useTranslation();
  const localePath = useLocalePath();
  return (
    <section className="relative min-h-[62dvh] overflow-hidden bg-paper py-28">
      <Memphis id={memphis} className="pointer-events-none absolute right-[8%] top-20 h-16 w-24" />
      <div className="mx-auto max-w-[1280px] px-6 xl:px-12">
        <p className="inline-flex items-center gap-2.5 font-mono text-[13px] font-medium uppercase tracking-[0.18em] text-ink">
          <span className="inline-block h-3 w-3 border-2 border-ink" style={{ backgroundColor: accent }} />
          {sig} // {label}
        </p>
        <h1 className="mt-6 font-sans text-[clamp(36px,6vw,72px)] font-black leading-[1.05] tracking-tight text-ink">{title}</h1>
        <p className="mt-6 max-w-[520px] text-lg leading-[1.75] text-paper-dim">{note}</p>
        <p className="mt-4 inline-block rounded-full border-[3px] border-ink bg-signal px-4 py-1.5 font-mono text-xs font-medium tracking-[0.14em]">
          {t('notFound.comingSoon')}
        </p>
        <div className="mt-10">
          <GhostLink to={localePath('/')}>{t('notFound.backHome')}</GhostLink>
        </div>
      </div>
    </section>
  );
}
