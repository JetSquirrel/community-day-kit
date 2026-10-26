/**
 * 分享海报绘制（1080×1080，Canvas 2D，零依赖）。
 * 视觉语言与官网一致：亮黄底 + 白卡黑描边 + 硬阴影，桥为唯一视觉主角，
 * 信号点沿桥拱流动；孟菲斯几何点缀克制使用（每张 ≤3 个）。
 * 由 /admin 推文物料 tab 调用，浏览器端直接出图下载。
 */
import { EVENT_CONFIG, SITE } from '@/lib/site';

export type PosterVariant = 'cfp' | 'sponsor';

export interface PosterFields {
  /** CFP：附加一行（如截稿日期），留空不画 */
  extraLine?: string;
  /** sponsor：联系邮箱 */
  contact?: string;
}

/** 讲师分享海报的输入（来自 CRM 讲师表）。 */
export interface SpeakerPosterData {
  name: string;
  nameEn: string;
  role: string;
  company: string;
  talk: string;
  /** 分论坛展示名，如「AI 工程化 · AI」 */
  trackLabel: string;
  /** 分论坛主题色（chip 底色） */
  trackColor: string;
  /** chip 文字色（与官网 TRACKS.textOn 一致） */
  trackTextColor: string;
  /** 场次时间（如「10.17 14:00–14:35」），留空不画 */
  time: string;
  /** CDN 照片 URL；跨域/加载失败时自动回退首字母头像 */
  photoUrl: string;
}

const SIZE = 1080;
const YELLOW = '#FFD900';
const INK = '#141414';
const PURPLE = '#6C3FD4';
const RED = '#FF4D3D';
const BLUE = '#2B5CE6';
const GREEN = '#2ECC71';

const SANS = `-apple-system,'PingFang SC','Microsoft YaHei',sans-serif`;
const MONO = `Menlo,'Courier New',monospace`;

const SITE_URL = EVENT_CONFIG.domain;
const CITY = SITE.cityShort;

interface VariantSpec {
  kicker: string;
  kickerColor: string;
  headline: string;
  sub: string;
  chips: string[];
  cta: string;
}

function spec(variant: PosterVariant, fields: PosterFields): VariantSpec {
  if (variant === 'cfp') {
    return {
      kicker: 'CALL FOR PAPERS // 征稿已截止',
      kickerColor: PURPLE,
      headline: '征稿截止',
      sub: 'Bridge with Signal · 以价值信号连通现在与未来',
      chips: ['云架构', 'AI · Agent', 'Serverless', '云安全', 'K8s', '数据平台', 'DevOps', '成本优化'],
      cta: `评审进行中 → ${SITE_URL}/cfp`,
    };
  }
  return {
    kicker: 'SPONSORS // 赞助商招募',
    kickerColor: RED,
    headline: '成为合作伙伴',
    sub: '与 600+ 开发者一起，站上这座桥',
    chips: ['钻石', '铂金', '金牌', '银牌', '社区合作伙伴', '宣传合作'],
    cta: `合作咨询 → ${fields.contact || 'contact@awscommunity.cn'}`,
  };
}

/** 桥：一道拱 + 吊索 + 沿拱分布的信号点（静态版「信号沿桥流动」） */
function drawBridge(ctx: CanvasRenderingContext2D, cx: number, baseY: number, w: number, h: number) {
  const x0 = cx - w / 2;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  // 桥面
  ctx.beginPath();
  ctx.moveTo(x0, baseY);
  ctx.lineTo(x0 + w, baseY);
  ctx.stroke();
  // 拱（二次曲线，顶点在桥面之上 h 处）
  const archY = (t: number) => baseY - 4 * h * t * (1 - t);
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x0, baseY);
  ctx.quadraticCurveTo(cx, baseY - 2 * h, x0 + w, baseY);
  ctx.stroke();
  // 吊索
  ctx.lineWidth = 3;
  for (let i = 1; i < 10; i += 1) {
    const t = i / 10;
    const x = x0 + w * t;
    ctx.beginPath();
    ctx.moveTo(x, archY(t));
    ctx.lineTo(x, baseY);
    ctx.stroke();
  }
  // 信号点：沿拱流动，紫红蓝绿循环
  const colors = [PURPLE, RED, BLUE, GREEN];
  for (let i = 0; i < 7; i += 1) {
    const t = 0.08 + (0.84 * i) / 6;
    const x = x0 + w * t;
    const y = archY(t);
    ctx.fillStyle = colors[i % colors.length];
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y - 14, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // 桥墩
  ctx.fillStyle = INK;
  ctx.fillRect(x0 - 8, baseY, 16, 40);
  ctx.fillRect(x0 + w - 8, baseY, 16, 40);
}

