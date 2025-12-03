# Portfolio Manager - Development Guide

## Project Overview

Multi-platform portfolio management application for tracking investment transactions across multiple markets (US, Taiwan, Japan, Hong Kong). Built with Clean Architecture principles using Tauri (Rust backend) + React (TypeScript frontend) with styled-components.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Rust + Tauri v1.5
- **Styling**: styled-components (NO Tailwind CSS)
- **Icons**: lucide-react
- **Data Format**: CSV files
- **Storage**: File-based (Tauri app data directory)
- **Platform**: Desktop (macOS MVP, future Windows/iOS/Android)

## Project Structure (Clean Architecture)

```
portfolio/
├── desktop/
│   ├── src/                   # Frontend (Clean Architecture)
│   │   ├── components/        # Presentation Layer
│   │   │   ├── DataTable.tsx          # Filterable data table
│   │   │   ├── Navigation.tsx         # Navigation component
│   │   │   └── ui/
│   │   │       └── button.tsx
│   │   ├── pages/            # Page Components
│   │   │   ├── PortfolioPage.tsx     # Portfolio summary dashboard
│   │   │   ├── TransactionsPage.tsx  # Transaction history page
│   │   │   └── SettingsPage.tsx      # Settings page
│   │   ├── services/         # Business Logic Layer
│   │   │   ├── transactionService.ts # Transaction operations
│   │   │   ├── settingsService.ts    # Settings management
│   │   │   ├── priceService.ts       # Twelve Data price API with rate limiting
│   │   │   ├── priceDataService.ts   # CSV-based price storage
│   │   │   ├── fxRateService.ts      # Twelve Data FX rate API with caching
│   │   │   └── fxRateDataService.ts  # CSV-based FX rate storage
│   │   ├── hooks/            # Custom React Hooks
│   │   │   ├── useTransactions.ts    # Transaction state hook
│   │   │   ├── useSettings.ts        # Settings state hook
│   │   │   └── usePortfolio.ts       # Portfolio state hook
│   │   ├── types/            # Type Definitions
│   │   │   ├── Transaction.ts        # Transaction interfaces
│   │   │   ├── Settings.ts           # Settings interfaces
│   │   │   ├── Portfolio.ts          # Portfolio & Position interfaces
│   │   │   ├── PriceData.ts          # Price record interface
│   │   │   └── FxRateData.ts         # FX rate record interface
│   │   ├── utils/            # Utility Functions
│   │   │   ├── transactionStats.ts   # Stats calculations
│   │   │   ├── portfolioCalculations.ts # Position & P&L calculations
│   │   │   └── rateLimiter.ts        # Rate limiting & exponential backoff
│   │   ├── App.tsx                    # App shell with routing
│   │   ├── main.tsx
│   │   └── styles.css
│   ├── src-tauri/            # Backend
│   │   ├── src/
│   │   │   └── main.rs       # Commands: read_csv, get_setting, set_setting,
│   │   │                     # read_data_csv, write_data_csv, append_data_csv
│   │   └── Cargo.toml
│   ├── data/                 # Transaction CSVs (user-managed)
│   │   ├── US_Trx.csv, TW_Trx.csv, JP_Trx.csv, HK_Trx.csv
│   ├── package.json
│   └── vite.config.ts
├── requirements.md
└── CLAUDE.md
```

## Clean Architecture Layers

### 1. Presentation Layer (`components/`, `pages/`)
- **Responsibility**: UI components, user interaction
- **Files**:
  - `PortfolioPage.tsx` - Portfolio summary with live prices
  - `TransactionsPage.tsx` - Transaction history view
  - `SettingsPage.tsx` - API key configuration
  - `DataTable.tsx` - Filterable transaction table
  - `Navigation.tsx` - App navigation bar
- **Rules**: Only imports from hooks, types, and styled-components

