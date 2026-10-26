import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { prefersReducedMotion } from '@/lib/gsap';

interface AvatarProps {
  /** two-letter initials, rendered in white Archivo Black */
  initials: string;
  /**
   * CMS 上传的讲者照片（CDN URL）；有才替换字母头像，框线/桥墩样式不变。
   * 多人合讲可填多个 URL（换行/空格/逗号分隔）→ 渲染成轮换的堆叠卡片。
   */
  photo?: string;
  /** the speaker's track accent color */
  color: string;
  /** square side in px (64–96 cards, 120 featured, 160 modal) */
  size?: number;
  /** render the 6px "桥墩" pier the avatar stands on (speakers.md S3) */
  pier?: boolean;
  className?: string;
}

/**
 * Geometric initial avatar (design.md asset manifest note): rounded square in
 * the track accent color + white Archivo Black initials + 3px ink border.
 * When a CMS photo is available it fills the same framed block instead.
 */
export default function Avatar({ initials, photo, color, size = 96, pier = false, className }: AvatarProps) {
  const photos = (photo ?? '').split(/[\s,]+/).filter(Boolean);
  // 小尺寸（日程卡片里的 36–44px）叠卡看不清，只放第一张
  const block = photos.length > 1 && size >= 48 ? (
    <PhotoStack photos={photos} alt={initials} color={color} size={size} className={className} />
  ) : photos.length > 0 ? (
    <span
      className={cn('flex items-center justify-center overflow-hidden rounded-lg border-[3px] border-ink', className)}
      style={{ width: size, height: size, backgroundColor: color }}
    >
      {/* 竖幅 / 半身照居中裁会切头，向上偏移保住脸 */}
      <img src={photos[0]} alt={initials} className="h-full w-full object-cover object-[50%_15%]" loading="lazy" />
    </span>
  ) : (
    <span
      className={cn('flex items-center justify-center rounded-lg border-[3px] border-ink font-display text-white', className)}
      style={{ width: size, height: size, backgroundColor: color, fontSize: Math.round(size * 0.34) }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
  if (!pier) return block;
  return (
    <span className="inline-flex flex-col items-center">
      {block}
      <span
        className="h-[6px] rounded-b-[3px] border-[3px] border-t-0 border-ink"
        style={{ width: Math.round(size * 0.46), backgroundColor: color }}
        aria-hidden="true"
      />
    </span>
  );
}

/** 叠卡里第 depth 张（0 = 最前）的位置：后面两张左右错开、微旋、略缩小。 */
function stackPose(depth: number, size: number) {
  const side = depth === 1 ? -1 : 1;
  return depth === 0
    ? { rotate: 0, x: 0, y: 0, scale: 1 }
    : { rotate: side * 7, x: side * size * 0.09, y: size * 0.03, scale: 0.9 };
}

/**
 * 多人合讲的照片：最多 3 张卡片叠放，每 2.8s 把最前一张换到最后，其余依次上前。
 * 减少动态效果时静止在第一张。
 */
function PhotoStack({ photos, alt, color, size, className }: { photos: string[]; alt: string; color: string; size: number; className?: string }) {
  const cards = photos.slice(0, 3);
  const [front, setFront] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = window.setInterval(() => setFront((f) => (f + 1) % cards.length), 2800);
    return () => window.clearInterval(id);
  }, [cards.length]);
  return (
    <span className="relative block" style={{ width: size, height: size }}>
      {cards.map((src, i) => {
        const depth = (i - front + cards.length) % cards.length;
        return (
          <motion.span
            key={src}
            className={cn('absolute inset-0 overflow-hidden rounded-lg border-[3px] border-ink', className)}
            style={{ backgroundColor: color, zIndex: cards.length - depth }}
            initial={false}
            animate={stackPose(depth, size)}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          >
            <img src={src} alt={depth === 0 ? alt : ''} className="h-full w-full object-cover object-[50%_15%]" loading="lazy" />
          </motion.span>
        );
      })}
    </span>
  );
}

/**
 * The open seat — dashed-border slot with an ink `?` (speakers.md S1 hero
 * empty slot / grid 虚位以待 / sessions whose speakers are TBA).
 */
export function EmptyAvatar({ size = 96, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn(
        'flex items-center justify-center rounded-lg border-[3px] border-dashed border-ink/50 bg-paper font-display text-ink/40 transition-colors',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      aria-hidden="true"
    >
      ?
    </span>
  );
}
