/**
 * Shared data for the Schedule & Speakers pages (my scope only).
 * Track color coding matches the home page (design.md §1):
 * AI & 建造者 = Pulse Purple, 远洋 = Growth Green, Spark = Signal Red,
 * Workshop = Bridge Blue, Keynote / main bridge = Ink + Signal Yellow.
 *
 * i18n: every user-facing text field is an LText ({ zh, en? }) — pick() in
 * @/lib/locale resolves it for the active locale. Speaker fields use the
 * looser LTextLike so zh-only plain strings from the remote content sync
 * (see @/lib/content) remain valid.
 */
import i18n from '@/i18n';
import EVENT from '@/event.generated.json';
import { pick } from '@/lib/locale';
import type { LText, LTextLike, Locale } from '@/lib/locale';

/**
 * 分论坛按 9-24 最终议程 / 海报：AI & 建造者桥 / 远洋桥 / 星火桥 + Workshop。
 * 'builder' 已并入 AI & 建造者桥，只为兼容飞书嘉宾表里的旧「赛道」值而保留（见 trackById）。
 */
export type TrackId = 'keynote' | 'ai' | 'builder' | 'spark' | 'global' | 'workshop';
export type SessionType = 'KEYNOTE' | 'SESSION' | 'WORKSHOP' | 'LIGHTNING' | 'PANEL' | 'BREAK' | 'SOCIAL';
export type Slot = 'main' | 'am' | 'pm';

export interface Track {
  id: TrackId;
  /** bridge name, bilingual, e.g. 智能桥 / AI Bridge */
  bridge: LText;
  /** english signal name, e.g. AI SIGNAL */
  signal: string;
  /** mono ordinal, e.g. TRACK 01 */
  no: string;
  /** accent color — keynote owns Ink (黑黄无色) */
  color: string;
  /** legible text color on top of `color` */
  textOn: string;
}

/**
 * 赛道来自 event.yaml tracks（顺序、颜色、名称、英文副标题）。
 * keynote / workshop 是约定 id（主会场 / 动手场），其余按出现顺序编号 TRACK 01…
 */
let trackNo = 0;
export const TRACKS: Track[] = EVENT.tracks.map((t) => ({
  id: t.id as TrackId,
  bridge: typeof t.name === 'string' ? { zh: t.name } : t.name,
  signal: t.signal,
  no: t.id === 'keynote' ? 'MAIN HALL' : t.id === 'workshop' ? 'WORKSHOP' : `TRACK ${String(++trackNo).padStart(2, '0')}`,
  color: t.color,
  textOn: t.textOn,
}));

export interface Speaker {
  /** slug — also the anchor id used by /speakers#id */
  id: string;
  /** zh name; en display prefers the dedicated `nameEn` field (see speakerName) */
  name: LTextLike;
  nameEn: string;
  /** two-letter initials for the geometric avatar (Archivo Black) */
  initials: string;
  /** CMS 上传的讲者照片（CDN URL）；有才优先于字母头像展示 */
  photo?: string;
  /** 排期时段，如 "13:30–14:05"（content-sync 来自嘉宾表「时间」列）；有它才会出现在时间表 */
  time?: string;
  company: LTextLike;
  role: LTextLike;
  track: TrackId;
  /** headliners get the 2-column featured card (speakers.md S3: 前 4 位) */
  featured: boolean;
  /** talk title shown on the card */
  talk: LTextLike;
  bio: LTextLike;
  socials: { label: LTextLike; href: string }[];
}

/**
 * 无内置嘉宾：名单只来自飞书嘉宾表 → S3 的 speakers.json（见 @/lib/content）。
 * 同步不可达时此处为空，/speakers 只保留「虚位以待」CFP 卡片。
 */
export const SPEAKERS: Speaker[] = [];

/** 讲者墙置顶、独占第一行的头牌嘉宾（Werner Vogels）。 */
export const HEADLINER_IDS = ['recvurXTFoJwBW'];

export interface Session {
  id: string;
  start: string;
  end: string;
  track: TrackId;
  type: SessionType;
  title: LText;
  room: LText;
  speakerIds: string[];
  /** 议程上的讲者署名——讲者不在嘉宾表或未勾「展示」时，卡片/弹窗靠它显示名字 */
  speakerLabel?: string;
  abstract: LText;
  /** which parallel block it belongs to; main-bridge items use `main` */
  slot: Slot;
}