### 2. Application Layer (`hooks/`)
- **Responsibility**: State management, side effects
- **Files**:
  - `useTransactions.ts` - Manages transaction loading/state
  - `useSettings.ts` - Manages settings loading/saving
  - `usePortfolio.ts` - Manages portfolio positions and price fetching
- **Rules**: Calls services, manages React state

### 3. Domain Layer (`types/`, `utils/`)
- **Responsibility**: Business logic, data models
- **Files**:
  - `types/Transaction.ts` - Transaction & Stats interfaces
  - `types/Settings.ts` - Settings interfaces
  - `types/Portfolio.ts` - Position & PortfolioSummary interfaces
  - `utils/transactionStats.ts` - Stats calculation logic
  - `utils/portfolioCalculations.ts` - Position calculations, P&L, cost basis
- **Rules**: Pure functions, no external dependencies

### 4. Infrastructure Layer (`services/`)
- **Responsibility**: External communication (Tauri, API, CSV storage)
- **Files**:
  - `transactionService.ts` - Tauri backend communication for transactions
  - `settingsService.ts` - Tauri backend communication for settings
  - `priceService.ts` - Twelve Data price API integration with smart caching & rate limiting
  - `priceDataService.ts` - CSV-based price storage (prices.csv)
  - `fxRateService.ts` - Twelve Data FX rate API integration with smart caching & rate limiting
  - `fxRateDataService.ts` - CSV-based FX rate storage (fx_rates.csv)
- **Rules**: Handles invoke calls, error handling, data transformation, smart caching

## Data Architecture

### CSV Files
Each market has a separate CSV file:
- `US_Trx.csv` → USD (NASDAQ, NYSE)
- `TW_Trx.csv` → TWD (Taiwan Stock Exchange)
- `JP_Trx.csv` → JPY (Tokyo Stock Exchange)
- `HK_Trx.csv` → HKD (Hong Kong Stock Exchange)

### Twelve Data API Integration

**Purpose**: Fetch **last close prices** and **FX rates** (not real-time) for portfolio valuation

**Services**:
- [priceService.ts](desktop/src/services/priceService.ts) - Price API client with rate limiting
- [priceDataService.ts](desktop/src/services/priceDataService.ts) - CSV-based price storage
- [fxRateService.ts](desktop/src/services/fxRateService.ts) - FX rate API client with rate limiting
- [fxRateDataService.ts](desktop/src/services/fxRateDataService.ts) - CSV-based FX rate storage

**Architecture**:
```
User clicks "Update Prices"
    ↓
priceService checks priceDataService for cached data (yesterday's close)
    ↓
If cached → Use it (no API call)
    ↓
If missing → Fetch from Twelve Data API
    ↓
Save to prices.csv (~/Library/Application Support/.../data/prices.csv)
    ↓
Display in UI
```

**Key Features**:
- ✅ **CSV-based storage** - All prices saved to `prices.csv` for offline use
- ✅ **Smart caching** - Only fetches if data missing for target date (yesterday)
- ✅ **Rate limiting** - Max 30 concurrent requests
- ✅ **Exponential backoff** - Handles 429 rate limits automatically (1s, 2s, 4s, 8s, 16s)
- ✅ **Retry logic** - Retries on 5xx errors with exponential backoff
- ✅ **Last close price** - Uses previous day's closing price (not real-time)

**Key Methods**:
```typescript
// Get last close price for a single stock (cached or fetched)
await priceService.getLastClosePrice('NASDAQ:AAPL');
// → Checks cache → Fetches if needed → Saves to CSV → Returns price

// Get quote with full details (always fetches)
await priceService.getQuote('NASDAQ:AAPL');

// Batch fetch prices for multiple stocks (smart caching)
await priceService.getBatchPrices(['NASDAQ:AAPL', 'TPE:2330', 'TYO:7203']);
// → Checks cache for each → Only fetches missing → Saves to CSV
```

