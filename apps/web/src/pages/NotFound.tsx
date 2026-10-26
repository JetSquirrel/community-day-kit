import { useTranslation } from 'react-i18next';
import PlaceholderPage from '@/components/PlaceholderPage';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <PlaceholderPage
      sig="404"
      label={t('notFound.label')}
      title={t('notFound.title')}
      note={t('notFound.note')}
      accent="#FF4D3D"
      memphis="zigzag"
    />
  );
}
