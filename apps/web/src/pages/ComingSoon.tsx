import { useTranslation } from 'react-i18next';
import PlaceholderPage from '@/components/PlaceholderPage';

/**
 * Interim page for sections whose content is not public yet (currently only
 * /schedule — the real agenda is still being finalized).
 * Restore the real page in App.tsx once the content is ready.
 */
export default function ComingSoon() {
  const { t } = useTranslation();
  return (
    <PlaceholderPage
      sig="SOON"
      label={t('comingSoon.label')}
      title={t('comingSoon.title')}
      note={t('comingSoon.note')}
      memphis="ring"
    />
  );
}
