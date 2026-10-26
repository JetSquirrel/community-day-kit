# 飞书 → S3 内容同步（讲师 / 赞助商）

内容更新不再需要重新打包。编辑在飞书多维表格里改数据，Lambda 把表格同步成
S3 上的 JSON，前端运行时拉取并热替换，约 1 分钟内全站生效。

```
飞书多维表格 ──(定时 5min / 表格自动化 webhook)──> Lambda ──> S3 content/*.json ──> 前端运行时 fetch
                                                              ↑ 失败时前端用打包内置数据兜底
```

## 1. 飞书侧准备

1. [飞书开放平台](https://open.feishu.cn/)创建**企业自建应用**，拿到 `App ID` / `App Secret`。
2. 应用权限添加 `bitable:app:readonly`（查看多维表格），发布版本。
3. 建一个多维表格，内含两张数据表（列名必须完全一致）：

   **讲师表** —— 单行文本除非另注：

   | 列名 | 类型 | 说明 |
   |---|---|---|
   | ID | 文本 | slug，如 `lin-xiaofeng`，也用作 `/speakers#id` 锚点 |
   | 姓名 | 文本 | |
   | 英文名 | 文本 | 空则同姓名 |
   | 缩写 | 文本 | 两个字母，几何头像用；空则自动推导 |
   | 公司 / 职位 | 文本 | |
   | 赛道 | 单选 | 选项必须是 `keynote` `ai` `builder` `spark` `global` |
   | 主推 | 复选框 | 勾选后排版为 2 列大卡 |
   | 议题 / 简介 | 文本 | |
   | 社交链接 | 多行文本 | 每行一条：`GitHub https://…` |
   | 展示 | 复选框 | 勾选才同步——未勾选即草稿 |

   可选英文列（缺列或留空时静默跳过，对应字段输出纯中文字符串；有值则输出 `{ zh, en }`）：
   `英文公司` `英文职位` `英文议题` `英文简介`。讲师姓名不设英文列——英文展示用 `英文名` 字段。

   **赞助商表** ——

   | 列名 | 类型 | 说明 |
   |---|---|---|
   | ID | 文本 | 可空 |
   | 名称 | 文本 | 可空——为空时回退到「公司」列（报名表两用：站内赞助表单只写「公司」） |
   | 公司 | 文本 | 站内赞助表单写入 |
   | 官网 | 超链接 | 可空 |
   | Logo | 文本 | 图片 URL（sponsor-logo-mailer 会自动回写 CDN 地址） |
   | 展示 | 复选框 | 勾选才同步 |

   2026 秋起赞助商报名表兼作展示表（同一张表）：审核「通过」→ sponsor-logo-mailer
   回写 Logo URL → 组委会补 ID/官网（必要时补「名称」）并勾选「展示」即上站。

4. 把应用**添加为多维表格协作者**（表格右上角「···」→ 更多 → 添加文档应用），否则 API 读不到。
5. 从表格 URL 取 `app_token` 和两张表的 `table_id`：
   `https://xxx.feishu.cn/base/{app_token}?table={table_id}&view=...`

## 2. 部署（SAM）

```bash
cd lambda/feishu-content-sync
sam build
sam deploy --guided   # 按提示填入 6 个参数（App ID/Secret、app_token、两个 table_id、SyncToken 随机串）
```

部署完看 Outputs：

- `ContentBaseUrl` → 到 Amplify 控制台 → 应用 → 环境变量，加
  `VITE_CONTENT_BASE_URL=<该值>`，**重新部署一次**（此后内容更新再也不需要部署）。
- `SyncEndpoint` → 即时同步地址。

无 SAM 时的替代：`zip -j function.zip index.mjs mapping.mjs`，在 Lambda 控制台建
`nodejs20.x` 函数上传，手动配同名环境变量、S3 桶与 Function URL。

## 3. 触发方式（已默认配好）

- **定时**：EventBridge 每 5 分钟同步一次（template.yaml 里 `rate(5 minutes)`，可改）。
- **即时**：多维表格 → 自动化 → 新建流程 → 触发器「记录新增/修改」→ 动作「发送 HTTP 请求」→
  POST 到 `SyncEndpoint?token=<SyncToken>`。保存后改数据秒级生效。

手动验证：

```bash
curl -X POST "<SyncEndpoint>?token=<SyncToken>"
# {"ok":true,"speakers":12,"partners":3}
```

## 4. 本地改动

- 字段映射逻辑：`mapping.mjs`（纯函数），改完跑 `node mapping.test.mjs`。
- 前端内容协议：`src/lib/content.ts`（`Speaker[]` / `Partner[]`，变更需两侧同步）。
- 赞助商墙上还有一份**打包内置名单** `src/components/sponsors/currentPartnersData.ts`
  （logo 在 `public/partners/`，无需同步即可上站）；同名条目以线上 sponsors.json
  为准，线上独有的条目追加在后。名单变动时改这份文件即可。
