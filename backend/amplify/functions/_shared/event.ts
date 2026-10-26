/**
 * 活动配置在构建期由 `cdkit use <slug>` 生成为 event.generated.json，esbuild 打进每个函数包。
 * 换一届：cdkit use <新 slug> → 重新部署，函数代码零修改。
 */
import raw from '../../event.generated.json';
import { EventConfig } from '@cdkit/core';

export const ev: EventConfig = EventConfig.parse(raw);