**Stock Symbol Format**:
- US: `NASDAQ:AAPL`, `NYSE:MSFT`, `NYSEARCA:VTI` ✅ Twelve Data free tier
- Taiwan: `2330:TWSE` ⚠️ Uses cached data only (requires Twelve Data PRO)
- Japan: `7203:JPX` ✅ AlphaVantage API (symbol converted to `7203.T` format)
- Hong Kong: `0700:HKEX` → Converted to `HKEX:0700` ✅ Twelve Data free tier

**API Integrations**:
- **Twelve Data**: US stocks (NASDAQ, NYSE, NYSEARCA), Hong Kong (HKEX)
- **AlphaVantage**: Japan stocks (JPX) - Uses TIME_SERIES_DAILY endpoint
- **Cache-only**: Taiwan stocks (TWSE)

**FX Rate Methods**:
```typescript
// Get exchange rate for a currency pair (cached or fetched)
await fxRateService.getExchangeRate('USD', 'JPY');
// → Checks cache → Fetches if needed → Saves to CSV → Returns rate

// Batch fetch rates for multiple pairs (smart caching)
await fxRateService.getBatchRates([
  { from: 'USD', to: 'JPY' },
  { from: 'TWD', to: 'USD' },
  { from: 'HKD', to: 'USD' }
]);
// → Checks cache for each → Only fetches missing → Saves to CSV
```

**API Key Required**: Configure in Settings page

**Free Tier**: 800 requests/day

**Rate Limiting Strategy**:
- Max 30 concurrent requests
- Automatic retry on 429 (rate limit) with exponential backoff
- Automatic retry on 5xx (server errors) with exponential backoff
- Uses `Retry-After` header when available

**API Credits Tracking**:
- Both priceService and fxRateService track API credits from response headers
- Headers used: `api-credits-used` and `api-credits-left`
- Total credits calculated as: `used + remaining`
- Real-time updates via listener pattern
- Status bar displays: remaining credits, percentage, and last update time
- Color-coded progress bar: green (>50%), yellow (>25%), red (≤25%)

### CSV Data Storage (prices.csv)

**Location**: `~/Library/Application Support/com.portfolio.manager/data/prices.csv`

**Purpose**:
- Store all historical price data for offline use
- Enable easy export/import for backup
- Reduce API calls by caching prices

**CSV Format**:
```csv
symbol,date,close,open,high,low,volume,source,updated_at
NASDAQ:AAPL,2024-12-02,180.25,178.50,181.00,177.80,52340100,twelve_data,2024-12-03T10:30:00.000Z
TPE:2330,2024-12-02,625.00,620.00,628.00,618.00,25000000,twelve_data,2024-12-03T10:30:15.000Z
```

**Fields**:
- `symbol` - Stock symbol with exchange prefix (e.g., NASDAQ:AAPL)
- `date` - Price date (YYYY-MM-DD)
- `close` - Closing price
- `open` - Opening price (optional)
- `high` - High price (optional)
- `low` - Low price (optional)
- `volume` - Trading volume (optional)
- `source` - Data source (twelve_data or manual)
- `updated_at` - When the data was saved (ISO 8601)

**Backend Commands**:
```rust
// Read CSV data
read_data_csv(filename: String) -> Result<String, String>

// Write CSV data (overwrites)
write_data_csv(filename: String, content: String) -> Result<(), String>

// Append to CSV data
append_data_csv(filename: String, content: String) -> Result<(), String>
```

**Frontend Usage**:
```typescript
// Load all prices
const prices = await priceDataService.loadAllPrices();

// Get latest price for a symbol
const price = await priceDataService.getLatestPrice('NASDAQ:AAPL');

// Get price for specific date
const price = await priceDataService.getPriceByDate('NASDAQ:AAPL', '2024-12-02');

// Get latest prices for multiple symbols
const prices = await priceDataService.getLatestPrices(['NASDAQ:AAPL', 'TPE:2330']);

// Save prices (merges with existing)
await priceDataService.savePrices(newPrices);
```

