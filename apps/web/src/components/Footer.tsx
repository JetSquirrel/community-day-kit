import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { NAV_ITEMS, SITE } from '@/lib/site';
import { useLocalePath } from '@/lib/locale';

/**
 * Shared footer (design.md §5.9): ink ground, Shenzhen skyline with a signal
 * pulse sweeping overhead, giant outline wordmark, 4 info columns, mono bar.
 * No Memphis pieces here — the skyline is the only ornament.
 */
export default function Footer() {
  const { t } = useTranslation();
  const localePath = useLocalePath();
  return (
    <footer className="border-t-[3px] border-ink bg-ink text-paper">
      {/* skyline + pulse overhead */}
      <div className="overflow-hidden" aria-hidden="true">
        <img src="/skyline.svg" alt="" className="block w-full min-w-[720px]" />
      </div>

      <div className="mx-auto max-w-[1280px] px-6 pb-10 xl:px-12">
        {/* giant outline wordmark — fills yellow on hover */}
        <h2 className="text-outline-yellow cursor-default select-none whitespace-nowrap text-center font-display text-[clamp(34px,7.2vw,110px)] leading-none tracking-tight transition-colors duration-300">
          BRIDGE WITH SIGNAL
        </h2>

        <div className="mt-14 grid grid-cols-1 gap-10 border-t border-paper/15 pt-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-signal">{t('footer.communityTitle')}</h3>
            <p className="mt-4 text-sm leading-7 text-paper/70">
              {t('footer.communityBody')}
            </p>
          </div>
          <div>
            <h3 className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-signal">{t('footer.quickNav')}</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <Link to={localePath(item.to)} className="text-paper/70 transition-colors hover:text-signal">
                    {t(`nav.${item.id}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-signal">{t('footer.contactTitle')}</h3>
            <a href={`mailto:${SITE.email}`} className="mt-4 block font-mono text-sm text-paper/70 underline-offset-4 hover:text-signal hover:underline">
              {SITE.email}
            </a>
            <img src="/qr-wechat.jpg" alt={t('footer.qrAlt')} className="mt-4 w-24 rounded-md border-2 border-paper/40" />
            <p className="mt-2 font-mono text-[11px] text-paper/40">{t('footer.qrCaption')}</p>
          </div>
          <div>
            <h3 className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-signal">{t('footer.organizerTitle')}</h3>
            <p className="mt-4 text-sm leading-7 text-paper/70">
              {t('footer.organizerHost')}
              <br />
              {t('footer.organizerSupport')}
              <br />
              {t('site.event')}
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-paper/15 pt-6 font-mono text-[11px] tracking-wider text-paper/45 sm:flex-row">
          <span>{t('footer.copyright')}</span>
          <span>{t('footer.locationBar')}</span>
        </div>
      </div>
    </footer>
  );
}
