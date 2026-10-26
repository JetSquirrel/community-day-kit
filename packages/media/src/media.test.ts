import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { checkPhoto, cropBox, readImageSize, analyzePptx, lintDeck, deckDigest } from './index.ts';

const spec = { aspect: [4, 5] as [number, number], minWidth: 800, minHeight: 1000, maxBytes: 8 << 20, formats: ['image/jpeg', 'image/png', 'image/webp'] };

test('照片：合格图无问题', () => {
  assert.deepEqual(checkPhoto({ width: 1200, height: 1500, bytes: 900_000, type: 'image/jpeg' }, spec), []);
});

test('照片：截图式小横图同时报分辨率与比例', () => {
  const codes = checkPhoto({ width: 640, height: 360, bytes: 40_000, type: 'image/jpeg' }, spec).map((f) => f.code);
  assert.ok(codes.includes('low-res'));
  assert.ok(codes.includes('aspect'));
});

test('照片：格式 / 体积', () => {
  const codes = checkPhoto({ width: 1200, height: 1500, bytes: 20 << 20, type: 'image/heic' }, spec).map((f) => f.code);
  assert.deepEqual(codes.sort(), ['format', 'too-large']);
});

test('裁剪框：横图裁成 4:5，且偏上保留头顶', () => {
  const b = cropBox(4000, 3000, [4, 5]);
  assert.equal(b.h, 3000);
  assert.equal(b.w, 2400);
  assert.equal(b.y, 0);
  const tall = cropBox(1000, 3000, [4, 5]);
  assert.equal(tall.w, 1000);
  assert.equal(tall.h, 1250);
  assert.ok(tall.y < (3000 - 1250) / 2, '竖长图应向上偏移而非居中');
});

test('读取图片尺寸：PNG / JPEG', () => {
  const png = new Uint8Array(32);
  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  new DataView(png.buffer).setUint32(16, 1200);
  new DataView(png.buffer).setUint32(20, 1500);
  assert.deepEqual(readImageSize(png), { width: 1200, height: 1500, type: 'image/png' });
  // SOI + APP0(len 4) + SOF0
  const jpg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0, 0, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x05, 0xdc, 0x04, 0xb0, 0x03]);
  assert.deepEqual(readImageSize(jpg), { width: 1200, height: 1500, type: 'image/jpeg' });
});

/** 测试用最小 zip 写入器 */
function makeZip(files: Record<string, string>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const data = deflateRawSync(Buffer.from(content, 'utf8'));
    const nameBuf = Buffer.from(name, 'utf8');
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(Object.keys(files).length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, eocd]);
}

const slide = (text: string, sz = 2400) => `<p:sld><a:p><a:r><a:rPr lang="zh-CN" sz="${sz}"/><a:t>${text}</a:t></a:r></a:p></p:sld>`;

test('PPTX 解析 + 确定性预审', () => {
  const files: Record<string, string> = {
    'ppt/slides/slide1.xml': slide('2026 Community Day · 深圳 张三 &amp; 李四'),
    'ppt/slides/slide2.xml': slide('我们从阿里云迁移到 AWS', 1000),
    'ppt/slides/slide10.xml': slide('谢谢 Community Day'),
    'ppt/slides/_rels/slide2.xml.rels': '<Relationships><Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/a.png"/></Relationships>',
  };
  const stats = analyzePptx(makeZip(files));
  assert.equal(stats.slideCount, 3);
  assert.equal(stats.slides[2].text, '谢谢 Community Day', 'slide10 应排在 slide2 之后');
  assert.match(stats.slides[0].text, /张三 & 李四/);
  assert.equal(stats.slides[1].minFontPt, 10);
  assert.equal(stats.slides[1].images, 1);

  const findings = lintDeck(stats, { maxBytes: 1 << 30, maxSlidesPerMinute: 1.5, flaggedTerms: ['阿里云'], templateMarkers: ['Community Day'] }, { minutes: 1, speaker: '张三' });
  const rules = findings.map((f) => f.rule);
  assert.ok(rules.includes('页数与时长'));
  assert.ok(rules.includes('可读性'));
  assert.ok(rules.includes('中立性'));
  assert.ok(!rules.includes('官方模板'));
  assert.match(deckDigest(stats), /第 2 页（最小字号 10pt）（图片 1）/);
});
