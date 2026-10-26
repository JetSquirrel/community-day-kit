/** Local check for the auth logic: `node lib.test.mjs`. */
import assert from 'node:assert/strict';
import { makeState, checkState, makeSession, checkSession, isAllowed, STATE_MAX_AGE_MS } from './lib.mjs';

const SECRET = 'admin-secret-0123456789';

// state round-trip + tamper + expiry
const state = makeState(SECRET);
assert.ok(checkState(state, SECRET));
assert.ok(!checkState(`${state}x`, SECRET));
assert.ok(!checkState(makeState('other'), SECRET));
assert.ok(!checkState(undefined, SECRET));
assert.ok(!checkState(makeState(SECRET, Date.now() - STATE_MAX_AGE_MS - 1000), SECRET));

// session round-trip
const token = makeSession({ openId: 'ou_abc', name: '组织者', picture: 'https://x/p.png' }, SECRET);
const session = checkSession(token, SECRET);
assert.equal(session.sub, 'ou_abc');
assert.equal(session.name, '组织者');
assert.equal(session.picture, 'https://x/p.png');

// tampered / wrong secret / expired sessions rejected
assert.equal(checkSession(`${token}x`, SECRET), null);
assert.equal(checkSession(makeSession({ openId: 'ou_abc', name: 'x' }, 'other'), SECRET), null);
assert.equal(checkSession('not-a-token', SECRET), null);
assert.equal(checkSession(makeSession({ openId: 'ou_abc', name: 'x' }, SECRET, Date.now() - 8 * 24 * 3600 * 1000), SECRET), null);

// allowlist
assert.ok(isAllowed({ openId: 'ou_abc' }, 'ou_abc, ou_def', ''));
assert.ok(isAllowed({ openId: 'ou_xyz', email: 'A@B.com' }, '', 'a@b.com'));
assert.ok(!isAllowed({ openId: 'ou_xyz', email: 'c@d.com' }, 'ou_abc', 'a@b.com'));
assert.ok(!isAllowed({ openId: 'ou_abc' }, '', '')); // fail closed when unconfigured

// validateSubmission — happy path + every rejection branch
import { validateSubmission, FORMAT_OPTIONS } from './lib.mjs';

const good = {
  name: '林晓峰',
  email: 'lxf@example.com',
  talk: '从信号到桥',
  track: 'ai',
  format: FORMAT_OPTIONS[0],
  abstract: '这是一个关于云与 AI 的议题摘要，长度需要超过五十个字，描述了生产环境的真实实践、关键决策与踩坑经验，以及听众能带走的三个要点。',
  bio: '首席架构师',
};
const okRes = validateSubmission(good);
assert.ok(okRes.ok);
assert.equal(okRes.data.name, '林晓峰');

assert.equal(validateSubmission({ ...good, name: '' }).error, '请填写称呼');
assert.equal(validateSubmission({ ...good, email: 'not-an-email' }).error, '邮箱格式不正确');
assert.equal(validateSubmission({ ...good, talk: ' ' }).error, '请填写议题标题');
assert.equal(validateSubmission({ ...good, track: 'keynote' }).error, '请选择赛道');
assert.equal(validateSubmission({ ...good, format: '随便讲讲' }).error, '请选择演讲形式');
assert.equal(validateSubmission({ ...good, abstract: '太短' }).ok, false);

// over-length input is truncated, not rejected
const long = validateSubmission({ ...good, talk: '长'.repeat(200) });
assert.ok(long.ok && long.data.talk.length === 60);

// phone — optional, loosely validated when present
assert.ok(validateSubmission({ ...good, phone: '' }).ok);
assert.ok(validateSubmission({ ...good, phone: '+86 138-0000-0000' }).ok);
assert.equal(validateSubmission({ ...good, phone: 'abc' }).error, '手机号格式不正确');

// communityTitle — array of values → readable labels; unknown values dropped, dupes removed
const withTitles = validateSubmission({ ...good, communityTitle: ['user_group_leader', 'community_hero', 'user_group_leader', 'nope'] });
assert.ok(withTitles.ok && withTitles.data.communityTitle === 'User Group Leader, Community Hero');
assert.equal(validateSubmission({ ...good, communityTitle: 'community_hero' }).data.communityTitle, ''); // not an array → empty
assert.equal(validateSubmission({ ...good }).data.communityTitle, '');

// isHeroTitle — Hero 投稿实时通知的触发判定：仅原始数组含 community_hero 时为真
import { isHeroTitle } from './lib.mjs';
assert.ok(isHeroTitle(['community_hero']));
assert.ok(isHeroTitle(['user_group_leader', 'community_hero']));
assert.ok(!isHeroTitle(['user_group_leader']));
assert.ok(!isHeroTitle('community_hero')); // 非数组不触发（与 communityTitles 归一化口径一致）
assert.ok(!isHeroTitle(undefined) && !isHeroTitle([]));

// validateVolunteer — name/email/role required, phone optional, note optional
import { validateVolunteer, validateSponsor, VOLUNTEER_ROLES, SPONSOR_TIERS } from './lib.mjs';

