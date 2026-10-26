import { useState } from 'react';
import { AdminApiError, outboxPlan, outboxSend } from '@/lib/adminApi';
import type { OutboxBatch, OutboxResult, OutboxTemplate } from '@/lib/adminApi';

/**
 * 发信台 —— 所有对外邮件的唯一出口。
 * 飞书 / 后台里把投稿改成「通过」只是评审决定，不会发信；
 * 在这里：① 生成批次（看到名单、名额表、邮件预览）→ ② 手动输入本批人数确认 → ③ 发送。
 * 同一人同一类邮件只会发一次（台账幂等），超出赛道名额必须填写理由并留痕。
 */
const TEMPLATES: { id: OutboxTemplate; label: string; hint: string }[] = [
  { id: 'cfp-accept', label: '讲者录用', hint: '投稿状态 = 通过；占赛道名额；发送后状态 → 已通知' },
  { id: 'cfp-waitlist', label: '候补通知', hint: '投稿状态 = 候补' },
  { id: 'cfp-decline', label: '未入选', hint: '投稿状态 = 拒绝' },
  { id: 'volunteer-accept', label: '志愿者录取', hint: '志愿者状态 = 通过；含指引页链接' },
  { id: 'sponsor-accept', label: '赞助商确认', hint: '赞助商状态 = 通过；含 Logo 上传链接' },
];

const btn = 'rounded-lg border-[3px] border-ink px-4 py-1.5 font-sans text-sm font-bold shadow-hard-sm transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0';

