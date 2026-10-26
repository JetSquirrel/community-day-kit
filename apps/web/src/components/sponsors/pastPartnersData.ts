/**
 * 往届共同建造者 —— 2026 夏（Signal over Noise）的真实赞助商名单，
 * 取自上一届仓库 frontend/src/data/sponsors.yaml（静态历史数据，不走飞书同步；
 * 本届名单见 currentPartnersData.ts，两个墙都在 /sponsors）。
 * 已按要求排除「宣传合作」分区的 25 个条目；logo 文件在 /public/past-partners/。
 */
export interface PastPartner {
  name: string;
  logo: string;
  tier: '钻石' | '铂金' | '金牌' | '银牌' | '社区';
}

export const PAST_PARTNERS: PastPartner[] = [
  // 钻石赞助
  { name: '亚马逊云科技', logo: '/past-partners/亚马逊云科技.png', tier: '钻石' },
  { name: 'NVIDIA', logo: '/past-partners/nvidia.png', tier: '钻石' },
  // 铂金赞助
  { name: 'Tuya', logo: '/past-partners/tuya.jpg', tier: '铂金' },
  { name: 'AIMA 开发者社区', logo: '/past-partners/AIMA开发者社区.png', tier: '铂金' },
  // 金牌赞助
  { name: '乐奇 Rokid', logo: '/past-partners/乐奇Rokid.png', tier: '金牌' },
  { name: '云器科技', logo: '/past-partners/云器.jpeg', tier: '金牌' },
  { name: '观测云', logo: '/past-partners/guance.png', tier: '金牌' },
  // 银牌赞助
  { name: 'Cuckoo', logo: '/past-partners/Cuckoo.svg', tier: '银牌' },
  { name: '函子科技', logo: '/past-partners/Zion.png', tier: '银牌' },
  { name: 'SelectDB', logo: '/past-partners/SelectDB.svg', tier: '银牌' },
  { name: '影石 Insta360', logo: '/past-partners/insta360.png', tier: '银牌' },
  // 社区合作伙伴
  { name: 'AtomGit', logo: '/past-partners/atomgit.png', tier: '社区' },
  { name: 'DataFun', logo: '/past-partners/datafun.png', tier: '社区' },
  { name: 'Bonjour', logo: '/past-partners/bonjour.png', tier: '社区' },
  { name: 'Datawhale', logo: '/past-partners/datawhale.jpg', tier: '社区' },
  { name: 'BoHack', logo: '/past-partners/BoHack.png', tier: '社区' },
  { name: 'Gitee', logo: '/past-partners/gitee.png', tier: '社区' },
  { name: '大学堂', logo: '/past-partners/大学堂.png', tier: '社区' },
  { name: 'DataForAI', logo: '/past-partners/DataForAI.jpg', tier: '社区' },
  { name: 'Unity 开发者社区', logo: '/past-partners/Unity开发者社区.png', tier: '社区' },
  { name: 'AGIVilla', logo: '/past-partners/AGIVilla.jpg', tier: '社区' },
];
