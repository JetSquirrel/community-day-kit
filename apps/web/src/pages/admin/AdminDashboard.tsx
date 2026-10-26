import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import {
  AdminApiError,
  clearSession,
  fetchOverview,
  fetchSubmissions,
  getSession,
  setSubmissionStatus,
  triggerSync,
} from '@/lib/adminApi';
import type { Overview, Submission } from '@/lib/adminApi';
import { SpeakersPanel, SponsorsPanel } from '@/pages/admin/CrmPanels';
import PreviewPanel from '@/pages/admin/PreviewPanel';
import VolunteersPanel from '@/pages/admin/VolunteersPanel';
import PromoPanel from '@/pages/admin/PromoPanel';
import OutboxPanel from '@/pages/admin/OutboxPanel';

const STATUS_STYLE: Record<string, string> = {
  待审核: 'bg-white text-ink',
  通过: 'bg-[#2B5CE6] text-white',
  候补: 'bg-[#FFD900] text-ink',
  已通知: 'bg-[#6C3FD4] text-white',
  已确认: 'bg-[#2ECC71] text-ink',
  拒绝: 'bg-[#FF4D3D] text-white',
};
const STATUS_ORDER = ['待审核', '通过', '候补', '已通知', '已确认', '拒绝'];
/** 评审可设置的状态；已通知 / 已确认由发信台与材料页流转。「通过」不会触发发信 */
const REVIEWABLE = new Set(['待审核', '通过', '候补', '拒绝']);

