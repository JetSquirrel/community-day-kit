# community-day-kit

AWS Community Day 一站式脚手架。**一份 `event.yaml` 生成整届活动**：官网、报名 / 材料 / 发信后端、倒排运营计划，以及一组接入 Claude（Amazon Bedrock）的 AI 助手。

基于 2026 秋 · 深圳（Bridge with Signal）的代码和 8 次筹备会纪要重构，重点修掉了三个问题：

| 2026 秋的问题 | 现在 |
|---|---|
| 讲者照片规格不一，海报生成器用不上 | 上传前先展示拍摄要求 → 浏览器内 4:5 裁剪 → 服务端复核尺寸 → AI 检查质量并返回人脸位置 |
| PPT 全靠人工 review | 上传前先展示 PPT 规范 → 程序检查 + AI 逐条预审 → 讲者提交前就拿到修改建议 |
| 飞书改状态就自动发录用信，需要 18 位讲者却发出 29 封 | **改状态 ≠ 发信**。发信台：生成批次 → 按赛道名额校验 → 输入人数确认 → 幂等发送 |

（各届的复盘文档放在 `docs/LESSONS-*.md`，含内部会议内容，不提交到仓库。）

---

## 快速开始：开一届新活动

```bash
npm install
cp .env.example .env                     # 填写 FEISHU_APP_ID / FEISHU_APP_SECRET 等

# 1. 复制上一届，所有截止日期按新活动日整体平移（注释、赛道、名额、规范全部继承）
npm run cdkit -- new 2027-spring-hangzhou --from 2026-autumn-shenzhen --date 2027-04-17 --city "中国 · 杭州"

# 2. 编辑 events/2027-spring-hangzhou/event.yaml：名称 / 场地 / 赛道名额 / 团队
npm run cdkit -- check 2027-spring-hangzhou

# 3. 建飞书多维表格（缺表建表、缺列补列，表 ID 自动写回 event.yaml）
npm run cdkit -- feishu:init 2027-spring-hangzhou --apply

# 4. 倒排计划：out/<slug>/plan.csv（导入飞书项目总表）、plan.ics（日历）、plan.md
npm run cdkit -- plan 2027-spring-hangzhou --push

# 5. 本地看官网
npm run cdkit -- use 2027-spring-hangzhou
npm ci --prefix apps/web && npm run dev --prefix apps/web
```

上线：在 Amplify 控制台给分支设置环境变量 `CDKIT_EVENT=2027-spring-hangzhou`，配置 Secrets（见下文），推送即部署。同一个仓库可以用不同分支同时托管多届官网。

---

## 目录

```
events/<slug>/event.yaml      每届唯一的配置（schema：packages/core/src/schema.ts）
events/<slug>/site/           每届的站点覆盖层：public/（KV、og 图、二维码、logo）、locales/（文案覆盖）
playbook/*.yaml               倒排运营手册：里程碑 / 推文排期 / 设计物料（D-N 偏移，换届自动重算）

packages/core                 配置 schema 与业务校验、倒排计划、名额校验
packages/outbox               发信台：批次计划 / 审批 / 幂等发送 / 催交提醒 / 邮件模板
packages/media                照片规格检查与裁剪计算、PPTX 零依赖解析与确定性预审
packages/ai                   Claude on Bedrock：照片审核、PPT 预审、CFP 预审、纪要转待办、文案
packages/feishu               飞书多维表格客户端 + 表结构定义
cli/                          cdkit 命令行

backend/amplify/              Amplify Gen2 后端
  functions/admin-api         管理后台 API + 公开报名表单（沿用 2026 秋，发信入口改接发信台）
  functions/portal            讲者 / 赞助商材料页（规范先行、S3 直传、程序检查 + AI 预审）
  functions/outbox            发信台 Lambda（审批发送 + 每日 10:00 催交提醒）
backend/content-sync/         飞书 → S3 内容同步（SAM，沿用 2026 秋）
apps/web/                     官网 + 管理后台（React + Vite，2026 秋站点模板化）
docs/                         复盘与说明
```

## cdkit 命令

