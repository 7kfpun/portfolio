import { CurrencyType } from '../types/Settings';

export interface CurrencyInfo {
    code: CurrencyType;
    symbol: string;
    name: string;
    color: string;
}

export const CURRENCIES: CurrencyInfo[] = [
    { code: 'AED', symbol: 'د.إ', name: 'United Arab Emirates Dirham', color: '#64748b' },
    { code: 'ARS', symbol: '$', name: 'Argentine Peso', color: '#64748b' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', color: '#0284c7' },
    { code: 'AZN', symbol: '₼', name: 'Azerbaijani Manat', color: '#64748b' },
    { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev', color: '#64748b' },
    { code: 'BHD', symbol: '.د.б', name: 'Bahraini Dinar', color: '#64748b' },
    { code: 'BND', symbol: 'B$', name: 'Brunei Dollar', color: '#64748b' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', color: '#64748b' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', color: '#c026d3' },
    { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', color: '#be123c' },
    { code: 'CLP', symbol: '$', name: 'Chilean Peso', color: '#64748b' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', color: '#ea580c' },
    { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', color: '#64748b' },
    { code: 'DKK', symbol: 'kr', name: 'Danish Krone', color: '#64748b' },
    { code: 'EGP', symbol: '£', name: 'Egyptian Pound', color: '#64748b' },
    { code: 'EUR', symbol: '€', name: 'Euro', color: '#8b5cf6' },
    { code: 'FJD', symbol: 'FJ$', name: 'Fiji Dollar', color: '#64748b' },
    { code: 'GBP', symbol: '£', name: 'Pound Sterling', color: '#0891b2' },
    { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', color: '#fb923c' },
    { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', color: '#64748b' },
    { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', color: '#64748b' },
    { code: 'ILS', symbol: '₪', name: 'Israeli New Shekel', color: '#64748b' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee', color: '#64748b' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen', color: '#16a34a' },
    { code: 'KRW', symbol: '₩', name: 'South Korean Won', color: '#7c3aed' },
    { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar', color: '#64748b' },
    { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', color: '#64748b' },
    { code: 'MAD', symbol: 'د.م.', name: 'Moroccan Dirham', color: '#64748b' },
    { code: 'MGA', symbol: 'Ar', name: 'Malagasy Ariary', color: '#64748b' },
    { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso', color: '#64748b' },
    { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', color: '#64748b' },
    { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', color: '#64748b' },
    { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', color: '#64748b' },
    { code: 'OMR', symbol: 'ر.ع.', name: 'Omani Rial', color: '#64748b' },
    { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', color: '#64748b' },
    { code: 'PGK', symbol: 'K', name: 'Papua New Guinean Kina', color: '#64748b' },
    { code: 'PHP', symbol: '₱', name: 'Philippine Peso', color: '#64748b' },
    { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', color: '#64748b' },
    { code: 'PLN', symbol: 'zł', name: 'Polish Złoty', color: '#64748b' },
    { code: 'RUB', symbol: '₽', name: 'Russian Ruble', color: '#64748b' },
    { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal', color: '#64748b' },
    { code: 'SBD', symbol: 'SI$', name: 'Solomon Islands Dollar', color: '#64748b' },
    { code: 'SCR', symbol: '₨', name: 'Seychelles Rupee', color: '#64748b' },
    { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', color: '#64748b' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', color: '#059669' },
    { code: 'THB', symbol: '฿', name: 'Thai Baht', color: '#64748b' },
    { code: 'TOP', symbol: 'T$', name: 'Tongan Paʻanga', color: '#64748b' },
    { code: 'TRY', symbol: '₺', name: 'Turkish Lira', color: '#64748b' },
    { code: 'TWD', symbol: 'NT$', name: 'New Taiwan Dollar', color: '#dc2626' },
    { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', color: '#64748b' },
    { code: 'USD', symbol: '$', name: 'United States Dollar', color: '#2563eb' },
    { code: 'VEF', symbol: 'Bs', name: 'Venezuelan Bolívar', color: '#64748b' },
    { code: 'VND', symbol: '₫', name: 'Vietnamese Đồng', color: '#64748b' },
    { code: 'VUV', symbol: 'VT', name: 'Vanuatu Vatu', color: '#64748b' },
    { code: 'WST', symbol: 'WS$', name: 'Samoan Tala', color: '#64748b' },
    { code: 'XOF', symbol: 'CFA', name: 'CFA Franc BCEAO', color: '#64748b' },
    { code: 'ZAR', symbol: 'R', name: 'South African Rand', color: '#64748b' },
];

// Map of currency code to symbol for quick lookup
export const CURRENCY_SYMBOLS: Record<CurrencyType, string> = CURRENCIES.reduce((acc, curr) => {
    acc[curr.code] = curr.symbol;
    return acc;
}, {} as Record<CurrencyType, string>);

// Map of currency code to color for quick lookup
export const CURRENCY_COLORS: Record<string, string> = CURRENCIES.reduce((acc, curr) => {
    acc[curr.code] = curr.color;
    return acc;
}, {} as Record<string, string>);

// Get currency info by code
export function getCurrencyInfo(code: CurrencyType): CurrencyInfo | undefined {
    return CURRENCIES.find(c => c.code === code);
}

// Get currency color with fallback
export function getCurrencyColor(currency: string): string {
    return CURRENCY_COLORS[currency] || '#64748b'; // gray fallback
}

// Get all currency codes
export const CURRENCY_CODES = CURRENCIES.map(c => c.code);

// Generate currency pairs from USD to all other currencies (excluding USD itself)
export const CURRENCY_PAIRS = CURRENCIES
    .filter(c => c.code !== 'USD')
    .map(c => ({ from: 'USD' as CurrencyType, to: c.code }));
