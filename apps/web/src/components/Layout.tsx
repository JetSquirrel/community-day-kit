import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useOutlet } from 'react-router';
import { useTranslation } from 'react-i18next';
import Lenis from 'lenis';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';
import { detectLocaleByIp, getLangPref, setLangPref } from '@/lib/locale';
import type { Locale } from '@/lib/locale';

/**
 * Shared layout — nested-route pattern (Layout renders <Outlet/>, so App.tsx
 * MUST declare pages as child <Route>s of this layout route).
 *
 * Owns: Navbar (sticky, in normal flow), page-transition wrapper, Footer,
 * Lenis smooth scrolling synced with GSAP ScrollTrigger, scroll restore.
 */
export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const outlet = useOutlet();
  const lenisRef = useRef<Lenis | null>(null);
  const { i18n } = useTranslation();
  const locale: Locale = /^\/en(\/|$)/.test(location.pathname) ? 'en' : 'zh';

  // 首次访问（无语言偏好）按 IP 识别一次：非中国 IP 切到 /en，之后记忆该选择
  useEffect(() => {
    const saved = getLangPref();
    if (saved) return;
    let cancelled = false;
    void detectLocaleByIp().then((detected) => {
      if (cancelled) return;
      setLangPref(detected);
      if (detected === 'en' && !/^\/en(\/|$)/.test(location.pathname)) {
        const next = `/en${location.pathname === '/' ? '' : location.pathname}`;
        navigate(`${next}${location.search}${location.hash}`, { replace: true });
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sync i18n language + document meta with the URL locale prefix
  useEffect(() => {
    void i18n.changeLanguage(locale);
    document.documentElement.lang = locale === 'en' ? 'en' : 'zh-CN';
    document.title = i18n.t('meta.title');
    document.querySelector('meta[name="description"]')?.setAttribute('content', i18n.t('meta.description'));
  }, [i18n, locale]);

  // Lenis smooth scroll, driven by the GSAP ticker (design.md §4: lerp 0.1)
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const lenis = new Lenis({ lerp: 0.1 });
    lenisRef.current = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener('load', onLoad);
    return () => {
      window.removeEventListener('load', onLoad);
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // scroll to top on route change
  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Navbar />
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={location.pathname}
          className="flex-1"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {outlet}
        </motion.main>
      </AnimatePresence>
      <Footer />
    </div>
  );
}
