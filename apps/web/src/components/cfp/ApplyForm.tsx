import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/components/Button';
import { adminConfigured, submitCfp } from '@/lib/adminApi';
import { CFP_MAILTO } from '@/components/cfp/CfpHero';
import { TRACKS } from '@/components/schedule/data';
import { pick, useLocale } from '@/lib/locale';
import { SITE } from '@/lib/site';
import { cn } from '@/lib/utils';

/** must stay in sync with amplify/functions/admin-api/lib.mjs FORMAT_OPTIONS — `value` is what gets submitted */
const FORMAT_OPTIONS = [
  { value: '深度分享（35min）', label: { zh: '深度分享（35min）', en: 'Deep Dive (35 min)' } },
  { value: '闪电演讲（10min）', label: { zh: '闪电演讲（10min）', en: 'Lightning Talk (10 min)' } },
  { value: 'Workshop（60–90min）', label: { zh: 'Workshop（60–90min）', en: 'Workshop (60–90 min)' } },
];
const TRACK_OPTIONS = TRACKS.filter((t) => t.id !== 'keynote');

/** must stay in sync with amplify/functions/admin-api/lib.mjs COMMUNITY_TITLES — program names stay in English */
const COMMUNITY_TITLES = [
  { value: 'community_hero', label: 'Community Hero' },
  { value: 'community_builder', label: 'Community Builder' },
  { value: 'user_group_leader', label: 'User Group Leader' },
  { value: 'user_group_ambassador', label: 'User Group Ambassador' },
];

const INPUT =
  'w-full rounded-lg border-2 border-ink bg-white px-3.5 py-2.5 font-sans text-[15px] text-ink placeholder:text-ink/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3FD4]';
const LABEL = 'mb-1.5 block font-mono text-xs font-bold uppercase tracking-[0.14em] text-ink/70';

const EMPTY = { name: '', email: '', phone: '', talk: '', track: 'ai', format: FORMAT_OPTIONS[0].value, abstract: '', bio: '' };

/**
 * CFP submission form (cfp-apply). Posts to the admin API's public
 * /cfp/submit endpoint → Feishu 投稿表 (状态=待审核). Falls back to the
 * mailto CTA when the API isn't configured.
 */
