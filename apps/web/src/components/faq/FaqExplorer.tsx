import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import Reveal from '@/components/Reveal';
import { SITE } from '@/lib/site';
import { useLocale, useLocalePath, pick } from '@/lib/locale';
import type { LText, Locale } from '@/lib/locale';
import { cn } from '@/lib/utils';

type Cat = '参会' | '演讲' | '票务' | '交通' | '其他';

const CATS: Cat[] = ['参会', '演讲', '票务', '交通', '其他'];

/** chip labels for category ids (ids stay as-is — they double as data keys) */
const CAT_LABELS: Record<'全部' | Cat, LText> = {
  全部: { zh: '全部', en: 'All' },
  参会: { zh: '参会', en: 'Attending' },
  演讲: { zh: '演讲', en: 'Speaking' },
  票务: { zh: '票务', en: 'Tickets' },
  交通: { zh: '交通', en: 'Getting There' },
  其他: { zh: '其他', en: 'Misc' },
};

/** context handed to answers that embed locale-aware links */
interface AnswerCtx {
  locale: Locale;
  localePath: (to: string) => string;
}

interface FaqItem {
  id: string;
  cat: Cat;
  q: LText;
  answer: LText | ((ctx: AnswerCtx) => ReactNode);
  /** plain text used for search matching */
  search: LText;
}

const mail = (label: string) => (
  <a href={`mailto:${SITE.email}`} className="font-bold text-ink underline underline-offset-2">
    {label}
  </a>
);