| 命令 | 作用 |
|---|---|
| `new <slug> --from <上一届> --date YYYY-MM-DD [--city] [--name]` | 复制上一届配置与站点覆盖层，日期整体平移，清空飞书表 ID |
| `check <slug>` | 校验结构与业务自洽（日期倒挂、国庆假期内的终稿、名额为 0、会场不存在……） |
| `plan <slug> [--push]` | 生成倒排计划（CSV / ICS / MD），`--push` 写入飞书项目总表（按 ID 去重，不覆盖状态） |
| `use <slug>` | 切换当前活动：生成 `apps/web` 与 `backend` 的 `event.generated.json` |
| `feishu:init <slug> [--apply]` | 按 schema 检查 / 创建多维表格与字段 |
| `outbox:preview <slug> [--template cfp-accept]` | 只读预演：现在发录用信会发给谁、名额是否超出（评审会上核对用） |
| `ai:cfp <slug> [--write]` | 每条投稿生成 AI 摘要 / 建议赛道 / 风险 / 相似投稿 / 标题建议 |
| `minutes <slug> <纪要.md 或目录…> [--push]` | 飞书智能纪要 → 待办（负责人归一、日期换算）+ 决定 + 待决问题 + 需同步的配置变化 |
| `copy tweet <slug> <推文 id>` | 按 playbook 中的推文和当前嘉宾 / 议程数据生成推文初稿 |
| `copy xhs <slug> --count 200` | 小红书打卡文案池（分批生成、去重） |
| `copy speakers <slug> [--write]` | 嘉宾资料润色 + 英译，写回嘉宾表英文列 |

## 关键流程

### 讲者：投稿 → 录用 → 材料

```
官网投稿 ──► 飞书「投稿」表（待审核）
               │  cdkit ai:cfp --write：AI 摘要 / 建议赛道 / 风险（评审参考，不打分）
               ▼
           评审打分，改状态：通过 / 候补 / 拒绝          ← 这一步不发任何邮件
               ▼
 后台「发信台」① 生成批次：名单 + 赛道名额表 + 邮件预览
             ② 输入本批人数确认（超额须填理由）
             ③ 发送（DynamoDB 台账幂等，一人一类邮件只发一次）→ 状态：已通知
               ▼
 讲者打开材料页：先看照片 / PPT 规范 → 裁剪上传照片、上传 PPT
             → 程序检查 + AI 预审报告（可反复替换）→ 提交 → 状态：已确认，同步嘉宾表
             → 或点「无法出席」→ 已婉拒，释放名额给候补
               ▼
 每天 10:00：缺照片 / 缺初稿 / 缺终稿 / 未确认 → 按 event.yaml reminders 自动提醒
```

### 换一届要改什么

| 内容 | 位置 |
|---|---|
| 名称、主题、日期、城市、域名、场地与会场、赛道与名额、截止日期、材料规范、提醒规则、飞书表、团队 | `events/<slug>/event.yaml` |
| 主 KV、og 图、公众号二维码、合作伙伴 logo、赞助方案 PDF | `events/<slug>/site/public/`（覆盖 `apps/web/public` 同名文件） |
| 首页标语、FAQ 交通、往届回顾等文案 | `events/<slug>/site/locales/<zh|en>/<ns>.json`（只写需要改的键，深合并） |
| 视觉风格（桥 / 孟菲斯是 2026 秋的主题） | `apps/web/src/components/home/*` 等主题组件，见 [docs/WEB-TEMPLATE.md](docs/WEB-TEMPLATE.md) |

## 部署配置

**Secrets**（Amplify 控制台 → Secrets；本地 `npx ampx sandbox secret set <NAME>`）：
`FEISHU_APP_SECRET`、`SESSION_SECRET`（≥16 位随机串）、`CONFIRM_SECRET`（≥16 位随机串，签名材料页链接）、`EMAIL_KEY`

**环境变量**：`CDKIT_EVENT`（必填）、`FEISHU_APP_ID`、`EMAIL_LINK`（生产必填）、`TEST_TO`（生产必须为空）、`ALLOWED_EMAILS` / `ALLOWED_OPEN_IDS`（后台白名单）、`CONTENT_SYNC_FUNCTION`、`VITE_CONTENT_BASE_URL`

**Bedrock**：在 `event.yaml ai.region` 对应区域开通 Claude 模型访问（默认 `anthropic.claude-opus-5-5` 用于 PPT / CFP / 纪要，`anthropic.claude-haiku-5-5` 用于照片与批量文案）。不需要 AI 时设 `ai.enabled: false`，程序检查照常工作。

## 开发

```bash
npm test                    # 核心逻辑单测（名额校验、发信幂等、倒排计划、照片 / PPT 检查、换届复制）
npm run typecheck           # packages + cli
npm run typecheck -w backend
npm run build --prefix apps/web
```

## 从 2026 秋仓库迁移

- `admin-api` 原样迁入；`/api/notify`、`/api/volunteers/notify` 返回 410，改为 `/api/outbox/plan|send|release`。
- `cfp-accept-mailer` / `sponsor-logo-mailer` / `volunteer-accept-mailer` 三个每 5 分钟轮询的发信函数**已移除**，由 `outbox` + `portal` 取代。
- 投稿表状态新增「候补」「已婉拒」；嘉宾表新增「联合讲者」「照片焦点」；投稿表新增 AI 列与 PPT 初稿 / 终稿列。运行 `cdkit feishu:init --apply` 自动补列。
- 志愿者指引页链接格式不变（兼容旧 token）。