/** 单条投稿卡片 — 内容摘要（extra 字段）默认收起，点「内容摘要」展开 */
function SubmissionCard({
  s,
  busy,
  onAct,
}: {
  s: Submission;
  busy: boolean;
  onAct: (recordId: string, status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const extra = Object.entries(s.extra);
  return (
    <article className="rounded-lg border-[3px] border-ink bg-white p-5 shadow-hard-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-sans text-base font-bold text-ink">
            {s.name}
            <span className="ml-2 font-mono text-xs font-medium text-ink/50">{s.email}</span>
          </p>
          <p className="mt-1 font-sans text-[15px] font-bold text-ink">《{s.talk}》</p>
        </div>
        <span className={`shrink-0 rounded-full border-2 border-ink px-3 py-1 font-mono text-xs font-bold ${STATUS_STYLE[s.status] ?? 'bg-white text-ink'}`}>
          {s.status}
        </span>
      </div>

      {extra.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="mt-3 font-mono text-xs font-bold text-ink/60 underline decoration-ink/30 underline-offset-2 hover:text-ink"
          >
            {open ? '收起摘要 ▴' : `内容摘要（${extra.length} 项）▾`}
          </button>
          {open && (
            <dl className="mt-3 space-y-1 border-t-2 border-ink/10 pt-3">
              {extra.map(([k, v]) => (
                <div key={k} className="flex gap-2 text-sm">
                  <dt className="shrink-0 font-mono text-xs font-medium leading-6 text-ink/50">{k}</dt>
                  <dd className="leading-6 text-paper-dim">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </>
      )}

      <div className="mt-4 flex items-center gap-3">
        {REVIEWABLE.has(s.status) ? (
          <>
            <button
              onClick={() => onAct(s.recordId, '通过')}
              disabled={busy || s.status === '通过'}
              className="rounded-lg border-2 border-ink bg-[#2ECC71] px-4 py-1.5 font-sans text-sm font-bold text-ink transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-40"
            >
              通过
            </button>
            <button
              onClick={() => onAct(s.recordId, '拒绝')}
              disabled={busy || s.status === '拒绝'}
              className="rounded-lg border-2 border-ink bg-white px-4 py-1.5 font-sans text-sm font-bold text-[#FF4D3D] transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-40"
            >
              拒绝
            </button>
            <button
              onClick={() => onAct(s.recordId, '候补')}
              disabled={busy || s.status === '候补'}
              className="rounded-lg border-2 border-ink bg-[#FFD900] px-4 py-1.5 font-sans text-sm font-bold text-ink transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-40"
            >
              候补
            </button>
            {s.status === '通过' && (
              <span className="font-mono text-xs text-ink/50">不会自动发信——到「发信台」审批发送</span>
            )}
          </>
        ) : (
          <span className="font-mono text-xs text-ink/50">邮件已发出，状态由系统流转</span>
        )}
      </div>
    </article>
  );
}

/**
 * /admin — organizer console: CFP review (投稿), CRM (讲师/赞助商) + CMS uploads,
 * overview counts, one-click content sync. Guarded by the Feishu SSO session.
 */
type Tab = 'cfp' | 'outbox' | 'volunteers' | 'speakers' | 'sponsors' | 'promo' | 'preview';
const TABS: { id: Tab; label: string }[] = [
  { id: 'cfp', label: '投稿评审' },
  { id: 'outbox', label: '发信台' },
  { id: 'volunteers', label: '志愿者' },
  { id: 'speakers', label: '讲师' },
  { id: 'sponsors', label: '赞助商' },
  { id: 'promo', label: '推文物料' },
  { id: 'preview', label: '预览' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const session = getSession();
  const [tab, setTab] = useState<Tab>('cfp');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const logout = useCallback(() => {
    clearSession();
    navigate('/admin/login', { replace: true });
  }, [navigate]);

  const load = useCallback(async () => {
    try {
      const [ov, subs] = await Promise.all([fetchOverview(), fetchSubmissions()]);
      setOverview(ov);
      setSubmissions(subs.submissions);
      setError(null);
    } catch (e) {
      if (e instanceof AdminApiError && e.status === 401) return logout();
      setError(e instanceof Error ? e.message : '加载失败');
    }
  }, [logout]);

  useEffect(() => {
    if (session) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 状态统计（仅展示；发信名单以发信台生成的批次为准） */
  const notifyStats = useMemo(() => {
    const subs = submissions ?? [];
    const sendable = (s: Submission) => s.status === '通过' && s.email.includes('@') && !!s.name && !!s.talk;
    return {
      ready: subs.filter(sendable).length,
      incomplete: subs.filter((s) => s.status === '通过' && !sendable(s)).length,
      pending: subs.filter((s) => s.status === '待审核').length,
    };
  }, [submissions]);

  if (!session) return <Navigate to="/admin/login" replace />;

  const act = async (recordId: string, status: string) => {
    setBusyId(recordId);
    try {
      await setSubmissionStatus(recordId, status);
      await load();
    } catch (e) {
      if (e instanceof AdminApiError && e.status === 401) return logout();
      setError(e instanceof Error ? e.message : '操作失败');
    } finally {
      setBusyId(null);
    }
  };

  const sync = async () => {
    setSyncMsg('同步中…');
    try {
      const res = await triggerSync();
      setSyncMsg(`已同步：${JSON.stringify(res)}`);
    } catch (e) {
      setSyncMsg(e instanceof Error ? `同步失败：${e.message}` : '同步失败');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-paper">
      {/* header */}
      <header className="border-b-[3px] border-ink bg-signal">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-3 px-5 py-4">
          <p className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-ink">
            ADMIN // 管理后台
          </p>
          <div className="flex items-center gap-3">
            {session.picture && <img src={session.picture} alt="" className="h-8 w-8 rounded-full border-2 border-ink" />}
            <span className="font-sans text-sm font-bold text-ink">{session.name}</span>
            <button
              onClick={logout}
              className="rounded-lg border-2 border-ink bg-white px-3 py-1 font-mono text-xs font-medium text-ink transition-colors hover:bg-ink hover:text-signal"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1080px] px-5 py-8">
        {/* overview */}
        <section className="flex flex-wrap items-center gap-3">
          {overview &&
            STATUS_ORDER.map((s) => (
              <span
                key={s}
                className={`rounded-full border-2 border-ink px-3.5 py-1.5 font-mono text-xs font-bold ${STATUS_STYLE[s]}`}
              >
                {s} {overview.submissions[s] ?? 0}
              </span>
            ))}
          {overview && (
            <span className="font-mono text-xs text-ink/60">
              嘉宾 {overview.speakers} · 合作伙伴 {overview.partners}
            </span>
          )}
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={sync}
              className="rounded-lg border-[3px] border-ink bg-white px-4 py-1.5 font-sans text-sm font-bold text-ink shadow-hard-sm transition-transform duration-150 hover:-translate-y-0.5"
            >
              立即同步内容
            </button>
          </div>
        </section>
        {submissions && (
          <p className="mt-3 font-mono text-xs text-ink/60">
            已通过 {notifyStats.ready} 位（到「发信台」审批发送） · 待审核 {notifyStats.pending} 条
            {notifyStats.incomplete > 0 && ` · ${notifyStats.incomplete} 条已通过但信息不全（发信台会自动排除）`}
          </p>
        )}
        {syncMsg && <p className="mt-3 font-mono text-xs text-ink/70">{syncMsg}</p>}
        {error && <p className="mt-3 font-sans text-sm font-bold text-[#FF4D3D]">{error}</p>}

        {/* tabs: 投稿评审 / 志愿者 / 讲师 / 赞助商 / 预览 */}
        <nav className="mt-8 flex gap-2 border-b-[3px] border-ink">
          {TABS.map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`rounded-t-lg border-[3px] border-b-0 border-ink px-5 py-2 font-sans text-sm font-bold transition-colors ${
                tab === tb.id ? 'bg-ink text-signal' : 'bg-white text-ink hover:bg-signal'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </nav>

        {tab === 'outbox' && (
          <div className="mt-6">
            <OutboxPanel onUnauthorized={logout} />
          </div>
        )}
        {tab === 'volunteers' && (
          <div className="mt-6">
            <VolunteersPanel onUnauthorized={logout} />
          </div>
        )}
        {tab === 'speakers' && (
          <div className="mt-6">
            <SpeakersPanel onUnauthorized={logout} />
          </div>
        )}
        {tab === 'sponsors' && (
          <div className="mt-6">
            <SponsorsPanel onUnauthorized={logout} />
          </div>
        )}
        {tab === 'promo' && (
          <div className="mt-6">
            <PromoPanel onUnauthorized={logout} />
          </div>
        )}
        {tab === 'preview' && (
          <div className="mt-6">
            <PreviewPanel onUnauthorized={logout} />
          </div>
        )}

        {/* submissions */}
        {tab === 'cfp' && (
        <section className="mt-6 space-y-4">
          {!submissions && !error && <p className="font-mono text-sm text-ink/50">加载中…</p>}
          {submissions?.length === 0 && <p className="font-mono text-sm text-ink/50">投稿表还是空的。</p>}
          {submissions?.map((s) => (
            <SubmissionCard key={s.recordId} s={s} busy={busyId === s.recordId} onAct={(id, st) => void act(id, st)} />
          ))}
        </section>
        )}
      </main>
    </div>
  );
}