/** faq.md §S3 — 12 questions, numbering continuous across the page. */
const FAQS: FaqItem[] = [
  {
    id: 'Q.01',
    cat: '参会',
    q: { zh: '大会门票收费吗？', en: 'Is there an admission fee?' },
    answer: {
      zh: '免费。为保证到场率采用报名审核制，审核通过后凭确认邮件/短信签到入场。',
      en: 'Free. To ensure attendance, registration is reviewed; once approved, check in with your confirmation email/SMS.',
    },
    search: {
      zh: '大会门票收费吗 免费 报名审核制 确认邮件 短信 签到入场',
      en: 'admission fee ticket free registration review approval confirmation email sms check-in',
    },
  },
  {
    id: 'Q.02',
    cat: '参会',
    q: { zh: '适合什么人参加？', en: 'Who should attend?' },
    answer: {
      zh: '开发者、架构师、运维/SRE、数据与 AI 工程师、技术管理者，以及对云计算感兴趣的学生。内容以中级深度为主，也有入门与闪电演讲。',
      en: 'Developers, architects, Ops/SREs, data and AI engineers, tech leads, and students curious about cloud computing. Most content is intermediate-depth, with beginner sessions and lightning talks too.',
    },
    search: {
      zh: '适合什么人参加 开发者 架构师 运维 SRE 数据 AI 工程师 技术管理者 学生 云计算 中级 入门 闪电演讲',
      en: 'who should attend developers architects ops sre data ai engineers tech leads students cloud computing intermediate beginner lightning talks',
    },
  },
  {
    id: 'Q.03',
    cat: '参会',
    q: { zh: '需要带电脑吗？', en: 'Do I need to bring a laptop?' },
    answer: {
      zh: '参加 Hands-on Workshop 建议携带（会场提供 Wi-Fi 与实验账号）；仅听演讲无需携带。',
      en: "Recommended for Hands-on Workshops (Wi-Fi and lab accounts are provided at the venue); not needed if you're only attending talks.",
    },
    search: {
      zh: '需要带电脑吗 Hands-on Workshop Wi-Fi 实验账号 演讲',
      en: 'bring laptop computer hands-on workshop wi-fi lab account talks',
    },
  },
  {
    id: 'Q.04',
    cat: '参会',
    q: { zh: '现场提供午餐吗？', en: 'Is lunch provided?' },
    answer: {
      zh: '提供简餐与全天茶歇；开发者市集同步开放。',
      en: 'Light meals and all-day refreshments are provided, and the developer bazaar stays open alongside.',
    },
    search: {
      zh: '现场提供午餐吗 简餐 茶歇 开发者市集',
      en: 'lunch light meals refreshments developer bazaar market',
    },
  },
  {
    id: 'Q.05',
    cat: '演讲',
    q: { zh: '如何成为演讲者？', en: 'How do I become a speaker?' },
    answer: ({ locale, localePath }) => (
      <>
        {pick(
          {
            zh: '本届议题征集已于 2026.08.31 截止，最终议程见 ',
            en: 'The call for proposals closed on 2026.08.31 — see the final agenda on ',
          },
          locale,
        )}
        <Link to={localePath('/schedule')} className="font-bold text-ink underline underline-offset-2">
          /schedule
        </Link>
        {pick(
          {
            zh: '。下一届征稿会在社区渠道提前公布，首次登台欢迎，社区提供一对一演讲辅导。',
            en: '. The next call will be announced on community channels in advance. First-time speakers are welcome — the community offers 1-on-1 talk coaching.',
          },
          locale,
        )}
      </>
    ),
    search: {
      zh: '如何成为演讲者 cfp 提交议题 截止 2026.08.31 已截止 日程 议程 下一届 首次登台 演讲辅导',
      en: 'become a speaker cfp submit proposal deadline 2026.08.31 closed schedule agenda next edition first-time speaker coaching',
    },
  },
  {
    id: 'Q.06',
    cat: '票务',
    q: { zh: '报名后如何确认？', en: 'How do I confirm my registration?' },
    answer: {
      zh: '审核结果于报名后 3 个工作日内邮件通知；10.10 起陆续发送含签到码的确认函。',
      en: 'Review results are emailed within 3 business days of registration; confirmation letters with check-in codes go out starting 10.10.',
    },
    search: {
      zh: '报名后如何确认 审核结果 3 个工作日 邮件通知 10.10 签到码 确认函',
      en: 'registration confirmation review result 3 business days email 10.10 check-in code confirmation letter',
    },
  },
  {
    id: 'Q.07',
    cat: '交通',
    q: { zh: '会场在哪里？', en: 'Where is the venue?' },
    answer: {
      zh: '深圳市宝安区新安街道兴东社区 70 区雪花路 1 号雪花科技大厦 6 楼。地铁兴东站 B 口出站，步行约 10 分钟（途经啤酒小镇）；驾车导航「雪花科技大厦」。',
      en: "6F, Xuehua Technology Building, No. 1 Xuehua Road, Area 70, Xingdong Community, Xin'an Subdistrict, Bao'an District, Shenzhen. Metro: Xingdong Station, Exit B — about a 10-minute walk via the Beer Town. Driving: navigate to \"Xuehua Technology Building\".",
    },
    search: {
      zh: '会场在哪里 深圳 宝安 新安 兴东 雪花路 雪花科技大厦 地铁 兴东站 驾车 导航 啤酒小镇',
      en: 'venue location shenzhen baoan xuehua road xuehua technology building metro subway xingdong station driving parking',
    },
  },
  {
    id: 'Q.08',
    cat: '交通',
    q: { zh: '有停车与住宿建议吗？', en: 'Any parking and hotel recommendations?' },
    answer: {
      zh: '场地已确定，周边停车场与住宿建议将在本页陆续更新。',
      en: "The venue is confirmed — we'll update this page with nearby parking and hotel recommendations.",
    },
    search: {
      zh: '停车 住宿 停车场',
      en: 'parking accommodation hotels nearby parking lots',
    },
  },
  {
    id: 'Q.09',
    cat: '其他',
    q: { zh: '如何成为志愿者？', en: 'How do I become a volunteer?' },
    answer: ({ locale, localePath }) => (
      <>
        {pick({ zh: '前往 ', en: 'Apply to become a Bridge Keeper on the ' }, locale)}
        <Link to={localePath('/volunteers')} className="font-bold text-ink underline underline-offset-2">
          {pick({ zh: '志愿者页', en: 'Volunteers page' }, locale)}
        </Link>
        {pick({ zh: ' 申请成为守桥人，截止 09.30。', en: ' by 09.30.' }, locale)}
      </>
    ),
    search: {
      zh: '如何成为志愿者 守桥人 申请 截止 09.30 volunteers',
      en: 'become a volunteer bridge keeper apply deadline 09.30 volunteers',
    },
  },
  {
    id: 'Q.10',
    cat: '其他',
    q: { zh: '企业可以组团参加吗？', en: 'Can companies attend as a group?' },
    answer: ({ locale }) => (
      <>
        {pick({ zh: '欢迎。10 人以上团队请联系 ', en: 'Absolutely. Groups of 10+ can contact ' }, locale)}
        {mail(SITE.email)}
        {pick({ zh: ' 获取团体签到通道。', en: ' for a group check-in lane.' }, locale)}
      </>
    ),
    search: {
      zh: '企业组团参加 10 人 团队 团体签到通道 contact@awscommunity.cn',
      en: 'company group attend 10 people team group check-in lane contact@awscommunity.cn',
    },
  },
];

