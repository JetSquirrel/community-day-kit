import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { adminConfigured, fetchAuthUrl, getSession } from '@/lib/adminApi';

/**
 * /admin/login — Feishu SSO entry. A 403 from the callback lands back here
 * with ?openid=… so the operator can add it to ALLOWED_OPEN_IDS (README §3).
 */
export default function AdminLogin() {
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!adminConfigured) {
    return (
      <AdminShell title="管理后台">
        <p className="text-sm leading-relaxed text-paper-dim">
          未配置 <code className="font-mono text-ink">VITE_ADMIN_API_URL</code>。请先部署
          <code className="font-mono text-ink">amplify/functions/admin-api</code> 并在 Amplify 环境变量中设置该值。
        </p>
      </AdminShell>
    );
  }
  if (getSession()) return <Navigate to="/admin" replace />;

  const errorMsg = params.get('error');
  const openId = params.get('openid');

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      window.location.href = await fetchAuthUrl();
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取登录地址失败');
      setLoading(false);
    }
  };

  return (
    <AdminShell title="管理后台">
      {errorMsg && (
        <div className="mb-5 rounded-lg border-[3px] border-ink bg-[#FF4D3D]/10 p-4 text-sm leading-relaxed text-ink">
          <p className="font-bold">{errorMsg}</p>
          {openId && (
            <p className="mt-2">
              你的 open_id：<code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">{openId}</code>
              <br />
              第一次打开请把 open_id 发给「邓添」加白名单，完成后重新登录。
            </p>
          )}
        </div>
      )}
      {error && <p className="mb-5 text-sm font-bold text-[#FF4D3D]">{error}</p>}
      <button
        onClick={start}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg border-[3px] border-ink bg-signal px-6 py-3.5 font-sans text-base font-bold text-ink shadow-hard transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-60"
      >
        {loading ? '正在跳转飞书…' : '使用飞书登录'}
      </button>
      <p className="mt-4 text-center font-mono text-xs tracking-[0.12em] text-ink/50">仅限组委会成员 · FEISHU SSO</p>
    </AdminShell>
  );
}

/** Centered brand card shared by the login states. */
function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-paper px-5">
      <div className="w-full max-w-[420px] rounded-lg border-[3px] border-ink bg-white p-8 shadow-hard">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-[#6C3FD4]">ADMIN // BRIDGE WITH SIGNAL</p>
        <h1 className="mb-6 mt-2 font-sans text-2xl font-black text-ink">{title}</h1>
        {children}
      </div>
    </div>
  );
}