export default function ApplyForm() {
  const locale = useLocale();
  const { t } = useTranslation('cfp');
  const [form, setForm] = useState(EMPTY);
  const [titles, setTitles] = useState<string[]>([]);
  const [website, setWebsite] = useState(''); // honeypot
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  if (!SITE.cfpOpen) {
    return (
      <div className="mx-auto max-w-[560px] rounded-lg border-[3px] border-ink bg-white p-8 text-center shadow-hard">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#FF4D3D]">{t('form.closedKicker')}</p>
        <h3 className="mt-3 font-sans text-xl font-black text-ink">{t('form.closedTitle')}</h3>
        <p className="mt-3 text-sm leading-relaxed text-paper-dim">{t('form.closedBody')}</p>
        <p className="mt-4 font-mono text-[13px] tracking-[0.12em] text-paper-dim">
          {t('form.mailtoHint')}{' '}
          <a href={CFP_MAILTO} className="underline decoration-2 underline-offset-4 transition-colors hover:text-ink">
            {SITE.email}
          </a>
        </p>
      </div>
    );
  }

  if (!adminConfigured) {
    return (
      <div className="text-center">
        <Button variant="red" href={CFP_MAILTO} className="px-10 py-4 text-lg">
          {t('form.mailtoCta')}
        </Button>
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div className="mx-auto max-w-[560px] rounded-lg border-[3px] border-ink bg-white p-8 text-center shadow-hard">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#2ECC71]">{t('form.doneKicker')}</p>
        <h3 className="mt-3 font-sans text-xl font-black text-ink">{t('form.doneTitle')}</h3>
        <p className="mt-3 text-sm leading-relaxed text-paper-dim">
          {t('form.doneBody', { talk: form.talk, email: form.email })}
        </p>
      </div>
    );
  }

  const set = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggleTitle = (v: string) => setTitles((xs) => (xs.includes(v) ? xs.filter((x) => x !== v) : [...xs, v]));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    setError(null);
    try {
      await submitCfp({ ...form, communityTitle: titles, website });
      setState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('form.errorFallback'));
      setState('idle');
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-[720px] rounded-lg border-[3px] border-ink bg-white p-6 text-left shadow-hard md:p-8">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#FF4D3D]">{t('form.kicker')}</p>
      <h3 className="mt-2 font-sans text-xl font-black text-ink md:text-2xl">{t('form.title')}</h3>

      {/* honeypot — invisible to humans, bots love it */}
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

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="cfp-name" className={LABEL}>{t('form.nameLabel')} *</label>
          <input id="cfp-name" required maxLength={30} value={form.name} onChange={set('name')} placeholder={t('form.namePlaceholder')} className={INPUT} />
        </div>
        <div>
          <label htmlFor="cfp-email" className={LABEL}>{t('form.emailLabel')} *</label>
          <input id="cfp-email" type="email" required maxLength={100} value={form.email} onChange={set('email')} placeholder={t('form.emailPlaceholder')} className={INPUT} />
        </div>
        <div>
          <label htmlFor="cfp-phone" className={LABEL}>{t('form.phoneLabel')}</label>
          <input id="cfp-phone" type="tel" maxLength={30} value={form.phone} onChange={set('phone')} placeholder={t('form.phonePlaceholder')} className={INPUT} />
        </div>
      </div>

      <div className="mt-4">
        <span className={LABEL}>
          {t('form.communityLabel')}
          <span className="ml-1.5 font-normal normal-case text-ink/40">{t('form.communityHint')}</span>
          {/* hand-drawn "!" badge — hover/focus reveals the explanation (neat-annotations) */}
          <span
            tabIndex={0}
            aria-label={t('form.communityNote')}
            data-note={t('form.communityNote')}
            className="ann ann-hover ann-nw ann-no-mark ml-2 inline-flex h-4 w-4 -translate-y-0.5 items-center justify-center rounded-full border-2 border-ink/60 align-middle font-mono text-[10px] font-bold text-ink/60"
          >
            !
          </span>
        </span>
        <div className="flex flex-wrap gap-2">
          {COMMUNITY_TITLES.map((c) => {
            const active = titles.includes(c.value);
            return (
              <button
                key={c.value}
                type="button"
                aria-pressed={active}
                onClick={() => toggleTitle(c.value)}
                className={cn(
                  'cursor-pointer rounded-full border-2 border-ink px-3.5 py-1.5 font-mono text-[13px] font-medium transition-colors',
                  active ? 'bg-[#6C3FD4] text-white' : 'bg-white text-ink hover:bg-signal',
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="cfp-talk" className={LABEL}>{t('form.talkLabel')} *</label>
        <input id="cfp-talk" required maxLength={60} value={form.talk} onChange={set('talk')} placeholder={t('form.talkPlaceholder')} className={INPUT} />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="cfp-track" className={LABEL}>{t('form.trackLabel')} *</label>
          <select id="cfp-track" value={form.track} onChange={set('track')} className={INPUT}>
            {TRACK_OPTIONS.map((track) => (
              <option key={track.id} value={track.id}>
                {pick(track.bridge, locale)} · {track.signal}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs leading-relaxed text-ink/50">{t(`form.trackHints.${form.track}`)}</p>
        </div>
        <div>
          <label htmlFor="cfp-format" className={LABEL}>{t('form.formatLabel')} *</label>
          <select id="cfp-format" value={form.format} onChange={set('format')} className={INPUT}>
            {FORMAT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {pick(f.label, locale)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="cfp-abstract" className={LABEL}>
          {t('form.abstractLabel')} * <span className="font-normal normal-case text-ink/40">{t('form.abstractHint', { count: form.abstract.length })}</span>
        </label>
        <textarea
          id="cfp-abstract"
          required
          minLength={50}
          maxLength={1000}
          rows={5}
          value={form.abstract}
          onChange={set('abstract')}
          placeholder={t('form.abstractPlaceholder')}
          className={`${INPUT} resize-y`}
        />
      </div>

      <div className="mt-4">
        <label htmlFor="cfp-bio" className={LABEL}>{t('form.bioLabel')}</label>
        <textarea id="cfp-bio" maxLength={500} rows={2} value={form.bio} onChange={set('bio')} placeholder={t('form.bioPlaceholder')} className={`${INPUT} resize-y`} />
      </div>

      {error && <p className="mt-4 font-sans text-sm font-bold text-[#FF4D3D]">{error}</p>}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-[28rem]">
          <p className="font-mono text-xs text-ink/50">{t('form.note')}</p>
          <p className="mt-1.5 font-sans text-[12px] leading-relaxed text-ink/45">{t('form.privacy')}</p>
        </div>
        <Button variant="red" type="submit" className="px-10 py-3.5 text-lg">
          {state === 'sending' ? t('form.submitting') : t('form.submitCta')}
        </Button>
      </div>

      <p className="mt-4 font-mono text-[13px] tracking-[0.12em] text-paper-dim">
        {t('form.mailtoHint')}{' '}
        <a href={CFP_MAILTO} className="underline decoration-2 underline-offset-4 transition-colors hover:text-ink">
          {SITE.email}
        </a>
      </p>
    </form>
  );
}
