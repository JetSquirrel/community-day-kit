import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AdminApiError, login } from '@/lib/adminApi';

/**
 * /admin/callback — Feishu redirects here with ?code&state; we exchange the
 * code for an admin session. 403 responses carry the user's open_id, forwarded
 * to the login page for the allowlist bootstrap.
 */
export default function AdminCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return; // code is single-use — never exchange twice
    once.current = true;
    const code = params.get('code') ?? '';
    const state = params.get('state') ?? '';
    login(code, state)
      .then(() => navigate('/admin', { replace: true }))
      .catch((e) => {
        const msg = e instanceof Error ? e.message : '登录失败';
        const openId = e instanceof AdminApiError ? (e.data?.openId ?? '') : '';
        navigate(`/admin/login?error=${encodeURIComponent(msg)}&openid=${encodeURIComponent(openId)}`, { replace: true });
      });
  }, [params, navigate]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-paper">
      <p className="font-mono text-sm tracking-[0.18em] text-ink/60">登录中…</p>
    </div>
  );
}
