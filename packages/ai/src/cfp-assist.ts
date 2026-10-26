/**
 * CFP 预审助手：评审只需打分，AI 先把「读一遍、归类、挑问题」做掉。
 * 输出写回飞书投稿表的 AI 列（AI 摘要 / AI 建议赛道 / AI 风险提示 / AI 重复/相似）。
 * AI 不打分、不做录用决定——2026 秋的三方打分机制保持不变。
 */
import { z } from 'zod';
import { t, type EventConfig } from '@cdkit/core';
import { structured, type Ai } from './client.ts';

export interface Submission {
  recordId: string;
  title: string;
  abstract: string;
  bio: string;
  track: string;
  format: string;
  name: string;
  company?: string;
}

export const CfpAssist = z.object({
  summary: z.string().describe('一句话概括这个分享讲什么、给谁听、带走什么，中文 ≤60 字'),
  suggestedTrack: z.string().describe('最匹配的赛道 id'),
  trackFit: z.enum(['good', 'ok', 'poor']).describe('与投稿所选赛道的匹配度'),
  awsRelevance: z.number().int().min(1).max(5).describe('与 AWS / 云原生 / 社区主题的相关度'),
  levelGuess: z.enum(['100', '200', '300', '400']),
  risks: z.array(z.string()).describe('需要评审注意的问题：纯产品推广、标题含竞品平台、内容空泛、与赛道定位不符、海外讲者无差旅支持、信息不全等；没有则空数组'),
  similarTo: z.array(z.string()).describe('与本投稿主题高度重复的其他投稿 recordId'),
  titleSuggestion: z.string().describe('如标题晦涩，给一个更直白吸引人的标题；否则空字符串'),
});
export type CfpAssist = z.infer<typeof CfpAssist>;

export async function assistCfp(ai: Ai, ev: EventConfig, all: Submission[], target: Submission): Promise<CfpAssist> {
  // 赛道说明 + 全部投稿清单放 system，跨投稿复用 prompt cache
  const system = `你是「${t(ev.name)}」CFP 评审助理。为每条投稿写评审参考，帮助评审快速打分。你不打分。

赛道：
${ev.tracks.map((tr) => `- ${tr.id}：${t(tr.name)}（${tr.signal}），名额 ${tr.quota}`).join('\n')}

形式与时长：${ev.formats.map((f) => `${f.label} ${f.minutes} 分钟`).join('；')}

全部投稿（用于判断重复）：
${all.map((s) => `- ${s.recordId} | ${s.track} | ${s.title}`).join('\n')}`;
  const content = `请评估这条投稿：
recordId：${target.recordId}
标题：${target.title}
所选赛道：${target.track}
形式：${target.format}
讲者：${target.name}${target.company ? `（${target.company}）` : ''}
讲者简介：${target.bio}
摘要：
${target.abstract}`;
  return structured(ai, { schema: CfpAssist, system, content, effort: 'medium', maxTokens: 4000 });
}
