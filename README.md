# Portfolio Manager

A cross-platform desktop application for tracking and managing multi-market investment portfolios (US, Taiwan, Japan, Hong Kong) with a privacy-first CSV storage model.

![Portfolio Manager](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![React](https://img.shields.io/badge/React-18-61dafb)
![Tauri](https://img.shields.io/badge/Tauri-1.5-ffc131)

## Features

- **Multi-market support** for USD, TWD, JPY, and HKD transactions
- **Portfolio heatmap** TradingView-style visualization with stock-level performance tracking and daily gain/loss data
- **Currency conversion** - Select base currency and toggle to convert all portfolio values on the fly
- **Advanced filtering** for both transactions and holdings (search, currency, type, gainers/losers, sorting)
- **Portfolio analytics** with currency allocation donut and top-holdings bar chart
- **Price caching** that fetches last-close data with rate limiting, exponential backoff, and CSV persistence
- **Offline-friendly CSV storage** for transactions, prices, FX rates, securities, and settings
- **Modern UI** powered by React, styled-components, Zustand state management, and Lucide icons
- **Git hooks** with Husky for pre-commit linting and testing

## Screenshots

### Dashboard View
Transaction statistics with breakdowns by type and currency

### Data Table
Sortable, filterable table with search functionality

### Portfolio Overview
Interactive charts plus refined tables with filters for holdings

## Installation

### Prerequisites

- Node.js 22+ ([Download](https://nodejs.org/))
- Rust 1.70+ ([Install](https://rustup.rs/))
- Tauri prerequisites for your platform ([Setup Guide](https://tauri.app/v1/guides/getting-started/prerequisites))

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd portfolio/desktop
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Run in development mode**
   ```bash
   npm run tauri:dev
   ```
4. **Build for production**
   ```bash
   npm run tauri:build
   ```
   The packaged application is generated under `src-tauri/target/release/`.

## Usage

### Adding Transaction Data

Place your broker CSV exports inside `desktop/data/` before launching the app:

- `US_Trx.csv` - US market transactions (USD)
- `TW_Trx.csv` - Taiwan market transactions (TWD)
- `JP_Trx.csv` - Japan market transactions (JPY)
- `HK_Trx.csv` - Hong Kong market transactions (HKD)

Each CSV should follow this schema:

```csv
Date,Stock,Type,Quantity,Transacted Price (per unit),Fees,Stock Split Ratio
2024-01-15,NASDAQ:AAPL,Buy,10,150.00,1.00,1
2024-02-20,NASDAQ:MSFT,Sell,5,380.00,1.00,1
2024-03-10,NASDAQ:GOOGL,Dividend,0,2.50,0,1
```

### Price and FX Cache

The application mirrors Twelve Data results into CSV files under the OS-specific Tauri app data directory (for example, `~/Library/Application Support/com.kfpun.portfolio/data` on macOS). The following files are created automatically:

- `prices.csv` – last close prices per symbol with OHLC data
- `fx_rates.csv` – cached FX rates (future use)
- `securities.csv` – security metadata (future use)
- `settings.csv` – serialized application preferences and API keys

Rust commands (`read_storage_csv`, `write_storage_csv`, `append_storage_csv`) expose these files to the frontend so React can read and persist CSV data without leaving the user directory.

### Using the Application

1. **Launch the app** – CSV transactions are merged, validated, and displayed instantly.
2. **Portfolio page** – Use the filter bar to search by ticker, filter by currency, toggle gainers/losers, and sort by any column. Select a base currency at the top and toggle "Show values in [currency]" to convert all holdings to your preferred currency. Charts visualize currency allocation and the largest holdings.
3. **Heatmap page** – View a TradingView-style heatmap of your holdings with color-coded performance. Cell size represents portfolio weight. Switch between Heatmap View and Table View to see detailed daily gain/loss data for each position.
4. **Transaction page** – Search, sort, and filter transactions by type and currency with comprehensive statistics.
5. **Settings page** – Configure Twelve Data and AlphaVantage API keys, and set your preferred base currency.
6. **Price refresh** – The Update Prices action fetches last-close data, retries automatically on rate limits, and saves each successful response back into `prices.csv` for offline reuse.

## Project Structure

```
portfolio/desktop/
├─ src/                       # React frontend
│  ├─ components/            # Reusable UI components
│  ├─ pages/                 # Portfolio, Heatmap, Transactions, Settings
│  ├─ services/              # API, CSV, and price services
│  ├─ store/                 # Zustand state management stores
│  ├─ types/                 # TypeScript interfaces
│  └─ utils/                 # Calculators, rate limiter
├─ src-tauri/                # Rust + Tauri backend
│  ├─ src/main.rs            # Commands + CSV helpers
│  └─ Cargo.toml
├─ data/                     # User-provided transaction CSV files
├─ tests/                    # Vitest unit tests
├─ .husky/                   # Git hooks configuration
├─ package.json
└─ README.md
```

## Development

### Tech Stack

- **Frontend**: React 18, TypeScript, Vite, styled-components, Zustand
- **Backend**: Rust + Tauri commands
- **State Management**: Zustand for global state
- **Testing**: Vitest with comprehensive unit tests
- **Charts**: Custom SVG-based visuals
- **Icons**: lucide-react
- **Git Hooks**: Husky for pre-commit linting and testing

### Available Scripts

```bash
npm run tauri:dev   # start dev server with hot reload
npm run lint        # type-check TypeScript (no emit)
npm test            # run Vitest unit tests
npm run build       # build frontend
npm run tauri:build # package the app for production
```

## Architecture

### Data Flow

```
CSV Files → Rust backend (parsing + validation) → JSON payloads → React state → UI components
                   ↘ price cache (prices.csv) ↗
```

- Transactions remain in the `desktop/data` folder for easy editing.
- Price data travels through `priceService`, which now relies on a `RateLimiter` and `fetchWithBackoff` utility. Successful responses are normalized into `prices.csv` via Tauri commands, enabling offline reuse and faster reloads.

### CSV Storage Commands

| Command               | Purpose                                      |
| --------------------- | -------------------------------------------- |
| `read_storage_csv`    | Stream CSV content from the app data folder  |
| `write_storage_csv`   | Overwrite/create CSV files with headers      |
| `append_storage_csv`  | Append rows to an existing CSV               |

### Rate Limiting & Backoff

`priceService` schedules every Twelve Data API call through a shared `RateLimiter` (30 req/min) and wraps each fetch in `fetchWithBackoff`. HTTP 429/5xx responses and transient network errors automatically retry with exponential backoff before surfacing to the UI, while cached prices remain available as a fallback.

## Roadmap

### Phase 1: Core Features ✅
- [x] Multi-market transaction viewing
- [x] Data table with filtering and sorting
- [x] Portfolio holdings summary with filters & charts
- [x] CSV storage + price caching commands
- [x] Zustand state management migration
- [x] Comprehensive test coverage
- [x] Git hooks with Husky

### Phase 2: Analytics ✅
- [x] Portfolio value calculation with FX conversion
- [x] Currency conversion toggle for all holdings
- [x] Portfolio heatmap with TradingView-style visualization
- [x] Daily gain/loss tracking and table view
- [ ] NAV tracking and benchmark comparison
- [ ] Historical performance charts

### Phase 3: Advanced Features (Future)
- [ ] Real-time price updates
- [ ] Automated rebalancing suggestions
- [ ] Data backup/versioning tooling
- [ ] Mobile companions and broker integrations

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Follow the conventional commit style (`feat`, `fix`, `docs`, etc.).

## Troubleshooting

- **App will not start** – confirm Node.js 22+, Rust toolchain, and Tauri prerequisites are installed.
- **CSV files missing** – ensure files exist inside `desktop/data/` with the expected headers.
- **Price refresh fails** – check your Twelve Data API key and rate limit status; cached prices remain available until the next successful refresh.
- **Build issues** – try `rm -rf node_modules && npm install` and `cargo clean` inside `src-tauri`.

## License

This project is licensed under the MIT License.

## Support

- Open an issue on GitHub
- Review the detailed [requirements](requirements.md)
- Check [CLAUDE.md](CLAUDE.md) for development guidelines
