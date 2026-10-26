/**
 * 邮件模板（中英双语）。所有活动信息来自 event.yaml，换一届不用改模板。
 * 录用邮件里直接附「材料页」链接，并在正文写明照片 / PPT 规范——讲者在打开上传页之前就知道要准备什么。
 */
import { t, type EventConfig } from '@cdkit/core';
import type { Recipient, TemplateId } from './outbox.ts';

export interface Rendered {
  subject: string;
  text: string;
  html: string;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function shell(ev: EventConfig, bodyHtml: string): string {
  const c = ev.theme.colors;
  return `<!doctype html><html><body style="margin:0;background:#f5f5f5;font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;color:${c.ink}">
<div style="max-width:600px;margin:0 auto;background:#fff">
<div style="background:${c.bg};padding:20px 28px;border-bottom:4px solid ${c.ink}"><b style="font-size:18px">${esc(t(ev.name))}</b><div style="font-size:13px">${esc(t(ev.slogan))} · ${ev.date}</div></div>
<div style="padding:24px 28px;line-height:1.7;font-size:15px">${bodyHtml}</div>
<div style="padding:16px 28px;font-size:12px;color:#888;border-top:1px solid #eee">${esc(ev.contactEmail)} · https://${esc(ev.domain)}</div>
</div></body></html>`;
}

const button = (ev: EventConfig, href: string, label: string) =>
  `<p><a href="${esc(href)}" style="display:inline-block;background:${ev.theme.colors.ink};color:${ev.theme.colors.bg};padding:12px 22px;text-decoration:none;font-weight:700">${esc(label)}</a></p>`;

const list = (items: string[]) => `<ul style="padding-left:20px">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;

export function render(ev: EventConfig, template: TemplateId, r: Recipient): Rendered {
  const v = r.vars ?? {};
  const name = esc(r.name);
  switch (template) {
    case 'cfp-accept': {
      const subject = `【议题录用】${t(ev.name)} | Your talk is accepted`;
      const body = `<p>${name} 你好，</p>
<p>恭喜！你的议题《${esc(v.talk ?? '')}》已被 ${esc(t(ev.name))} 录用 🎉</p>
<p><b>请在 ${ev.deadlines.speakerConfirm} 前点击下方按钮确认出席</b>，逾期未确认的席位将依次递补给候补讲者。</p>
${button(ev, v.portalUrl ?? '#', '确认出席并提交材料')}
<p><b>需要准备的材料</b>（页面会先展示规范，上传后 AI 即时预审，可反复修改）：</p>
<p>📷 个人照片（用于嘉宾海报，${ev.deadlines.agendaFreeze} 前）：</p>${list(ev.materials.photo.guidelines)}
<p>📊 PPT（初稿 ${ev.deadlines.deckDraft}，终稿 ${ev.deadlines.deckFinal}）：</p>${list(ev.materials.deck.rules)}
${ev.materials.deck.templateUrl ? `<p>官方 PPT 模板：<a href="${esc(ev.materials.deck.templateUrl)}">${esc(ev.materials.deck.templateUrl)}</a></p>` : ''}
<hr style="border:none;border-top:1px solid #eee"><p style="color:#555">Hi ${name}, your talk "${esc(v.talk ?? '')}" has been accepted. Please confirm before ${ev.deadlines.speakerConfirm} via the button above; the page lists the photo and slide guidelines and gives instant AI feedback on upload.</p>`;
      return { subject, html: shell(ev, body), text: `${r.name} 你好，你的议题《${v.talk ?? ''}》已录用。请在 ${ev.deadlines.speakerConfirm} 前确认出席：${v.portalUrl ?? ''}` };
    }
    case 'cfp-waitlist': {
      const subject = `【候补通知】${t(ev.name)}`;
      const body = `<p>${name} 你好，</p><p>感谢投稿《${esc(v.talk ?? '')}》。本届名额有限，你的议题已进入候补名单，如有讲者无法出席我们会第一时间联系你。也欢迎到现场参加！</p>`;
      return { subject, html: shell(ev, body), text: `${r.name} 你好，你的议题《${v.talk ?? ''}》已进入候补名单。` };
    }
    case 'cfp-decline': {
      const subject = `【投稿结果】${t(ev.name)}`;
      const body = `<p>${name} 你好，</p><p>感谢投稿《${esc(v.talk ?? '')}》。很遗憾本届未能入选，期待在下一届 Community Day 见到你的分享，也欢迎来现场交流！</p>`;
      return { subject, html: shell(ev, body), text: `${r.name} 你好，感谢投稿，本届未能入选。` };
    }
    case 'sponsor-accept': {
      const subject = `【合作确认】${t(ev.name)} · 请提交高清 Logo`;
      const body = `<p>${name} 你好，</p><p>感谢支持 ${esc(t(ev.name))}！请在 ${ev.deadlines.sponsorMaterials} 前通过下方链接提交 <b>SVG / AI 矢量 Logo 或 ≥2000px 宽的透明 PNG</b>（印刷物料需要高清源文件）。</p>${button(ev, v.portalUrl ?? '#', '提交 Logo 与展位信息')}`;
      return { subject, html: shell(ev, body), text: `${r.name} 你好，请在 ${ev.deadlines.sponsorMaterials} 前提交高清 Logo：${v.portalUrl ?? ''}` };
    }
    case 'volunteer-accept': {
      const subject = `【志愿者录取】${t(ev.name)}`;
      const body = `<p>${name} 你好，</p><p>欢迎加入 ${esc(t(ev.name))} 志愿者团队！岗位：<b>${esc(v.role ?? '待分配')}</b>。请点击确认，并查看志愿者指引。</p>${button(ev, v.portalUrl ?? '#', '确认参加 / 查看指引')}`;
      return { subject, html: shell(ev, body), text: `${r.name} 你好，欢迎加入志愿者团队：${v.portalUrl ?? ''}` };
    }
    default: {
      // reminder:<id>
      const id = template.slice('reminder:'.length).split('@')[0];
      const rem = ev.reminders.find((x) => x.id === id);
      const subject = `【提醒】${rem?.subject ?? '材料提交提醒'} · ${t(ev.name)}`;
      const body = `<p>${name} 你好，</p><p>${esc(rem?.subject ?? '')}。${esc(v.detail ?? '')}</p>${v.portalUrl ? button(ev, v.portalUrl, '前往提交') : ''}<p style="color:#888">如已提交请忽略本邮件。</p>`;
      return { subject, html: shell(ev, body), text: `${r.name} 你好，${rem?.subject ?? ''}。${v.portalUrl ?? ''}` };
    }
  }
}
