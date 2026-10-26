/**
 * cdkit ai:cfp <slug> [--write] [--all]
 * 为投稿表中尚无「AI 摘要」的记录生成评审参考（摘要 / 建议赛道 / 风险 / 重复），
 * --write 写回飞书；默认只输出 out/<slug>/cfp-assist.json 供查看。--all 连已有 AI 摘要的也重跑。
 */
import { assistCfp, createAi, AiUnavailable, type Submission } from '@cdkit/ai';
import { asText } from '@cdkit/feishu';
import { event, feishu, log, write } from '../ctx.ts';

export async function run(args: string[], flags: Record<string, string | boolean>) {
  const ev = event(args[0]);
  const fs = feishu();
  const records = await fs.listRecords(ev.feishu.appToken, ev.feishu.tables.cfp);
  const subs: (Submission & { hasAi: boolean })[] = records.map((r) => ({
    recordId: r.record_id,
    title: asText(r.fields['议题']),
    abstract: asText(r.fields['摘要']),
    bio: asText(r.fields['简介']),
    track: asText(r.fields['赛道']),
    format: asText(r.fields['形式']),
    name: asText(r.fields['姓名']),
    company: asText(r.fields['公司']),
    hasAi: !!asText(r.fields['AI 摘要']),
  }));
  const todo = subs.filter((s) => s.title && (flags.all || !s.hasAi));
  log(`投稿 ${subs.length} 条，待处理 ${todo.length} 条`);
  const ai = createAi(ev);
  const results = [];
  for (const s of todo) {
    try {
      const a = await assistCfp(ai, ev, subs, s);
      results.push({ recordId: s.recordId, title: s.title, ...a });
      log(`  ✓ ${s.title.slice(0, 30)} → ${a.suggestedTrack}${a.trackFit === 'poor' ? '（赛道不匹配）' : ''}${a.risks.length ? ` ⚠ ${a.risks.join('；')}` : ''}`);
      if (flags.write) {
        await fs.updateRecord(ev.feishu.appToken, ev.feishu.tables.cfp, s.recordId, {
          'AI 摘要': a.summary + (a.titleSuggestion ? `\n建议标题：${a.titleSuggestion}` : ''),
          'AI 建议赛道': a.suggestedTrack,
          'AI 风险提示': a.risks.join('\n'),
          'AI 重复/相似': a.similarTo.join(', '),
        });
      }
    } catch (e) {
      if (e instanceof AiUnavailable) log(`  ✗ ${s.title.slice(0, 30)}：${e.message}（转人工）`);
      else throw e;
    }
  }
  log(`\n✓ ${write(ev.slug, 'cfp-assist.json', JSON.stringify(results, null, 2))}${flags.write ? '，并已写回飞书' : '（加 --write 写回飞书）'}`);
}
