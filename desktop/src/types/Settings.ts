export type CurrencyType = 'USD' | 'TWD' | 'JPY' | 'HKD';

export interface AppSettings {
  apiKeyTwelveData: string;
  apiKeyMassive: string;
  baseCurrency: CurrencyType;
}
