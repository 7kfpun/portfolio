import { useEffect } from 'react';
import styled from 'styled-components';
import { useSettingsStore } from '../store/settingsStore';
import { DollarSign } from 'lucide-react';
import { Container, Header, Meta, Title, Description, Card } from '../components/PageLayout';
import { CurrencySelector } from '../components/CurrencySelector';

const Section = styled.div`
  margin-bottom: 2rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SectionDescription = styled.p`
  color: #64748b;
  font-size: 0.9rem;
  margin: 0 0 1.5rem 0;
  line-height: 1.6;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #475569;
  margin-bottom: 0.5rem;
`;

const Message = styled.div<{ $type: 'success' | 'error' | 'info' }>`
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  margin-top: 1rem;
  display: flex;
  align-items: start;
  gap: 0.5rem;

  ${({ $type }) => {
    if ($type === 'success') return `
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
    `;
    if ($type === 'error') return `
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    `;
    return `
      background: #eff6ff;
      color: #1e40af;
      border: 1px solid #bfdbfe;
    `;
  }}
`;

export function KeySettingsPage() {
  const { settings, loading, error, loadSettings, updateSettings } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleCurrencyChange = async (newCurrency: 'USD' | 'TWD' | 'JPY' | 'HKD') => {
    try {
      await updateSettings({
        ...settings,
        baseCurrency: newCurrency,
      });
    } catch (err) {
      console.error('Failed to save currency:', err);
    }
  };

  if (loading) {
    return (
      <Container>
        <Header>
          <Meta>CONFIGURATION</Meta>
          <Title>Settings</Title>
          <Description>Configure your portfolio preferences</Description>
        </Header>
        <Card>Loading...</Card>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Meta>CONFIGURATION</Meta>
        <Title>Settings</Title>
        <Description>Configure your portfolio preferences</Description>
      </Header>

      <Card>
        <Section>
          <SectionTitle>
            <DollarSign size={20} />
            Base Currency
          </SectionTitle>
          <SectionDescription>
            Select your preferred base currency for portfolio calculations and display. All portfolio values will be converted to this currency using FX rates.
          </SectionDescription>

          <FormGroup>
            <Label htmlFor="baseCurrency">Default Currency</Label>
            <CurrencySelector
              value={settings.baseCurrency}
              onChange={handleCurrencyChange}
            />
          </FormGroup>
        </Section>

        {error && <Message $type="error">{error}</Message>}
      </Card>
    </Container>
  );
}
