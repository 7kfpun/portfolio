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

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
`;

export function ReportPage() {
    const { reportSubPage } = useNavigationStore();

    const renderPage = () => {
        switch (reportSubPage) {
            case 'positions':
                return <PositionsPage />;
            case 'heatmaps':
                return <HeatmapsPage />;
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