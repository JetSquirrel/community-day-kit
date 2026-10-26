import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@/components/Button';
import { adminConfigured, submitVolunteer } from '@/lib/adminApi';
import { VOL_MAILTO } from '@/components/volunteers/VolHero';
import { pick, useLocale } from '@/lib/locale';
import { SITE } from '@/lib/site';

/** must stay in sync with amplify/functions/admin-api/lib.mjs VOLUNTEER_ROLES — `value` is what gets submitted */
const ROLE_OPTIONS = [
  { value: '签到引导组', label: { zh: '签到引导组', en: 'Check-in & Wayfinding' } },
  { value: '会场执行组', label: { zh: '会场执行组', en: 'Venue Operations' } },
  { value: '直播技术组', label: { zh: '直播技术组', en: 'Livestream Tech' } },
  { value: '摄影记录组', label: { zh: '摄影记录组', en: 'Photography & Recording' } },
  { value: '嘉宾接待组', label: { zh: '嘉宾接待组', en: 'Guest Reception' } },
  { value: '物料后勤组', label: { zh: '物料后勤组', en: 'Logistics & Supplies' } },
];

const INPUT =
  'w-full rounded-lg border-2 border-ink bg-white px-3.5 py-2.5 font-sans text-[15px] text-ink placeholder:text-ink/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3FD4]';
const LABEL = 'mb-1.5 block font-mono text-xs font-bold uppercase tracking-[0.14em] text-ink/70';

const EMPTY = { name: '', email: '', phone: '', role: ROLE_OPTIONS[0].value, note: '' };

/**
 * Volunteer application form (vol-apply). Posts to the admin API's public
 * /volunteer/submit endpoint → Feishu 志愿者报名表 (状态=待审核). Falls back
 * to the mailto CTA when the API isn't configured.
 */
export default function VolunteerForm() {
  const locale = useLocale();
  const { t } = useTranslation('volunteers');
  const [form, setForm] = useState(EMPTY);
  const [website, setWebsite] = useState(''); // honeypot
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  if (!adminConfigured) {
    return (
      <div className="text-center">
        <Button variant="red" href={VOL_MAILTO} className="px-10 py-4 text-lg">
          {t('apply.cta')}
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
          {t('form.doneBody', { role: pick(ROLE_OPTIONS.find((r) => r.value === form.role)?.label ?? { zh: form.role }, locale), email: form.email })}
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
      await submitVolunteer({ ...form, website });
      setState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('form.errorFallback'));
      setState('idle');
    }
  };

  return (
    <form id="vol-apply" onSubmit={submit} className="mx-auto max-w-[720px] rounded-lg border-[3px] border-ink bg-white p-6 text-left shadow-hard md:p-8">
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
          <label htmlFor="vol-name" className={LABEL}>{t('form.nameLabel')} *</label>
          <input id="vol-name" required maxLength={30} value={form.name} onChange={set('name')} placeholder={t('form.namePlaceholder')} className={INPUT} />
        </div>
        <div>
          <label htmlFor="vol-email" className={LABEL}>{t('form.emailLabel')} *</label>
          <input id="vol-email" type="email" required maxLength={100} value={form.email} onChange={set('email')} placeholder={t('form.emailPlaceholder')} className={INPUT} />
        </div>
        <div>
          <label htmlFor="vol-phone" className={LABEL}>{t('form.phoneLabel')}</label>
          <input id="vol-phone" type="tel" maxLength={30} value={form.phone} onChange={set('phone')} placeholder={t('form.phonePlaceholder')} className={INPUT} />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="vol-role" className={LABEL}>{t('form.roleLabel')} *</label>
        <select id="vol-role" value={form.role} onChange={set('role')} className={INPUT}>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {pick(r.label, locale)}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <label htmlFor="vol-note" className={LABEL}>{t('form.noteLabel')}</label>
        <textarea id="vol-note" maxLength={500} rows={3} value={form.note} onChange={set('note')} placeholder={t('form.notePlaceholder')} className={`${INPUT} resize-y`} />
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
        <a href={VOL_MAILTO} className="underline decoration-2 underline-offset-4 transition-colors hover:text-ink">
          {SITE.email}
        </a>
      </p>
    </form>
  );
}
