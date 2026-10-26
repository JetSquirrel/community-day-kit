/**
 * 本届共建者 —— 2026 秋（Bridge with Signal）已确认的合作社区及企业，
 * 取自组委会 2026-09-23 的「合作社区及企业」名单（52 行中排除「本次暂不合作」
 * 与「待确认」两类后 28 家；观猹声明不加 logo、只做社群转发，未上墙 → 本站 27 家）
 * 及其 logo 包；logo 文件在 /public/partners/。
 * 墙上分两段：赞助伙伴（付费赞助，isPaidSponsor）在前，合作伙伴（社区合作宣发）在后。
 * 费用赞助 5 家的档位沿用上届（飞书表还没定档），Anker 已确认费用赞助但档位未定。
 * 比上一版新增 6 家：gitee@oschina、开源社、OpenAgents、通客松、TechFlows、FastGPT。
 * 入库时处理过的 logo：观测云从 AI 变体表裁出彩色锁定款、Anker 按明度重建字标
 * （去掉预览稿水印）、waytoagi 白色字标转墨色、gitee 由 .ai 转出、分子分母从简介图裁出字标。
 *
 * 飞书「赞助商表」同步来的 sponsors.json 仍会覆盖同名条目、并追加新条目
 * （见 mergePartners）——报名表里新审核通过的一家不用改代码就能上墙。
 */
import type { Partner } from '@/lib/content';

export interface CurrentPartner {
  name: string;
  /** /public/partners/ 下的 logo；缺省时墙上显示名称文字 */
  logo?: string;
  /** 飞书档位名（钻石赞助/铂金赞助/金牌赞助/银牌赞助）——只作记录，见 isPaidSponsor */
  tier?: string;
  /** 已确认付费赞助但档位未定：仍归入「赞助伙伴」段 */
  sponsor?: boolean;
  url?: string;
}

export const CURRENT_PARTNERS: CurrentPartner[] = [
  // 赞助伙伴 —— 费用赞助（顺序按组委会 9-23 海报）
  { name: '亚马逊云科技', logo: '/partners/amazon-web-services.png', tier: '钻石赞助' },
  { name: '英伟达 NVIDIA', logo: '/partners/nvidia.png', tier: '钻石赞助' },
  { name: '乐奇 Rokid', logo: '/partners/rokid.png', tier: '金牌赞助' },
  { name: 'SelectDB', logo: '/partners/selectdb.png', tier: '银牌赞助' },
  { name: '观测云', logo: '/partners/guance.png', tier: '金牌赞助' },
  { name: 'Anker', logo: '/partners/anker.png', sponsor: true },
  // 合作伙伴 —— 社区合作宣发（gitee@oschina 另含礼品赞助）
  { name: 'gitee@oschina', logo: '/partners/gitee.png' },
  { name: 'Intel', logo: '/partners/intel.png' },
  { name: 'waytoagi', logo: '/partners/waytoagi.png' },
  { name: '深圳市人工智能协会', logo: '/partners/shenzhen-ai-association.png' },
  { name: '赛博阿吉', logo: '/partners/cyber-aji.png' },
  { name: 'Clawtime', logo: '/partners/clawtime.png' },
  { name: '小红花', logo: '/partners/xiaohonghua.png' },
  { name: 'AIGC 广州社区', logo: '/partners/aigc-guangzhou.png' },
  { name: '广测集团', logo: '/partners/gtg.png' },
  { name: '分子分母', logo: '/partners/fenzi-fenmu.png' },
  { name: 'DataForAI', logo: '/partners/dataforai.png' },
  { name: 'ifclub', logo: '/partners/ifclub.png' },
  { name: 'IT168 · ITPUB', logo: '/partners/it168-itpub.png' },
  { name: '117AI 社区', logo: '/partners/117ai.png' },
  { name: '模力无限', logo: '/partners/moliwuxian.png' },
  { name: '励媖深圳', logo: '/partners/lean-in-shenzhen.png' },
  { name: '开源社', logo: '/partners/kaiyuanshe.png' },
  { name: 'OpenAgents', logo: '/partners/openagents.png' },
  { name: '通客松', logo: '/partners/tongkesong.png' },
  { name: 'FastGPT', logo: '/partners/fastgpt.png' },
  { name: 'TechFlows', logo: '/partners/techflows.png' },
];

/** 飞书档位名（/sponsors 权益表按档写） */
export const SPONSOR_TIERS = ['钻石赞助', '铂金赞助', '金牌赞助', '银牌赞助'];

/** 有赞助档位 = 付费赞助方；社区合作宣发、社区合作伙伴无档位。 */
export function isSponsorTier(tier?: string): boolean {
  return SPONSOR_TIERS.includes(tier ?? '');
}

/** 进「赞助伙伴」段：有档位，或档位未定但已确认为付费赞助（sponsor: true）。 */
export function isPaidSponsor(p: CurrentPartner): boolean {
  return isSponsorTier(p.tier) || p.sponsor === true;
}

/**
 * 内置名单 + 线上 sponsors.json：同名条目以线上为准（有 logo/tier/url 才覆盖），
 * 线上独有的条目追加在末尾。
 */
export function mergePartners(live: Partner[]): CurrentPartner[] {
  const merged = new Map(CURRENT_PARTNERS.map((p) => [p.name, p]));
  for (const p of live) {
    const prev = merged.get(p.name);
    merged.set(p.name, {
      name: p.name,
      logo: p.logo ?? prev?.logo,
      tier: p.tier ?? prev?.tier,
      url: p.url ?? prev?.url,
    });
  }
  return [...merged.values()];
}
