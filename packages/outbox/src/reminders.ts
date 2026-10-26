/**
 * 自动催交。2026 秋大量时间花在群里 @ 人催照片 / PPT / Logo / 志愿者回填。
 * 规则写在 event.yaml reminders（谁、缺什么、D-N 哪几天），定时任务每天算一次「今天该提醒谁」，
 * 经发信台幂等台账发送（键含日期，同一提醒同一天只发一次；材料交了自然不再命中）。
 * 提醒不占名额、内容无副作用，所以允许定时自动发；录用类邮件仍必须人工审批。
 */
import { diffDays, type EventConfig } from '@cdkit/core';
import type { Recipient, TemplateId } from './outbox.ts';

export type Condition = EventConfig['reminders'][number]['when'];

export interface Subject extends Recipient {
  audience: 'speaker' | 'sponsor' | 'volunteer';
  /** 当前命中的缺失条件，由调用方根据飞书记录计算 */
  missing: Condition[];
}

export interface DueReminder {
  template: TemplateId;
  reminderId: string;
  day: number;
  recipients: Recipient[];
}

/** today 为活动时区的 YYYY-MM-DD */
export function dueReminders(ev: EventConfig, today: string, subjects: Subject[]): DueReminder[] {
  const day = diffDays(today, ev.date);
  const out: DueReminder[] = [];
  for (const rem of ev.reminders) {
    if (!rem.days.includes(day)) continue;
    const recipients = subjects.filter((s) => s.audience === rem.audience && s.missing.includes(rem.when));
    if (recipients.length) {
      // 模板名带上 D-N，使台账键 = reminder:<id>@<day>#recordId —— 每天最多一封
      out.push({ template: `reminder:${rem.id}@${day}`, reminderId: rem.id, day, recipients });
    }
  }
  return out;
}

/** 讲者记录 → 缺失条件（字段名与 feishu schema 一致） */
export function speakerMissing(row: { status: string; photo?: string; deck?: string; deckFinal?: string }): Condition[] {
  const m: Condition[] = [];
  if (row.status === '已通知') m.push('unconfirmed');
  if (row.status === '已确认') {
    if (!row.photo) m.push('photo-missing');
    if (!row.deck) m.push('deck-missing');
    if (!row.deckFinal) m.push('deck-final-missing');
  }
  return m;
}
