import { useState } from 'react';
import { SettingsLayout } from '../components/SettingsLayout';
import { KeySettingsPage } from './KeySettingsPage';
import { DataReadinessPage } from './DataReadinessPage';

export function SettingsPage() {
  const [currentPage, setCurrentPage] = useState<'keys' | 'data-readiness'>('keys');

  return (
    <SettingsLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {currentPage === 'keys' && <KeySettingsPage />}
      {currentPage === 'data-readiness' && <DataReadinessPage />}
    </SettingsLayout>
  );
}
