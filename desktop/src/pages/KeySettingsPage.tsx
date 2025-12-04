import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useSettingsStore } from '../store/settingsStore';
import { Eye, EyeOff, Save, Key, DollarSign } from 'lucide-react';
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

const InputContainer = styled.div`
  position: relative;
  display: flex;
  gap: 0.5rem;
`;

const Input = styled.input`
  flex: 1;
  padding: 0.75rem 3rem 0.75rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: all 150ms ease;
  font-family: 'Monaco', 'Courier New', monospace;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  &::placeholder {
    color: #94a3b8;
    font-family: inherit;
  }
`;

const ToggleButton = styled.button`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 150ms ease;

  &:hover {
    color: #475569;
  }

  &:focus-visible {
    outline: 2px solid rgba(102, 126, 234, 0.6);
    outline-offset: 2px;
    border-radius: 4px;
  }
`;

const Button = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  font-size: 0.95rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid rgba(102, 126, 234, 0.6);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const SuccessMessage = styled.div`
  padding: 1rem;
  background: #dcfce7;
  border: 1px solid #86efac;
  border-radius: 8px;
  color: #166534;
  font-size: 0.9rem;
  margin-top: 1rem;
`;

const ErrorMessage = styled.div`
  padding: 1rem;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 8px;
  color: #991b1b;
  font-size: 0.9rem;
  margin-top: 1rem;
`;

const InfoBox = styled.div`
  padding: 1rem;
  background: #e0e7ff;
  border: 1px solid #a5b4fc;
  border-radius: 8px;
  color: #3730a3;
  font-size: 0.875rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;

  a {
    color: #4f46e5;
    text-decoration: underline;
    font-weight: 600;

    &:hover {
      color: #4338ca;
    }
  }
`;

export function KeySettingsPage() {
  const settings = useSettingsStore(state => state.settings);
  const loading = useSettingsStore(state => state.loading);
  const updateSettings = useSettingsStore(state => state.updateSettings);
  const loadSettings = useSettingsStore(state => state.loadSettings);

  const [apiKeyTwelveData, setApiKeyTwelveData] = useState(settings.apiKeyTwelveData);
  const [apiKeyMassive, setApiKeyMassive] = useState(settings.apiKeyMassive);
  const [baseCurrency, setBaseCurrency] = useState(settings.baseCurrency);
  const [showTwelveData, setShowTwelveData] = useState(false);
  const [showMassive, setShowMassive] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    setApiKeyTwelveData(settings.apiKeyTwelveData);
    setApiKeyMassive(settings.apiKeyMassive);
    setBaseCurrency(settings.baseCurrency);
  }, [settings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveMessage(null);
      await updateSettings({
        apiKeyTwelveData,
        apiKeyMassive,
        baseCurrency,
      });
      setSaveMessage({
        type: 'success',
        text: 'Settings saved successfully!',
      });

      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save settings',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <Card>
          <p style={{ textAlign: 'center', color: '#64748b' }}>Loading settings...</p>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Meta>Configuration</Meta>
        <Title>API Keys & Settings</Title>
        <Description>Manage your API keys and application preferences</Description>
      </Header>

      <Card>
        <Section>
          <SectionTitle>
            <Key size={24} />
            Twelve Data API
          </SectionTitle>
          <SectionDescription>
            Configure your Twelve Data API key to fetch stock prices for US and Hong Kong markets.
          </SectionDescription>

          <InfoBox>
            Don't have an API key?{' '}
            <a
              href="https://twelvedata.com/pricing"
              target="_blank"
              rel="noopener noreferrer"
            >
              Sign up at Twelve Data
            </a>{' '}
            to get a free API key with 800 requests per day.
          </InfoBox>

          <FormGroup>
            <Label htmlFor="apiKeyTwelveData">API Key</Label>
            <InputContainer>
              <Input
                id="apiKeyTwelveData"
                type={showTwelveData ? 'text' : 'password'}
                value={apiKeyTwelveData}
                onChange={e => setApiKeyTwelveData(e.target.value)}
                placeholder="Enter your Twelve Data API key"
                autoComplete="off"
              />
              <ToggleButton
                type="button"
                onClick={() => setShowTwelveData(!showTwelveData)}
                aria-label={showTwelveData ? 'Hide API key' : 'Show API key'}
              >
                {showTwelveData ? <EyeOff size={18} /> : <Eye size={18} />}
              </ToggleButton>
            </InputContainer>
          </FormGroup>
        </Section>

        <Section>
          <SectionTitle>
            <Key size={24} />
            Massive API
          </SectionTitle>
          <SectionDescription>
            Configure your Massive.com API key (previously Polygon.io). Currently Japan and Taiwan stocks use cached data only.
          </SectionDescription>

          <InfoBox>
            Note: Polygon.io free tier only supports US stocks. Japan (JPX) and Taiwan (TWSE) stocks currently require manual price updates.
            Learn more at{' '}
            <a
              href="https://polygon.io"
              target="_blank"
              rel="noopener noreferrer"
            >
              Polygon.io
            </a>
          </InfoBox>

          <FormGroup>
            <Label htmlFor="apiKeyMassive">API Key</Label>
            <InputContainer>
              <Input
                id="apiKeyMassive"
                type={showMassive ? 'text' : 'password'}
                value={apiKeyMassive}
                onChange={e => setApiKeyMassive(e.target.value)}
                placeholder="Enter your Massive API key"
                autoComplete="off"
              />
              <ToggleButton
                type="button"
                onClick={() => setShowMassive(!showMassive)}
                aria-label={showMassive ? 'Hide API key' : 'Show API key'}
              >
                {showMassive ? <EyeOff size={18} /> : <Eye size={18} />}
              </ToggleButton>
            </InputContainer>
          </FormGroup>
        </Section>

        <Section>
          <SectionTitle>
            <DollarSign size={24} />
            Base Currency
          </SectionTitle>
          <SectionDescription>
            Select your preferred base currency for portfolio calculations and display.
          </SectionDescription>
          <CurrencySelector
            value={baseCurrency}
            onChange={setBaseCurrency}
            showIcon={false}
          />
        </Section>

        <Button
          onClick={handleSave}
          disabled={saving}
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>

        {saveMessage && (
          <>
            {saveMessage.type === 'success' ? (
              <SuccessMessage>{saveMessage.text}</SuccessMessage>
            ) : (
              <ErrorMessage>{saveMessage.text}</ErrorMessage>
            )}
          </>
        )}
      </Card>
    </Container>
  );
}
