import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { fetchVolunteerMe } from '@/lib/adminApi';
import type { VolunteerMe } from '@/lib/adminApi';
import { SITE } from '@/lib/site';

/**
 * VolunteerPortal (/volunteer/portal) — 守桥人指引页。
 * 邮件 token 即登录凭证：从 ?token= 取（存 sessionStorage 防刷新丢失），
 * 调 admin-api 公共端点 /volunteer/me 换取本人姓名/岗位/状态，下方是静态指引手册 v1
 * （占位文案，最终规则以组委会邮件为准）。token 无效显示错误卡。
 */

const TOKEN_KEY = 'bws_volunteer_portal_token';

const STATUS_STYLE: Record<string, string> = {
  待审核: 'bg-white text-ink',
  通过: 'bg-[#2B5CE6] text-white',
  已通知: 'bg-[#6C3FD4] text-white',
  已确认: 'bg-[#2ECC71] text-ink',
  拒绝: 'bg-[#FF4D3D] text-white',
};

/** 指引手册 v1（静态占位）——规则定了再填，最终规则以组委会邮件为准。 */
const GUIDE_SECTIONS: { title: string; color: string; items: string[] }[] = [
  {
    title: '签到流程',
    color: '#FFD900',
    items: [
      '活动当天凭录取邮件（或本页）到「守桥人签到处」报到，领取工牌与手环。',
      '签到时段与集合地点以组委会邮件通知为准，请提前 15 分钟到场。',
    ],
  },
  {
    title: '手环使用',
    color: '#6C3FD4',
    items: [
      '手环是守桥人身份凭证，请全程佩戴；餐饮、物料领取均需出示手环。',
      '手环遗失请立即到签到处找签到组补办。',
    ],
  },
  {
    title: '打卡规则',
    color: '#FF4D3D',
    items: [
      '每个班次的开始与结束各打卡一次，打卡点设在签到处。',
      '临时换岗或离岗请先与组长确认，避免岗位空档。',
    ],
  },
  {
    title: '岗位说明',
    color: '#2ECC71',
    items: [
      '岗位分工、排班表与岗前培训材料将随组委会邮件下发。',
      '现场请听从各组组长安排；对岗位有疑问可在报到时提出调整。',
    ],
  },
  {
    title: 'After Party 规则',
    color: '#FFD900',
    items: [
      '完成全天服务的守桥人可凭工牌参加 After Party。',
      '具体时间、地点与名额以组委会最终通知为准。',
    ],
  },
  {
    title: '紧急联系',
    color: '#6C3FD4',
    items: [
      '现场紧急事务请第一时间联系本组组长或签到处总控。',
      '其他问题请邮件联系组委会：contact@awscommunity.cn。',
    ],
  },
];

export default function VolunteerPortal() {
  const [searchParams] = useSearchParams();
  const [me, setMe] = useState<VolunteerMe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fromUrl = searchParams.get('token');
    if (fromUrl) sessionStorage.setItem(TOKEN_KEY, fromUrl);
    const token = fromUrl ?? sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      setError('缺少访问凭证——请从录取邮件或确认成功页的链接进入本页。');
      setLoading(false);
      return;
    }
    fetchVolunteerMe(token)
      .then(setMe)
      .catch((e) => setError(e instanceof Error ? e.message : '链接无效或已过期'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-paper px-6 py-16 md:py-24">
      <div className="mx-auto max-w-[760px]">
        {loading && (
          <p className="text-center font-mono text-sm text-ink/50">加载中…</p>
        )}

        {!loading && error && (
          <div className="rounded-xl border-[3px] border-ink bg-white p-8 text-center shadow-hard">
            <div className="mx-auto mb-4 h-14 w-14 rounded-xl border-[3px] border-ink bg-[#FF4D3D]" aria-hidden="true" />
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#FF4D3D]">PORTAL // 无法进入</p>
            <h1 className="mt-2 font-sans text-xl font-bold text-ink">链接无效或已过期</h1>
            <p className="mt-3 font-sans text-sm leading-7 text-ink/70">{error}</p>
            <p className="mt-3 font-sans text-sm leading-7 text-ink/70">
              如确认链接无误仍无法进入，请邮件联系组委会：contact@awscommunity.cn
            </p>
          </div>
        )}

        {!loading && me && (
          <>
            {/* 头部卡：姓名 · 意向岗位 · 状态 */}
            <header className="rounded-xl border-[3px] border-ink bg-white p-8 shadow-hard">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#6C3FD4]">VOLUNTEER // 守桥人指引页</p>
              <h1 className="mt-2 font-sans text-2xl font-bold text-ink md:text-3xl">
                {me.name}
                {me.role && <span className="ml-2 font-sans text-lg font-bold text-ink/60">· {me.role}</span>}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className={`rounded-full border-2 border-ink px-3.5 py-1.5 font-mono text-xs font-bold ${STATUS_STYLE[me.status] ?? 'bg-white text-ink'}`}>
                  {me.status}
                </span>
                <span className="font-mono text-xs text-ink/60">{SITE.event} · {SITE.dateLong}</span>
              </div>
              <p className="mt-4 font-sans text-sm leading-7 text-ink/70">
                建议收藏本页——排班、培训与现场规则的最终版本以组委会邮件为准。
              </p>
            </header>

            {/* 指引手册 v1（静态占位） */}
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {GUIDE_SECTIONS.map((s) => (
                <section key={s.title} className="rounded-xl border-[3px] border-ink bg-white p-6 shadow-hard-sm">
                  <div className="flex items-center gap-3">
                    <span className="h-4 w-4 shrink-0 rounded border-2 border-ink" style={{ background: s.color }} aria-hidden="true" />
                    <h2 className="font-sans text-lg font-bold text-ink">{s.title}</h2>
                  </div>
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 font-sans text-sm leading-7 text-ink/80">
                    {s.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <p className="mt-8 text-center font-mono text-xs leading-6 text-ink/50">
              以上为指引手册 v1（占位版），最终规则以组委会邮件为准。
              <br />
              {SITE.name.toUpperCase()} · {SITE.date} · {SITE.cityEn.toUpperCase()}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
