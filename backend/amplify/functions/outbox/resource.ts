import { defineFunction, secret } from '@aws-amplify/backend';

/**
 * 发信台：唯一的对外发信出口。只有每日催交提醒是定时任务；
 * 录用 / 候补 / 拒绝 / 志愿者 / 赞助商邮件必须由后台审批批次后发送。
 * OUTBOX_TABLE / PORTAL_URL / EMAIL_LINK / TEST_TO / FEISHU_APP_ID 由 backend.ts 注入。
 */
export const outbox = defineFunction({
  name: 'outbox',
  entry: './handler.ts',
  timeoutSeconds: 300,
  // 每天 02:00 UTC = 北京时间 10:00 发催交提醒
  schedule: '0 2 * * ? *',
  environment: {
    FEISHU_APP_SECRET: secret('FEISHU_APP_SECRET'),
    CONFIRM_SECRET: secret('CONFIRM_SECRET'),
    EMAIL_KEY: secret('EMAIL_KEY'),
  },
});
