/**
 * PPT AI 预审。规则 = event.yaml materials.deck.rules（上传页先原样展示给讲者），
 * 确定性检查结果（页数 / 字号 / 敏感词 / 模板标记）一并交给模型作为事实依据，
 * 模型逐条给出 pass / warn / fail + 页码 + 可执行的修改建议。
 * 讲者在提交前就能看到报告并自行修改；组委会只复核 fail / warn 项。
 */
import { z } from 'zod';
import { t, type EventConfig } from '@cdkit/core';
import { deckDigest, type DeckFinding, type DeckStats } from '@cdkit/media';
import { structured, type Ai } from './client.ts';

export const DeckReview = z.object({
  verdict: z.enum(['ready', 'minor', 'major']).describe('ready=可直接上台；minor=小修即可；major=需要较大修改后再提交'),
  items: z.array(
    z.object({
      rule: z.string().describe('规则原文'),
      status: z.enum(['pass', 'warn', 'fail']),
      slides: z.array(z.number().int()).describe('涉及页码，没有则为空'),
      comment: z.string().describe('发现的问题，中文，具体到内容'),
      suggestion: z.string().describe('可执行的修改建议；pass 时为空字符串'),
    }),
  ),
  titleMatches: z.boolean().describe('PPT 主题是否与提交的议题一致'),
  estimatedMinutes: z.number().describe('按内容量估计的讲述时长（分钟）'),
  summary: z.string().describe('给讲者的总评，中文，先肯定亮点再列最重要的 1–3 个修改点，≤150 字'),
});
export type DeckReview = z.infer<typeof DeckReview>;

export async function reviewDeck(
  ai: Ai,
  ev: EventConfig,
  input: {
    stats: DeckStats;
    findings: DeckFinding[];
    /** PDF 原文件（pptx 用 stats 文本即可） */
    pdfBase64?: string;
    talk: { title: string; abstract?: string; speaker: string; minutes: number; track: string; audience?: 'zh' | 'en' | 'mixed' };
  },
): Promise<DeckReview> {
  const track = ev.tracks.find((x) => x.id === input.talk.track);
  const system = `你是「${t(ev.name)}」的讲稿审核员，代表组委会在讲者提交 PPT 之前给出预审意见。
语气：专业、友善、具体。讲者都是志愿分享的社区成员，先肯定、再建议，不说教。

审核规则（items 必须逐条覆盖，rule 用原文，顺序一致）：
${ev.materials.deck.rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}

判断要点：
- 程序检查结果是事实（页数、字号、关键词命中），直接引用，不要质疑；关键词命中只是线索，要结合上下文判断是否真的违规（例如客观的迁移案例可以是 pass 或 warn）。
- 「推广克制」看整体比例：公司 / 产品介绍超过 1 页、或通篇都是产品功能罗列，判 warn/fail。
- 看不到图片内容时，不要臆测图片里的问题。
- 无法从文本判断的规则（如字体授权），status 给 pass，comment 写「无法从文本判断，请自查」。`;
  const meta = `议题：${input.talk.title}
讲者：${input.talk.speaker}
赛道：${track ? t(track.name) : input.talk.track}
时长：${input.talk.minutes} 分钟
受众语言：${input.talk.audience ?? 'zh'}
${input.talk.abstract ? `摘要：${input.talk.abstract}` : ''}

程序检查结果：
${input.findings.length ? input.findings.map((f) => `- [${f.level}] ${f.rule}：${f.message}${f.slides ? `（第 ${f.slides.join(',')} 页）` : ''}`).join('\n') : '- 无'}
总页数：${input.stats.slideCount}`;

  const content: Parameters<typeof structured>[1]['content'] = input.pdfBase64
    ? [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: input.pdfBase64 } },
        { type: 'text', text: `${meta}\n\n请审核上面的 PDF 讲稿。` },
      ]
    : [{ type: 'text', text: `${meta}\n\n逐页文字如下：\n${deckDigest(input.stats)}\n\n请审核这份讲稿。` }];

  return structured(ai, { schema: DeckReview, system, content, effort: 'medium' });
}
