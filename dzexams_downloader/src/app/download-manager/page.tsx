import AppLayout from '@/components/AppLayout';
import DownloadManagerContent from './components/DownloadManagerContent';

export default function DownloadManagerPage() {
  return (
    <AppLayout activePath="/download-manager">
      <DownloadManagerContent />
    </AppLayout>
  );
}