/** §5.7 accordion item — mono number, ＋ rotates 45° to ×, top bridge line draws once. */
function AccordionItem({ item, open, onToggle }: { item: FaqItem; open: boolean; onToggle: () => void }) {
  const locale = useLocale();
  const localePath = useLocalePath();
  return (
    <div className="rounded-lg border-[3px] border-ink bg-white shadow-hard-sm">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left md:px-6">
        <span className="shrink-0 font-mono text-xs font-medium tracking-[0.14em] text-ink/60">{item.id}</span>
        <span className="flex-1 font-sans text-base font-bold text-ink md:text-lg">{pick(item.q, locale)}</span>
        <span aria-hidden="true" className={cn('shrink-0 font-mono text-2xl leading-none text-ink transition-transform duration-300', open && 'rotate-45')}>
          ＋
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.1, ease: 'easeOut' }}
              className="mx-5 h-[2px] origin-left bg-ink md:mx-6"
              aria-hidden="true"
            />
            <div className="px-5 pb-5 pt-4 text-[15px] leading-[1.8] text-paper-dim md:px-6 md:pl-[4.75rem]">
              {typeof item.answer === 'function' ? item.answer({ locale, localePath }) : pick(item.answer, locale)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * faq.md §S2+S3 — sticky search/category bar + grouped accordion with live
 * filtering. Non-matching entries collapse (opacity 0 + height 0, 200ms);
 * matching entries stagger in at 0.04s. One panel open at a time.
 */
export default function FaqExplorer() {
  const { t } = useTranslation('faq');
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<'全部' | Cat>('全部');
  const [openId, setOpenId] = useState<string | null>(null);

  const visibleIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    return new Set(
      FAQS.filter((f) => (cat === '全部' || f.cat === cat) && (q === '' || pick(f.search, locale).toLowerCase().includes(q))).map((f) => f.id),
    );
  }, [query, cat, locale]);

  /** stagger order among currently visible items */
  const visibleIndex = useMemo(() => {
    const m = new Map<string, number>();
    FAQS.filter((f) => visibleIds.has(f.id)).forEach((f, i) => m.set(f.id, i));
    return m;
  }, [visibleIds]);

  // changing the filter also closes the open panel (done in the handlers,
  // not an effect, so the accordion never shows a filtered-out answer)
  const onQuery = (v: string) => {
    setQuery(v);
    setOpenId(null);
  };
  const onCat = (c: '全部' | Cat) => {
    setCat(c);
    setOpenId(null);
  };

  return (
    <>
      {/* S2 — sticky search + category bar (sits right under the 72px navbar) */}
      <div className="sticky top-[72px] z-40 border-b-[3px] border-ink bg-paper">
        <div className="mx-auto flex min-h-[72px] max-w-[1280px] flex-wrap items-center gap-3 px-6 py-3 xl:px-12">
          <label className="relative min-w-[220px] flex-1 md:max-w-[420px]">
            <span className="sr-only">{t('explorer.searchLabel')}</span>
            <span aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-base text-ink/60">
              ⌕
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder={t('explorer.searchPlaceholder')}
              className="w-full rounded-full border-[3px] border-ink bg-white py-2.5 pl-11 pr-4 font-sans text-sm text-ink outline-none transition-colors placeholder:text-ink/40 focus:border-pulse"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('explorer.filterAria')}>
            {(['全部', ...CATS] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={cat === c}
                onClick={() => onCat(c)}
                className={cn(
                  'cursor-pointer rounded-full border-[3px] border-ink px-4 py-1.5 font-sans text-sm font-bold transition-colors duration-150',
                  cat === c ? 'bg-ink text-signal' : 'bg-transparent text-ink hover:bg-signal',
                )}
              >
                {pick(CAT_LABELS[c], locale)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* S3 — grouped question list */}
      <section className="bg-paper px-6 py-16 md:py-20">
        <Reveal className="mx-auto max-w-[880px]" stagger={0.06} y={40}>
          {CATS.map((c) => {
            const items = FAQS.filter((f) => f.cat === c);
            const groupVisible = items.some((f) => visibleIds.has(f.id));
            return (
              <div key={c}>
                <motion.div
                  initial={false}
                  animate={{ height: groupVisible ? 'auto' : 0, opacity: groupVisible ? 1 : 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="pb-12">
                    <p className="inline-flex items-center gap-2.5 font-mono text-[13px] font-medium uppercase tracking-[0.18em] text-ink">
                      <span className="inline-block h-3 w-3 border-2 border-ink bg-pulse" aria-hidden="true" />
                      CATEGORY // {pick(CAT_LABELS[c], locale)}
                    </p>
                    <div className="mt-5">
                      {items.map((item) => {
                        const vis = visibleIds.has(item.id);
                        return (
                          <motion.div
                            key={item.id}
                            initial={false}
                            animate={{ height: vis ? 'auto' : 0, opacity: vis ? 1 : 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut', delay: vis ? (visibleIndex.get(item.id) ?? 0) * 0.04 : 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pb-4">
                              <AccordionItem item={item} open={openId === item.id} onToggle={() => setOpenId(openId === item.id ? null : item.id)} />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </Reveal>

        {/* empty state */}
        {visibleIds.size === 0 && (
          <div className="mx-auto max-w-[880px]">
            <div className="rounded-lg border-[3px] border-ink bg-white p-10 text-center shadow-hard">
              <p className="font-mono text-sm font-medium tracking-[0.14em] text-ink">{t('explorer.emptyTitle')}</p>
              <a
                href={`mailto:${SITE.email}?subject=${encodeURIComponent(t('mailSubject'))}`}
                className="group mt-5 inline-flex items-center gap-2 font-mono text-sm font-medium uppercase tracking-[0.12em] text-ink"
              >
                <span className="underline decoration-2 underline-offset-4">{t('explorer.emptyCta')}</span>
                <span aria-hidden="true" className="inline-block transition-transform duration-300 group-hover:translate-x-1.5">
                  →
                </span>
              </a>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