### CSV Data Storage (fx_rates.csv)

**Location**: `~/Library/Application Support/com.portfolio.manager/data/fx_rates.csv`

**Purpose**:
- Store all historical FX rates for offline use
- Enable easy export/import for backup
- Reduce API calls by caching rates
- Fetch once per date per currency pair

**CSV Format**:
```csv
from_currency,to_currency,date,rate,source,updated_at
USD,JPY,2024-12-02,150.25,twelve_data,2024-12-03T10:30:00.000Z
TWD,USD,2024-12-02,0.0312,twelve_data,2024-12-03T10:30:15.000Z
HKD,USD,2024-12-02,0.1282,twelve_data,2024-12-03T10:30:20.000Z
```

**Fields**:
- `from_currency` - Source currency code (e.g., USD, JPY, TWD)
- `to_currency` - Target currency code (e.g., USD, JPY, TWD)
- `date` - Rate date (YYYY-MM-DD) - uses t-1 (yesterday)
- `rate` - Exchange rate (how much 1 unit of from_currency equals in to_currency)
- `source` - Data source (twelve_data or manual)
- `updated_at` - When the data was saved (ISO 8601)

**Frontend Usage**:
```typescript
// Load all FX rates
const rates = await fxRateDataService.loadAllRates();

// Get latest rate for a currency pair
const rate = await fxRateDataService.getLatestRate('USD', 'JPY');

// Get rate for specific date
const rate = await fxRateDataService.getRateByDate('USD', 'JPY', '2024-12-02');

// Save rates (merges with existing)
await fxRateDataService.saveRates(newRates);
```

**Smart Caching Workflow**:
```
User requests portfolio valuation
    ↓
fxRateService checks fxRateDataService for cached rate (yesterday's rate)
    ↓
If cached → Use it (no API call)
    ↓
If missing → Fetch from Twelve Data API (https://api.twelvedata.com/exchange_rate)
    ↓
Save to fx_rates.csv
    ↓
Return rate for calculations
```

### Settings Storage

**Storage Method**: CSV file in data directory

**Location**: `desktop/src-tauri/data/settings.csv`

**Format**:
```csv
key,value
app_settings,{"twelveDataApiKey":"YOUR_TWELVE_DATA_KEY","alphaVantageApiKey":"YOUR_ALPHAVANTAGE_KEY"}
```

**Why CSV instead of localStorage**:
- ✅ **Security**: LocalStorage is not available in Tauri desktop apps
- ✅ **Persistence**: File storage survives app updates
- ✅ **Version control**: Can be gitignored to keep API keys private
- ✅ **Easy backup**: Single file contains all settings
- ✅ **Human-readable**: Can be edited manually if needed