export const SESSIONS: Session[] = [
  // ——— 上午 · 主桥（全员）———
  {
    id: 'checkin',
    start: '09:00',
    end: '09:50',
    track: 'keynote',
    type: 'BREAK',
    title: { zh: '签到入场 · 领取胸牌、NFC 手环与周边', en: 'Check-in · Pick Up Badge, NFC Wristband & Swag' },
    room: { zh: '主会场 · 签到大厅', en: 'Main Hall · Check-in Lobby' },
    speakerIds: [],
    abstract: {
      zh: '早到的信号先过桥。凭报名二维码签到，领取胸牌、NFC 手环与限量周边；手环将用于全天 Workshop 签到、市集互动与抽奖。咖啡通道同步开放。',
      en: 'Early signals cross the bridge first. Check in with your registration QR code and pick up your badge, NFC wristband, and limited-edition swag — the wristband works all day for workshop check-ins, market activities, and the lucky draw. The coffee lane opens at the same time.',
    },
    slot: 'main',
  },
  {
    id: 'main-host',
    start: '09:50',
    end: '10:00',
    track: 'keynote',
    type: 'BREAK',
    title: { zh: '主持人开场', en: 'Host Opening' },
    room: { zh: '主会场 MAIN HALL', en: 'MAIN HALL' },
    speakerIds: [],
    abstract: { zh: '主持人开场，介绍本场议程与讲者。', en: 'The host opens the session and introduces the agenda and speakers.' },
    slot: 'main',
  },
  {
    id: 'main-1',
    start: '10:00',
    end: '10:15',
    track: 'keynote',
    type: 'KEYNOTE',
    title: { zh: 'Choose your own adventure in the AWS Community' },
    room: { zh: '主会场 MAIN HALL', en: 'MAIN HALL' },
    speakerIds: ['recvurXZ5L10vm'],
    speakerLabel: 'Maria',
    abstract: { zh: 'The AWS Community has a place for every builder. Whether you like creating content, organize tech events, or just show up and learn. Pick your level of commitment, choose what excites you (events, content, code), and jump in wherever feels right. Your community, your adventure' },
    slot: 'main',
  },
  {
    id: 'main-2',
    start: '10:15',
    end: '10:55',
    track: 'keynote',
    type: 'KEYNOTE',
    title: { zh: '20 Years of Solving Unsolvable Problems' },
    room: { zh: '主会场 MAIN HALL', en: 'MAIN HALL' },
    speakerIds: ['recvurXTFoJwBW'],
    speakerLabel: 'Werner Vogels',
    abstract: { zh: '议题详情即将公布。', en: 'Session details coming soon.' },
    slot: 'main',
  },
  {
    id: 'main-3',
    start: '10:55',
    end: '11:20',
    track: 'keynote',
    type: 'KEYNOTE',
    title: { zh: 'NVIDIA 全栈加速 Agentic AI Workload' },
    room: { zh: '主会场 MAIN HALL', en: 'MAIN HALL' },
    speakerIds: ['recvurY2PfcPV2'],
    speakerLabel: 'River Liu 刘川',
    abstract: { zh: '议题详情即将公布。', en: 'Session details coming soon.' },
    slot: 'main',
  },
  {
    id: 'main-4',
    start: '11:20',
    end: '11:45',
    track: 'keynote',
    type: 'KEYNOTE',
    title: { zh: 'From Release Notes to Production: What the Latest Developer Launches Mean for You' },
    room: { zh: '主会场 MAIN HALL', en: 'MAIN HALL' },
    speakerIds: ['recvvsoifrGrIQ'],
    speakerLabel: 'Mouna',
    abstract: { zh: '议题详情即将公布。', en: 'Session details coming soon.' },
    slot: 'main',
  },
  {
    id: 'main-5',
    start: '11:45',
    end: '12:00',
    track: 'keynote',
    type: 'KEYNOTE',
    title: { zh: '安克创新在 AI 时代的探索和创新' },
    room: { zh: '主会场 MAIN HALL', en: 'MAIN HALL' },
    speakerIds: ['recvvRMi5DTlOk'],
    speakerLabel: '商渭清',
    abstract: { zh: '议题详情即将公布。', en: 'Session details coming soon.' },
    slot: 'main',
  },
  // ——— 午间 · 通栏 ———
  {
    id: 'lunch',
    start: '12:00',
    end: '13:30',
    track: 'keynote',
    type: 'BREAK',
    title: { zh: '午餐 & 开发者市集', en: 'Lunch & Developer Market' },
    room: { zh: '餐饮区 · 开发者市集', en: 'Dining Area · Developer Market' },
    speakerIds: [],
    abstract: {
      zh: '午餐补给，开发者市集持续开放。趁人少去逛展位、换周边、和讲者偶遇——桥上的好对话大多发生在议程之外。',
      en: 'Lunch refuel; the developer market stays open. Visit booths while it is quiet, swap swag, and bump into speakers — the best conversations on the bridge usually happen off-agenda.',
    },
    slot: 'main',
  },
  // ——— 下午 · AI & 建造者桥（紫）———
  {
    id: 'ai-host',
    start: '13:20',
    end: '13:30',
    track: 'ai',
    type: 'BREAK',
    title: { zh: '主持人开场', en: 'Host Opening' },
    room: { zh: 'AI & 建造者桥', en: 'AI & Builder Bridge' },
    speakerIds: [],
    abstract: { zh: '主持人开场，介绍本场议程与讲者。', en: 'The host opens the session and introduces the agenda and speakers.' },
    slot: 'pm',
  },
  {
    id: 'ai-1',
    start: '13:30',
    end: '14:00',
    track: 'ai',
    type: 'SESSION',
    title: { zh: '2027的智能体世界：从信号到行动' },
    room: { zh: 'AI & 建造者桥', en: 'AI & Builder Bridge' },
    speakerIds: ['recvqxemCPnVqt'],
    speakerLabel: 'Haowen Huang',
    abstract: { zh: '2026年，智能体（Agentic AI）从概念走向生产。2027年，它将重塑我们的工作方式、组织形态与开发者日常。本次分享从红杉「计算革命」框架出发，解析为何这波 AI 浪潮与以往截然不同，以及开发者如何在新世界中把握机遇，绽放价值信号。我将分享真实构建经验：多智能体量化交易系统、AutoResearch 科研管线、开源模型自建应用（Flux on EC2 + Kiro），以及用 Agent 协作体系实现 10x 产出的实践。从感知信号到自主行动，这就是 2027 的开发者新世界。' },
    slot: 'pm',
  },
  {
    id: 'ai-2',
    start: '14:00',
    end: '14:30',
    track: 'ai',
    type: 'SESSION',
    title: { zh: '面向企业的通用 Agent 应用实践' },
    room: { zh: 'AI & 建造者桥', en: 'AI & Builder Bridge' },
    speakerIds: ['recvqJbfuISGZr'],
    speakerLabel: '范桂飓',
    abstract: { zh: '讲述一种帮助企业用户搭建通用 Agent 支撑企业常规业务的应用实践。听众可以收获一种快速搭建 Agent 应用并不断完成适用于自身业务提效的方法和工具。' },
    slot: 'pm',
  },
  {
    id: 'ai-3',
    start: '14:30',
    end: '15:00',
    track: 'ai',
    type: 'SESSION',
    title: { zh: '企业级可用的运维智能体：观测AI Agent teams演示' },
    room: { zh: 'AI & 建造者桥', en: 'AI & Builder Bridge' },
    speakerIds: ['recvugxd9I0KJU'],
    speakerLabel: '王海名',
    abstract: { zh: '议题详情即将公布。', en: 'Session details coming soon.' },
    slot: 'pm',
  },
  {
    id: 'ai-4',
    start: '15:00',
    end: '15:30',
    track: 'ai',
    type: 'SESSION',
    title: { zh: 'AWS Serverless OpenClaw Agent Platform - AgentCore+ MicroVMs' },
    room: { zh: 'AI & 建造者桥', en: 'AI & Builder Bridge' },
    speakerIds: ['recvqfoF5EkNC7'],
    speakerLabel: 'Cyrus Wong',
    abstract: { zh: 'Discover how to architect a highly secure, 100% serverless multi-tenant AI agent platform on AWS. This technical deep dive explores per-user isolation using Lambda MicroVMs, centralized governance and strict budget controls with LiteLLM and Aurora Serverless v2, and real-time visual dashboards for OpenClaw. Learn how to deploy an auto-scaling, serverless LiteLLM layer using AWS CDK to enforce security perimeters, observability, and cost management across all LLM workloads. The session also demonstrates how to synchronize real-time computer vision, serverless robotics, and multimodal AI runtimes through interactive web-based environments powered by Amazon Bedrock AgentCore container runtimes and automated AWS CDK deployment pipelines, showcasing a complete end-to-end architecture for scalable, secure, and intelligent AI systems.' },
    slot: 'pm',
  },
  {
    id: 'ai-5',
    start: '15:30',
    end: '16:00',
    track: 'ai',
    type: 'SESSION',
    title: { zh: 'Doris 驱动的 Data Agent 架构智能化升级' },
    room: { zh: 'AI & 建造者桥', en: 'AI & Builder Bridge' },
    speakerIds: ['recvqKSk6WPbq1'],
    speakerLabel: '张彬华',
    abstract: { zh: '基于 Apache Doris 如何构建 Data Agent 智能数据平台，以及落地的价值与总结。' },
    slot: 'pm',
  },
  {
    id: 'ai-6',
    start: '16:00',
    end: '16:30',
    track: 'ai',
    type: 'SESSION',
    title: { zh: '如何打造AI-Ready的数据组织和平台' },
    room: { zh: 'AI & 建造者桥', en: 'AI & Builder Bridge' },
    speakerIds: ['recvrFvjzDibM0'],
    speakerLabel: '张鑫',
    abstract: { zh: '定义概念，明确AI-Ready数据组织与平台的核心定义与内涵边界，帮助企业客户建立统一的认知基准，理解"AI-Ready"区别于传统数据平台建设的关键差异点。\n诊断评估，提供标准化的评估维度、可衡量指标及问卷工具，帮助企业客户快速识别自身组织能力与平台建设现状中的欠缺点，并支持不同规模、不同行业客户之间的横向对比。\n落地推荐，基于诊断结果匹配对应的AWS解决方案与实施路径，为企业客户提供从组织变革到平台改造的可执行建设步骤，加速AI-Ready能力的落地进程。' },
    slot: 'pm',
  },
  {
    id: 'ai-7',
    start: '16:30',
    end: '16:40',
    track: 'ai',
    type: 'LIGHTNING',
    title: { zh: '创造智能眼镜应用只要一句“咒语”：Rokid AIUI STUDIO' },
    room: { zh: 'AI & 建造者桥', en: 'AI & Builder Bridge' },
    speakerIds: ['recvvLSmVm51s7'],
    speakerLabel: '郝俸',
    abstract: { zh: '议题详情即将公布。', en: 'Session details coming soon.' },
    slot: 'pm',
  },
  {
    id: 'ai-8',
    start: '16:40',
    end: '17:10',
    track: 'ai',
    type: 'SESSION',
    title: { zh: '突破 DB 效能瓶頸：Amazon Aurora 的高彈性架構與成本優化案例' },
    room: { zh: 'AI & 建造者桥', en: 'AI & Builder Bridge' },
    speakerIds: ['recvqdtGLGYIks'],
    speakerLabel: '光光',
    abstract: { zh: '一、 彈性架構與效能突破透過結合讀庫 Auto Scaling、Amazon Aurora Serverless 與自訂讀取端點，成功將每日高負荷報表任務的執行時間從將近 15 小時大幅縮短至 2 小時以內。此設計不僅實現了業務分離與高效能，更確保一般性任務的執行不受影響，發揮了極佳的彈性架構價值。\n\n二、 智慧節費與成本優化在成本控制方面，藉由 Amazon Aurora Serverless 在一天中有 22 小時維持低規格運作、升級資料庫型號，以及將磁碟空間從 6000GB 費用精簡至 4000GB，配合多項最佳實務調整，最終實現了每月高達 84% 的顯著費用節省。\n\n三、 卓越成效與最佳實務落實了多達十四招的最佳實務設計，包含參數優化、分區表設計、Optimized Reads 加速以及 Aurora I/O 優化等機制。在處理單表超過 1300G、近 28 億筆資料與每日大量讀寫的金融交易高壓情境下，不僅展現出優異的系統穩定度，更帶來效能與成本雙贏的實質成效。' },
    slot: 'pm',
  },
  {
    id: 'ai-9',
    start: '17:10',
    end: '17:30',
    track: 'ai',
    type: 'SESSION',
    title: { zh: '图表、告警和回测：将金融脚本语言迁移到可观测性实战' },
    room: { zh: 'AI & 建造者桥', en: 'AI & Builder Bridge' },
    speakerIds: ['recvrX9v7DvW4x'],
    speakerLabel: '邓添',
    abstract: { zh: 'SRE 每天跟监控和告警打交道,工具已经很成熟。但金融行业和时序数据打交道的时间更久,有些问题他们早就解决过。\n这场分享从一个需求开始:我想让故障调查 agent 每次都画出一张定制面板。怎么用文本定义一张图该长什么样?\nPine Script like 的解决方案是我要找的答案。一份脚本同时定义检测规则、告警和绘图。agent 写它,人读它——读到的既是文本,也是画出来的图。\n顺着这条路还带来了回测。上告警规则的常见方式是拍脑袋定个阈值、发布、跑一段时间才知道吵不吵,代价是 on-call 被噪音消耗。借鉴金融回测的思路,把规则在历史指标上重放,触发次数和噪音率当场就有。\n我会分享怎么设计一门适合可观测性的脚本语言,以及金融行业的脚本语言里有什么可以借鉴。' },
    slot: 'pm',
  },
  // ——— 下午 · 远洋桥（绿）———
  {
    id: 'global-host',
    start: '13:20',
    end: '13:30',
    track: 'global',
    type: 'BREAK',
    title: { zh: '主持人开场', en: 'Host Opening' },
    room: { zh: '远洋桥', en: 'Global Bridge' },
    speakerIds: [],
    abstract: { zh: '主持人开场，介绍本场议程与讲者。', en: 'The host opens the session and introduces the agenda and speakers.' },
    slot: 'pm',
  },
  {
    id: 'g-1',
    start: '13:30',
    end: '14:00',
    track: 'global',
    type: 'SESSION',
    title: { zh: 'Amazon DevOps Agent & Security Agent 驱动出海安全合规认证效率跃升' },
    room: { zh: '远洋桥', en: 'Global Bridge' },
    speakerIds: ['recvtUbIQqHTOK'],
    speakerLabel: '李少奕 · 张占腾 · 黄馨锜',
    abstract: { zh: '出海企业在全球业务拓展中，通常需要应对PCI DSS、ISO 27001、SOC 2、GDPR、CCPA 等多类国际合规标准、认证体系与监管要求，面临认证项多、证据材料繁杂、审计周期长等挑战。本议题将介绍 Amazon DevOps Agent & Security Agent 如何协同工作，将合规要求转化为架构检查、配置核验、自动化测试与证据沉淀能力。结合亚马逊云科技 Systems Manager、Security Hub 等服务，简化应审资料准备流程，提升合规改造效率，缩短认证准备周期，驱动出海安全合规认证效率跃升。' },
    slot: 'pm',
  },
  {
    id: 'g-2',
    start: '14:00',
    end: '14:30',
    track: 'global',
    type: 'SESSION',
    title: { zh: 'AI for Security — 后Mythos时代，AI带来的安全新威胁以及策略应对' },
    room: { zh: '远洋桥', en: 'Global Bridge' },
    speakerIds: ['recvvUGMtzem8n'],
    speakerLabel: '阴俊哲',
    abstract: { zh: '议题详情即将公布。', en: 'Session details coming soon.' },
    slot: 'pm',
  },
  {
    id: 'g-3',
    start: '14:30',
    end: '15:00',
    track: 'global',
    type: 'SESSION',
    title: { zh: 'Amazon Quick 使用方案分享', en: 'Amazon Quick in Practice' },
    room: { zh: '远洋桥', en: 'Global Bridge' },
    speakerIds: ['recvtTK2M8RLEz', 'recvtTgmXHpOzJ'],
    speakerLabel: 'Lho Chen Yang · Lyn',
    abstract: {
      zh: 'Lyn 与 Lho Chen Yang（卢正扬）合并为一场，分三部分分享 Amazon Quick 的使用方案：先介绍 Quick；再由 Lyn 讲个人、非技术场景下怎么用 Quick；最后由 Lho Chen Yang 讲 Quick 在商业场景中的实践。',
      en: 'A joint session by Lyn and Lho Chen Yang in three parts: an introduction to Amazon Quick; Quick for personal, non-technical use (Lyn); and Quick for business insights (Lho Chen Yang).',
    },
    slot: 'pm',
  },
  {
    id: 'g-4',
    start: '15:00',
    end: '15:30',
    track: 'global',
    type: 'SESSION',
    title: { zh: '从幻觉到可信：用 Ontology 和知识图谱构建企业级 Agentic AI 的语义基础' },
    room: { zh: '远洋桥', en: 'Global Bridge' },
    speakerIds: ['recvs8Vi0ncLkE'],
    speakerLabel: '柯俊雄',
    abstract: { zh: '你的 AI Agent 在 Demo 里表现惊艳，一接入企业真实数据就开始"胡说八道"？问题往往不在模型，而在数据缺乏语义。本 Session 从一个反直觉的现象讲起——为什么给 Agent 喂更多上下文，准确率反而更低——并给出解法：用 Ontology 和 Knowledge Graph 搭建语义层，让 Agent 的推理有据可依、可验证、可审计。' },
    slot: 'pm',
  },
  {
    id: 'g-5',
    start: '15:30',
    end: '16:00',
    track: 'global',
    type: 'SESSION',
    title: { zh: '如何打造AI agent出海团队：从选品到售后，Agent 的全链路实践' },
    room: { zh: '远洋桥', en: 'Global Bridge' },
    speakerIds: ['recvsDuatDPiLV'],
    speakerLabel: '彭志豪Echo',
    abstract: { zh: 'This sharing focuses on two mainstream cross-border overseas scenarios: TikTok physical product sales and Shopify independent station brand building. It deeply analyzes how to leverage the full-link capabilities of AI Agent to solve the core pain points of cross-border e-commerce globalization. Covering overseas market demand mining, multilingual brand content creation, product matrix iteration, localized operation, and private domain user asset accumulation, this speech combines cloud-native practices and real overseas cases to demonstrate the end-to-end workflow of AI Agent-driven automated product launching, intelligent market matching, and long-term brand asset precipitation. It also summarizes practical landing methods, compliance and cost optimization strategies, providing replicable AI growth solutions for cross-border physical sellers and brand independent station operators.' },
    slot: 'pm',
  },
  {
    id: 'g-7',
    start: '16:00',
    end: '16:30',
    track: 'global',
    type: 'SESSION',
    title: { zh: 'Ontology本体语义的企业级落地' },
    room: { zh: '远洋桥', en: 'Global Bridge' },
    speakerIds: ['recvqzcnBig2o2'],
    speakerLabel: '沈金',
    abstract: { zh: '当 AI Agent 从"对话式问答"走向"自主决策与行动"，一个被低估的瓶颈正在浮现：Agent 不缺模型能力，缺的是对业务现实的结构化理解。2025 年以来，Ontology（本体）在硅谷重新成为技术热点——Palantir 以本体为核心构建 AIP，Snowflake Summit 26 将其列为 Agentic Enterprise 的关键支柱。原因很简单：没有本体，Agent 只能在孤立的表上拼接脆弱 SQL；有了本体，Agent 才能像人一样基于概念推理，而非基于行连接猜测。\n\n本次演讲将深入解析：为什么传统数据建模在 Agent 时代失效？Ontology 与 Knowledge Graph 的本质区别是什么？如何在 Snowflake 上构建一套"五层本体智能栈"——从通用物理存储、元数据声明、自动编译视图、三模型语义策略，到 Cortex Agent 的意图驱动编排' },
    slot: 'pm',
  },
  {
    id: 'g-8',
    start: '16:30',
    end: '17:00',
    track: 'global',
    type: 'SESSION',
    title: { zh: '造好了没通电：Agent 活体审计实战' },
    room: { zh: '远洋桥', en: 'Global Bridge' },
    speakerIds: ['recvqOuQKUlmZ0'],
    speakerLabel: '赵思明',
    abstract: { zh: '绝大多数 Agent 团队没有"通电"这个概念，只有"做完"这个概念。\n行业现在的默认验收姿势是：单测绿了、demo 跑通了、PR 合了 → 记为"已交付"。而 Agent 系统的特殊之处在于，它的执行路径是运行时由模型决定的 —— 你写的工具、你建的表、你埋的字段，会不会被走到，不由编译期决定。于是出现了一种在传统 CRUD 服务里罕见的故障类别：\n代码是对的，测试是绿的，日志是正常的，但这条路径从来没有被走过。\n我用 3 个月做了 11 轮全系统审计 + 10 余轮分域审计，把这类故障攒成了一份分类学，并且每一条都有可追溯到 文件:行号 的实证。这些结论与技术栈无关 —— 它们是 Agent 架构的结构性陷阱，不是我们代码的特产。听众换成任何 LLM、任何云、任何编排框架，都会撞到同一批。\n而且这里有一个反直觉的收益：这套方法最大的价值不是找 bug，是撤回误判。 我有 14 条以上被前几轮审计判成 P0 的问题，被后来的审计证伪 —— 其中最贵的一课是「零行 = 没人用过 ≠ 坏的」。一个只会找茬的审计方法是 bug 发生器；只有会撤回的，才是测量仪器。这一半的内容，市面上几乎没人讲。' },
    slot: 'pm',
  },
  {
    id: 'g-9',
    start: '17:00',
    end: '17:10',
    track: 'global',
    type: 'LIGHTNING',
    title: { zh: '以期货行业为例：基于 AWS 搭建企业数据与智能分析体系' },
    room: { zh: '远洋桥', en: 'Global Bridge' },
    speakerIds: ['recvtME3MbBXrx'],
    speakerLabel: 'Allen',
    abstract: { zh: '本次分享以期货行业作为真实业务样本，跳出单一行业视角，讲解企业如何利用 AWS 完整产品栈搭建通用的数据与智能信息分析体系。涵盖数据接入存储、非结构化文档智能解析、大模型 RAG 应用、BI 可视化全链路，同时分享云服务选型、架构取舍、线上落地踩坑的实战经验。\n目标听众：各行业技术研发、业务数据分析师、云架构实践者、AI 应用落地从业者。\n听众可以带走 3 个核心收获：\n\n1. 一套可跨行业复用的 AWS 数据 + 智能分析整体架构思路；\n2. 结构化 + 非结构化业务数据融合处理的落地方法；\n3. 业务背景从业者，从零上手云与 AI 技术的成长路径与实践心得。' },
    slot: 'pm',
  },
  // ——— 下午 · 星火桥（红）———
  {
    id: 'spark-host',
    start: '13:20',
    end: '13:30',
    track: 'spark',
    type: 'BREAK',
    title: { zh: '主持人开场', en: 'Host Opening' },
    room: { zh: '星火桥', en: 'Spark Bridge' },
    speakerIds: [],
    abstract: { zh: '主持人开场，介绍本场议程与讲者。', en: 'The host opens the session and introduces the agenda and speakers.' },
    slot: 'pm',
  },
  {
    id: 's-1',
    start: '13:30',
    end: '14:00',
    track: 'spark',
    type: 'SESSION',
    title: { zh: '从模型到智能体：开源如何驱动下一波 AI 创新' },
    room: { zh: '星火桥', en: 'Spark Bridge' },
    speakerIds: ['recvrTKhcchmPJ'],
    speakerLabel: '郑予彬',
    abstract: { zh: 'AI 的重心正在从单一的大模型，转向能够自主推理、行动与协作的智能体（Agent）。这一变化不仅重新定义了 AI 应用的构建方式，也正在催生一套全新的技术栈。而从数据基础设施、模型与开发框架，到 Agent 运行时、工具连接和开放协议，开源正在成为这场变革中最重要的推动力量之一。今天，一个真正能够工作的 Agent，早已不只是一次模型调用。它需要可靠的数据底座，需要能够组织推理与行动的 Agent 框架，需要连接工具和外部系统的开放协议，也需要解决状态、记忆、安全、可观测性与规模化运行等一系列系统工程问题。从 Apache Iceberg 等开放数据基础设施，到 Strands 等开源 Agent SDK，再到 MCP 等开放协议，一个围绕 Agentic AI 的开放技术生态正在快速形成。\n本次分享将从“模型到智能体”的技术演进出发，跨越不同开源社区和项目，梳理开源如何支撑现代 Agent 技术栈的不同层次，并进一步探讨：当 Agent 从 Demo 走向 Production，哪些问题已经超出了模型本身？开源社区又如何通过开放标准、共享基础设施和全球开发者协作，共同解决这些新的挑战？\n当 AI 从“回答问题”走向“完成任务”，下一波创新或许不仅来自更强大的模型，更来自一个开放、可组合、共同演进的技术生态。而每一位开发者，都有机会成为这个生态的使用者、构建者和贡献者。' },
    slot: 'pm',
  },
  {
    id: 's-2',
    start: '14:00',
    end: '14:30',
    track: 'spark',
    type: 'SESSION',
    title: { zh: 'Visualizing the Cloud-Native Stack in 3D' },
    room: { zh: '星火桥', en: 'Spark Bridge' },
    speakerIds: ['recvqMbT5rNViu'],
    speakerLabel: '吴晟',
    abstract: { zh: '在 AWS 云原生环境中，一次故障往往会跨越多个技术层。用户感知到的延迟上升，可能来自应用代码，也可能出现在 Envoy Sidecar、Kubernetes 服务网络，甚至底层数据平台。然而，大多数可观测性工具仍然将这些信息分散在不同的页面和仪表盘中，排障人员不得不在多个视角之间反复切换，依靠经验在脑海中还原系统的完整运行状态。\n\n本次分享将介绍 Apache SkyWalking Horizon 中的 3D Infrastructure Map。这是一个基于 WebGL 构建的开源三维可视化视图，它将应用、Middleware、服务网格和基础设施组织在同一个可交互场景中，帮助使用者从整体视角观察云原生系统的运行状态及其跨层关联。\n\n在三维场景中，应用、服务网格、Kubernetes 和基础设施会按照技术层次纵向展开，相关服务则呈现在各自所属的层级中。实时流量、调用依赖和运行状态被叠加在同一视图内，使排障人员既能观察每一层内部的服务关系，也能看到同一个业务服务在应用探针、服务网格和 Kubernetes 等不同观测来源中的对应关系。发生故障时，Beacon 模式会弱化处于正常状态的区域，仅突出当前正在触发告警的服务，帮助响应人员快速收敛排查范围。\n\n本次分享将结合演示视频和实现原理，介绍这套三维地图背后的数据模型、分阶段加载流程、配置驱动的技术层映射机制，以及针对浏览器渲染性能所做的优化。参会者将了解如何从两个互补的角度描述一个基于 Amazon EKS 的环境：一方面呈现服务之间的实时流量和依赖关系，另一方面建立同一服务在不同技术层和观测体系中的身份关联。\n\n我们希望通过这一实践说明，三维可视化并不只是更具视觉冲击力的拓扑展示。当它能够整合跨层数据、关联不同观测视角，并在故障发生时有效突出异常区域时，它也可以成为云原生系统事件分析和故障定位中的实用工具。' },
    slot: 'pm',
  },
  {
    id: 's-3',
    start: '14:30',
    end: '15:00',
    track: 'spark',
    type: 'SESSION',
    title: { zh: '技术债的尽头是 AI：一个微服务从零文档到知识库的重构之路' },
    room: { zh: '星火桥', en: 'Spark Bridge' },
    speakerIds: ['recvtm0bOPY5pO'],
    speakerLabel: '熊聘',
    abstract: { zh: '本文分享了在零文档、零容错的生产环境下，使用 AI Coding 重构数字钥匙微服务的完整实战经验。\n\n讲什么：一个已上线两年、三端联调（手机+车端+云端）的 Java/Spring Boot 微服务，在没有任何文档的前提下，借助 AI Agent 完成从理解旧代码到灰度发布全流程的重构。文章系统拆解了借鉴 Kiro 设计哲学构建的 13 步流程——理解→定义→重构→部署，涵盖文档生成、测试回归、一致性校验、差异分析、知识沉淀等关键环节，并附 git commit 记录与知识库目录截图作为硬证据。\n\n为什么值得听：这不是一篇"AI 很强"的营销文，而是一份带数据、带失败复盘的现场报告：原计划一周的编码 4 小时完成，联调从一周缩短至两天，首次集成 20 分钟验证 90% 功能，仅 2 个 Bug 且均为人因——同时如实呈现了 5 个踩过的坑。核心结论是：流程而非 AI 本身才是安全性的来源，这套方法论与工具无关，可平滑迁移至 Kiro 等平台。\n\n目标听众：正在或计划用 AI 重构遗留系统的技术负责人、架构师和一线工程师；对 AI Coding 落地有疑虑、需要可复制方法论而非工具测评的实践者。\n\n你能带走：① 零文档项目如何用 AI 快速建立系统认知；② "运动员与裁判分离"的多 Agent 校验设计；③ 哪些场景该用 AI、哪些场景手动更高效；④ 深入理解Kiro Spec Coding的设计哲学，助你在任意 AI 编程工具上复现这一流程。' },
    slot: 'pm',
  },
  {
    id: 's-4',
    start: '15:00',
    end: '15:30',
    track: 'spark',
    type: 'SESSION',
    title: { zh: 'RustFS：高性能分布式对象存储的AI之旅' },
    room: { zh: '星火桥', en: 'Spark Bridge' },
    speakerIds: ['recvrT9brzJXYv'],
    speakerLabel: '小马哥',
    abstract: { zh: 'RustFS 是一款用Rust编写的高性能分布式对象存储，以Apache 2.0 开源，开源一年已经收货30.5k GitHub Star。本次主要分享\n1  RustFS 的超多节点无限扩容实践\n2 AI 测试/运维在 RustFS 健壮性打造过程中的使用' },
    slot: 'pm',
  },
  {
    id: 's-5',
    start: '15:30',
    end: '16:00',
    track: 'spark',
    type: 'SESSION',
    title: { zh: 'Self-Evolving Strands Agents' },
    room: { zh: '星火桥', en: 'Spark Bridge' },
    speakerIds: ['recvqjtfv5rANZ'],
    speakerLabel: 'Subin Kim',
    abstract: { zh: 'Most agents are frozen at v1 - they answer today, then fall behind as the team\'s context moves on. I built a Strands agent that does real ops work and contributes back to its own codebase, so its skills and memory keep evolving with the team it serves. It opens and merges PRs against itself and redeploys - improving without anyone manually shipping a new version. I\'ll cover the architecture, self-evolution in practice, and the guardrails that keep it safe in production. Audience: engineers building and operating LLM agents in production. Key takeaways: (1) What self-evolution actually means in practice: an agent that updates its own skills, memory, and code instead of waiting for a human release. (2) A concrete architecture: Strands Agents + MCP (Notion / Slack / GitHub) + self-authored PRs + doc-gardening. (3) The guardrails (review gates, scoping, and reversibility) that make a self-modifying agent safe enough for production.' },
    slot: 'pm',
  },
  {
    id: 's-6',
    start: '16:00',
    end: '16:20',
    track: 'spark',
    type: 'SESSION',
    title: { zh: '从Vibe Coding到Frontier Development：让 Coding Agent 真正自主工作的五个习惯' },
    room: { zh: '星火桥', en: 'Spark Bridge' },
    speakerIds: ['recvtQOnrEhDwW'],
    speakerLabel: '李小飞',
    abstract: { zh: 'AI 编程正在从代码补全和对话式辅助，迈向能够自主规划、编码、测试与迭代的 Agentic Development。然而，仅仅把 AI 编程工具叠加到原有研发流程中，通常只能带来有限的效率提升。真正的突破并不只取决于模型或工具，而在于开发者能否重新设计与 AI Agent 协作的方式。\n\n本议题将基于 Amazon 等企业公开分享的研发案例，并结合讲者在 AI 编程与软件现代化场景中的实践，解析从 Vibe Coding 走向 Frontier Development 的关键变化：减少人工持续干预、让 Agent 长时间自主执行任务，并通过多个 Agent 并行推进研发工作。\n\n分享将重点介绍五个可落地的实践习惯：持续建设 Agent Context、先减速再加速、为 Agent 提供任务而非全程监督、通过 Spec 明确开发意图，以及利用自动化测试建立快速反馈闭环。同时，也会讨论上下文膨胀、AI 代码审查、多 Agent 并行带来的认知负担，以及研发瓶颈向决策与组织流程转移等现实挑战。\n\n听众将获得一套适用于现有代码库和真实研发团队的 Agentic Development 实践框架，了解如何让 AI 从“辅助写代码的工具”，逐步转变为能够自主执行和验证任务的工程协作者。\n\n听众收获：\n理解 Vibe Coding 与 Frontier Development 的本质差异\n掌握让 AI Agent 长时间自主执行任务的五个关键习惯\n学习如何通过 Context、Spec 和自动化测试构建 Agent 反馈闭环\n了解多 Agent 并行开发的风险以及团队和组织层面的应对方式\n获得一套可在现有代码库中逐步落地的实践路径\n\n目标人群：\n使用或计划引入 AI 编程助手、Coding Agent 的软件开发者、技术负责人及研发管理者；希望从 Vibe Coding 进一步迈向 Agentic Development，并探索如何在现有代码库和真实团队中提升 AI Agent 自主执行能力的工程团队。' },
    slot: 'pm',
  },
  {
    id: 's-7',
    start: '16:20',
    end: '16:45',
    track: 'spark',
    type: 'SESSION',
    title: { zh: 'FDE服务案例：如何帮助集团化企业找到第一个可交付的场景' },
    room: { zh: '星火桥', en: 'Spark Bridge' },
    speakerIds: ['recvtARCV5aRgm'],
    speakerLabel: '尼克江',
    abstract: { zh: '随着大模型能力快速提升，企业AI落地的核心难题，正从“模型能不能做”转向“组织如何真正用起来”。本次分享将从FDE前线共创视角出发，结合事项督办、公文写作、简历筛选评价三个真实案例，拆解集团企业如何筛选首个AI场景，完成需求诊断、MVP试点、人机边界设计、业务验收与持续评测。分享还将介绍如何通过业务Skill和企业工作系统，让AI从演示工具进入真实业务流程，并将每次项目经验沉淀为可复用的Skill、模板、连接器和测试集。FDE的价值，不只是交付一个系统，而是让AI真正接住一段工作，并为企业持续积累可规模化复用的数字能力。' },
    slot: 'pm',
  },
  {
    id: 's-8',
    start: '16:45',
    end: '17:10',
    track: 'spark',
    type: 'SESSION',
    title: { zh: 'OPC如何才能实现更高收入天花板' },
    room: { zh: '星火桥', en: 'Spark Bridge' },
    speakerIds: ['recvrMEVppWXdn'],
    speakerLabel: '司强',
    abstract: { zh: '讲什么:OPC 如何解决活下来且能获得更高的收入机会\n为什么值得听：大多数Opc赚不到钱，或者沉浸在交付中但收入不高\n目标听众:OPC、职场想创业的人\n听众能带走的三个要点:\n绝大多数Opc如果想高收入 不可能既做流量又做销售又做交付又做营销，成为销售型Opc收入天花板更高、Opc要背靠大树而不是单打独斗' },
    slot: 'pm',
  },
  {
    id: 's-9',
    start: '17:10',
    end: '17:30',
    track: 'spark',
    type: 'SESSION',
    title: { zh: 'AI时代下，如何做好FDE工作' },
    room: { zh: '星火桥', en: 'Spark Bridge' },
    speakerIds: ['recvuIbssCKZNy'],
    speakerLabel: 'Bright Li',
    abstract: { zh: '议题详情即将公布。', en: 'Session details coming soon.' },
    slot: 'pm',
  },
  // ——— 下午 · Workshop（蓝）———
  {
    id: 'w-1',
    start: '13:30',
    end: '16:00',
    track: 'workshop',
    type: 'WORKSHOP',
    title: { zh: 'AI 掼蛋：用提示词驱动大模型玩转策略扑克' },
    room: { zh: 'Workshop 工作坊', en: 'Workshop' },
    speakerIds: [],
    abstract: { zh: 'AI 掼蛋是一款基于大语言模型的策略型扑克游戏平台，参与者通过编写自然语言策略提示词，驱动 Amazon Bedrock 上的大模型展开掼蛋对战，在趣味博弈中体验提示词工程，观察 AI 如何理解并执行你的出牌策略。同时，通过多桌并行对局与实时模型调用，了解 Lambda 与 DynamoDB 如何实现无需预置容量的弹性扩展，感受大模型的高并发推理能力，并结合 DynamoDB 单表设计、事件驱动、异步任务及 CDN 加速等实践，探索现代云原生应用的架构与开发模式。' },
    slot: 'pm',
  },
  {
    id: 'w-2',
    start: '13:30',
    end: '16:00',
    track: 'workshop',
    type: 'WORKSHOP',
    title: { zh: '亚马逊云科技 Agentic Football Cup' },
    room: { zh: 'Workshop 工作坊', en: 'Workshop' },
    speakerIds: [],
    abstract: { zh: '亚马逊云科技 Agentic 足球杯是一个免费的 Workshop，您可以在其中构建一个 AI 代理团队，将它们部署到 Amazon Bedrock AgentCore，并观看它们与其他团队进行实时 3D 足球比赛。您将使用Amazon Bedrock、Bedrock AgentCore、Strands Agents SDK 和 Kiro构建、破坏并重建一个可运行的多代理系统。这些并非沙盒工具——它们正是亚马逊云科技客户如今在生产环境中使用的技术栈。' },
    slot: 'pm',
  },
  {
    id: 'w-3',
    start: '13:30',
    end: '16:00',
    track: 'workshop',
    type: 'WORKSHOP',
    title: { zh: '使用 AgentCore + NVIDIA Nemotron 快速搭建 AI Agent：心情能量卡' },
    room: { zh: 'Workshop 工作坊', en: 'Workshop' },
    speakerIds: [],
    abstract: { zh: '画一个图案，抽一张属于你的心情能量卡！这个实验带你用 Amazon Bedrock AgentCore 和 NVIDIA Nemotron 模型，从部署到网页体验，快速搭建一个有趣的 AI Agent。不用写代码，也能跑完一个 Agent 应用从代码到上线的全过程。' },
    slot: 'pm',
  },
  {
    id: 'w-4',
    start: '15:00',
    end: '17:00',
    track: 'workshop',
    type: 'WORKSHOP',
    title: { zh: "Once Upon Agentic AI: A Developer's Epic Journey" },
    room: { zh: 'Workshop 工作坊', en: 'Workshop' },
    speakerIds: ['recvrRPJT805MG', 'recvqxemCPnVqt'],
    speakerLabel: 'Olivier Leplus · Haowen Huang',
    abstract: { zh: "This hands-on workshop teaches AI agent development through a Dungeons & Dragons adventure. Using Python and Strands Agents, AWS's open-source framework for building AI agents, you'll go from creating a single agent to running a team of agents that work together." },
    slot: 'pm',
  },
];

