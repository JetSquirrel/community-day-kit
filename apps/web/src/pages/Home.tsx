import Hero from '@/components/home/Hero';
import Ticker from '@/components/home/Ticker';
import NoiseToSignal from '@/components/home/NoiseToSignal';
import Stats from '@/components/home/Stats';
import Highlights from '@/components/home/Highlights';
import BridgeBuilder from '@/components/home/BridgeBuilder';
import Tracks from '@/components/home/Tracks';
import SponsorsPreview from '@/components/home/SponsorsPreview';
import InfoSection from '@/components/home/InfoSection';

/**
 * Home (/): 黄 Hero → 黑 ticker → 纸白 叙事 → 黄 数据/亮点 → 黑 建桥 →
 * 纸白 分论坛 → 黑 CFP → 纸白 赞助/信息 → 黑 Footer。
 * One bridge moment per screen; Memphis ≤1–3 pieces per screen.
 * 日程/嘉宾内容未公布，AgendaPreview/SpeakersPreview 暂时下线，恢复时加回
 * Tracks 与 CfpBanner 之间。
 */
export default function Home() {
  return (
    <>
      <Hero />
      <Ticker />
      <NoiseToSignal />
      <Stats />
      <Highlights />
      <BridgeBuilder />
      <Tracks />
      <SponsorsPreview />
      {/* same-color adjacency (paper→paper): the single bridge-arch divider */}
      <div className="bg-paper px-6" aria-hidden="true">
        <img src="/divider-arch.svg" alt="" className="mx-auto h-16 w-full max-w-[1280px] md:h-20" />
      </div>
      <InfoSection />
    </>
  );
}
