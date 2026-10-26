import { useEffect, useRef, useState } from 'react';
import {
  AdminApiError,
  fetchCrmSpeakers,
  fetchCrmSponsors,
  updateCrm,
  uploadImage,
} from '@/lib/adminApi';
import type { CrmSpeaker, CrmSponsor } from '@/lib/adminApi';
import { cn } from '@/lib/utils';

/**
 * /admin CRM panels — 讲师 & 赞助商管理（CRM），照片 / Logo 直传即上站（CMS）。
 * 每张卡片本地编辑，「保存」提交字段白名单；图片选择后立即上传并回写 CDN URL。
 */

const TRACK_OPTIONS = ['keynote', 'ai', 'builder', 'spark', 'global'];

const INPUT =
  'w-full rounded-md border-2 border-ink/60 bg-white px-2.5 py-1.5 font-sans text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3FD4]';
const LABEL = 'mb-1 block font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-ink/50';

interface PanelProps {
  onUnauthorized: () => void;
}

function useCrm<T>(fetcher: () => Promise<{ rows: T[] }>, onUnauthorized: () => void) {
  const [rows, setRows] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    try {
      const res = await fetcher();
      setRows(res.rows);
      setError(null);
    } catch (e) {
      if (e instanceof AdminApiError && e.status === 401) return onUnauthorized();
      setError(e instanceof Error ? e.message : '加载失败');
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void load(), []);
  return { rows, error, reload: load, setError };
}

function useSave(recordId: string, onUnauthorized: () => void, onError: (m: string) => void) {
  const [saving, setSaving] = useState(false);
  const save = async (table: 'speakers' | 'sponsors', fields: Record<string, string | boolean>) => {
    setSaving(true);
    try {
      await updateCrm(table, recordId, fields);
      return true;
    } catch (e) {
      if (e instanceof AdminApiError && e.status === 401) onUnauthorized();
      else onError(e instanceof Error ? e.message : '保存失败');
      return false;
    } finally {
      setSaving(false);
    }
  };
  return { saving, save };
}

