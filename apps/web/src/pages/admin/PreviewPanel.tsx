import { useMemo } from 'react';
import { AdminApiError, fetchCrmSpeakers } from '@/lib/adminApi';
import type { CrmSpeaker } from '@/lib/adminApi';
import { useEffect, useState } from 'react';
import SpeakerCard, { FeaturedSpeakerCard } from '@/components/speakers/SpeakerCard';
import { TRACKS } from '@/components/schedule/data';
import type { Speaker, TrackId } from '@/components/schedule/data';
import { deriveSessions } from '@/lib/content';
import { pick, useLocale } from '@/lib/locale';

/**
 * /admin 预览 tab — 发布前的内部排版检查：用官网同款 SpeakerCard 渲染
 * 「展示」已勾选的讲者，并按「时间」派生时间表。未勾选的不上预览（即不上站）。
 */

const TRACK_IDS: TrackId[] = ['keynote', 'ai', 'builder', 'spark', 'global'];

function toSiteSpeaker(s: CrmSpeaker): Speaker {
  return {
    id: s.id || s.recordId,
    name: s.name,
    nameEn: s.nameEn || s.name,
    initials: (s.nameEn || s.name).slice(0, 2).toUpperCase(),
    photo: s.photo || undefined,
    time: s.time || undefined,
    company: s.company,
    role: s.role,
    track: TRACK_IDS.includes(s.track as TrackId) ? (s.track as TrackId) : 'ai',
    featured: s.featured,
    talk: s.talk,
    bio: s.bio,
    socials: [],
  };
}

export default function PreviewPanel({ onUnauthorized }: { onUnauthorized: () => void }) {
  const locale = useLocale();
  const [rows, setRows] = useState<CrmSpeaker[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCrmSpeakers()
      .then((res) => setRows(res.rows))
      .catch((e) => {
        if (e instanceof AdminApiError && e.status === 401) onUnauthorized();
        else setError(e instanceof Error ? e.message : '加载失败');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const published = useMemo(() => (rows ?? []).filter((r) => r.show).map(toSiteSpeaker), [rows]);
  const sessions = useMemo(() => deriveSessions(published), [published]);
  const times = useMemo(() => [...new Set(sessions.map((s) => `${s.start}–${s.end}`))], [sessions]);
  const hidden = (rows?.length ?? 0) - published.length;

  if (error) return <p className="font-sans text-sm font-bold text-[#FF4D3D]">{error}</p>;
  if (!rows) return <p className="font-mono text-sm text-ink/50">加载中…</p>;

  return (
    <div className="space-y-10">
      <p className="font-mono text-xs text-ink/60">
        预览 = 官网实际排版（仅「展示」已勾选的 {published.length} 位；另有 {hidden} 位未勾选不上站）。确认无误后无需其他操作——内容同步每 5 分钟自动上站，或点上方「立即同步内容」。
      </p>

      {/* 讲者墙 — 官网同款卡片 */}
      <section>
        <p className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.14em] text-ink/60">讲者墙 SPEAKERS</p>
        {published.length === 0 ? (
          <p className="font-mono text-sm text-ink/50">还没有勾选「展示」的讲者。</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {published.map((s) =>
              s.featured ? (
                <FeaturedSpeakerCard key={s.id} speaker={s} onSelect={() => {}} />
              ) : (
                <SpeakerCard key={s.id} speaker={s} onSelect={() => {}} />
              ),
            )}
          </div>
        )}
      </section>

      {/* 时间表 — 按时段 × 桥（赛道） */}
      <section>
        <p className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.14em] text-ink/60">时间表 AGENDA</p>
        {times.length === 0 ? (
          <p className="font-mono text-sm text-ink/50">还没有讲者排「时间」——在「讲师」tab 里填时段（如 13:30–14:05）后这里会出现排期。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr>
                  <th className="border-2 border-ink bg-ink px-3 py-2 text-left font-mono text-xs text-signal">时间</th>
                  {TRACKS.map((t) => (
                    <th key={t.id} className="border-2 border-ink px-3 py-2 text-left font-sans text-sm font-black text-white" style={{ backgroundColor: t.color }}>
                      {pick(t.bridge, locale)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {times.map((time) => (
                  <tr key={time}>
                    <td className="border-2 border-ink bg-white px-3 py-2 font-mono text-xs font-medium whitespace-nowrap">{time}</td>
                    {TRACKS.map((t) => {
                      const s = sessions.find((x) => `${x.start}–${x.end}` === time && x.track === t.id);
                      return (
                        <td key={t.id} className="border-2 border-ink bg-white px-3 py-2 align-top">
                          {s && (
                            <>
                              <p className="font-sans text-sm font-bold text-ink">{pick(s.title, locale)}</p>
                              <p className="mt-0.5 font-mono text-[11px] text-ink/50">
                                {(() => {
                                  const sp = published.find((x) => x.id === s.speakerIds[0]);
                                  return sp ? pick(sp.name, locale) : '';
                                })()}
                              </p>
                            </>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
