import { Suspense, lazy } from 'react';
import styled from 'styled-components';
import { useNavigationStore } from '../store/navigationStore';

const LoadingCard = styled.div`
  padding: 2rem;
  color: #475569;
  font-size: 0.9rem;
`;

const PositionsPage = lazy(() =>
    import('./PositionsPage').then(module => ({ default: module.PositionsPage }))
);

const HeatmapsPage = lazy(() =>
    import('./HeatmapsPage').then(module => ({ default: module.HeatmapsPage }))
);

const DividendsPage = lazy(() =>
    import('./DividendsPage').then(module => ({ default: module.DividendsPage }))
);

const Container = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  box-sizing: border-box;
`;

export function ReportPage() {
    const { reportSubPage } = useNavigationStore();

    const renderPage = () => {
        switch (reportSubPage) {
            case 'positions':
                return <PositionsPage />;
            case 'heatmaps':
                return <HeatmapsPage />;
            case 'dividends':
                return <DividendsPage />;
            default:
                return <PositionsPage />;
        }
    };

    return (
        <Container>
            <Suspense fallback={<LoadingCard>Loading report section...</LoadingCard>}>
                {renderPage()}
            </Suspense>
        </Container>
    );
}
