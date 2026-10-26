# 官网模板（apps/web）：哪些自动、哪些每届要改

`apps/web` 是 2026 秋「Bridge with Signal」官网的模板化版本：React 19 + Vite 7 + Tailwind，带中英双语和管理后台。

## 已由 event.yaml 驱动（换届不改代码）

| 内容 | 实现 |
|---|---|
| 活动名、主题、日期（含星期）、城市、域名、联系邮箱、报名链接 | `src/lib/site.ts`（`SITE`） |
| `<title>` / description / og 文案 | `vite.config.ts` 中的 `transformIndexHtml`；i18n `common.site.*` / `common.meta.*` 在 `src/i18n/index.ts` 注入 |
| 赛道（名称、颜色、英文副标题、编号） | `src/components/schedule/data.ts`（`TRACKS`） |
| 征稿 / 赞助入口开关、导航项 | `PHASE`：按 `deadlines.cfpOpen ~ cfpClose`、`sponsorMaterials` 自动计算；关闭后旧链接重定向到首页 |
| 首页日期 chip、信息栏日期与地址、CFP FAQ 截止日 | `Hero.tsx`、`InfoSection.tsx` |
| 推文物料文案、海报底部日期城市、讲师海报 kicker | `PromoPanel.tsx`、`lib/poster.ts` |
| 志愿者指引页抬头 | `VolunteerPortal.tsx` |
| 管理后台「发信台」 | `pages/admin/OutboxPanel.tsx` |

## 每届通过覆盖层修改（`events/<slug>/site/`）

```
events/<slug>/site/
  public/                  覆盖 apps/web/public 的同名文件：og-cover.png、qr-wechat.png、partners/*.png、sponsorship-deck.pdf…
  locales/zh/home.json     只写要改的键，深合并到 src/i18n/locales/zh/home.json
  locales/en/faq.json      ……
```

基础文案里仍有本届内容的 JSON（适合用覆盖层改）：`common.json`（footer 版权行）、`home.json`、`cfp.json`、`sponsors.json`、`volunteers.json`、`past.json`。

## 仍写在组件里的内容（主题 / 内容耦合，按需改或替换主题）

这些是 2026 秋视觉主题（「桥」+ 孟菲斯）和本届具体内容，每届通常都会随新 KV 重做：

| 文件 | 内容 |
|---|---|
| `components/home/*`（Hero、BridgeBuilder、NoiseToSignal、Ticker、Tracks） | 桥主题动效与文案 |
| `components/faq/FaqExplorer.tsx` | FAQ 正文（含场地交通的详细描述） |
| `components/schedule/data.ts` 的 `SESSIONS`、`HEADLINER_IDS` | 2026 秋最终议程（内置）与头牌嘉宾 ID → 计划改为由飞书「议程」表同步 |
| `components/sponsors/currentPartnersData.ts`、`pastPartnersData.ts` | 合作伙伴兜底名单（线上以飞书同步为准） |
| `components/past/Gallery.tsx`、`Timeline.tsx` | 往届回顾 |
| `components/volunteers/Roles.tsx`、`DayTimeline.tsx` | 志愿者岗位与当日时间线 |
| `pages/Renaissance.tsx` | 彩蛋页 |

建议做法：新一届先 `cdkit new` + 覆盖层上线「预热版」（日期、赛道、征稿入口都已正确），视觉主题与 KV 定稿后再替换 `components/home` 等主题组件。
