import { useEffect, useState } from 'react';
import { AdminApiError, fetchVolunteers, setVolunteerStatus } from '@/lib/adminApi';
import type { Volunteer } from '@/lib/adminApi';

/**
 * /admin 志愿者 tab — 守桥人报名审核：列表卡片（姓名/邮箱/岗位/备注 + 状态章 +
 * 通过/拒绝按钮），面板内一个「立即通知」触发 volunteer-accept-mailer。
 * 模式照搬投稿评审（AdminDashboard SubmissionCard）。
 */

/** 状态章配色与投稿评审一致 */
const STATUS_STYLE: Record<string, string> = {
  待审核: 'bg-white text-ink',
  通过: 'bg-[#2B5CE6] text-white',
  已通知: 'bg-[#6C3FD4] text-white',
  已确认: 'bg-[#2ECC71] text-ink',
  拒绝: 'bg-[#FF4D3D] text-white',
};
/** statuses the console may set — the mailer owns 已通知/已确认 */
const REVIEWABLE = new Set(['待审核', '通过', '拒绝']);

function VolunteerCard({
  v,
  busy,
  onAct,
}: {
  v: Volunteer;
  busy: boolean;
  onAct: (recordId: string, status: string) => void;
}) {
  return (
    <article className="rounded-lg border-[3px] border-ink bg-white p-5 shadow-hard-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-sans text-base font-bold text-ink">
            {v.name}
            <span className="ml-2 font-mono text-xs font-medium text-ink/50">{v.email}</span>
          </p>
          <p className="mt-1 font-sans text-[15px] font-bold text-ink">
            {v.role}
            {v.phone && <span className="ml-2 font-mono text-xs font-medium text-ink/50">{v.phone}</span>}
          </p>
          {v.note && <p className="mt-1 font-sans text-sm text-paper-dim">{v.note}</p>}
        </div>
        <span className={`shrink-0 rounded-full border-2 border-ink px-3 py-1 font-mono text-xs font-bold ${STATUS_STYLE[v.status] ?? 'bg-white text-ink'}`}>
          {v.status}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        {REVIEWABLE.has(v.status) ? (
          <>
            <button
              onClick={() => onAct(v.recordId, '通过')}
              disabled={busy || v.status === '通过'}
              className="rounded-lg border-2 border-ink bg-[#2ECC71] px-4 py-1.5 font-sans text-sm font-bold text-ink transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-40"
            >
              通过
            </button>
            <button
              onClick={() => onAct(v.recordId, '拒绝')}
              disabled={busy || v.status === '拒绝'}
              className="rounded-lg border-2 border-ink bg-white px-4 py-1.5 font-sans text-sm font-bold text-[#FF4D3D] transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-40"
            >
              拒绝
            </button>
            {v.status === '通过' && (
              <span className="font-mono text-xs text-ink/50">到达通知时间后自动发信，或点上方「立即通知」</span>
            )}
          </>
        ) : (
          <span className="font-mono text-xs text-ink/50">邮件已发出，状态由系统流转</span>
        )}
      </div>
    </article>
  );
}

export default function VolunteersPanel({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [rows, setRows] = useState<Volunteer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetchVolunteers();
      setRows(res.rows);
      setError(null);
    } catch (e) {
      if (e instanceof AdminApiError && e.status === 401) return onUnauthorized();
      setError(e instanceof Error ? e.message : '加载失败');
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void load(), []);

  const act = async (recordId: string, status: string) => {
    setBusyId(recordId);
    try {
      await setVolunteerStatus(recordId, status);
      await load();
    } catch (e) {
      if (e instanceof AdminApiError && e.status === 401) return onUnauthorized();
      setError(e instanceof Error ? e.message : '操作失败');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {rows && <span className="font-mono text-xs text-ink/60">共 {rows.length} 条报名</span>}
        <span className="font-mono text-xs text-ink/50">「通过」不会自动发信——录取邮件（含指引页链接）在「发信台」审批发送</span>
      </div>
      {error && <p className="font-sans text-sm font-bold text-[#FF4D3D]">{error}</p>}
      {!rows && !error && <p className="font-mono text-sm text-ink/50">加载中…</p>}
      {rows?.length === 0 && <p className="font-mono text-sm text-ink/50">志愿者报名表还是空的。</p>}
      {rows?.map((v) => (
        <VolunteerCard key={v.recordId} v={v} busy={busyId === v.recordId} onAct={(id, st) => void act(id, st)} />
      ))}
    </section>
  );
}
