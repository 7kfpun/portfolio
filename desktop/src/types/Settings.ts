export type CurrencyType =
  | 'AED' | 'ARS' | 'AUD' | 'AZN' | 'BGN' | 'BHD' | 'BND' | 'BRL'
  | 'CAD' | 'CHF' | 'CLP' | 'CNY' | 'CZK' | 'DKK' | 'EGP' | 'EUR'
  | 'FJD' | 'GBP' | 'HKD' | 'HUF' | 'IDR' | 'ILS' | 'INR' | 'JPY'
  | 'KRW' | 'KWD' | 'LKR' | 'MAD' | 'MGA' | 'MXN' | 'MYR' | 'NOK'
  | 'NZD' | 'OMR' | 'PEN' | 'PGK' | 'PHP' | 'PKR' | 'PLN' | 'RUB'
  | 'SAR' | 'SBD' | 'SCR' | 'SEK' | 'SGD' | 'THB' | 'TOP' | 'TRY'
  | 'TWD' | 'TZS' | 'USD' | 'VEF' | 'VND' | 'VUV' | 'WST' | 'XOF' | 'ZAR';

export interface AppSettings {
  baseCurrency: CurrencyType;
  privacyMode?: boolean;
}
