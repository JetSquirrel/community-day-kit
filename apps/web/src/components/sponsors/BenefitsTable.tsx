import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { gsap, useGSAP, prefersReducedMotion } from '@/lib/gsap';
import SectionHeader from '@/components/SectionHeader';
import CableCard from '@/components/CableCard';
import Memphis from '@/components/Memphis';
import { pick, useLocale } from '@/lib/locale';
import type { LText, LTextLike } from '@/lib/locale';

/** sponsors.md §S3 — benefit matrix; tier columns keep the anatomy colors. */
const TIER_COLS: { label: LText; color: string }[] = [
  { label: { zh: '钻石 · 主塔', en: 'Diamond · Tower' }, color: '#6C3FD4' },
  { label: { zh: '铂金 · 主缆', en: 'Platinum · Cable' }, color: '#2B5CE6' },
  { label: { zh: '金牌 · 桥面', en: 'Gold · Deck' }, color: '#FF4D3D' },
  { label: { zh: '银牌 · 桥墩', en: 'Silver · Pier' }, color: '#2ECC71' },
];

/** first cell = benefit name, then one value per tier column (● included / — none) */
const ROWS: LTextLike[][] = [
  [{ zh: '大会门票', en: 'Conference Passes' }, '10', '6', '4', '2'],
  [{ zh: '展位', en: 'Booth' }, { zh: '黄金', en: 'Prime' }, { zh: '标准', en: 'Standard' }, { zh: '市集', en: 'Market' }, '—'],
  [{ zh: 'Keynote 致谢', en: 'Keynote Acknowledgment' }, '●', '—', '—', '—'],
  [{ zh: '分论坛冠名', en: 'Breakout Track Naming' }, '—', '●', '—', '—'],
  [{ zh: '主视觉 LOGO', en: 'Key Visual Logo' }, '●', '●', '—', '—'],
  [{ zh: '官网 LOGO', en: 'Website Logo' }, '●', '●', '●', '●'],
  [{ zh: '公众号联动', en: 'WeChat Official Account' }, { zh: '头条', en: 'Headline' }, { zh: '推文', en: 'Post' }, { zh: '合集', en: 'Roundup' }, { zh: '合集', en: 'Roundup' }],
  [{ zh: '周边入袋', en: 'Swag in Bags' }, '●', '●', '●', '●'],
];

export default function BenefitsTable() {
  const { t } = useTranslation('sponsors');
  const locale = useLocale();
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from('[data-benefit-row]', {
        y: 16,
        opacity: 0,
        duration: 0.5,
        ease: 'power3.out',
        stagger: 0.06,
        scrollTrigger: { trigger: root.current, start: 'top 75%', once: true },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative bg-signal py-24 md:py-28">
      {/* Memphis: exactly 1 piece, in the whitespace above the table */}
      <Memphis id="cross" className="pointer-events-none absolute right-[6%] top-14 h-12 w-16 max-md:h-9 max-md:w-12" />

      <div className="mx-auto max-w-[1280px] px-6 xl:px-12">
        <SectionHeader sig="SIG.01" label={t('table.label')} title={t('table.title')} accent="#FF4D3D" />

        <CableCard cable={false} rivets={false} className="mt-12 overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse font-mono text-sm text-ink">
              <thead>
                <tr className="bg-paper">
                  <th scope="col" className="border-2 border-ink px-5 py-4 text-left text-xs font-medium uppercase tracking-[0.14em]">
                    {t('table.headerBenefit')}
                  </th>
                  {TIER_COLS.map((c) => (
                    <th key={pick(c.label, locale)} scope="col" className="border-2 border-ink px-4 py-4">
                      <span className="inline-block rounded-full border-[2.5px] border-ink px-3 py-1 text-xs font-medium text-ink" style={{ backgroundColor: c.color }}>
                        {pick(c.label, locale)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={pick(row[0], locale)} data-benefit-row className="group/row transition-colors hover:bg-paper">
                    <th scope="row" className="relative border-2 border-ink px-5 py-3.5 text-left font-sans font-bold">
                      <span className="absolute left-0 top-0 h-full w-[4px] bg-pulse opacity-0 transition-opacity duration-200 group-hover/row:opacity-100" aria-hidden="true" />
                      {pick(row[0], locale)}
                    </th>
                    {row.slice(1).map((cell, i) => (
                      <td key={i} className="border-2 border-ink px-4 py-3.5 text-center">
                        {cell === '●' ? (
                          <span style={{ color: TIER_COLS[i].color }} aria-label={t('table.included')}>
                            ●
                          </span>
                        ) : (
                          pick(cell, locale)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CableCard>
      </div>
    </section>
  );
}
