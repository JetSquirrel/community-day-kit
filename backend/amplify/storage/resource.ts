import { defineStorage } from '@aws-amplify/backend';

// 私有桶；speakers/* sponsors/* 经 CloudFront(OAC) 公开，materials/* 永不公开，
// staging/* 为材料页直传暂存区（7 天生命周期，见 backend.ts）。
export const storage = defineStorage({ name: 'communityDayAssets' });
