import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/** GSAP back.out(1.4) ≈ cubic-bezier(0.34, 1.3, 0.64, 1) */
const BACK_OUT: [number, number, number, number] = [0.34, 1.3, 0.64, 1];

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** accessible dialog label */
  label: string;
  children: ReactNode;
}

/**
 * Shared detail modal (design.md §5.8): rgba(20,20,20,0.72) overlay, paper
 * panel + 3px ink border + 12px hard shadow, max-width 720px. Entrance:
 * scale 0.94→1 + translateY 24→0 (280ms back.out). Close via × capsule,
 * overlay click or Esc; body scroll is locked while open.
 */
export default function Modal({ open, onClose, label, children }: ModalProps) {
  const { t } = useTranslation('schedule');
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
        >
          <button
            type="button"
            aria-label={t('modal.closeAria')}
            className="absolute inset-0 cursor-default bg-[rgba(20,20,20,0.72)]"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className="relative max-h-[85dvh] w-full max-w-[720px] overflow-y-auto rounded-lg border-[3px] border-ink bg-paper p-6 shadow-hard-xl md:p-9"
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10, transition: { duration: 0.15 } }}
            transition={{ duration: 0.28, ease: BACK_OUT }}
          >
            <button
              type="button"
              aria-label={t('modal.close')}
              onClick={onClose}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-ink bg-white font-mono text-lg font-bold leading-none text-ink shadow-hard-sm transition-[transform,box-shadow,background-color] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-signal"
            >
              ×
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
