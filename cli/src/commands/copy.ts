/**
 * cdkit copy tweet <slug> <推文 id>     读取当前嘉宾 / 议程 / 赞助数据，生成该期推文初稿
 * cdkit copy xhs <slug> --count 200      小红书打卡文案池（JSON + 每行一条的 txt，供扫码随机领取）
 * cdkit copy speakers <slug> [--write]   嘉宾资料润色 + 英译，--write 写回嘉宾表英文列
 */
import { buildPlan, loadPlaybook, t } from '@cdkit/core';
import { createAi, draftTweet, polishSpeaker, xhsPool } from '@cdkit/ai';
import { asText } from '@cdkit/feishu';
import { event, feishu, log, playbookFiles, write } from '../ctx.ts';

async function speakers(slug: string) {
  const ev = event(slug);
  if (!process.env.FEISHU_APP_ID || !ev.feishu.tables.speakers) return [];
  const rows = await feishu().listRecords(ev.feishu.appToken, ev.feishu.tables.speakers);
  return rows
    .filter((r) => r.fields['展示'] === true)
    .map((r) => ({ name: asText(r.fields['姓名']), title: asText(r.fields['职位']), company: asText(r.fields['公司']), talk: asText(r.fields['议题']), track: asText(r.fields['赛道']) }));
}

export async function run(args: string[], flags: Record<string, string | boolean>) {
  const [kind, slug, id] = args;
  const ev = event(slug);
  const ai = createAi(ev);
  if (kind === 'tweet') {
    const item = buildPlan(ev, loadPlaybook(playbookFiles())).find((r) => r.id === id && r.kind === 'tweet');
    if (!item) throw new Error(`playbook/tweets.yaml 中没有推文 ${id}`);
    const context = {
      活动: { 名称: t(ev.name), 主题: t(ev.slogan), 日期: ev.date, 城市: t(ev.city), 场地: ev.venue.name, 报名: ev.registerUrl, 官网: `https://${ev.domain}` },
      赛道: ev.tracks.map((x) => ({ id: x.id, 名称: t(x.name), 出品人: x.owners })),
      嘉宾: await speakers(slug),
      截止日期: ev.deadlines,
    };
    const d = await draftTweet(ai, ev, item, context);
    const md = [`# ${item.title}（${item.due} ${item.d}）`, '', '## 备选标题', ...d.titles.map((x) => `- ${x}`), '', '## 正文', d.body, '', '## 发布前仍缺', ...d.missing.map((x) => `- [ ] ${x}`), '', '## 配图需求', ...d.designNeeds.map((x) => `- ${x}`)].join('\n');
    log(`✓ ${write(slug, `tweet-${id}.md`, md)}`);
  } else if (kind === 'xhs') {
    const count = Number(flags.count ?? 200);
    const facts = `${t(ev.name)}，${ev.date} 在${t(ev.city)}，主题「${t(ev.slogan)}」，赛道：${ev.tracks.map((x) => t(x.name)).join('、')}；话题 #AWSCommunityDay #亚马逊云科技`;
    const posts = await xhsPool(ai, ev, count, facts, (n) => process.stdout.write(`\r  已生成 ${n}/${count}`));
    log('');
    write(slug, 'xhs.json', JSON.stringify(posts, null, 2));
    log(`✓ ${write(slug, 'xhs.txt', posts.map((p) => `${p.title}\n${p.body}\n${p.tags.map((x) => `#${x.replace(/^#/, '')}`).join(' ')}`).join('\n\n---\n\n'))}（${posts.length} 条）`);
  } else if (kind === 'speakers') {
    const fs = feishu();
    const rows = await fs.listRecords(ev.feishu.appToken, ev.feishu.tables.speakers);
    const out = [];
    for (const r of rows) {
      const s = { name: asText(r.fields['姓名']), title: asText(r.fields['职位']), company: asText(r.fields['公司']), talk: asText(r.fields['议题']), bio: asText(r.fields['简介']) };
      if (!s.name || (asText(r.fields['英文简介']) && !flags.all)) continue;
      const p = await polishSpeaker(ai, ev, s);
      out.push({ recordId: r.record_id, ...s, polished: p });
      log(`  ✓ ${s.name}${p.fixes.length ? `：${p.fixes.join('；')}` : ''}`);
      if (flags.write) {
        await fs.updateRecord(ev.feishu.appToken, ev.feishu.tables.speakers, r.record_id, {
          英文职位: p.titleEn, 英文公司: p.companyEn, 英文议题: p.talkEn, 英文简介: p.bioEn,
          // 中文字段只在为空或有修正时更新，修正说明见 out/speakers.json
          ...(p.fixes.length ? { 职位: p.title, 公司: p.company } : {}),
        });
      }
    }
    log(`✓ ${write(slug, 'speakers.json', JSON.stringify(out, null, 2))}`);
  } else {
    throw new Error('用法：cdkit copy tweet|xhs|speakers <slug> ...');
  }
}
