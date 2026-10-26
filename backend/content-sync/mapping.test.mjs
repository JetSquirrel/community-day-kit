/** Local check for the pure mappers: `node mapping.test.mjs` (no AWS/Feishu needed). */
import assert from 'node:assert/strict';
import { asText, parseSocials, mapSpeaker, mapPartner } from './mapping.mjs';

// asText — all bitable value shapes
assert.equal(asText([{ text: '林晓峰' }]), '林晓峰');
assert.equal(asText('智能桥'), '智能桥');
assert.equal(asText({ text: '官网', link: 'https://example.com' }), '官网');
assert.equal(asText(null), '');
assert.equal(asText(42), '42');

// parseSocials — one "Label URL" per line
assert.deepEqual(parseSocials('GitHub https://github.com/x\nX | https://x.com/y'), [
  { label: 'GitHub', href: 'https://github.com/x' },
  { label: 'X', href: 'https://x.com/y' },
]);
assert.deepEqual(parseSocials('没有链接的一行'), []);

// mapSpeaker — full record with realistic bitable shapes
const speaker = mapSpeaker({
  ID: [{ text: 'lin-xiaofeng' }],
  姓名: [{ text: '林晓峰' }],
  英文名: [{ text: 'Lin Xiaofeng' }],
  公司: [{ text: '某科技' }],
  职位: [{ text: '首席架构师' }],
  赛道: 'keynote',
  主推: true,
  议题: [{ text: '从信号到桥' }],
  简介: [{ text: '十五年分布式系统经验' }],
  社交链接: [{ text: 'GitHub https://github.com/lxf' }],
  展示: true,
});
assert.deepEqual(speaker, {
  id: 'lin-xiaofeng',
  name: '林晓峰',
  nameEn: 'Lin Xiaofeng',
  initials: 'LX',
  company: '某科技',
  role: '首席架构师',
  track: 'keynote',
  featured: true,
  talk: '从信号到桥',
  bio: '十五年分布式系统经验',
  socials: [{ label: 'GitHub', href: 'https://github.com/lxf' }],
});

// drafts & fallbacks
assert.equal(mapSpeaker({ ID: 'x', 姓名: 'x', 展示: false }), null);
assert.equal(mapSpeaker({ 姓名: '没有ID' }), null);
const fallback = mapSpeaker({ ID: 'a-b', 姓名: '阿灿', 赛道: '不存在的赛道' });
assert.equal(fallback.track, 'ai');
assert.equal(fallback.initials, '阿灿'.slice(0, 2));
assert.equal(fallback.featured, false);

// optional English columns → { zh, en } LText output; missing columns stay plain strings
const bilingual = mapSpeaker({
  ID: 'lin-xiaofeng',
  姓名: '林晓峰',
  议题: [{ text: '从信号到桥' }],
  英文议题: [{ text: 'From Signal to Bridge' }],
  英文简介: 'Fifteen years of distributed systems',
});
assert.deepEqual(bilingual.talk, { zh: '从信号到桥', en: 'From Signal to Bridge' });
assert.deepEqual(bilingual.bio, { zh: '', en: 'Fifteen years of distributed systems' });
assert.equal(bilingual.company, '');
assert.equal(bilingual.role, '');

// 照片列：有才输出，无则不带该字段（前端回退字母头像）
assert.equal(mapSpeaker({ ID: 'a', 姓名: 'x', 照片: 'https://cdn/photo.jpg' }).photo, 'https://cdn/photo.jpg');
assert.equal('photo' in mapSpeaker({ ID: 'a', 姓名: 'x' }), false);

// mapPartner
assert.deepEqual(mapPartner({ ID: 'acme', 名称: 'ACME', 官网: { text: 'ACME', link: 'https://acme.com' }, Logo: 'https://cdn/acme.svg', 展示: true }), {
  id: 'acme',
  name: 'ACME',
  url: 'https://acme.com',
  logo: 'https://cdn/acme.svg',
});
assert.equal(mapPartner({ 名称: '坏链', 官网: 'javascript:alert(1)', 展示: true }).url, undefined);
assert.equal(mapPartner({ 名称: '隐藏', 展示: false }), null);
assert.deepEqual(mapPartner({ 名称: '只有名字' }), { id: '', name: '只有名字', url: undefined, logo: undefined });
// 报名表两用：「名称」为空时回退到「公司」列
assert.deepEqual(mapPartner({ ID: 'qiao', 公司: '桥科技', Logo: 'https://cdn/logo.png', 展示: true }), {
  id: 'qiao',
  name: '桥科技',
  url: undefined,
  logo: 'https://cdn/logo.png',
});
// 档位：有才输出 tier（首页赞助墙分档用），无则不带该字段
assert.equal(mapPartner({ 名称: 'x', 意向档位: '钻石赞助', 展示: true }).tier, '钻石赞助');
assert.equal('tier' in mapPartner({ 名称: 'x', 展示: true }), false);

console.log('mapping tests passed');
