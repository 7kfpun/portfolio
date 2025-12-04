import { Suspense, lazy, useState } from 'react';
import { SettingsLayout } from '../components/SettingsLayout';
import styled from 'styled-components';

const LoadingCard = styled.div`
  padding: 2rem;
  color: #475569;
  font-size: 0.9rem;
`;

const KeySettingsPage = lazy(() =>
  import('./KeySettingsPage').then(module => ({ default: module.KeySettingsPage }))
);
const DataReadinessPage = lazy(() =>
  import('./DataReadinessPage').then(module => ({ default: module.DataReadinessPage }))
);
const CurrencyDataPage = lazy(() =>
  import('./CurrencyDataPage').then(module => ({ default: module.CurrencyDataPage }))
);

export function SettingsPage() {
  const [currentPage, setCurrentPage] = useState<'keys' | 'data-readiness' | 'currency-data'>('keys');

  const renderPage = () => {
    switch (currentPage) {
      case 'keys':
        return <KeySettingsPage />;
      case 'data-readiness':
        return <DataReadinessPage />;
      case 'currency-data':
        return <CurrencyDataPage />;
      default:
        return null;
    }
  };

  return (
    <SettingsLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      <Suspense fallback={<LoadingCard>Loading section...</LoadingCard>}>
        {renderPage()}
      </Suspense>
    </SettingsLayout>
  );
}