/** 图片上传按钮：选中即传，成功后把新 URL 写回本地状态。 */
function ImageUpload({
  kind,
  recordId,
  onUploaded,
  onUnauthorized,
  onError,
}: {
  kind: 'speaker' | 'sponsor';
  recordId: string;
  onUploaded: (url: string) => void;
  onUnauthorized: () => void;
  onError: (m: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const res = await uploadImage(kind, recordId, file);
      onUploaded(res.url);
    } catch (e) {
      if (e instanceof AdminApiError && e.status === 401) onUnauthorized();
      else onError(e instanceof Error ? e.message : '上传失败');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };
  return (
    <>
      <input ref={input} type="file" accept={kind === 'sponsor' ? 'image/png,image/jpeg,image/webp,image/svg+xml' : 'image/png,image/jpeg,image/webp'} className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="mt-2 w-full rounded-md border-2 border-ink bg-white px-2 py-1 font-mono text-[11px] font-bold text-ink transition-colors hover:bg-ink hover:text-signal disabled:opacity-50"
      >
        {busy ? '上传中…' : kind === 'speaker' ? '更换照片' : '更换 Logo'}
      </button>
    </>
  );
}

// ——— 讲师 ———

function SpeakerCard({ speaker, onUnauthorized, onError }: { speaker: CrmSpeaker } & PanelProps & { onError: (m: string) => void }) {
  const [form, setForm] = useState(speaker);
  /** 内容摘要（编辑区）默认收起，点卡片头展开 */
  const [open, setOpen] = useState(false);
  const { saving, save } = useSave(speaker.recordId, onUnauthorized, onError);
  const set = (k: keyof CrmSpeaker) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  /** 开关类（主推/展示）勾选即保存，失败回滚 */
  const toggle = (k: 'featured' | 'show', field: '主推' | '展示') => (e: { target: { checked: boolean } }) => {
    const checked = e.target.checked;
    setForm((f) => ({ ...f, [k]: checked }));
    void save('speakers', { [field]: checked }).then((ok) => {
      if (!ok) setForm((f) => ({ ...f, [k]: !checked }));
    });
  };

  return (
    <article className="rounded-lg border-[3px] border-ink bg-white p-4 shadow-hard-sm">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="min-w-0 truncate font-sans text-base font-bold text-ink">
          {form.name}
          <span className="ml-2 font-mono text-xs font-medium text-ink/50">
            {[form.company, form.role, form.track].filter(Boolean).join(' · ')}
          </span>
        </span>
        <span className="shrink-0 font-mono text-xs font-bold text-ink/60">{open ? '收起 ▴' : '编辑 ▾'}</span>
      </button>
      {open && (
      <div className="mt-3 flex gap-4">
        <div className="shrink-0">
          {form.photo ? (
            <img src={form.photo} alt={form.name} className="h-20 w-20 rounded-md border-2 border-ink object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-md border-2 border-dashed border-ink/40 font-mono text-xs text-ink/40">无照片</div>
          )}
          <ImageUpload kind="speaker" recordId={speaker.recordId} onUploaded={(url) => setForm((f) => ({ ...f, photo: url }))} onUnauthorized={onUnauthorized} onError={onError} />
        </div>
        <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-2">
          <div>
            <label className={LABEL}>姓名</label>
            <input className={INPUT} value={form.name} onChange={set('name')} />
          </div>
          <div>
            <label className={LABEL}>英文名</label>
            <input className={INPUT} value={form.nameEn} onChange={set('nameEn')} />
          </div>
          <div>
            <label className={LABEL}>公司</label>
            <input className={INPUT} value={form.company} onChange={set('company')} />
          </div>
          <div>
            <label className={LABEL}>职位</label>
            <input className={INPUT} value={form.role} onChange={set('role')} />
          </div>
          <div>
            <label className={LABEL}>ID（锚点）</label>
            <input className={INPUT} value={form.id} onChange={set('id')} />
          </div>
          <div>
            <label className={LABEL}>赛道</label>
            <select className={INPUT} value={form.track} onChange={set('track')}>
              {TRACK_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>时间（如 13:30–14:05）</label>
            <input className={INPUT} value={form.time} onChange={set('time')} placeholder="10:35–11:10" />
          </div>
          <div>
            <label className={LABEL}>议题</label>
            <input className={INPUT} value={form.talk} onChange={set('talk')} />
          </div>
          <div>
            <label className={LABEL}>简介</label>
            <input className={INPUT} value={form.bio} onChange={set('bio')} />
          </div>
        </div>
      </div>
      )}
      <div className="mt-3 flex items-center justify-between gap-3 border-t-2 border-ink/10 pt-3">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 font-sans text-sm text-ink">
            <input type="checkbox" checked={form.featured} onChange={toggle('featured', '主推')} /> 主推
          </label>
          <label className="flex items-center gap-1.5 font-sans text-sm text-ink">
            <input type="checkbox" checked={form.show} onChange={toggle('show', '展示')} /> 展示
          </label>
        </div>
        <button
          disabled={saving}
          onClick={() =>
            void save('speakers', {
              ID: form.id,
              姓名: form.name,
              英文名: form.nameEn,
              公司: form.company,
              职位: form.role,
              赛道: form.track,
              议题: form.talk,
              简介: form.bio,
              时间: form.time,
              主推: form.featured,
              展示: form.show,
            })
          }
          className="rounded-lg border-2 border-ink bg-[#FFD900] px-4 py-1.5 font-sans text-sm font-bold text-ink transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-40"
        >
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </article>
  );
}

export function SpeakersPanel({ onUnauthorized }: PanelProps) {
  const { rows, error, reload } = useCrm(fetchCrmSpeakers, onUnauthorized);
  const [panelError, setPanelError] = useState<string | null>(null);
  return (
    <section className="space-y-4">
      {(error || panelError) && <p className="font-sans text-sm font-bold text-[#FF4D3D]">{error ?? panelError}</p>}
      {!rows && !error && <p className="font-mono text-sm text-ink/50">加载中…</p>}
      {rows?.length === 0 && <p className="font-mono text-sm text-ink/50">嘉宾表还是空的。</p>}
      {rows?.map((s) => <SpeakerCard key={s.recordId} speaker={s} onUnauthorized={onUnauthorized} onError={setPanelError} />)}
      {rows && (
        <p className="font-mono text-xs text-ink/50">
          改完点「保存」；照片即传即生效。「展示」勾选后随内容同步上站——<button onClick={() => void reload()} className="underline">刷新列表</button>
        </p>
      )}
    </section>
  );
}

// ——— 赞助商 ———

function SponsorCard({ sponsor, onUnauthorized, onError }: { sponsor: CrmSponsor } & PanelProps & { onError: (m: string) => void }) {
  const [form, setForm] = useState(sponsor);
  const { saving, save } = useSave(sponsor.recordId, onUnauthorized, onError);
  const set = (k: keyof CrmSponsor) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const reviewable = ['待审核', '通过', '拒绝'].includes(form.status);

  const setStatus = async (status: string) => {
    if (await save('sponsors', { 状态: status })) setForm((f) => ({ ...f, status }));
  };

  /** 「展示」勾选即保存，失败回滚 */
  const toggleShow = (e: { target: { checked: boolean } }) => {
    const checked = e.target.checked;
    setForm((f) => ({ ...f, show: checked }));
    void save('sponsors', { 展示: checked }).then((ok) => {
      if (!ok) setForm((f) => ({ ...f, show: !checked }));
    });
  };

  return (
    <article className="rounded-lg border-[3px] border-ink bg-white p-4 shadow-hard-sm">
      <div className="flex gap-4">
        <div className="shrink-0">
          {form.logo ? (
            <div className="flex h-20 w-20 items-center justify-center rounded-md border-2 border-ink bg-white p-1.5">
              <img src={form.logo} alt={form.name} className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-md border-2 border-dashed border-ink/40 font-mono text-xs text-ink/40">无 Logo</div>
          )}
          <ImageUpload kind="sponsor" recordId={sponsor.recordId} onUploaded={(url) => setForm((f) => ({ ...f, logo: url }))} onUnauthorized={onUnauthorized} onError={onError} />
        </div>
        <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-2">
          <div>
            <label className={LABEL}>名称</label>
            <input className={INPUT} value={form.name} onChange={set('name')} />
          </div>
          <div>
            <label className={LABEL}>ID</label>
            <input className={INPUT} value={form.id} onChange={set('id')} />
          </div>
          <div className="col-span-2">
            <label className={LABEL}>官网</label>
            <input className={INPUT} value={form.url} onChange={set('url')} placeholder="https://…" />
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink/10 pt-3">
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-ink/60">
          <span className="rounded-full border-2 border-ink/40 px-2 py-0.5">{sponsor.tier || '未定档'}</span>
          <span className={cn('rounded-full border-2 border-ink px-2 py-0.5', form.status === '待审核' ? 'bg-white' : form.status === '拒绝' ? 'bg-[#FF4D3D] text-white' : 'bg-[#2ECC71]')}>{form.status}</span>
          <label className="flex items-center gap-1.5 font-sans text-sm text-ink">
            <input type="checkbox" checked={form.show} onChange={toggleShow} /> 展示
          </label>
        </div>
        <div className="flex items-center gap-2">
          {reviewable ? (
            <>
              <button
                onClick={() => void setStatus('通过')}
                disabled={saving || form.status === '通过'}
                className="rounded-lg border-2 border-ink bg-[#2ECC71] px-3.5 py-1.5 font-sans text-sm font-bold text-ink transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-40"
              >
                通过
              </button>
              <button
                onClick={() => void setStatus('拒绝')}
                disabled={saving || form.status === '拒绝'}
                className="rounded-lg border-2 border-ink bg-white px-3.5 py-1.5 font-sans text-sm font-bold text-[#FF4D3D] transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-40"
              >
                拒绝
              </button>
              {form.status === '通过' && <span className="font-mono text-xs text-ink/50">约 5 分钟内自动发 Logo 上传邮件</span>}
            </>
          ) : (
            <span className="font-mono text-xs text-ink/50">邮件已发出，状态由系统流转</span>
          )}
          <button
            disabled={saving}
            onClick={() => void save('sponsors', { ID: form.id, 名称: form.name, 官网: form.url, 展示: form.show })}
            className="rounded-lg border-2 border-ink bg-[#FFD900] px-4 py-1.5 font-sans text-sm font-bold text-ink transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-40"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </article>
  );
}

export function SponsorsPanel({ onUnauthorized }: PanelProps) {
  const { rows, error, reload } = useCrm(fetchCrmSponsors, onUnauthorized);
  const [panelError, setPanelError] = useState<string | null>(null);
  return (
    <section className="space-y-4">
      {(error || panelError) && <p className="font-sans text-sm font-bold text-[#FF4D3D]">{error ?? panelError}</p>}
      {!rows && !error && <p className="font-mono text-sm text-ink/50">加载中…</p>}
      {rows?.length === 0 && <p className="font-mono text-sm text-ink/50">赞助商表还是空的。</p>}
      {rows?.map((s) => <SponsorCard key={s.recordId} sponsor={s} onUnauthorized={onUnauthorized} onError={setPanelError} />)}
      {rows && (
        <p className="font-mono text-xs text-ink/50">
          Logo 即传即生效；「展示」勾选后随内容同步上站——<button onClick={() => void reload()} className="underline">刷新列表</button>
        </p>
      )}
    </section>
  );
}