export default function OutboxPanel({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [template, setTemplate] = useState<OutboxTemplate>('cfp-accept');
  const [batch, setBatch] = useState<OutboxBatch | null>(null);
  const [count, setCount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OutboxResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const fail = (e: unknown) => {
    if (e instanceof AdminApiError && e.status === 401) return onUnauthorized();
    setError(e instanceof Error ? e.message : '操作失败');
  };

  const plan = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    setCount('');
    setReason('');
    try {
      const res = await outboxPlan(template);
      if (!res.ok) throw new Error(res.error ?? '生成失败');
      setBatch(res.batch);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!batch) return;
    setBusy(true);
    setError(null);
    try {
      const res = await outboxSend({ batchId: batch.id, digest: batch.digest, confirmCount: Number(count), overrideReason: reason || undefined });
      if (!res.ok) throw new Error(res.error ?? '发送失败');
      setResult(res.result);
      setBatch(null);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const over = batch?.quota && !batch.quota.ok;
  const canSend = !!batch && batch.recipients.length > 0 && Number(count) === batch.recipients.length && (!over || reason.trim().length >= 4);

  return (
    <section className="space-y-5">
      <div className="rounded-lg border-[3px] border-ink bg-[#FFF8CC] p-4 font-sans text-sm leading-6 text-ink">
        <b>发信规则：</b>改状态 ≠ 发信。所有录用 / 候补 / 拒绝 / 志愿者 / 赞助商邮件只在这里审批发送；
        同一人同一类邮件永远只发一次；讲者录用会按 event.yaml 的赛道名额校验。催交提醒由系统每天 10:00 自动发送。
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTemplate(t.id); setBatch(null); setResult(null); }}
            className={`${btn} ${template === t.id ? 'bg-ink text-signal' : 'bg-white text-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="font-mono text-xs text-ink/60">{TEMPLATES.find((t) => t.id === template)?.hint}</p>
      <button onClick={() => void plan()} disabled={busy} className={`${btn} bg-[#FFD900] text-ink`}>
        {busy && !batch ? '生成中…' : '① 生成发信批次（不会发信）'}
      </button>

      {error && <p className="font-sans text-sm font-bold text-[#FF4D3D]">{error}</p>}

      {batch && (
        <div className="space-y-4 rounded-lg border-[3px] border-ink bg-white p-5 shadow-hard-sm">
          <p className="font-sans text-base font-bold">
            本批 {batch.recipients.length} 人
            {batch.skippedAlreadySent > 0 && <span className="ml-2 font-mono text-xs text-ink/50">（另有 {batch.skippedAlreadySent} 人已发过，自动排除）</span>}
          </p>

          {batch.quota && (
            <table className="w-full border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b-2 border-ink text-left">
                  <th className="py-1">赛道</th><th>名额</th><th>已发</th><th>本批</th><th>结果</th>
                </tr>
              </thead>
              <tbody>
                {batch.quota.lines.filter((l) => l.quota || l.pending || l.committed).map((l) => (
                  <tr key={l.track} className={`border-b border-ink/10 ${l.over ? 'bg-[#FFE3E0] font-bold text-[#C0261A]' : ''}`}>
                    <td className="py-1">{l.track}</td><td>{l.quota}</td><td>{l.committed}</td><td>{l.pending}</td>
                    <td>{l.over ? `超出 ${l.over}` : `剩余 ${l.remaining}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {batch.quota?.unknownTracks.length ? (
            <p className="font-sans text-sm font-bold text-[#FF4D3D]">赛道取值不在 event.yaml 中：{batch.quota.unknownTracks.join('、')}（请先在飞书修正）</p>
          ) : null}

          <ul className="max-h-72 space-y-1 overflow-auto border-y-2 border-ink/10 py-2 font-sans text-sm">
            {batch.recipients.map((r) => (
              <li key={r.recordId}>
                {r.track && <span className="mr-2 rounded bg-ink px-1.5 font-mono text-[11px] text-signal">{r.track}</span>}
                <b>{r.name}</b> <span className="font-mono text-xs text-ink/50">{r.email}</span>
                {r.talk && <span className="ml-2 text-ink/70">《{r.talk}》</span>}
              </li>
            ))}
            {batch.recipients.length === 0 && <li className="font-mono text-xs text-ink/50">没有需要发送的人。</li>}
          </ul>

          {batch.preview && (
            <div>
              <button onClick={() => setShowPreview((v) => !v)} className="font-mono text-xs font-bold underline">
                {showPreview ? '收起邮件预览' : `预览邮件：${batch.preview.subject}`}
              </button>
              {showPreview && <iframe title="preview" srcDoc={batch.preview.html} sandbox="" className="mt-2 h-[480px] w-full border-2 border-ink" />}
            </div>
          )}

          {batch.recipients.length > 0 && (
            <div className="space-y-3 border-t-2 border-ink/10 pt-4">
              {over && (
                <label className="block font-sans text-sm">
                  <b className="text-[#C0261A]">超出名额</b>：如确需发送，请写明理由（将记录在台账中）
                  <input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded border-2 border-ink px-2 py-1" placeholder="例如：赞助商联合分享，组委会 10/9 周会同意" />
                </label>
              )}
              <label className="block font-sans text-sm">
                ② 请输入本批人数 <b>{batch.recipients.length}</b> 以确认：
                <input value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className="ml-2 w-20 rounded border-2 border-ink px-2 py-1 font-mono" />
              </label>
              <button onClick={() => void send()} disabled={!canSend || busy} className={`${btn} bg-ink text-signal`}>
                {busy ? '发送中…' : `③ 确认发送 ${batch.recipients.length} 封`}
              </button>
              <p className="font-mono text-[11px] text-ink/50">批次 {batch.id} · digest {batch.digest} · 名单在生成后若有变化，发送会被拒绝并要求重新生成</p>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="rounded-lg border-[3px] border-ink bg-[#E8FAEF] p-4 font-sans text-sm">
          ✅ 已发送 {result.sent.length} 封
          {result.skipped.length > 0 && `，跳过 ${result.skipped.length}（已发过）`}
          {result.failed.length > 0 && (
            <div className="mt-2 text-[#C0261A]">
              失败 {result.failed.length}：
              <ul className="list-disc pl-5">{result.failed.map((f) => <li key={f.recordId}>{f.recordId}：{f.error}</li>)}</ul>
              <p className="text-xs">失败记录不会自动重试（避免投递状态不明时重复发）。确认对方确实没收到后，可在台账中释放再重发。</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
