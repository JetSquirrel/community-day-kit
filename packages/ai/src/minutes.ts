/**
 * 会议纪要 → 待办。2026 秋每周会后由专人手动从飞书智能纪要里抄待办、在群里 @ 人跟进。
 * 现在：导出纪要 markdown → cdkit minutes → 写入飞书「待办」表（负责人 / 截止日 / 原文），
 * 并与倒排计划对照，标出「与 playbook 冲突 / playbook 里没有的新事项」。
 */
import { z } from 'zod';
import type { EventConfig } from '@cdkit/core';
import { structured, type Ai } from './client.ts';

export const MinutesDigest = z.object({
  meetingDate: z.string().describe('会议日期 YYYY-MM-DD'),
  todos: z.array(
    z.object({
      task: z.string().describe('可执行的一句话事项，动词开头'),
      owner: z.string().describe('负责人，用团队名册里的标准姓名；无法确定写「待定」'),
      due: z.string().nullable().describe('截止日期 YYYY-MM-DD；纪要里的「明天」「下周二」「节前」按会议日期换算；无则 null'),
      priority: z.enum(['P0', 'P1', 'P2']).describe('P0=阻塞活动或有硬截止；P1=本周内；P2=其他'),
      quote: z.string().describe('纪要原文依据（≤60 字）'),
    }),
  ),
  decisions: z.array(z.string()).describe('本次会议已拍板的决定'),
  openQuestions: z.array(z.string()).describe('尚未决定、需要后续跟进的问题'),
  configChanges: z
    .array(z.object({ field: z.string().describe('event.yaml 字段路径，如 deadlines.deckDraft / tracks[ai].quota / venue.boothCount'), value: z.string(), quote: z.string() }))
    .describe('会议中改变了、需要同步到 event.yaml 的参数（日期、名额、展位数、会场等）'),
});
export type MinutesDigest = z.infer<typeof MinutesDigest>;

export async function digestMinutes(ai: Ai, ev: EventConfig, markdown: string): Promise<MinutesDigest> {
  const roster = ev.team
    .filter((m) => !m.name.startsWith('（'))
    .map((m) => `- ${m.name}（${m.role}）${m.aliases.length ? ` 别名：${m.aliases.join('、')}` : ''}`)
    .join('\n');
  const system = `你是社区活动筹备组的项目助理。把会议纪要整理成可跟踪的待办。
活动日：${ev.date}；当前关键截止：${Object.entries(ev.deadlines).map(([k, v]) => `${k}=${v}`).join('，')}。
团队名册（负责人请归一到这些名字；纪要里的昵称、英文名、「来自 XX」都要识别）：
${roster || '（未配置，按纪要原文姓名填写）'}

规则：
- 纪要的「待办」部分是主要来源，正文中明确分配了人和动作的也要收录；同一件事合并成一条。
- AI 生成的纪要可能有错字（人名 / 品牌名同音错写），按上下文纠正为最可能的写法。
- 不要编造截止日期。
- configChanges 只收录明确拍板的参数变化。`;
  return structured(ai, { schema: MinutesDigest, system, content: markdown, effort: 'medium' });
}
