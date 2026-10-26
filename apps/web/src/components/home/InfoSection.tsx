import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { pick, useLocale, useLocalePath } from '@/lib/locale';
import type { LText, LTextLike } from '@/lib/locale';
import { GhostLink } from '@/components/Button';
import Memphis from '@/components/Memphis';
import { subscribe } from '@/lib/adminApi';
import { SITE } from '@/lib/site';

const INFO_ROWS: [string, LTextLike][] = [
  ['DATE //', `${SITE.date} ${SITE.weekday} 09:00–17:00`],
  // 英文地址可在覆盖层 locales 或 event.yaml venue 中补充；缺省回退中文
  ['VENUE //', { zh: SITE.venue.address || SITE.venue.name, en: SITE.venue.address || SITE.venue.name }],
  ['TICKET //', { zh: '免费 · 需报名审核', en: 'Free · registration subject to approval' }],
  ['LANG //', { zh: '中文为主', en: 'Primarily in Chinese' }],
];

const FAQS: { q: LText; a: LText }[] = [
  {
    q: { zh: '如何成为演讲者？', en: 'How do I become a speaker?' },
    a: {
      zh: SITE.cfpOpen
        ? `通过 CFP 提交议题，截止 ${SITE.cfpClose}。我们欢迎一线实战经验，不讲 PPT 广告。`
        : `通过 CFP 提交议题。本届征集已于 ${SITE.cfpClose} 截止，评审结果会邮件通知投稿人。我们欢迎一线实战经验，不讲 PPT 广告。`,
      en: SITE.cfpOpen
        ? `Submit your proposal through the CFP before ${SITE.cfpClose}. We welcome front-line, hands-on experience — no PPT ads.`
        : `Proposals are submitted through the CFP. This edition closed on ${SITE.cfpClose}; results are sent to submitters by email. We welcome front-line, hands-on experience — no PPT ads.`,
    },
  },
  {
    q: { zh: '演讲会有录制吗？', en: 'Will the talks be recorded?' },
    a: {
      zh: '主论坛演讲会在会后统一剪辑并发布到社区频道（征得讲者同意）；分论坛与 Workshop 以现场参与为准，不保证录制。',
      en: 'Keynote talks will be edited and published on community channels after the event (with speaker consent); track sessions and workshops are live-first and are not guaranteed to be recorded.',
    },
  },
  {
    q: { zh: '适合什么人参加？', en: 'Who should attend?' },
    a: {
      zh: '云从业者、架构师、AI/Agent 开发者、初创技术团队，以及所有想在真实场景里动手验证想法的建造者。零基础可逛市集与入门轨。',
      en: 'Cloud practitioners, architects, AI/Agent developers, startup tech teams, and every builder who wants to validate ideas hands-on in real scenarios. Beginners can enjoy the market and the beginner track.',
    },
  },
];

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

function FaqItem({ q, a, index, open, onToggle }: { q: string; a: string; index: number; open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-lg border-[3px] border-ink bg-white shadow-hard-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        <span className="font-mono text-xs font-medium tracking-wider text-ink/50">Q.{String(index + 1).padStart(2, '0')}</span>
        <span className="flex-1 font-sans font-bold text-ink">{q}</span>
        <motion.span
          aria-hidden="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-ink font-mono text-base font-bold"
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.25 }}
        >
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            {/* bridge line draws once when opened */}
            <motion.span
              className="mx-5 block h-[2px] origin-left bg-ink"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.1 }}
              aria-hidden="true"
            />
            <p className="px-5 pb-5 pt-3 leading-[1.75] text-paper-dim">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * S12 — practical info ("过桥须知") + FAQ quick accordion. Entrance: the two
 * cards slide toward each other (Framer Motion owns this component's motion).
 */
export default function InfoSection() {
  const { t } = useTranslation('home');
  const locale = useLocale();
  const lp = useLocalePath();
  const [openIdx, setOpenIdx] = useState<number>(0);
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  const submitSubscribe = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    setError(null);
    try {
      await subscribe(email, website);
      setState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : '订阅失败，请稍后重试');
      setState('idle');
    }
  };

  return (
    <section className="bg-paper pb-24 md:pb-32">
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-8 px-6 lg:grid-cols-2 xl:px-12">
        {/* left: info card */}
        <motion.div
          initial={{ x: -30, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="relative rounded-lg border-[3px] border-ink bg-white p-7 shadow-hard-lg md:p-9"
        >
          <Memphis id="tri-1" className="pointer-events-none absolute -bottom-4 left-8 h-12 w-16" />
          <p className="inline-flex items-center gap-2.5 font-mono text-[13px] font-medium uppercase tracking-[0.18em] text-ink">
            <span className="inline-block h-3 w-3 border-2 border-ink bg-sunset" />
            SIG.08 // INFO
          </p>
          <h2 className="mt-4 font-sans text-[clamp(28px,3.4vw,44px)] font-black text-ink">{t('info.title')}</h2>
          <dl className="mt-6 space-y-3 font-mono text-sm">
            {INFO_ROWS.map(([k, v]) => (
              <div key={k} className="flex flex-wrap gap-x-3 gap-y-1 border-b border-ink/10 pb-3">
                <dt className="w-24 shrink-0 font-medium tracking-wider text-ink/60">{k}</dt>
                <dd className="font-medium text-ink">{pick(v, locale)}</dd>
              </div>
            ))}
          </dl>
          {state === 'done' ? (
            <p className="mt-6 inline-flex items-center gap-2 rounded-full border-[3px] border-ink bg-growth px-5 py-2.5 font-sans text-sm font-bold text-ink">
              {t('info.subscribed')}
            </p>
          ) : (
            <form className="mt-6 flex flex-wrap gap-3" onSubmit={submitSubscribe}>
              {/* honeypot — 人类不可见 */}
              <input
                type="text"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('info.emailPlaceholder')}
                aria-label={t('info.emailAria')}
                className="min-w-0 flex-1 rounded-full border-[3px] border-ink bg-paper px-5 py-2.5 font-mono text-sm outline-none transition-colors placeholder:text-ink/35 focus:border-pulse"
              />
              <button
                type="submit"
                disabled={state === 'sending'}
                className="rounded-full border-[3px] border-ink bg-transparent px-5 py-2.5 font-sans text-sm font-bold text-ink shadow-hard-sm transition-[transform,box-shadow,background-color] hover:-translate-y-0.5 hover:bg-signal hover:shadow-hard active:translate-y-0 active:shadow-hard-2 disabled:opacity-50"
              >
                {state === 'sending' ? '…' : t('info.notify')}
              </button>
              {error && <p className="w-full font-sans text-sm font-bold text-[#FF4D3D]">{error}</p>}
            </form>
          )}
        </motion.div>

        {/* right: FAQ quick view */}
        <motion.div
          initial={{ x: 30, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <div className="space-y-4">
            {FAQS.map((f, i) => (
              <FaqItem key={f.q.zh} q={pick(f.q, locale)} a={pick(f.a, locale)} index={i} open={openIdx === i} onToggle={() => setOpenIdx(openIdx === i ? -1 : i)} />
            ))}
          </div>
          <GhostLink to={lp('/faq')} className="mt-6">
            {t('info.allFaq')}
          </GhostLink>
        </motion.div>
      </div>
    </section>
  );
}
