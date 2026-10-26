import { Link } from 'react-router';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'red' | 'secondary' | 'ghost';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full border-[3px] border-ink font-sans font-bold transition-[transform,box-shadow,background-color] duration-150 ease-out select-none';

const variants: Record<Variant, string> = {
  /** ink fill + yellow text — main actions */
  primary:
    'bg-ink px-7 py-3 text-signal shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-2',
  /** signal red fill + white text — conversion actions only (报名/投稿) */
  red: 'bg-spark px-7 py-3 text-white shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-2',
  /** outlined, fills yellow on hover */
  secondary:
    'bg-transparent px-7 py-3 text-ink shadow-hard hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-signal hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-2',
  /** text + arrow, arrow nudges right on hover (signal pulse meaning) */
  ghost: 'border-none bg-transparent px-0 py-0 font-mono text-sm font-medium tracking-wide text-ink',
};

interface ButtonProps {
  variant?: Variant;
  to?: string;
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  type?: 'button' | 'submit';
}

/** Buttons per design.md §5.2 — hard shadow + physical press feedback. */
export default function Button({ variant = 'primary', to, href, onClick, children, className, type = 'button' }: ButtonProps) {
  const cls = cn(base, variants[variant], className);
  if (to) {
    return (
      <Link to={to} className={cls} onClick={onClick}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={cls} onClick={onClick} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
        {children}
      </a>
    );
  }
  return (
    <button type={type} className={cls} onClick={onClick}>
      {children}
    </button>
  );
}

/** Ghost link with the pulse-arrow (design.md §5.2). */
export function GhostLink({ to, children, className, dark = false }: { to: string; children: ReactNode; className?: string; dark?: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        'group inline-flex items-center gap-2 font-mono text-sm font-medium uppercase tracking-[0.12em]',
        dark ? 'text-signal' : 'text-ink',
        className,
      )}
    >
      <span className="underline decoration-2 underline-offset-4">{children}</span>
      <span aria-hidden="true" className="inline-block transition-transform duration-300 group-hover:translate-x-1.5">
        →
      </span>
    </Link>
  );
}
