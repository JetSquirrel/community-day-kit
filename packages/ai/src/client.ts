/**
 * Claude on Amazon Bedrock（Mantle Messages API）。凭证走 Lambda 执行角色 / 本地 AWS profile，无需 API Key。
 * 所有任务都用结构化输出（zod schema），结果直接写回飞书或展示给讲者，不做字符串解析。
 */
import { AnthropicBedrockMantle } from '@anthropic-ai/bedrock-sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import type { z } from 'zod';
import type { EventConfig } from '@cdkit/core';

export type Effort = 'low' | 'medium' | 'high';

export interface Ai {
  client: AnthropicBedrockMantle;
  /** 质量优先（PPT 审核、CFP 预审、纪要） */
  model: string;
  /** 高频低成本（照片审核、批量文案） */
  fastModel: string;
}

export function createAi(ev: EventConfig, opts: { region?: string } = {}): Ai {
  if (!ev.ai.enabled) throw new Error('event.yaml ai.enabled = false');
  return {
    client: new AnthropicBedrockMantle({ awsRegion: opts.region ?? ev.ai.region }),
    model: ev.ai.model,
    fastModel: ev.ai.fastModel,
  };
}

export class AiUnavailable extends Error {}

/**
 * 发一次结构化请求。拒答 / 截断 / 解析失败统一抛 AiUnavailable，
 * 调用方据此降级为「转人工审核」而不是阻塞讲者提交。
 */
export async function structured<S extends z.ZodType>(
  ai: Ai,
  args: {
    schema: S;
    system: string;
    content: MessageParam['content'];
    fast?: boolean;
    effort?: Effort;
    maxTokens?: number;
  },
): Promise<z.infer<S>> {
  const res = await ai.client.messages.parse({
    model: args.fast ? ai.fastModel : ai.model,
    max_tokens: args.maxTokens ?? 16000,
    system: [{ type: 'text', text: args.system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: args.content }],
    output_config: { effort: args.effort ?? 'medium', format: zodOutputFormat(args.schema) },
  });
  if (res.stop_reason === 'refusal') throw new AiUnavailable(`模型拒绝处理（${res.stop_details?.category ?? 'unknown'}）`);
  if (res.stop_reason === 'max_tokens') throw new AiUnavailable('输出被截断（max_tokens）');
  if (res.parsed_output == null) throw new AiUnavailable('结构化输出解析失败');
  return res.parsed_output as z.infer<S>;
}
