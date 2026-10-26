import VolHero from '@/components/volunteers/VolHero';
import Roles from '@/components/volunteers/Roles';
import VolPerks from '@/components/volunteers/VolPerks';
import DayTimeline from '@/components/volunteers/DayTimeline';
import ApplyBand from '@/components/volunteers/ApplyBand';

/**
 * Volunteers (/volunteers) — 成为守桥人: 黄 Hero → 纸白 岗位 → 黄 权益 →
 * 纸白 守桥人的一天 →（桥拱分隔）→ 纸白 速览 FAQ + 黑申请带 → 黑 Footer。
 */
export default function Volunteers() {
  return (
    <>
      <VolHero />
      <Roles />
      <VolPerks />
      <DayTimeline />
      {/* same-color adjacency (paper→paper): the single bridge-arch divider */}
      <div className="bg-paper px-6" aria-hidden="true">
        <img src="/divider-arch.svg" alt="" className="mx-auto h-16 w-full max-w-[1280px] md:h-20" />
      </div>
      <ApplyBand />
    </>
  );
}