export interface DaySegment {
  id: string;
  time: string;
  label: LText;
  kind: 'main' | 'parallel';
  slot?: 'am' | 'pm';
  sessionIds?: string[];
}

/** The day's crossing route, left bank 09:00 → right bank 17:30. */
export const DAY_SEGMENTS: DaySegment[] = [
  { id: 'morning-main', time: '09:00', label: { zh: '上午 · 主论坛 MAIN BRIDGE', en: 'Morning · MAIN BRIDGE' }, kind: 'main', sessionIds: ['checkin', 'main-host', 'main-1', 'main-2', 'main-3', 'main-4', 'main-5'] },
  { id: 'lunch-break', time: '12:00', label: { zh: '午间 · 充电站 RECHARGE', en: 'Midday · RECHARGE' }, kind: 'main', sessionIds: ['lunch'] },
  { id: 'pm-parallel', time: '13:20', label: { zh: '下午 · 三座桥 + Workshop 并行 PARALLEL', en: 'Afternoon · PARALLEL TRACKS' }, kind: 'parallel', slot: 'pm' },
];

// ——— helpers ———

export function trackById(id: TrackId): Track {
  const resolved = id === 'builder' ? 'ai' : id;
  return TRACKS.find((t) => t.id === resolved) ?? TRACKS[0];
}

