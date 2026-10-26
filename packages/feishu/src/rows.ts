/** 飞书记录 → 巡检用的扁平行（CLI 的 cdkit status 与发信台每日巡检共用） */
import type { AuditInput, AuditRow, EventConfig } from '@cdkit/core';
import { asText, type Feishu, type FeishuRecord } from './client.ts';

const f = (r: FeishuRecord, k: string) => asText(r.fields[k]);

export function cfpRow(r: FeishuRecord): AuditRow {
  return {
    id: r.record_id,
    name: f(r, '姓名'),
    status: f(r, '状态'),
    track: f(r, '赛道'),
    photo: !!f(r, '照片'),
    deck: !!f(r, 'PPT 初稿'),
    deckFinal: !!f(r, 'PPT 终稿'),
    publicDecision: !!f(r, '公开授权'),
  };
}

export const sponsorRow = (r: FeishuRecord): AuditRow => ({ id: r.record_id, name: f(r, '名称') || f(r, '公司'), status: f(r, '状态'), logo: !!f(r, 'Logo') });
export const volunteerRow = (r: FeishuRecord): AuditRow => ({ id: r.record_id, name: f(r, '姓名'), status: f(r, '状态') });

/** 过滤飞书表里常见的空白行 */
const nonBlank = (r: AuditRow) => !!(r.name || r.status);

export async function loadAuditInput(feishu: Feishu, ev: EventConfig): Promise<AuditInput & { raw: Record<string, FeishuRecord[]> }> {
  const T = ev.feishu.tables;
  const app = ev.feishu.appToken;
  const list = (id: string) => (id ? feishu.listRecords(app, id) : Promise.resolve([] as FeishuRecord[]));
  const [cfp, sponsors, volunteers, speakers] = await Promise.all([list(T.cfp), list(T.sponsors), list(T.volunteers), list(T.speakers)]);
  return {
    cfp: cfp.map(cfpRow).filter(nonBlank),
    sponsors: sponsors.map(sponsorRow).filter(nonBlank),
    volunteers: volunteers.map(volunteerRow).filter(nonBlank),
    shownSpeakerIds: T.speakers ? speakers.filter((r) => r.fields['展示'] === true).map((r) => f(r, 'ID')) : undefined,
    raw: { cfp, sponsors, volunteers, speakers },
  };
}
