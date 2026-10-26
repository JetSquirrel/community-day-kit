import CfpHero from '@/components/cfp/CfpHero';
import Topics from '@/components/cfp/Topics';
import Formats from '@/components/cfp/Formats';
import Timeline from '@/components/cfp/Timeline';
import Perks from '@/components/cfp/Perks';
import Submit from '@/components/cfp/Submit';

/**
 * CFP (/cfp) — 把你的信号带上桥: 黄 Hero → 纸白 选题频道 →（桥拱分隔）→
 * 纸白 演讲形式 → 黑 里程碑 → 黄 权益 → 纸白 投稿协议 + CTA → 黑 Footer。
 */
export default function Cfp() {
  return (
    <>
      <CfpHero />
      <Topics />
      {/* same-color adjacency (paper→paper): the single bridge-arch divider */}
      <div className="bg-paper px-6" aria-hidden="true">
        <img src="/divider-arch.svg" alt="" className="mx-auto h-16 w-full max-w-[1280px] md:h-20" />
      </div>
      <Formats />
      <Timeline />
      <Perks />
      <Submit />
    </>
  );
}
