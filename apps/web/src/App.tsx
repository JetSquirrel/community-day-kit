import { Routes, Route, Navigate } from 'react-router'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Schedule from '@/pages/Schedule'
import Speakers from '@/pages/Speakers'
import Volunteers from '@/pages/Volunteers'
import VolunteerPortal from '@/pages/VolunteerPortal'
import Faq from '@/pages/Faq'
import Past from '@/pages/Past'
import NotFound from '@/pages/NotFound'
import AdminLogin from '@/pages/admin/AdminLogin'
import AdminCallback from '@/pages/admin/AdminCallback'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import Renaissance from '@/pages/Renaissance'
import Cfp from '@/pages/Cfp'
import Sponsors from '@/pages/Sponsors'
import { PHASE } from '@/lib/site'

/**
 * Routing contract: Layout renders <Outlet/>, so all pages are nested child
 * routes of the layout route (react-dev.md pattern B — never mix).
 * Exception: /admin/* renders without the marketing chrome on purpose.
 * i18n: zh keeps unprefixed paths; en mirrors the same tree under /en.
 * 征稿 /cfp 与赞助 /sponsors 按 event.yaml 的日期自动开关（见 lib/site.ts PHASE）；
 * 关闭后旧链接（海报二维码等）重定向回首页。
 */
const marketingRoutes = (
  <>
    <Route index element={<Home />} />
    <Route path="schedule" element={<Schedule />} />
    <Route path="speakers" element={<Speakers />} />
    <Route path="cfp" element={PHASE.cfpOpen ? <Cfp /> : <Navigate to=".." replace />} />
    <Route path="sponsors" element={PHASE.sponsorsOpen ? <Sponsors /> : <Navigate to=".." replace />} />
    <Route path="volunteers" element={<Volunteers />} />
    <Route path="volunteer/portal" element={<VolunteerPortal />} />
    <Route path="faq" element={<Faq />} />
    <Route path="past" element={<Past />} />
    <Route path="*" element={<NotFound />} />
  </>
)

export default function App() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/callback" element={<AdminCallback />} />
      {/* 彩蛋页（主页三连击吉祥物进入）：独立路由，不带 Navbar/Footer chrome */}
      <Route path="/renaissance" element={<Renaissance />} />
      <Route path="/en/renaissance" element={<Renaissance />} />
      <Route element={<Layout />}>{marketingRoutes}</Route>
      <Route path="en" element={<Layout />}>{marketingRoutes}</Route>
    </Routes>
  )
}
