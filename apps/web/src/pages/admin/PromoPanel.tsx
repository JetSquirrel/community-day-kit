import { useEffect, useRef, useState } from 'react';
import { downloadPoster, drawPoster, drawSpeakerPoster } from '@/lib/poster';
import type { PosterVariant, SpeakerPosterData } from '@/lib/poster';
import { AdminApiError, fetchCrmSpeakers } from '@/lib/adminApi';
import type { CrmSpeaker } from '@/lib/adminApi';
import { TRACKS } from '@/components/schedule/data';
import { EVENT_CONFIG, SITE } from '@/lib/site';

/**
 * /admin 推文物料 tab — CFP 征稿 / 赞助招募的通用分享图 + 推文文案。
 * 海报在浏览器端用 Canvas 绘制（app/src/lib/poster.ts），预览满意后下载 PNG；
 * 文案是可编辑模板，改完一键复制。零后端依赖。
 */

const COPY: Record<PosterVariant, string> = {
  cfp: `【${SITE.cfpOpen ? '议题征集' : '征稿截止'}】${SITE.event}

主题：${SITE.name} · ${SITE.nameCn}
时间：${SITE.dateLong} 09:00–17:00
地点：${SITE.city}

${SITE.cfpOpen ? `议题征集进行中，${SITE.cfpClose} 截止，欢迎投稿！` : `议题征集已于 ${SITE.cfpClose} 截止，感谢每一位投稿人！评审结果将通过邮件通知。`}

${SITE.cfpOpen ? '投稿' : '详情'}：${SITE.domain}/cfp

${SITE.hashtags}`,
  sponsor: `【赞助商招募】${SITE.event}

${SITE.name} · ${SITE.nameCn}
${SITE.dateLong} · ${SITE.cityShort} · ${EVENT_CONFIG.expectedAttendees}+ 参会者 · ${EVENT_CONFIG.tracks.length} 个分论坛

合作档位：${EVENT_CONFIG.sponsorTiers.map((t) => t.name.replace(/赞助$/, '')).join(' / ')}

合作咨询：${SITE.email}
官网：${SITE.domain}

${SITE.hashtags}`,
};

const LABEL = 'mb-1 block font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-ink/50';
const INPUT =
  'w-full rounded-md border-2 border-ink/60 bg-white px-2.5 py-1.5 font-sans text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6C3FD4]';

/** 讲师 → 海报输入。track 不在 TRACKS（如未定分论坛）时 chip 留空。 */
function toPosterData(s: CrmSpeaker): SpeakerPosterData {
  const track = TRACKS.find((t) => t.id === s.track);
  return {
    name: s.name,
    nameEn: s.nameEn,
    role: s.role,
    company: s.company,
    talk: s.talk,
    trackLabel: track ? `${track.bridge.zh} · ${track.signal}` : '',
    trackColor: track?.color ?? '#6C3FD4',
    trackTextColor: track?.textOn ?? '#FFFFFF',
    time: s.time,
    photoUrl: s.photo,
  };
}

function speakerCopy(s: CrmSpeaker): string {
  const track = TRACKS.find((t) => t.id === s.track);
  return `【讲师官宣】${s.name}${s.nameEn && s.nameEn !== s.name ? `（${s.nameEn}）` : ''} · ${[s.role, s.company].filter(Boolean).join(' @ ')}

议题：《${s.talk}》${track ? `\n分论坛：${track.bridge.zh} ${track.signal}` : ''}${s.time ? `\n场次：${s.time}` : ''}

${SITE.event}
${SITE.dateLong} · ${SITE.name} · ${SITE.nameCn}

详情：${SITE.domain}/speakers

${SITE.hashtags}`;
}

