# 站点覆盖层 · 2026-autumn-shenzhen

- `public/`：覆盖 / 追加 `apps/web/public` 的静态资源（og 图、公众号二维码、合作伙伴 logo、赞助方案 PDF）。
- `locales/<zh|en>/<namespace>.json`：只写需要改的键，深合并到 `apps/web/src/i18n/locales` 的同名文件。
  例：`locales/zh/home.json` → `{ "hero": { "lede": "……" } }`

详见 docs/WEB-TEMPLATE.md。
