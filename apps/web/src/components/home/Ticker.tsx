import { useTranslation } from 'react-i18next';

function Run({ segments }: { segments: string[] }) {
  return (
    <span className="flex shrink-0 items-center">
      {Array.from({ length: 4 }).map((_, r) =>
        segments.map((s, i) => (
          <span key={`${r}-${i}`} className="flex items-center">
            <span className="whitespace-nowrap font-display text-2xl text-signal">{s}</span>
            <span className="mx-6 font-display text-2xl text-pulse" aria-hidden="true">
              ///
            </span>
          </span>
        )),
      )}
    </span>
  );
}

/** S2 — black signal band: seamless marquee, pauses on hover. */
export default function Ticker() {
  const { t } = useTranslation('home');
  const segments = ['BRIDGE WITH SIGNAL', t('common:site.nameCn'), '2026.10.17 SHENZHEN'];
  return (
    <div className="overflow-hidden border-y-[3px] border-ink bg-ink py-3.5" aria-hidden="true">
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
        <Run segments={segments} />
        <Run segments={segments} />
      </div>
    </div>
  );
}
