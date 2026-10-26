/**
 * cdkit 后端（Amplify Gen2）。部署前先 `npm run cdkit -- use <slug>` 生成 event.generated.json。
 *
 *   admin-api  管理后台 + 公开报名表单（Function URL）
 *   portal     讲者 / 赞助商材料页：规范先行、直传 S3、程序检查 + AI 预审（Function URL）
 *   outbox     发信台：批次审批发送 + 每日催交提醒（仅被 admin-api invoke / 定时触发）
 *   storage    私有桶 + CloudFront（speakers/* sponsors/* 公开）
 *   OutboxTable 发信台账（幂等键）+ 批次快照
 */
import { defineBackend } from '@aws-amplify/backend';
import { readFileSync } from 'node:fs';
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { EventConfig } from '@cdkit/core';
import { storage } from './storage/resource';
import { adminApi } from './functions/admin-api/resource';
import { portal } from './functions/portal/resource';
import { outbox } from './functions/outbox/resource';

// 本地 sandbox：读取仓库根目录 .env（控制台注入的环境变量优先）
try {
  for (const line of readFileSync(new URL('../../.env', import.meta.url), 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {
  /* CI 无 .env */
}

let ev: EventConfig;
try {
  ev = EventConfig.parse(JSON.parse(readFileSync(new URL('./event.generated.json', import.meta.url), 'utf8')));
} catch (e) {
  throw new Error(`缺少或无效的 backend/amplify/event.generated.json——先运行 npm run cdkit -- use <slug>\n${(e as Error).message}`);
}

const backend = defineBackend({ storage, adminApi, portal, outbox });

const isProd = ['main', 'master'].includes(process.env.AWS_BRANCH ?? '');
const EMAIL_LINK = (process.env.EMAIL_LINK ?? '').trim();
const TEST_TO = isProd ? '' : (process.env.TEST_TO ?? ev.mail.testTo ?? '').trim();
if (isProd && !EMAIL_LINK) throw new Error('生产分支必须配置 EMAIL_LINK');
if (isProd && ev.mail.testTo) throw new Error('生产分支 event.yaml mail.testTo 必须为空（否则所有邮件都会改投）');

const site = `https://${ev.domain}`;
const origins_ = [site, 'http://localhost:3000', 'http://localhost:5173'];

// ===== 存储 + CDN =====
const bucket = backend.storage.resources.bucket;
const cfnBucket = backend.storage.resources.cfnResources.cfnBucket;
// 材料页直传：预签名 PUT（签名即授权），来源为 Lambda Function URL 域名
cfnBucket.corsConfiguration = {
  corsRules: [{ allowedMethods: ['PUT'], allowedOrigins: ['https://*.lambda-url.*.on.aws'], allowedHeaders: ['*'], maxAge: 3000 }],
};
cfnBucket.lifecycleConfiguration = { rules: [{ id: 'staging-expire', prefix: 'staging/', status: 'Enabled', expirationInDays: 7 }] };

const st = backend.storage.stack;
const cdn = new cloudfront.Distribution(st, 'AssetsCdn', {
  comment: `${ev.slug} assets (speakers/*, sponsors/*)`,
  defaultBehavior: {
    origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
    responseHeadersPolicy: new cloudfront.ResponseHeadersPolicy(st, 'AssetsCors', {
      corsBehavior: { accessControlAllowCredentials: false, accessControlAllowHeaders: ['*'], accessControlAllowMethods: ['GET', 'HEAD'], accessControlAllowOrigins: origins_, originOverride: true },
    }),
    functionAssociations: [
      {
        eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        function: new cloudfront.Function(st, 'PrefixGuard', {
          code: cloudfront.FunctionCode.fromInline(
            "function handler(e){var u=e.request.uri;if(u.indexOf('/speakers/')===0||u.indexOf('/sponsors/')===0)return e.request;return{statusCode:404,statusDescription:'Not Found'}}",
          ),
        }),
      },
    ],
  },
});

// ===== 发信台账 =====
const outboxTable = new dynamodb.Table(backend.outbox.stack, 'OutboxTable', {
  partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  timeToLiveAttribute: 'ttl',
  pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
  // 台账是「谁收到过什么」的唯一凭据，删栈也保留
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});
outboxTable.addGlobalSecondaryIndex({ indexName: 'byTemplate', partitionKey: { name: 'template', type: dynamodb.AttributeType.STRING } });

// ===== 函数 =====
const adminFn = backend.adminApi.resources.lambda as lambda.Function;
const portalFn = backend.portal.resources.lambda as lambda.Function;
const outboxFn = backend.outbox.resources.lambda as lambda.Function;

const T = ev.feishu.tables;
const common: Record<string, string> = { FEISHU_APP_ID: process.env.FEISHU_APP_ID ?? '' };
for (const fn of [adminFn, portalFn, outboxFn]) for (const [k, v] of Object.entries(common)) fn.addEnvironment(k, v);

// admin-api：沿用 2026 秋的环境变量名
const adminEnv: Record<string, string> = {
  FEISHU_REDIRECT_URI: `${site}/admin/callback`,
  FEISHU_BITABLE_APP_TOKEN: ev.feishu.appToken,
  FEISHU_CFP_TABLE_ID: T.cfp,
  FEISHU_VOLUNTEERS_TABLE_ID: T.volunteers,
  FEISHU_SPONSOR_APPS_TABLE_ID: T.sponsors,
  FEISHU_SPONSORS_TABLE_ID: T.sponsors,
  FEISHU_SPEAKERS_TABLE_ID: T.speakers,
  FEISHU_SUBSCRIBE_TABLE_ID: process.env.FEISHU_SUBSCRIBE_TABLE_ID ?? '',
  ALLOWED_OPEN_IDS: process.env.ALLOWED_OPEN_IDS ?? '',
  ALLOWED_EMAILS: process.env.ALLOWED_EMAILS ?? '',
  CONTENT_SYNC_FUNCTION: process.env.CONTENT_SYNC_FUNCTION ?? '',
  HERO_NOTIFY_TO: process.env.HERO_NOTIFY_TO ?? '',
  EMAIL_FROM: ev.mail.from,
  EMAIL_LINK,
  TEST_TO,
  OUTBOX_FUNCTION: outboxFn.functionName,
  ASSETS_BUCKET: bucket.bucketName,
  ASSETS_CDN_DOMAIN: cdn.distributionDomainName,
};
for (const [k, v] of Object.entries(adminEnv)) adminFn.addEnvironment(k, v);
outboxFn.grantInvoke(adminFn);
bucket.grantPut(adminFn, 'speakers/*');
bucket.grantPut(adminFn, 'sponsors/*');

const adminUrl = adminFn.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
  cors: { allowedOrigins: origins_, allowedMethods: [lambda.HttpMethod.GET, lambda.HttpMethod.POST], allowedHeaders: ['Authorization', 'Content-Type'], maxAge: cdk.Duration.minutes(5) },
});

// portal
portalFn.addEnvironment('ASSETS_BUCKET', bucket.bucketName);
portalFn.addEnvironment('ASSETS_CDN_DOMAIN', cdn.distributionDomainName);
bucket.grantReadWrite(portalFn, 'staging/*');
bucket.grantPut(portalFn, 'speakers/*');
bucket.grantPut(portalFn, 'sponsors/*');
bucket.grantPut(portalFn, 'materials/*');
const portalUrl = portalFn.addFunctionUrl({ authType: lambda.FunctionUrlAuthType.NONE });

// outbox
outboxFn.addEnvironment('OUTBOX_TABLE', outboxTable.tableName);
outboxFn.addEnvironment('PORTAL_URL', portalUrl.url.replace(/\/$/, ''));
outboxFn.addEnvironment('EMAIL_LINK', EMAIL_LINK);
outboxFn.addEnvironment('TEST_TO', TEST_TO);
outboxTable.grantReadWriteData(outboxFn);

// Bedrock（Claude，经 Mantle Messages API）。
// ⚠ 首次部署请对照 Bedrock 文档确认 Mantle 端点所需的 IAM action，并把 resources 收窄到所用模型。
if (ev.ai.enabled) {
  portalFn.addToRolePolicy(
    new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
      resources: ['*'],
    }),
  );
}

backend.addOutput({
  custom: {
    event: ev.slug,
    adminApiUrl: adminUrl.url,
    portalUrl: portalUrl.url,
    assetsCdnDomain: cdn.distributionDomainName,
  },
});
