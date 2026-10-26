import { useTranslation } from 'react-i18next';
import SectionHeader from '@/components/SectionHeader';
import CableCard from '@/components/CableCard';
import Reveal from '@/components/Reveal';
import Memphis from '@/components/Memphis';
import { GhostLink } from '@/components/Button';
import { useSpeakers } from '@/lib/content';
import { speakerName, trackById } from '@/components/schedule/data';
import { pick, useLocale, useLocalePath } from '@/lib/locale';

/**
 * S9 — people on the bridge. Geometric initial avatars (no photos, per
 * design.md asset note); first 8 of the roster (CFP 已关闭，不再留「虚位以待」卡).
 * Roster comes from the live content store (bundled fallback → S3 sync).
 */
export default function SpeakersPreview() {
  const { t } = useTranslation('home');
  const locale = useLocale();
  const lp = useLocalePath();
  const speakers = useSpeakers().slice(0, 8);
  return (
    <section className="relative bg-paper py-24 md:py-32">
      {/* Memphis: exactly 1 piece */}
      <Memphis id="dots-1" className="pointer-events-none absolute left-[4%] top-14 h-14 w-20 max-md:h-10 max-md:w-14" />

      <div className="mx-auto max-w-[1280px] px-6 xl:px-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeader
            sig="SIG.05"
            label="SPEAKERS"
            title={
              <>
                <span className="font-sans">{t('speakers.title')}</span>
                <span className="mx-3 font-sans">·</span>
                <span className="font-sans">{t('speakers.titleSub')}</span>
              </>
            }
            accent="#2B5CE6"
          />
          <GhostLink to={lp('/speakers')} className="mb-1">
            {t('speakers.allSpeakers')}
          </GhostLink>
        </div>

        <Reveal className="mt-12 grid grid-cols-2 gap-5 lg:grid-cols-4" stagger={0.08}>
          {speakers.map((sp) => {
            const track = trackById(sp.track);
            return (
              <CableCard key={sp.id} className="p-5 pt-8 text-center">
                <span
                  className="mx-auto flex h-20 w-20 items-center justify-center rounded-lg border-[3px] border-ink font-display text-2xl text-white transition-transform duration-200 group-hover:-rotate-4"
                  style={{ backgroundColor: track.color }}
                  aria-hidden="true"
                >
                  {sp.initials}
                </span>
                <h3 className="mt-4 font-sans text-[17px] font-bold text-ink">{speakerName(sp, locale)}</h3>
                <p className="mt-1 text-sm text-paper-dim">
                  {[pick(sp.company, locale), pick(sp.role, locale)].filter(Boolean).join(' · ')}
                </p>
                <span
                  className="mt-3 inline-block rounded-full border-2 border-ink px-2.5 py-0.5 font-mono text-[10px] font-medium tracking-wider text-white"
                  style={{ backgroundColor: track.color }}
                >
                  {track.signal}
                </span>
              </CableCard>
            );
          })}

        </Reveal>
      </div>
    </section>
  );
}
