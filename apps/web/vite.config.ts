import path from "path"
import { cpSync, existsSync, readFileSync, statSync } from "fs"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"
import { inspectAttr } from 'plugin-inspect-react-code'

/**
 * 当前活动由 `npm run cdkit -- use <slug>` 写入 src/event.generated.json。
 * 每届的差异放在 events/<slug>/site/ 覆盖层，不改模板代码：
 *   site/public/**                  覆盖 / 追加静态资源（KV、og 图、二维码、合作伙伴 logo…）
 *   site/locales/<lng>/<ns>.json    深合并覆盖 src/i18n/locales 下的同名文案
 */
const generated = path.resolve(__dirname, 'src/event.generated.json')
if (!existsSync(generated)) {
  throw new Error('缺少 src/event.generated.json —— 先在仓库根目录运行：npm run cdkit -- use <slug>')
}
const EVENT = JSON.parse(readFileSync(generated, 'utf8'))
const slug: string = EVENT.slug
const zh = (v: string | { zh: string }) => (typeof v === 'string' ? v : v.zh)
const en = (v: string | { zh: string; en?: string }) => (typeof v === 'string' ? v : v.en || v.zh)
const htmlEsc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const HTML_VARS: Record<string, string> = {
  CDKIT_TITLE: `${en(EVENT.slogan)} — ${zh(EVENT.name)}`,
  CDKIT_DESCRIPTION: `${en(EVENT.slogan)} · ${zh(EVENT.slogan)} — ${zh(EVENT.name)}。${EVENT.date.replace(/-/g, '.')}，${EVENT.expectedAttendees}+ 开发者，${EVENT.tracks.length} 个分论坛。`,
  CDKIT_OG_DESCRIPTION: `${zh(EVENT.slogan)}。${EVENT.date.replace(/-/g, '.')} · ${zh(EVENT.city)}`,
}
const overlay = path.resolve(__dirname, '../../events', slug, 'site')
const overlayPublic = path.join(overlay, 'public')

/** dev：覆盖层 public 优先；build：产物写完后把覆盖层 public 叠加进 dist */
function eventOverlay(): Plugin {
  let outDir = 'dist'
  return {
    name: 'cdkit-event-overlay',
    configResolved(c) {
      outDir = path.resolve(c.root, c.build.outDir)
    },
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = decodeURIComponent((req.url ?? '').split('?')[0])
        const file = path.join(overlayPublic, url)
        if (url !== '/' && file.startsWith(overlayPublic) && existsSync(file) && statSync(file).isFile()) {
          req.url = `/@fs/${file.replace(/\\/g, '/')}`
        }
        next()
      })
    },
    transformIndexHtml(html) {
      return html.replace(/%(CDKIT_[A-Z_]+)%/g, (m, k: string) => (k in HTML_VARS ? htmlEsc(HTML_VARS[k]) : m))
    },
    closeBundle() {
      if (existsSync(overlayPublic)) cpSync(overlayPublic, outDir, { recursive: true })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [
    // Dev-only: injects inspect attributes; never ship to production bundles.
    ...(mode === 'development' ? [inspectAttr()] : []),
    react(),
    eventOverlay(),
  ],
  server: {
    port: 3000,
    fs: { allow: [path.resolve(__dirname, '../..')] },
  },
  resolve: {
    alias: {
      "@event": overlay,
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