/** 克制的孟菲斯点缀：圆环 + 三角 + 折线（zigY=null 时跳过折线，如底部被色带占用） */
function drawAccents(ctx: CanvasRenderingContext2D, zigY: number | null = 920) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  // 左上圆环
  ctx.beginPath();
  ctx.arc(160, 165, 24, 0, Math.PI * 2);
  ctx.stroke();
  // 右上三角
  ctx.beginPath();
  ctx.moveTo(930, 135);
  ctx.lineTo(966, 192);
  ctx.lineTo(894, 192);
  ctx.closePath();
  ctx.stroke();
  // 左下折线
  if (zigY !== null) {
    ctx.beginPath();
    ctx.moveTo(130, zigY);
    for (let i = 0; i < 4; i += 1) {
      ctx.lineTo(130 + (i + 0.5) * 22, zigY + (i % 2 === 0 ? -16 : 0));
    }
    ctx.stroke();
  }
}

/** 自适应缩小字号直到文本塞进 maxWidth。 */
function fitFont(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, startPx: number, weight: number, family: string) {
  let px = startPx;
  ctx.font = `${weight} ${px}px ${family}`;
  while (px > 14 && ctx.measureText(text).width > maxWidth) {
    px -= 1;
    ctx.font = `${weight} ${px}px ${family}`;
  }
}

function drawChips(ctx: CanvasRenderingContext2D, chips: string[], cx: number, y: number, maxWidth: number) {
  ctx.font = `500 26px ${SANS}`;
  const padX = 16;
  const gap = 12;
  const chipH = 44;
  const rows: string[][] = [[]];
  let rowWidth = 0;
  for (const c of chips) {
    const w = ctx.measureText(c).width + padX * 2;
    if (rowWidth + w + gap > maxWidth && rows[rows.length - 1].length > 0) {
      rows.push([]);
      rowWidth = 0;
    }
    rows[rows.length - 1].push(c);
    rowWidth += w + gap;
  }
  rows.forEach((row, ri) => {
    const widths = row.map((c) => ctx.measureText(c).width + padX * 2);
    const total = widths.reduce((a, b) => a + b, 0) + gap * (row.length - 1);
    let x = cx - total / 2;
    const cy = y + ri * (chipH + 12);
    row.forEach((c, i) => {
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(x, cy, widths[i], chipH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c, x + widths[i] / 2, cy + chipH / 2 + 1);
      x += widths[i] + gap;
    });
  });
  return rows.length;
}

/** 把海报画到 canvas（会被重置为 1080×1080）。 */
export function drawPoster(canvas: HTMLCanvasElement, variant: PosterVariant, fields: PosterFields = {}) {
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const s = spec(variant, fields);

  // 底
  ctx.fillStyle = YELLOW;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // 白卡（硬阴影）
  const card = { x: 72, y: 72, w: SIZE - 144, h: SIZE - 144 };
  ctx.fillStyle = INK;
  ctx.fillRect(card.x + 14, card.y + 14, card.w, card.h);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(card.x, card.y, card.w, card.h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.strokeRect(card.x, card.y, card.w, card.h);
  drawAccents(ctx);

  const cx = SIZE / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // kicker
  ctx.fillStyle = s.kickerColor;
  ctx.font = `700 28px ${MONO}`;
  ctx.fillText(s.kicker, cx, 190);

  // 主标题
  ctx.fillStyle = INK;
  ctx.font = `900 108px ${SANS}`;
  ctx.fillText(s.headline, cx, 320);

  // 副标题
  ctx.font = `500 34px ${SANS}`;
  ctx.fillText(s.sub, cx, 385);

  // 方向 / 档位 chips
  drawChips(ctx, s.chips, cx, 430, card.w - 160);

  // 桥
  drawBridge(ctx, cx, 760, 620, 130);

  // CTA 黑块
  ctx.font = `700 34px ${SANS}`;
  const ctaW = ctx.measureText(s.cta).width + 72;
  const ctaY = 830;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.roundRect(cx - ctaW / 2, ctaY, ctaW, 64, 10);
  ctx.fill();
  ctx.fillStyle = YELLOW;
  ctx.textBaseline = 'middle';
  ctx.fillText(s.cta, cx, ctaY + 33);
  ctx.textBaseline = 'alphabetic';

  // 附加行（如截稿日期）
  if (fields.extraLine) {
    ctx.fillStyle = RED;
    ctx.font = `700 28px ${SANS}`;
    ctx.fillText(fields.extraLine, cx, 936);
  }

  // 底部信息（自适应缩到卡内）
  ctx.fillStyle = INK;
  fitFont(ctx, `${SITE.date} · ${CITY} · 亚马逊云科技 User Group · ${SITE_URL}`, card.w - 120, 26, 500, MONO);
  ctx.fillText(`${SITE.date} · ${CITY} · 亚马逊云科技 User Group · ${SITE_URL}`, cx, card.y + card.h - 36);
}

// ——— 讲师分享海报（竖版 1080×1440）———

const SPEAKER_W = 1080;
const SPEAKER_H = 1440;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`photo load failed: ${url}`));
    img.src = url;
  });
}

