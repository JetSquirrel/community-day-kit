/**
 * PPT 预审（确定性部分）：零依赖解析 .pptx（zip + XML），抽出每页文字 / 最小字号 / 图片数 / 备注，
 * 再按 event.yaml materials.deck 的规则做硬性检查。主观部分（内容质量、推广比例、中立性语境）交给 AI。
 *
 * 2026 秋 PPT 全靠组委会人工逐份审，初稿还因此从 9/23 推迟到 9/30。
 * 现在：讲者上传 → 当场拿到「规则 → 结果 → 修改建议」报告 → 自己改完再交，人只复核 AI 标红项。
 */
import { inflateRawSync } from 'node:zlib';

export interface ZipEntry {
  name: string;
  data: () => Buffer;
}

/** 极简 zip 读取（中央目录 + stored/deflate），足够解析 Office Open XML。 */
export function readZip(buf: Buffer): Map<string, ZipEntry> {
  const entries = new Map<string, ZipEntry>();
  // 找 End Of Central Directory（从尾部向前找签名 0x06054b50）
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('不是有效的 zip / pptx 文件');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('zip 中央目录损坏');
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString('utf8');
    entries.set(name, {
      name,
      data: () => {
        const lNameLen = buf.readUInt16LE(localOff + 26);
        const lExtraLen = buf.readUInt16LE(localOff + 28);
        const start = localOff + 30 + lNameLen + lExtraLen;
        const raw = buf.subarray(start, start + compSize);
        if (method === 0) return Buffer.from(raw);
        if (method === 8) return inflateRawSync(raw);
        throw new Error(`不支持的 zip 压缩方式 ${method}（${name}）`);
      },
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

export interface SlideInfo {
  index: number;
  text: string;
  /** 本页出现的最小字号（pt），无显式字号时为 null（沿用母版） */
  minFontPt: number | null;
  images: number;
  notes: string;
}

export interface DeckStats {
  kind: 'pptx' | 'pdf';
  slides: SlideInfo[];
  slideCount: number;
  bytes: number;
}

const decodeXml = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&amp;/g, '&');

/** 抽取 <a:t> 文本，段落 <a:p> 之间换行 */
function xmlText(xml: string): string {
  return xml
    .split(/<\/a:p>/)
    .map((para) => [...para.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => decodeXml(m[1])).join(''))
    .filter((s) => s.trim())
    .join('\n');
}

export function analyzePptx(buf: Buffer): DeckStats {
  const zip = readZip(buf);
  const slideNames = [...zip.keys()]
    .filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k))
    .sort((a, b) => Number(/(\d+)\.xml$/.exec(a)![1]) - Number(/(\d+)\.xml$/.exec(b)![1]));
  const slides: SlideInfo[] = slideNames.map((name, i) => {
    const xml = zip.get(name)!.data().toString('utf8');
    const sizes = [...xml.matchAll(/<a:rPr[^>]*\ssz="(\d+)"/g)].map((m) => Number(m[1]) / 100);
    const relsName = name.replace('slides/', 'slides/_rels/') + '.rels';
    const rels = zip.get(relsName)?.data().toString('utf8') ?? '';
    const images = (rels.match(/relationships\/image"/g) ?? []).length;
    const notesTarget = /Target="\.\.\/notesSlides\/(notesSlide\d+\.xml)"/.exec(rels)?.[1];
    const notes = notesTarget ? xmlText(zip.get(`ppt/notesSlides/${notesTarget}`)?.data().toString('utf8') ?? '') : '';
    return { index: i + 1, text: xmlText(xml), minFontPt: sizes.length ? Math.min(...sizes) : null, images, notes };
  });
  return { kind: 'pptx', slides, slideCount: slides.length, bytes: buf.length };
}

/** PDF 只数页数（正文交给 Claude 的 PDF 输入直接读） */
export function analyzePdf(buf: Buffer): DeckStats {
  const s = buf.toString('latin1');
  const pages = (s.match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
  return {
    kind: 'pdf',
    slides: Array.from({ length: pages }, (_, i) => ({ index: i + 1, text: '', minFontPt: null, images: 0, notes: '' })),
    slideCount: pages,
    bytes: buf.length,
  };
}

export interface DeckSpecLike {
  maxBytes: number;
  maxSlidesPerMinute: number;
  flaggedTerms: string[];
  templateMarkers: string[];
}

export interface DeckFinding {
  level: 'error' | 'warn' | 'info';
  rule: string;
  message: string;
  slides?: number[];
}

/** 确定性检查。minutes = 该场次时长。 */
export function lintDeck(stats: DeckStats, spec: DeckSpecLike, ctx: { minutes: number; title?: string; speaker?: string }): DeckFinding[] {
  const out: DeckFinding[] = [];
  if (stats.bytes > spec.maxBytes) {
    out.push({ level: 'error', rule: '文件大小', message: `文件 ${(stats.bytes / 1048576).toFixed(0)}MB 超过 ${(spec.maxBytes / 1048576).toFixed(0)}MB，请压缩图片或导出 PDF` });
  }
  if (stats.slideCount === 0) {
    out.push({ level: 'error', rule: '文件解析', message: '没有读到任何页面，文件可能损坏或加密' });
    return out;
  }
  const maxSlides = Math.ceil(ctx.minutes * spec.maxSlidesPerMinute);
  if (stats.slideCount > maxSlides) {
    out.push({ level: 'warn', rule: '页数与时长', message: `${stats.slideCount} 页 / ${ctx.minutes} 分钟，超过建议上限 ${maxSlides} 页，容易超时` });
  }
  if (stats.kind === 'pptx') {
    const first = stats.slides[0]?.text ?? '';
    const last = stats.slides.at(-1)?.text ?? '';
    const missingMarkers = spec.templateMarkers.filter((m) => !(first + '\n' + last).toLowerCase().includes(m.toLowerCase()));
    if (missingMarkers.length) {
      out.push({ level: 'warn', rule: '官方模板', message: `首/末页未找到「${missingMarkers.join('、')}」，可能未使用官方模板`, slides: [1, stats.slideCount] });
    }
    if (ctx.speaker && !first.includes(ctx.speaker)) {
      out.push({ level: 'info', rule: '首页信息', message: `首页未出现讲者姓名「${ctx.speaker}」`, slides: [1] });
    }
    const small = stats.slides.filter((s) => s.minFontPt !== null && s.minFontPt < 14).map((s) => s.index);
    if (small.length) out.push({ level: 'warn', rule: '可读性', message: `${small.length} 页存在小于 14pt 的文字，投影后台下看不清`, slides: small });
    const dense = stats.slides.filter((s) => s.text.split('\n').length > 10 || s.text.length > 300).map((s) => s.index);
    if (dense.length) out.push({ level: 'warn', rule: '可读性', message: `${dense.length} 页文字过多（>10 行或 >300 字）`, slides: dense });
    for (const term of spec.flaggedTerms) {
      const hits = stats.slides.filter((s) => s.text.toLowerCase().includes(term.toLowerCase())).map((s) => s.index);
      if (hits.length) out.push({ level: 'warn', rule: '中立性', message: `出现「${term}」，需组委会确认语境是否合适`, slides: hits });
    }
  }
  return out;
}

/** 给 AI 的精简文本（每页 ≤ 600 字，保留页码） */
export function deckDigest(stats: DeckStats, maxPerSlide = 600): string {
  return stats.slides
    .map((s) => `--- 第 ${s.index} 页${s.minFontPt ? `（最小字号 ${s.minFontPt}pt）` : ''}${s.images ? `（图片 ${s.images}）` : ''}\n${s.text.slice(0, maxPerSlide)}${s.notes ? `\n[备注] ${s.notes.slice(0, 200)}` : ''}`)
    .join('\n');
}
