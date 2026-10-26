import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/components/Button';
import { adminConfigured, submitSponsor } from '@/lib/adminApi';
import { pick, useLocale } from '@/lib/locale';
import { SITE } from '@/lib/site';

/** must stay in sync with amplify/functions/admin-api/lib.mjs SPONSOR_TIERS — `value` is what gets submitted */
const TIER_OPTIONS = [
  { value: '钻石赞助', label: { zh: '钻石赞助', en: 'Diamond' } },
  { value: '铂金赞助', label: { zh: '铂金赞助', en: 'Platinum' } },
  { value: '金牌赞助', label: { zh: '金牌赞助', en: 'Gold' } },
  { value: '银牌赞助', label: { zh: '银牌赞助', en: 'Silver' } },
  { value: '社区合作伙伴', label: { zh: '社区合作伙伴', en: 'Community Partner' } },
  { value: '宣传合作', label: { zh: '宣传合作', en: 'Media / Promo Partner' } },
];

const SPONSOR_MAILTO = `mailto:${SITE.email}?subject=${encodeURIComponent('赞助意向 // Bridge with Signal')}`;

const INPUT =
  'w-full rounded-lg border-2 border-ink bg-white px-3.5 py-2.5 font-sans text-[15px] text-ink placeholder:text-ink/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3FD4]';
const LABEL = 'mb-1.5 block font-mono text-xs font-bold uppercase tracking-[0.14em] text-ink/70';

const EMPTY = { company: '', contact: '', email: '', phone: '', tier: TIER_OPTIONS[0].value, note: '' };

/**
 * Sponsor application form (sponsor-apply). Posts to the admin API's public
 * /sponsor/submit endpoint → Feishu 赞助商报名表 (状态=待审核). After review
 * (状态=通过), the sponsor-logo-mailer emails the contact a logo-upload link.
 * Falls back to the mailto CTA when the API isn't configured.
 */
export default function SponsorForm() {
  const locale = useLocale();
  const { t } = useTranslation('sponsors');
  const [form, setForm] = useState(EMPTY);
  const [logo, setLogo] = useState<File | null>(null);
  const [website, setWebsite] = useState(''); // honeypot
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  if (!adminConfigured) {
    return (
      <div className="text-center">
        <Button variant="red" href={SPONSOR_MAILTO} className="px-10 py-4 text-lg">
          {t('form.submitCta')}
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
          {t('form.doneBody', { company: form.company, tier: pick(TIER_OPTIONS.find((x) => x.value === form.tier)?.label ?? { zh: form.tier }, locale), email: form.email })}
        </p>
      </div>
    );
  }

  const set = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    setError(null);
    try {
      await submitSponsor({ ...form, website }, logo);
      setState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('form.errorFallback'));
      setState('idle');
    }
  };

  return (
    <form id="sponsor-apply" onSubmit={submit} className="mx-auto max-w-[720px] rounded-lg border-[3px] border-ink bg-white p-6 text-left shadow-hard md:p-8">
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

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="spo-company" className={LABEL}>{t('form.companyLabel')} *</label>
          <input id="spo-company" required maxLength={60} value={form.company} onChange={set('company')} placeholder={t('form.companyPlaceholder')} className={INPUT} />
        </div>
        <div>
          <label htmlFor="spo-contact" className={LABEL}>{t('form.contactLabel')} *</label>
          <input id="spo-contact" required maxLength={30} value={form.contact} onChange={set('contact')} placeholder={t('form.contactPlaceholder')} className={INPUT} />
        </div>
        <div>
          <label htmlFor="spo-email" className={LABEL}>{t('form.emailLabel')} *</label>
          <input id="spo-email" type="email" required maxLength={100} value={form.email} onChange={set('email')} placeholder={t('form.emailPlaceholder')} className={INPUT} />
        </div>
        <div>
          <label htmlFor="spo-phone" className={LABEL}>{t('form.phoneLabel')}</label>
          <input id="spo-phone" type="tel" maxLength={30} value={form.phone} onChange={set('phone')} placeholder={t('form.phonePlaceholder')} className={INPUT} />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="spo-tier" className={LABEL}>{t('form.tierLabel')} *</label>
        <select id="spo-tier" value={form.tier} onChange={set('tier')} className={INPUT}>
          {TIER_OPTIONS.map((x) => (
            <option key={x.value} value={x.value}>
              {pick(x.label, locale)}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <label htmlFor="spo-note" className={LABEL}>{t('form.noteLabel')}</label>
        <textarea id="spo-note" maxLength={500} rows={3} value={form.note} onChange={set('note')} placeholder={t('form.notePlaceholder')} className={`${INPUT} resize-y`} />
      </div>

      <div className="mt-4">
        <label htmlFor="spo-logo" className={LABEL}>{t('form.logoLabel')}</label>
        <input
          id="spo-logo"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
          className={`${INPUT} cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-2 file:border-ink file:bg-[#FFD900] file:px-3.5 file:py-1.5 file:font-mono file:text-xs file:font-bold file:uppercase file:tracking-[0.12em] file:text-ink file:transition-colors hover:file:bg-ink hover:file:text-[#FFD900]`}
        />
        <p className="mt-1.5 font-mono text-xs text-ink/40">{t('form.logoHint')}</p>
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
        <a href={SPONSOR_MAILTO} className="underline decoration-2 underline-offset-4 transition-colors hover:text-ink">
          {SITE.email}
        </a>
      </p>
    </form>
  );
}
