import { defineFunction, secret } from '@aws-amplify/backend';

/**
 * 讲者 / 赞助商材料页。PPT 解析 + AI 预审需要内存与时间：1GB / 3 分钟。
 * ASSETS_BUCKET / ASSETS_CDN_DOMAIN / FEISHU_APP_ID 由 backend.ts 注入；Bedrock 权限在 backend.ts 授予。
 */
export const portal = defineFunction({
  name: 'portal',
  entry: './handler.ts',
  timeoutSeconds: 180,
  memoryMB: 1024,
  environment: {
    FEISHU_APP_SECRET: secret('FEISHU_APP_SECRET'),
    CONFIRM_SECRET: secret('CONFIRM_SECRET'),
  },
});