/**
 * 换行：拉丁词（字母/数字/常用符号）整体不断开，CJK 逐字；
 * 最多 maxLines 行，装不下时最后一行截断为 …。
 */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const tokens: string[] = [];
  let word = '';
  for (const ch of text) {
    if (/[\w+#&/.-]/.test(ch)) {
      word += ch;
      continue;
    }
    if (word) {
      tokens.push(word);
      word = '';
    }
    tokens.push(ch);
  }
  if (word) tokens.push(word);

  const lines: string[] = [];
  let line = '';
  let truncated = false;
  for (const tok of tokens) {
    if (line && ctx.measureText(line + tok).width > maxWidth) {
      lines.push(line.trimEnd());
      line = '';
      if (lines.length === maxLines) {
        truncated = true;
        break;
      }
      if (tok === ' ') continue;
      // 单个词就超宽（如超长 URL）：逐字硬断
      if (ctx.measureText(tok).width > maxWidth) {
        for (const ch of tok) {
          if (line && ctx.measureText(line + ch).width > maxWidth) {
            lines.push(line);
            line = '';
            if (lines.length === maxLines) {
              truncated = true;
              break;
            }
          }
          line += ch;
        }
        if (truncated) break;
        continue;
      }
    }
    line += tok;
  }
  if (!truncated && line.trimEnd()) lines.push(line.trimEnd());
  if (truncated && lines.length > 0) {
    let last = lines[lines.length - 1];
    while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines[lines.length - 1] = `${last}…`;
  }
  return lines;
}