/**
 * 讲者在官网上的赛道：以议程里排到的分论坛为准（飞书「赛道」是 CFP 投稿方向，
 * 和最终分到的桥不一定一致）；没排进议程的回退到飞书值，旧 'builder' 并入 ai。
 */
export function scheduledTrack(speaker: Speaker): TrackId {
  const session = SESSIONS.find((s) => s.speakerIds.includes(speaker.id));
  if (session) return session.track;
  return TRACKS.some((t) => t.id === speaker.track) ? speaker.track : 'ai';
}

export function speakerById(id: string): Speaker | undefined {
  return SPEAKERS.find((s) => s.id === id);
}

export function sessionById(id: string): Session | undefined {
  return SESSIONS.find((s) => s.id === id);
}

export function sessionsBySpeaker(speakerId: string): Session[] {
  return SESSIONS.filter((s) => s.speakerIds.includes(speakerId));
}

export function sessionsByTrackSlot(track: TrackId, slot: 'am' | 'pm'): Session[] {
  return SESSIONS.filter((s) => s.track === track && s.slot === slot);
}

/** Workshop 按「开始–结束」时段分组（时段相同的并成一张卡），保持时间顺序。 */
export function groupByTime(sessions: Session[]): Session[][] {
  const groups = new Map<string, Session[]>();
  for (const s of [...sessions].sort((a, b) => a.start.localeCompare(b.start))) {
    const key = `${s.start}-${s.end}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return [...groups.values()];
}

export function sessionsByTrack(track: TrackId): Session[] {
  return SESSIONS.filter((s) => s.track === track);
}

export function speakersByIds(ids: string[]): Speaker[] {
  return ids.map((id) => speakerById(id)).filter((s): s is Speaker => Boolean(s));
}

/** Display name: en prefers the dedicated pinyin/English `nameEn` field. */
export function speakerName(speaker: Speaker, locale: Locale): string {
  return locale === 'en' && speaker.nameEn ? speaker.nameEn : pick(speaker.name, locale);
}

/** Is this segment happening right now (only meaningful on 2026-10-17)? */
export function isLiveSlot(time: string): boolean {
  const now = new Date();
  if (now.getFullYear() !== 2026 || now.getMonth() !== 9 || now.getDate() !== 17) return false;
  const [h, m] = time.split(':').map(Number);
  const start = h * 60 + m;
  const cur = now.getHours() * 60 + now.getMinutes();
  return cur >= start && cur < start + 90;
}

// ——— 加入日历 (ICS download) ———

export function downloadIcs(session: Session): void {
  const locale: Locale = i18n.language.startsWith('en') ? 'en' : 'zh';
  const dt = (t: string) => `20261017T${t.replace(':', '')}00`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//cdkit//${EVENT.slug}//CN`,
    'BEGIN:VEVENT',
    `UID:${session.id}@bridge-with-signal`,
    `DTSTAMP:${dt('00:00')}`,
    `DTSTART:${dt(session.start)}`,
    `DTEND:${dt(session.end)}`,
    `SUMMARY:${pick(session.title, locale)}`,
    `LOCATION:${pick(session.room, locale)}`,
    `DESCRIPTION:${pick(session.abstract, locale).replace(/\n/g, ' ')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bridge-with-signal-${session.id}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
