import { defineFunction, secret } from '@aws-amplify/backend';

/**
 * 管理后台 API + 公开报名表单（沿用 2026 秋实现）。
 * 表 ID、回调地址、发件人等全部由 backend.ts 从 event.generated.json 注入——换一届不改这里。
 */
export const adminApi = defineFunction({
  name: 'admin-api',
  entry: './handler.mjs',
  timeoutSeconds: 60,
  environment: {
    EMAIL_KEY: secret('EMAIL_KEY'),
    FEISHU_APP_SECRET: secret('FEISHU_APP_SECRET'),
    SESSION_SECRET: secret('SESSION_SECRET'),
    CONFIRM_SECRET: secret('CONFIRM_SECRET'),
  },
});