const vol = { name: '阿桥', email: 'qiao@example.com', phone: '', role: VOLUNTEER_ROLES[0], note: '只能上午' };
const volOk = validateVolunteer(vol);
assert.ok(volOk.ok && volOk.data.role === '签到引导组');
assert.equal(validateVolunteer({ ...vol, name: '' }).error, '请填写称呼');
assert.equal(validateVolunteer({ ...vol, email: 'nope' }).error, '邮箱格式不正确');
assert.equal(validateVolunteer({ ...vol, phone: 'abc' }).error, '手机号格式不正确');
assert.equal(validateVolunteer({ ...vol, role: '保安' }).error, '请选择意向岗位');
assert.ok(validateVolunteer({ name: 'x', email: 'x@y.z', role: VOLUNTEER_ROLES[5] }).ok); // phone/note omitted entirely

// validateSponsor — company/contact/email/tier required
const spo = { company: '桥科技', contact: '林总', email: 'lin@example.com', phone: '13800000000', tier: SPONSOR_TIERS[1], note: '' };
const spoOk = validateSponsor(spo);
assert.ok(spoOk.ok && spoOk.data.tier === '铂金赞助');
assert.equal(validateSponsor({ ...spo, company: '' }).error, '请填写公司名称');
assert.equal(validateSponsor({ ...spo, contact: ' ' }).error, '请填写联系人');
assert.equal(validateSponsor({ ...spo, email: 'nope' }).error, '邮箱格式不正确');
assert.equal(validateSponsor({ ...spo, tier: '免费档位' }).error, '请选择意向档位');

// parseMultipart + validateImage — CMS 图片上传
import { parseMultipart, validateImage } from './lib.mjs';

const boundary = '----test-boundary';
const mpBody = Buffer.concat([
  Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="kind"\r\n\r\nsponsor\r\n`),
  Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="logo.svg"\r\nContent-Type: image/svg+xml\r\n\r\n`),
  Buffer.from('<svg></svg>'),
  Buffer.from(`\r\n--${boundary}--\r\n`),
]);
const mp = parseMultipart(mpBody, `multipart/form-data; boundary=${boundary}`);
assert.equal(mp.fields.kind, 'sponsor');
assert.equal(mp.files.file.contentType, 'image/svg+xml');
assert.equal(parseMultipart(mpBody, 'application/json'), null);

const svgLogo = validateImage({ filename: 'logo.svg', contentType: 'image/svg+xml', data: Buffer.from('<svg/>') }, { allowSvg: true });
assert.ok(svgLogo.ok && svgLogo.data.ext === '.svg');
assert.equal(
  validateImage({ filename: 'x', contentType: 'image/svg+xml', data: Buffer.from('<svg onload=alert(1)></svg>') }, { allowSvg: true }).error,
  'SVG 含有不安全内容',
);
assert.equal(validateImage(null).error, '请选择要上传的图片文件');
assert.equal(validateImage({ filename: 'x', contentType: 'image/svg+xml', data: Buffer.from('x') }).error, '图片格式仅支持 JPG / PNG / WebP');
assert.equal(validateImage({ filename: 'x', contentType: 'image/gif', data: Buffer.from('x') }, { allowSvg: true }).error, '图片格式仅支持 JPG / PNG / WebP / SVG');
assert.equal(
  validateImage({ filename: 'x.jpg', contentType: 'image/jpeg', data: Buffer.from('not-a-jpeg') }).error,
  '图片内容与格式不匹配，请重新导出后上传',
);

import { sanitizeHttpUrl, allowRate } from './lib.mjs';
assert.equal(sanitizeHttpUrl('https://example.com/a'), 'https://example.com/a');
assert.equal(sanitizeHttpUrl('javascript:alert(1)'), null);
assert.equal(sanitizeHttpUrl(''), '');
const store = new Map();
assert.equal(allowRate({ key: 't', limit: 2, windowMs: 60_000, store }), true);
assert.equal(allowRate({ key: 't', limit: 2, windowMs: 60_000, store }), true);
assert.equal(allowRate({ key: 't', limit: 2, windowMs: 60_000, store }), false);

// countSubmissionsByEmail — 同邮箱限投计数（忽略空白行、大小写不敏感）
import { countSubmissionsByEmail, MAX_SUBMISSIONS_PER_EMAIL } from './lib.mjs';
const subRows = [
  { record_id: 'r1', fields: { 姓名: '甲', 邮箱: [{ text: 'A@B.com' }], 议题: 'x' } },
  { record_id: 'r2', fields: { 姓名: '乙', 邮箱: 'a@b.com', 议题: 'y' } },
  { record_id: 'r3', fields: { 姓名: '丙', 邮箱: 'c@d.com', 议题: 'z' } },
  { record_id: 'r4', fields: {} }, // 空白行不计
  { record_id: 'r5', fields: { 邮箱: 'a@b.com' } }, // 无姓名/议题，不计
];
assert.equal(countSubmissionsByEmail(subRows, 'a@b.com'), 2);
assert.equal(countSubmissionsByEmail(subRows, 'A@B.COM'), 2);
assert.equal(countSubmissionsByEmail(subRows, 'c@d.com'), 1);
assert.equal(countSubmissionsByEmail(subRows, 'none@x.com'), 0);
assert.equal(countSubmissionsByEmail(subRows, ''), 0);
assert.equal(MAX_SUBMISSIONS_PER_EMAIL, 2);

console.log('admin-api lib tests passed');