/** 讲师分享海报（1080×1440 竖版）：选讲师 → 实时出图 → 下载 / 复制官宣文案。 */
function SpeakerPosterCard({ onUnauthorized }: { onUnauthorized: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rows, setRows] = useState<CrmSpeaker[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoWarn, setPhotoWarn] = useState(false);
  const [sel, setSel] = useState('');
  const [copy, setCopy] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchCrmSpeakers()
      .then((res) => {
        setRows(res.rows);
        if (res.rows.length > 0) setSel(res.rows[0].recordId);
      })
      .catch((e) => {
        if (e instanceof AdminApiError && e.status === 401) onUnauthorized();
        else setError(e instanceof Error ? e.message : '加载失败');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speaker = rows?.find((r) => r.recordId === sel) ?? null;

  useEffect(() => {
    if (!speaker || !canvasRef.current) return;
    setCopy(speakerCopy(speaker));
    void drawSpeakerPoster(canvasRef.current, toPosterData(speaker)).then((photoOk) => setPhotoWarn(!photoOk && Boolean(speaker.photo)));
  }, [speaker]);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(copy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="rounded-lg border-[3px] border-ink bg-white p-5 shadow-hard-sm">
      <p className="font-sans text-base font-bold text-ink">讲师分享海报</p>
      {error && <p className="mt-2 font-sans text-sm font-bold text-[#FF4D3D]">{error}</p>}
      {!rows && !error && <p className="mt-4 font-mono text-sm text-ink/50">加载讲师中…</p>}
      {rows?.length === 0 && <p className="mt-4 font-mono text-sm text-ink/50">嘉宾表还是空的，先到「讲师」tab 添加。</p>}
      {speaker && (
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          {/* 海报预览 + 选择 */}
          <div>
            <canvas ref={canvasRef} className="w-full rounded-lg border-2 border-ink" />
            <div className="mt-3 space-y-2">
              <div>
                <label className={LABEL}>选择讲师（数据来自嘉宾表，照片走 CDN）</label>
                <select className={INPUT} value={sel} onChange={(e) => setSel(e.target.value)}>
                  {(rows ?? []).map((r) => (
                    <option key={r.recordId} value={r.recordId}>
                      {r.name} · {r.talk || '（议题未填）'}
                      {r.show ? '' : ' [未勾选展示]'}
                    </option>
                  ))}
                </select>
              </div>
              {photoWarn && <p className="font-sans text-xs font-bold text-[#FF4D3D]">照片加载失败，已用首字母头像代替（可先在「讲师」tab 重新上传照片试试）。</p>}
              <button
                onClick={() => canvasRef.current && downloadPoster(canvasRef.current, `speaker-${speaker.id || speaker.recordId}.png`)}
                className="w-full rounded-lg border-2 border-ink bg-[#FFD900] px-4 py-2 font-sans text-sm font-bold text-ink transition-transform duration-150 hover:-translate-y-0.5"
              >
                下载 PNG（1080×1440）
              </button>
            </div>
          </div>
          {/* 文案 */}
          <div className="flex flex-col">
            <label className={LABEL}>官宣文案（可编辑）</label>
            <textarea
              className={`${INPUT} min-h-[280px] flex-1 resize-y font-mono text-[13px] leading-6`}
              value={copy}
              onChange={(e) => setCopy(e.target.value)}
            />
            <button
              onClick={() => void copyText()}
              className="mt-3 w-full rounded-lg border-2 border-ink bg-white px-4 py-2 font-sans text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-signal"
            >
              {copied ? '已复制 ✓' : '复制文案'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function PosterCard({ variant, title }: { variant: PosterVariant; title: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [extraLine, setExtraLine] = useState('');
  const [contact, setContact] = useState('contact@awscommunity.cn');
  const [copy, setCopy] = useState(COPY[variant]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (canvasRef.current) drawPoster(canvasRef.current, variant, { extraLine, contact });
  }, [variant, extraLine, contact]);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(copy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="rounded-lg border-[3px] border-ink bg-white p-5 shadow-hard-sm">
      <p className="font-sans text-base font-bold text-ink">{title}</p>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        {/* 海报预览 + 字段 */}
        <div>
          <canvas ref={canvasRef} className="w-full rounded-lg border-2 border-ink" />
          <div className="mt-3 space-y-2">
            {variant === 'cfp' ? (
              <div>
                <label className={LABEL}>附加一行（如截稿日期，留空不显示）</label>
                <input className={INPUT} value={extraLine} onChange={(e) => setExtraLine(e.target.value)} placeholder="投稿截止：2026-XX-XX" maxLength={40} />
              </div>
            ) : (
              <div>
                <label className={LABEL}>合作咨询邮箱（画进海报）</label>
                <input className={INPUT} value={contact} onChange={(e) => setContact(e.target.value)} maxLength={60} />
              </div>
            )}
            <button
              onClick={() => canvasRef.current && downloadPoster(canvasRef.current, `${variant}-poster.png`)}
              className="w-full rounded-lg border-2 border-ink bg-[#FFD900] px-4 py-2 font-sans text-sm font-bold text-ink transition-transform duration-150 hover:-translate-y-0.5"
            >
              下载 PNG（1080×1080）
            </button>
          </div>
        </div>
        {/* 文案 */}
        <div className="flex flex-col">
          <label className={LABEL}>推文文案（可编辑）</label>
          <textarea
            className={`${INPUT} min-h-[280px] flex-1 resize-y font-mono text-[13px] leading-6`}
            value={copy}
            onChange={(e) => setCopy(e.target.value)}
          />
          <button
            onClick={() => void copyText()}
            className="mt-3 w-full rounded-lg border-2 border-ink bg-white px-4 py-2 font-sans text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-signal"
          >
            {copied ? '已复制 ✓' : '复制文案'}
          </button>
        </div>
      </div>
    </section>
  );
}

export default function PromoPanel({ onUnauthorized }: { onUnauthorized: () => void }) {
  return (
    <div className="space-y-6">
      <p className="font-mono text-xs text-ink/60">
        海报在浏览器本地生成，不经过服务器；改字段会实时重绘。讲师海报读取嘉宾表（含未勾选「展示」的，方便提前备料）。
      </p>
      <SpeakerPosterCard onUnauthorized={onUnauthorized} />
      <PosterCard variant="cfp" title="CFP 征稿宣传" />
      <PosterCard variant="sponsor" title="赞助招募宣传" />
    </div>
  );
}
