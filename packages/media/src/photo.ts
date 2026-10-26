/**
 * 讲者照片规格检查——浏览器（上传前即时提示）和服务端（防绕过）共用同一份逻辑。
 *
 * 2026 秋的问题：照片尺寸 / 比例 / 质量五花八门，海报生成器裁出来头像被切、抠图异常，
 * 最后海报只能交给设计师逐张手工做。解决办法是在「上传那一刻」就把规格讲清楚并卡住：
 *   1) 上传页先展示拍摄要求（event.yaml materials.photo.guidelines）；
 *   2) 选图后浏览器内按 4:5 裁剪框让讲者自己框选头部位置，导出统一尺寸；
 *   3) 本文件做硬性检查（格式 / 分辨率 / 比例 / 体积）；
 *   4) AI 做软性检查（单人、清晰、背景、水印……），结果当场反馈，讲者可换图重传。
 * 本文件零依赖、无 DOM / Node API，两端都能 import。
 */

export interface PhotoSpecLike {
  aspect: [number, number];
  minWidth: number;
  minHeight: number;
  maxBytes: number;
  formats: string[];
}

export interface PhotoFacts {
  width: number;
  height: number;
  bytes: number;
  type: string;
}

export interface Finding {
  level: 'error' | 'warn';
  code: string;
  message: string;
}

/** 比例容差：±3% 视为符合（裁剪后导出会是精确比例，这里兼容手工裁的图） */
const ASPECT_TOLERANCE = 0.03;

export function checkPhoto(f: PhotoFacts, spec: PhotoSpecLike): Finding[] {
  const out: Finding[] = [];
  if (!spec.formats.includes(f.type)) {
    out.push({ level: 'error', code: 'format', message: `格式不支持（${f.type || '未知'}），请上传 JPG / PNG / WebP` });
  }
  if (f.bytes > spec.maxBytes) {
    out.push({ level: 'error', code: 'too-large', message: `文件 ${(f.bytes / 1048576).toFixed(1)}MB，超过 ${(spec.maxBytes / 1048576).toFixed(0)}MB 上限` });
  }
  if (f.width < spec.minWidth || f.height < spec.minHeight) {
    out.push({
      level: 'error',
      code: 'low-res',
      message: `分辨率 ${f.width}×${f.height} 过低，至少需要 ${spec.minWidth}×${spec.minHeight}（请上传原图，不要截图或聊天软件压缩图）`,
    });
  }
  const want = spec.aspect[0] / spec.aspect[1];
  const got = f.width / f.height;
  if (Math.abs(got - want) / want > ASPECT_TOLERANCE) {
    out.push({
      level: 'error',
      code: 'aspect',
      message: `比例应为 ${spec.aspect[0]}:${spec.aspect[1]} 竖版（当前 ${f.width}×${f.height}），请用页面上的裁剪框调整`,
    });
  }
  // 体积异常小而分辨率高 → 多半是被重度压缩过
  if (f.width * f.height > 0 && f.bytes / (f.width * f.height) < 0.05 && f.type === 'image/jpeg') {
    out.push({ level: 'warn', code: 'over-compressed', message: '图片压缩痕迹明显，打印/大屏可能出现色块，建议换原图' });
  }
  return out;
}

/**
 * 给定原图尺寸，算出符合目标比例的最大裁剪框。
 * focusY：人脸中心的相对纵坐标（0=顶，1=底），默认 0.35——人像头部通常在上三分之一，
 * 纯居中裁剪会把头顶切掉（2026 秋海报「头像被切」就是这个原因）。
 */
export function cropBox(width: number, height: number, aspect: [number, number], focusX = 0.5, focusY = 0.35) {
  const want = aspect[0] / aspect[1];
  let w = width;
  let h = Math.round(width / want);
  if (h > height) {
    h = height;
    w = Math.round(height * want);
  }
  const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v));
  const x = clamp(Math.round(focusX * width - w / 2), width - w);
  const y = clamp(Math.round(focusY * height - h * 0.4), height - h);
  return { x, y, w, h };
}

/** 统一导出尺寸：不放大，最长边不超过 maxW 对应尺寸 */
export function exportSize(spec: PhotoSpecLike, srcW: number, maxW = 1600) {
  const w = Math.min(maxW, Math.max(spec.minWidth, srcW));
  return { w, h: Math.round((w * spec.aspect[1]) / spec.aspect[0]) };
}

/** 从文件头读取图片尺寸（JPEG / PNG / WebP），服务端防绕过校验用。读不出返回 null。 */
export function readImageSize(buf: Uint8Array): { width: number; height: number; type: string } | null {
  const u16 = (o: number) => (buf[o] << 8) | buf[o + 1];
  const u16le = (o: number) => buf[o] | (buf[o + 1] << 8);
  const u32 = (o: number) => ((buf[o] << 24) | (buf[o + 1] << 16) | (buf[o + 2] << 8) | buf[o + 3]) >>> 0;
  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { width: u32(16), height: u32(20), type: 'image/png' };
  }
  // JPEG：扫描 SOFn 段
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let o = 2;
    while (o + 9 < buf.length) {
      if (buf[o] !== 0xff) { o++; continue; }
      const marker = buf[o + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { o += 2; continue; }
      const len = u16(o + 2);
      if ((marker >= 0xc0 && marker <= 0xcf) && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: u16(o + 5), width: u16(o + 7), type: 'image/jpeg' };
      }
      o += 2 + len;
    }
    return null;
  }
  // WebP（RIFF....WEBP）
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45) {
    const chunk = String.fromCharCode(buf[12], buf[13], buf[14], buf[15]);
    if (chunk === 'VP8 ') return { width: u16le(26) & 0x3fff, height: u16le(28) & 0x3fff, type: 'image/webp' };
    if (chunk === 'VP8L') {
      const b = buf.subarray(21, 25);
      return { width: 1 + (((b[1] & 0x3f) << 8) | b[0]), height: 1 + (((b[3] & 0xf) << 10) | (b[2] << 2) | ((b[1] & 0xc0) >> 6)), type: 'image/webp' };
    }
    if (chunk === 'VP8X') {
      return { width: 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16)), height: 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16)), type: 'image/webp' };
    }
  }
  return null;
}
