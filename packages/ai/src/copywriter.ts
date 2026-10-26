/**
 * 文案助手：推文初稿、小红书打卡文案池、嘉宾资料润色 + 英译、个性化邀约。
 * 2026 秋这些都是人工逐篇写（甚至「组内撰稿因全员没空直接跳过」），
 * 这里让 AI 基于真实数据（嘉宾 / 议程 / 赞助 / 规则）出初稿，人只负责改和发。
 */
import { z } from 'zod';
import { t, type EventConfig, type PlanRow } from '@cdkit/core';
import { structured, type Ai } from './client.ts';

const voice = (ev: EventConfig) => `你为「${t(ev.name)}」（主题：${t(ev.slogan)}，${ev.date}，${t(ev.city)}）写中文社区宣发文案。
风格：开发者社区口吻，真诚、具体、有信息量；不用「震撼」「重磅炸弹」等夸张词；不编造任何未提供的嘉宾、数据、奖品或福利。
品牌写法：「亚马逊云科技」（中文语境），英文语境用「AWS」。`;

export const TweetDraft = z.object({
  titles: z.array(z.string()).describe('3 个备选标题，≤28 字'),
  body: z.string().describe('正文 markdown，按推文框架分节'),
  missing: z.array(z.string()).describe('发布前仍缺的素材 / 信息（如照片、二维码、未确认的嘉宾）'),
  designNeeds: z.array(z.string()).describe('需要设计提供的配图及尺寸'),
});
export type TweetDraft = z.infer<typeof TweetDraft>;

export async function draftTweet(ai: Ai, ev: EventConfig, item: PlanRow, context: unknown): Promise<TweetDraft> {
  return structured(ai, {
    schema: TweetDraft,
    system: voice(ev),
    effort: 'medium',
    content: `推文：${item.title}（计划发布 ${item.due}，${item.d}）
内容框架：${item.detail || '按标题自行组织'}
可用数据（JSON，只能使用这里的事实）：
${JSON.stringify(context, null, 2)}`,
  });
}

const XhsBatch = z.object({ posts: z.array(z.object({ title: z.string(), body: z.string(), tags: z.array(z.string()) })) });

/**
 * 小红书打卡文案池（扫码随机领取一条发布换午餐券）。分批生成并去重，保证 count 条互不雷同。
 */
export async function xhsPool(ai: Ai, ev: EventConfig, count: number, facts: string, onProgress?: (n: number) => void) {
  const out: z.infer<typeof XhsBatch>['posts'] = [];
  const seen = new Set<string>();
  const angles = ['技术干货收获', '现场氛围', '和讲师交流', 'Workshop 动手体验', '展位逛吃', '认识新朋友', '城市与场地', '第一次参加技术大会', '带着问题来找答案', '周末充电'];
  let round = 0;
  while (out.length < count && round < Math.ceil(count / 20) + 5) {
    const batch = await structured(ai, {
      schema: XhsBatch,
      system: `${voice(ev)}
现在写小红书参会打卡笔记，参会者会原样发布。要求：第一人称、口语化、80–150 字、2–4 个 emoji、带活动话题；每条视角和句式都不同，避免模板感；不出现虚构的具体演讲内容。`,
      fast: true,
      effort: 'low',
      content: `活动事实：${facts}
本批写 20 条，侧重角度：${angles[round % angles.length]}、${angles[(round + 3) % angles.length]}。
已有标题（不要重复）：${[...seen].slice(-60).join(' / ')}`,
    });
    for (const p of batch.posts) {
      const k = p.title.replace(/\s/g, '');
      if (!seen.has(k)) {
        seen.add(k);
        out.push(p);
      }
    }
    round++;
    onProgress?.(out.length);
  }
  return out.slice(0, count);
}

export const SpeakerProfile = z.object({
  title: z.string().describe('职位，规范大小写与品牌写法'),
  company: z.string(),
  bio: z.string().describe('第三人称中文简介，≤120 字，保留事实不夸大'),
  titleEn: z.string(),
  companyEn: z.string(),
  talkEn: z.string().describe('议题英文标题'),
  bioEn: z.string().describe('英文简介，≤80 words'),
  fixes: z.array(z.string()).describe('改动说明：修正了哪些大小写 / 品牌名 / 错别字'),
});

/** 嘉宾资料润色 + 英译（官网英文版、国际讲者海报都要用；2026 秋英文列大多是空的） */
export async function polishSpeaker(ai: Ai, ev: EventConfig, s: { name: string; title: string; company: string; talk: string; bio: string }) {
  return structured(ai, {
    schema: SpeakerProfile,
    system: `${voice(ev)}
你在整理嘉宾资料用于官网和海报。规范品牌与技术名词大小写（如 Amazon Bedrock、Kubernetes、AWS Community Hero、SageMaker），去掉口语和重复，不添加原文没有的头衔或成就。`,
    fast: true,
    effort: 'low',
    maxTokens: 3000,
    content: JSON.stringify(s),
  });
}