**API Keys Configuration**:
- **Twelve Data API Key**: Get from [twelvedata.com](https://twelvedata.com) - Used for US and HK stocks
- **AlphaVantage API Key**: Get from [alphavantage.co](https://www.alphavantage.co/support/#api-key) - Used for Japan stocks
- Configure in Settings page or directly edit `settings.csv`

**Backend Commands**:
```rust
// Get setting by key (reads from settings.csv)
get_setting(key: String) -> Result<String, String>

// Save setting (writes to settings.csv)
set_setting(key: String, value: String) -> Result<(), String>
```

**Frontend Usage**:
```typescript
// In settingsService.ts
await invoke('get_setting', { key: 'app_settings' });
await invoke('set_setting', { key: 'app_settings', value: JSON.stringify(settings) });
```

**IMPORTANT**: The `desktop/src-tauri/data/` directory is gitignored to prevent committing API keys and sensitive data.

## Key Features

### 1. Portfolio Dashboard (PortfolioPage.tsx)
- **Current holdings summary** - View all open positions
- **Last close prices** - Cached yesterday's closing prices (not real-time)
- **Gain/Loss calculations** - Automatic P&L calculation per position
- **Currency breakdown** - Portfolio value by currency with donut chart
- **Position details** - Shares, cost basis, current value, gains
- **Refresh prices** - Smart fetch (cached or API) with rate limiting
- **Top positions chart** - Bar chart showing top 5 holdings
- **Sorting** - Click any column header to sort (asc/desc)
- **Filtering** - Search by ticker, filter by currency, show gainers/losers
- **Visual charts** - Allocation donut chart & top positions bar chart

### 2. Transactions (TransactionsPage.tsx)
- Transaction statistics by type (Buy/Sell/Dividend)
- Transaction statistics by currency (USD/TWD/JPY/HKD)
- Filterable/sortable data table
- Real-time stats calculation
- Search and filter capabilities

### 3. Settings (SettingsPage.tsx)
- Twelve Data API key configuration
- Show/hide API key toggle
- Secure file-based storage
- Success/error feedback

### 4. Navigation (Navigation.tsx)
- Portfolio, Transactions, and Settings tabs
- Active state indicator
- Keyboard accessible

### 5. Data Table (DataTable.tsx)
- Search by stock, type, or date
- Filter by currency (USD/TWD/JPY/HKD/All)
- Filter by type (Buy/Sell/Dividend/All)
- Sort by any column (click header)
- Result counter
- Empty state handling

## Styling Guidelines

### Use styled-components (NOT Tailwind)

```typescript
// Good
const Card = styled.div`
  padding: 2rem;
  border-radius: 12px;
`;

// Bad - DO NOT USE
<div className="p-8 rounded-xl">
```

### Color Palette

**Currency Colors**:
- USD: `#2563eb` (blue)
- TWD: `#dc2626` (red)
- JPY: `#16a34a` (green)
- HKD: `#fb923c` (orange)

**Transaction Type Colors**:
- Buy: `#16a34a` (green)
- Sell: `#dc2626` (red)
- Dividend: `#2563eb` (blue)

**UI Colors**:
- Primary gradient: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- Background: `radial-gradient(circle at top, #ede9fe 0%, #f8fafc 60%)`

## Development Commands

```bash
cd desktop

# Install dependencies
npm install

# Development mode (hot reload)
npm run tauri:dev

# Type checking
npm run lint

# Production build
npm run tauri:build
```

## Adding New Features

### Adding a New Market

1. **Add CSV file**: `desktop/data/XX_Trx.csv`
2. **Update backend** ([main.rs:60](desktop/src-tauri/src/main.rs#L60)):
   ```rust
   let files = vec![
     ("US_Trx.csv", "USD"),
     ("TW_Trx.csv", "TWD"),
     ("JP_Trx.csv", "JPY"),
     ("HK_Trx.csv", "HKD"),
     ("XX_Trx.csv", "XXX"), // Add here
   ];
   ```
3. **Add currency color** ([DataTable.tsx:284](desktop/src/components/DataTable.tsx#L284)):
   ```typescript
   const colors: Record<string, string> = {
     USD: '#2563eb',
     TWD: '#dc2626',
     JPY: '#16a34a',
     HKD: '#fb923c',
     XXX: '#yourcolor', // Add here
   };
   ```
4. **Update stats** ([transactionStats.ts](desktop/src/utils/transactionStats.ts)):
   ```typescript
   export interface TransactionStats {
     // ... existing
     xxx: number; // Add here
   }

   // In calculateTransactionStats:
   xxx: transactions.filter(t => t.currency === 'XXX').length,
   ```

### Adding a New Page

1. **Create page** in `src/pages/`:
   ```typescript
   // src/pages/NewPage.tsx
   export function NewPage() {
     return <div>New Page</div>;
   }
   ```

2. **Update App.tsx**:
   ```typescript
   const [currentPage, setCurrentPage] = useState<'dashboard' | 'settings' | 'new'>('dashboard');

   {currentPage === 'dashboard' && <DashboardPage />}
   {currentPage === 'settings' && <SettingsPage />}
   {currentPage === 'new' && <NewPage />}
   ```

3. **Update Navigation.tsx** to add nav button

### Adding a New Tauri Command

**Backend** ([main.rs](desktop/src-tauri/src/main.rs)):
```rust
#[tauri::command]
fn your_command(param: &str) -> Result<String, String> {
  Ok("result".to_string())
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      greet, read_csv, get_setting, set_setting, your_command
    ])
    .run(tauri::generate_context!())
    .expect("error");
}
```

**Frontend Service**:
```typescript
// src/services/yourService.ts
import { invoke } from '@tauri-apps/api/tauri';

export class YourService {
  async callCommand(param: string): Promise<string> {
    return await invoke<string>('your_command', { param });
  }
}
```

## Code Conventions

### File Naming
- Components: PascalCase (e.g., `DashboardPage.tsx`)
- Services: camelCase (e.g., `transactionService.ts`)
- Hooks: camelCase with `use` prefix (e.g., `useSettings.ts`)
- Types: PascalCase (e.g., `Transaction.ts`)

### Component Structure
```typescript
// 1. Imports
import { useState } from 'react';
import styled from 'styled-components';
import { YourType } from '../types/YourType';
import { useYourHook } from '../hooks/useYourHook';

// 2. Styled components
const Container = styled.div`
  // styles
`;

// 3. Component
export function YourComponent() {
  // Hooks
  const { data } = useYourHook();

  // State
  const [state, setState] = useState('');

  // Handlers
  const handleClick = () => {};

  // Render
  return <Container>...</Container>;
}
```

### Service Structure
```typescript
// 1. Imports
import { invoke } from '@tauri-apps/api/tauri';
import { YourType } from '../types/YourType';

// 2. Service class
export class YourService {
  async loadData(): Promise<YourType> {
    const result = await invoke<string>('your_command');
    return JSON.parse(result);
  }
}

// 3. Singleton export
export const yourService = new YourService();
```

### Hook Structure
```typescript
// 1. Imports
import { useState, useEffect } from 'react';
import { YourType } from '../types/YourType';
import { yourService } from '../services/yourService';

// 2. Hook function
export function useYourHook() {
  const [data, setData] = useState<YourType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await yourService.loadData();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch: loadData };
}
```

## Troubleshooting

### Build Errors
- **Rust errors**: Check `Cargo.toml` dependencies
- **TypeScript errors**: Run `npm run lint`
- **Import errors**: Check file paths and exports

### Data Not Loading
1. Check CSV files in `data/` directory
2. Verify `read_csv` command registration
3. Check browser console for errors

### Settings Not Saving
1. Verify `get_setting` and `set_setting` commands are registered
2. Check Tauri app data directory permissions
3. Look for errors in console

## Best Practices

1. **Follow Clean Architecture** - Keep layers separated
2. **Use services for external calls** - Never call `invoke` directly from components
3. **Use hooks for state management** - Keep components pure
4. **Type everything** - Use TypeScript interfaces
5. **Use styled-components** for styling (no Tailwind)
6. **Handle errors gracefully** - Always show loading/error states
7. **Keep components small** - Single responsibility
8. **Test across all markets** (US, TW, JP, HK)

## Git Commit Format

```
fix: description of change

# Examples:
fix: fix settings storage path issue
feat: add Twelve Data API key configuration
refactor: extract transaction service logic
```

**Rules**:
- Use lowercase for type prefix
- No "Claude Code" in commits
- Remove trailing spaces
- Be concise and clear

## Security Notes

### API Key Storage
- ✅ Stored in OS-specific app data directory (not in code)
- ✅ File permissions managed by OS
- ✅ Not committed to git
- ✅ Can be manually deleted by user

### Future Enhancements
- Consider encrypting API keys at rest
- Add API key validation before saving
- Implement key rotation mechanism
