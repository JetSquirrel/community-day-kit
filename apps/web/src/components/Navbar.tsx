import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { NAV_ITEMS, SITE } from '@/lib/site';
import { useLocale, useLocalePath, setLangPref } from '@/lib/locale';
import type { Locale } from '@/lib/locale';
import { cn } from '@/lib/utils';

function WaveUnderline({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'wave-underline absolute -bottom-[7px] left-0 h-[6px] w-full origin-left transition-transform duration-300',
        active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
      )}
    />
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const locale = useLocale();
  const localePath = useLocalePath();
  const navigate = useNavigate();
  const location = useLocation();

  // switch language, keeping the equivalent path (plus search/hash)
  const switchLocale = (target: Locale) => {
    if (target === locale) return;
    setLangPref(target); // 手动选择优先于 IP 识别，不再被覆盖
    const { pathname, search, hash } = location;
    const next = target === 'en' ? `/en${pathname === '/' ? '' : pathname}` : pathname.replace(/^\/en/, '') || '/';
    navigate(`${next}${search}${hash}`);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 h-[72px] border-b-[3px] border-ink bg-signal transition-shadow duration-200',
          scrolled && 'shadow-hard-nav',
        )}
      >
        <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between gap-4 px-6 xl:px-12">
          {/* logo */}
          <Link to={localePath('/')} className="flex shrink-0 items-center gap-3" aria-label={t('aria.home')}>
            <img src="/logo.svg" alt="" className="h-8 w-auto" />
            <span className="hidden font-display text-base tracking-tight text-ink min-[420px]:inline lg:hidden xl:inline">
              Bridge with Signal
            </span>
          </Link>

          {/* desktop nav */}
          <nav className="hidden items-center gap-6 lg:flex" aria-label={t('aria.mainNav')}>
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={localePath(item.to)} end={item.to === '/'}>
                {({ isActive }) => (
                  <span className="group relative inline-block py-1 text-sm font-bold text-ink">
                    {t(`nav.${item.id}`)}
                    <WaveUnderline active={isActive} />
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* right side */}
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border-[3px] border-ink bg-paper px-3 py-1 font-mono text-xs font-medium tracking-wider md:inline-flex">
              {t('site.dateChip')}
            </span>
            {/* language switch */}
            <span className="hidden items-center rounded-full border-[3px] border-ink bg-paper font-mono text-xs font-medium md:inline-flex">
              <button
                type="button"
                aria-pressed={locale === 'zh'}
                className={cn(
                  'rounded-full px-2.5 py-1 transition-colors',
                  locale === 'zh' ? 'bg-ink text-signal' : 'text-ink/60 hover:text-ink',
                )}
                onClick={() => switchLocale('zh')}
              >
                中
              </button>
              <button
                type="button"
                aria-pressed={locale === 'en'}
                className={cn(
                  'rounded-full px-2.5 py-1 transition-colors',
                  locale === 'en' ? 'bg-ink text-signal' : 'text-ink/60 hover:text-ink',
                )}
                onClick={() => switchLocale('en')}
              >
                EN
              </button>
            </span>
            {SITE.registerUrl && (
              <a
                href={SITE.registerUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden rounded-full border-[3px] border-ink bg-ink px-5 py-2 text-sm font-bold text-signal shadow-hard-sm transition-[transform,box-shadow] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-2 sm:inline-flex"
              >
                {t('common.register')}
              </a>
            )}
            {/* mobile hamburger: two bars + one signal wave */}
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border-[3px] border-ink bg-paper shadow-hard-sm lg:hidden"
              aria-label={open ? t('aria.closeMenu') : t('aria.openMenu')}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#141414" strokeWidth="2.4" strokeLinecap="round">
                <path d="M3 7 H21" />
                <path d="M3 12 q2.2 -2.6 4.5 0 t4.5 0 t4.5 0 t4.5 0" />
                <path d="M3 17 H21" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* mobile full-screen drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[70] flex flex-col bg-signal lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            <div className="flex h-[72px] items-center justify-between border-b-[3px] border-ink px-6">
              <img src="/logo.svg" alt="" className="h-8 w-auto" />
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border-[3px] border-ink bg-paper font-mono text-lg font-bold shadow-hard-sm"
                aria-label={t('aria.closeMenu')}
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>
            <nav className="flex flex-1 flex-col justify-center gap-1 px-8" aria-label={t('aria.mobileNav')}>
              {NAV_ITEMS.map((item, i) => (
                <motion.div
                  key={item.to}
                  initial={{ y: 60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.06 * i, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <NavLink
                    to={localePath(item.to)}
                    end={item.to === '/'}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'block py-2.5 font-sans text-4xl font-black tracking-tight text-ink',
                        isActive && 'wave-underline inline-block bg-bottom pb-2',
                      )
                    }
                  >
                    {t(`nav.${item.id}`)}
                  </NavLink>
                </motion.div>
              ))}
            </nav>
            <motion.div
              className="border-t-[3px] border-ink px-8 py-6"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.35 }}
            >
              <img src="/divider-arch.svg" alt="" className="mb-5 h-8 w-full" />
              {SITE.registerUrl && (
                <a
                  href={SITE.registerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center rounded-full border-[3px] border-ink bg-ink px-7 py-3.5 text-lg font-bold text-signal shadow-hard"
                >
                  {t('common.register')} · {SITE.dateChip}
                </a>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