/** 照片 cover 裁剪进矩形；无照片/加载失败时画白底首字母占位。 */
function drawPhotoRect(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, initials: string, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (img) {
    const scale = Math.max(w / img.width, h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = INK;
    ctx.font = `900 ${Math.round(w * 0.3)}px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, x + w / 2, y + h / 2 + 4);
  }
  ctx.restore();
}

/**
 * 讲师分享海报（1080×1440 竖版，「1c」布局的黄底版本）：
 * 左上黑底 kicker 标签 → 居中竖版照片（不铺满，黑框硬阴影）→ 左对齐超大姓名 →
 * 头衔 + 分论坛 chip 同行 → 紫色分隔线 → 左对齐议题（≤3 行自适应）→
 * 黑底黄字时间块 → 底部日期地点 + 右下公众号二维码。
 * 返回照片是否加载成功（失败时已回退首字母占位，调用方可提示）。
 */
export async function drawSpeakerPoster(canvas: HTMLCanvasElement, d: SpeakerPosterData): Promise<boolean> {
  canvas.width = SPEAKER_W;
  canvas.height = SPEAKER_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  const [img, qr] = await Promise.all([
    d.photoUrl ? loadImage(d.photoUrl).catch(() => null) : Promise.resolve(null),
    loadImage('/qr-wechat.png').catch(() => null),
  ]);

  const M = 72; // 页边距
  ctx.fillStyle = YELLOW;
  ctx.fillRect(0, 0, SPEAKER_W, SPEAKER_H);

  // kicker 标签（左上，黑底黄字）
  const kicker = `SPEAKER // ${SITE.eventEn.toUpperCase()}`;
  ctx.font = `700 26px ${MONO}`;
  const kw = ctx.measureText(kicker).width + 44;
  ctx.fillStyle = INK;
  ctx.fillRect(M, 64, kw, 56);
  ctx.fillStyle = YELLOW;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(kicker, M + 22, 64 + 29);
  ctx.textBaseline = 'alphabetic';

  // 照片（居中竖版，黑框 + 硬阴影；不铺满整宽）
  const pw = 400;
  const ph = 470;
  const px0 = (SPEAKER_W - pw) / 2;
  const py0 = 168;
  ctx.fillStyle = INK;
  ctx.fillRect(px0 + 12, py0 + 12, pw, ph);
  const initials = (d.nameEn || d.name).slice(0, 2).toUpperCase();
  drawPhotoRect(ctx, img, initials, px0, py0, pw, ph);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.strokeRect(px0, py0, pw, ph);

  // 姓名（左对齐超大）
  let y = py0 + ph + 108;
  ctx.fillStyle = INK;
  fitFont(ctx, d.name, SPEAKER_W - M * 2, 92, 900, SANS);
  ctx.fillText(d.name, M, y);

  // 头衔 + 分论坛 chip 同行（左对齐）
  y += 62;
  let chipX = M;
  const roleLine = [d.role, d.company].filter(Boolean).join(' · ').toUpperCase();
  if (roleLine) {
    fitFont(ctx, roleLine, 540, 25, 500, MONO);
    ctx.fillStyle = INK;
    ctx.fillText(roleLine, M, y + 8);
    chipX = M + ctx.measureText(roleLine).width + 20;
  }
  if (d.trackLabel) {
    ctx.font = `700 24px ${SANS}`;
    const cw = ctx.measureText(d.trackLabel).width + 40;
    ctx.fillStyle = d.trackColor || PURPLE;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(chipX, y - 18, cw, 46, 23);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = d.trackTextColor || '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.fillText(d.trackLabel, chipX + 20, y + 6);
    ctx.textBaseline = 'alphabetic';
  }

  // 紫色分隔线
  y += 64;
  ctx.fillStyle = PURPLE;
  ctx.fillRect(M, y, SPEAKER_W - M * 2, 4);

  // 议题（左对齐，≤3 行自适应缩字号）
  let px = 56;
  let lines: string[] = [];
  while (px > 28) {
    ctx.font = `900 ${px}px ${SANS}`;
    lines = wrapLines(ctx, d.talk, SPEAKER_W - M * 2, 3);
    if (!lines.some((l) => l.endsWith('…'))) break;
    px -= 2;
  }
  ctx.fillStyle = INK;
  const lineH = Math.round(px * 1.3);
  let talkY = y + 96;
  for (const l of lines) {
    ctx.fillText(l, M, talkY);
    talkY += lineH;
  }

  // 时间块（黑底黄字，左对齐）
  if (d.time) {
    ctx.font = `700 27px ${MONO}`;
    const tw = ctx.measureText(d.time).width + 48;
    const ty = talkY + 24;
    ctx.fillStyle = INK;
    ctx.fillRect(M, ty, tw, 58);
    ctx.fillStyle = YELLOW;
    ctx.textBaseline = 'middle';
    ctx.fillText(d.time, M + 24, ty + 30);
    ctx.textBaseline = 'alphabetic';
  }

  // 底部信息（左）+ 公众号二维码（右下）
  const fy = SPEAKER_H - 110;
  ctx.fillStyle = INK;
  ctx.font = `700 27px ${SANS}`;
  ctx.fillText(`${SITE.date} ${SITE.dateChip.split(' ')[1]} · ${CITY}`, M, fy);
  ctx.font = `500 20px ${MONO}`;
  ctx.fillStyle = 'rgba(20,20,20,0.62)';
  ctx.fillText(`亚马逊云科技 User Group · ${SITE_URL}`, M, fy + 40);
  if (qr) {
    const qs = 108;
    const qx = SPEAKER_W - M - qs;
    const qy = SPEAKER_H - 72 - qs;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(qx - 6, qy - 6, qs + 12, qs + 12);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.strokeRect(qx - 6, qy - 6, qs + 12, qs + 12);
    ctx.drawImage(qr, qx, qy, qs, qs);
  }

  return img !== null;
}

/** 导出 PNG 并触发下载。 */
export function downloadPoster(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}
