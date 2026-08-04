import AppLayout from '@/components/AppLayout';
import PdfBrowserContent from './components/PdfBrowserContent';

export default function PdfBrowserPage() {
  return (
    <AppLayout activePath="/">
      <PdfBrowserContent />
    </AppLayout>
  );
}