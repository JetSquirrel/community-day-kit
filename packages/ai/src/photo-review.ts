/**
 * 讲者照片 AI 审核（上传后数秒内返回，讲者当场可换图）。
 * 硬性指标（分辨率 / 比例 / 格式）已在 @cdkit/media checkPhoto 卡住，这里只看人眼判断的部分，
 * 并顺带返回人脸中心位置——海报生成按它裁剪，避免「头像被切」。
 */
import { z } from 'zod';
import type { EventConfig } from '@cdkit/core';
import { structured, type Ai } from './client.ts';

export const PhotoReview = z.object({
  verdict: z.enum(['pass', 'fix', 'reject']).describe('pass=可直接用于海报；fix=可用但建议换更好的；reject=不可用'),
  checks: z.array(
    z.object({
      rule: z.string().describe('对应的拍摄要求原文'),
      ok: z.boolean(),
      note: z.string().describe('不通过时说明原因，面向讲者，中文，一句话'),
    }),
  ),
  people: z.number().int().describe('画面中可辨认的人数'),
  faceCenter: z
    .object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })
    .nullable()
    .describe('主体人脸中心的相对坐标（0–1，左上为原点）；无人脸为 null'),
  backgroundSimple: z.boolean().describe('背景是否简洁、便于抠图'),
  message: z.string().describe('给讲者的总结与具体改进建议，中文，礼貌简短，≤80 字'),
});
export type PhotoReview = z.infer<typeof PhotoReview>;

export async function reviewPhoto(ai: Ai, ev: EventConfig, image: { base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' }): Promise<PhotoReview> {
  const system = `你是技术大会「${typeof ev.name === 'string' ? ev.name : ev.name.zh}」的嘉宾海报设计助理，负责检查讲者上传的个人照片能否直接用于海报。
海报为竖版，照片区域比例 ${ev.materials.photo.aspect.join(':')}，会自动抠图并放在纯色背景上。

逐条对照以下拍摄要求判断（checks 按此顺序、rule 用原文）：
${ev.materials.photo.guidelines.map((g, i) => `${i + 1}. ${g}`).join('\n')}

判定标准：
- reject：非真人照片、多人且无法确定主体、脸部被遮挡或严重模糊、含明显水印/文字/logo、聊天截图或屏幕翻拍。
- fix：能用但效果会打折，例如背景杂乱难以抠图、光线偏暗、头顶被裁、轻微模糊、过度美颜。
- pass：其余情况。不要因为个人审美（服装、表情）判不通过。
分辨率与比例已由程序检查，不要据此判定。只评价照片，不评价人。`;
  return structured(ai, {
    schema: PhotoReview,
    system,
    fast: true,
    effort: 'low',
    maxTokens: 2000,
    content: [
      { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
      { type: 'text', text: '请审核这张讲者照片。' },
    ],
  });
}
