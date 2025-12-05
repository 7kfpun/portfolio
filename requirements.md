## Complete Feature Requirements - Portfolio Manager Desktop App

## Pure CSV Storage Architecture

---

# 1. PROJECT OVERVIEW

## 1.1 Application Summary

**Desktop portfolio management application** for tracking multi-currency stock and cryptocurrency investments with accurate NAV calculation, performance metrics, and S&P 500 benchmark comparison.

**Technology Stack:**

- **Backend:** Rust + Tauri 2.x
- **Frontend:** React 18 + TypeScript + Vite
- **UI Framework:** shadcn/ui + Tailwind CSS
- **Charts:** Recharts
- **Storage:** Pure CSV files (6 files total)
- **Platform:** macOS (MVP), Windows/iOS/Android (future)

## 1.2 Core Value Proposition

- Track multi-currency portfolio (USD, HKD, JPY, TWD) in one place
- Calculate accurate NAV with real-time FX conversion
- Compare performance against S&P 500 benchmark
- Support stocks, ETFs, and cryptocurrencies
- All data stored in Excel-editable CSV files
- Fast, offline-first, privacy-focused (no cloud)

---

# 2. DATA STORAGE SPECIFICATIONS

## 2.1 File Structure

```
~/Library/Application Support/PortfolioManager/  (macOS)
  ├── data/
  │   ├── transactions.csv       # All buy/sell/dividend transactions
  │   ├── prices.csv             # Historical daily prices for all securities
  │   ├── fx_rates.csv           # Historical FX rates for all currency pairs
  │   ├── securities.csv         # Metadata for all securities (stocks/ETFs/crypto)
  │   ├── splits.csv             # Stock split records
  │   └── settings.csv           # User preferences and API keys
  ├── backups/
  │   ├── 2024-12-02-1430/       # Timestamped backup folders
  │   │   ├── transactions.csv
  │   │   ├── prices.csv
  │   │   ├── fx_rates.csv
  │   │   ├── securities.csv
  │   │   ├── splits.csv
  │   │   └── settings.csv
  │   └── ... (keep last 30 daily backups)
  └── logs/
      └── app.log                # Application logs for debugging
```

## 2.2 CSV Schema Specifications

### 2.2.1 transactions.csv

**Purpose:** Record all portfolio transactions (buys, sells, dividends, fees, cash movements)

**Schema:**

```csv
id,date,ticker,type,quantity,price,fee,currency,notes,created_at,updated_at
```

**Column Specifications:**

| Column     | Type    | Required    | Description                                         | Validation                                             |
| ---------- | ------- | ----------- | --------------------------------------------------- | ------------------------------------------------------ |
| id         | string  | Yes         | Unique identifier (format: tx*{timestamp}*{random}) | Must be unique                                         |
| date       | string  | Yes         | Transaction date (ISO 8601: YYYY-MM-DD)             | Valid date, not in future                              |
| ticker     | string  | Yes         | Security identifier with exchange prefix            | Format: EXCHANGE:SYMBOL or SYMBOL.EXCHANGE             |
| type       | string  | Yes         | Transaction type                                    | Must be: BUY, SELL, DIVIDEND, FEE, DEPOSIT, WITHDRAWAL |
| quantity   | decimal | Conditional | Number of shares/units                              | Required for BUY/SELL/DIVIDEND, >0, can be decimal     |
| price      | decimal | Conditional | Price per unit                                      | Required for BUY/SELL/DIVIDEND, >0                     |
| fee        | decimal | No          | Transaction fee                                     | Default 0, must be ≥0                                  |
| currency   | string  | Yes         | Transaction currency                                | ISO 4217 code (USD, HKD, JPY, TWD, etc.)               |
| notes      | string  | No          | User notes                                          | Free text, max 500 characters                          |
| created_at | string  | Yes         | Record creation timestamp                           | ISO 8601 with timezone                                 |
| updated_at | string  | Yes         | Last modification timestamp                         | ISO 8601 with timezone                                 |

**Example Rows:**

```csv
id,date,ticker,type,quantity,price,fee,currency,notes,created_at,updated_at
tx_1704988800_abc123,2018-01-12,NASDAQ:FB,BUY,10,179.90,1.00,USD,,2024-12-02T10:30:00Z,2024-12-02T10:30:00Z
tx_1705161600_def456,2018-01-23,NASDAQ:AAPL,BUY,10,178.60,1.00,USD,,2024-12-02T10:31:00Z,2024-12-02T10:31:00Z
tx_1707523200_ghi789,2018-02-09,NASDAQ:FB,SELL,10,170.00,1.04,USD,,2024-12-02T10:32:00Z,2024-12-02T10:32:00Z
tx_1708041600_jkl012,2018-02-15,NASDAQ:AAPL,DIVIDEND,10,0.63,1.89,USD,Quarterly dividend,2024-12-02T10:33:00Z,2024-12-02T10:33:00Z
tx_1708041601_mno345,2018-02-20,0700.HK,BUY,100,420.50,15.00,HKD,Tencent purchase,2024-12-02T10:34:00Z,2024-12-02T10:34:00Z
tx_1708041602_pqr678,2024-12-01,,DEPOSIT,,,,10000.00,USD,Initial capital,2024-12-02T10:35:00Z,2024-12-02T10:35:00Z
```

**File Characteristics:**

- Encoding: UTF-8 with BOM (Excel compatibility)
- Delimiter: Comma
- Quote character: Double quote (")
- Line ending: CRLF (Windows style for Excel compatibility)
- Sorting: By date (ascending), then created_at (for same-day ordering)
- Estimated size: ~150 bytes per row
  - 1,000 transactions ≈ 150KB
  - 10,000 transactions ≈ 1.5MB

### 2.2.2 prices.csv

**Purpose:** Store historical daily closing prices for all securities

**Schema:**

```csv
ticker,date,close
```

**Column Specifications:**

| Column | Type    | Required | Description                                           | Validation                   |
| ------ | ------- | -------- | ----------------------------------------------------- | ---------------------------- |
| ticker | string  | Yes      | Security identifier (matches transactions.csv format) | Must exist in securities.csv |
| date   | string  | Yes      | Price date (ISO 8601: YYYY-MM-DD)                     | Valid date, trading day only |
| close  | decimal | Yes      | Closing price in native currency                      | Must be >0                   |

**Example Rows:**

```csv
ticker,date,close
0700.HK,2024-11-28,420.00
0700.HK,2024-11-29,422.50
0700.HK,2024-12-02,425.20
NASDAQ:AAPL,2024-11-28,189.50
NASDAQ:AAPL,2024-11-29,188.95
NASDAQ:AAPL,2024-12-02,190.20
NASDAQ:GOOGL,2024-11-28,140.25
NASDAQ:GOOGL,2024-11-29,141.10
NASDAQ:GOOGL,2024-12-02,142.50
```

**File Characteristics:**

- Sorting: By ticker (ascending), then date (ascending)
- This allows efficient lookups: binary search by ticker, then binary search by date
- No prices stored for weekends/holidays (trading days only)
- Estimated size: ~40 bytes per row
  - 20 tickers × 1,250 trading days ≈ 25,000 rows ≈ 1MB
  - 100 tickers × 2,500 trading days ≈ 250,000 rows ≈ 10MB

**Data Sources:**

- Stocks/ETFs: Twelve Data API
- Cryptocurrencies: CoinGecko API

### 2.2.3 fx_rates.csv

**Purpose:** Store historical FX exchange rates for currency conversion

**Schema:**

```csv
currency_pair,date,rate
```

**Column Specifications:**

| Column        | Type    | Required | Description                             | Validation      |
| ------------- | ------- | -------- | --------------------------------------- | --------------- |
| currency_pair | string  | Yes      | Currency pair (format: XXX/USD)         | Standard format |
| date          | string  | Yes      | Rate date (ISO 8601: YYYY-MM-DD)        | Valid date      |
| rate          | decimal | Yes      | Exchange rate (foreign currency to USD) | Must be >0      |

**Rate Interpretation:**

- HKD/USD = 0.1282 means 1 HKD = 0.1282 USD
- To convert HKD to USD: amount_hkd × rate
- To convert USD to HKD: amount_usd / rate

**Supported Currency Pairs (MVP):**

- HKD/USD (Hong Kong Dollar)
- JPY/USD (Japanese Yen)
- TWD/USD (Taiwan Dollar)
- EUR/USD (Euro, future)
- GBP/USD (British Pound, future)
- SGD/USD (Singapore Dollar, future)
- CNY/USD (Chinese Yuan, future)

**Example Rows:**

```csv
currency_pair,date,rate
HKD/USD,2024-11-28,0.1282
HKD/USD,2024-11-29,0.1283
HKD/USD,2024-12-02,0.1281
JPY/USD,2024-11-28,0.0067
JPY/USD,2024-11-29,0.0066
JPY/USD,2024-12-02,0.0068
TWD/USD,2024-11-28,0.0314
TWD/USD,2024-11-29,0.0315
TWD/USD,2024-12-02,0.0313
```

**File Characteristics:**

- Sorting: By currency_pair (ascending), then date (ascending)
- Estimated size: ~35 bytes per row
  - 5 pairs × 1,250 days ≈ 6,250 rows ≈ 220KB

**Data Source:** Twelve Data Forex API

### 2.2.4 securities.csv

**Purpose:** Store metadata about each security (stocks, ETFs, cryptocurrencies)

**Schema:**

```csv
ticker,name,exchange,currency,type,sector,data_source,api_symbol,last_updated
```

**Column Specifications:**

| Column       | Type   | Required | Description                               | Validation                            |
| ------------ | ------ | -------- | ----------------------------------------- | ------------------------------------- |
| ticker       | string | Yes      | Security identifier (primary key)         | Must be unique                        |
| name         | string | Yes      | Full company/asset name                   | Max 200 characters                    |
| exchange     | string | Yes      | Exchange code                             | NASDAQ, NYSE, HKEX, TSE, TWSE, CRYPTO |
| currency     | string | Yes      | Native trading currency                   | ISO 4217 code                         |
| type         | string | Yes      | Security type                             | STOCK, ETF, CRYPTO                    |
| sector       | string | No       | Industry sector (for allocation analysis) | GICS sector names                     |
| data_source  | string | Yes      | Price data API source                     | twelve_data, coingecko                |
| api_symbol   | string | Yes      | Symbol used for API calls                 | May differ from ticker                |
| last_updated | string | Yes      | Last metadata fetch timestamp             | ISO 8601                              |

**Example Rows:**

```csv
ticker,name,exchange,currency,type,sector,data_source,api_symbol,last_updated
NASDAQ:AAPL,Apple Inc.,NASDAQ,USD,STOCK,Information Technology,twelve_data,AAPL,2024-12-02T10:30:00Z
0700.HK,Tencent Holdings Ltd,HKEX,HKD,STOCK,Communication Services,twelve_data,0700.HK,2024-12-02T10:30:00Z
2330.TW,Taiwan Semiconductor Manufacturing Co,TWSE,TWD,STOCK,Information Technology,twelve_data,2330.TW,2024-12-02T10:30:00Z
9984.T,SoftBank Group Corp,TSE,JPY,STOCK,Communication Services,twelve_data,9984.T,2024-12-02T10:30:00Z
BTC-USD,Bitcoin,CRYPTO,USD,CRYPTO,,coingecko,bitcoin,2024-12-02T10:30:00Z
ETH-USD,Ethereum,CRYPTO,USD,CRYPTO,,coingecko,ethereum,2024-12-02T10:30:00Z
```

**GICS Sectors (for sector allocation):**

- Energy
- Materials
- Industrials
- Consumer Discretionary
- Consumer Staples
- Health Care
- Financials
- Information Technology
- Communication Services
- Utilities
- Real Estate

**File Characteristics:**

- Sorting: By ticker (ascending)
- Estimated size: ~150 bytes per row
  - 20 securities ≈ 3KB
  - 100 securities ≈ 15KB

**Auto-population:** When first transaction for a new ticker is entered, app automatically fetches metadata from API and creates row.

### 2.2.5 splits.csv

**Purpose:** Record stock split events and track adjustment status

**Schema:**

```csv
id,ticker,date,ratio,applied,created_at
```

**Column Specifications:**

| Column     | Type    | Required | Description                                           | Validation                                      |
| ---------- | ------- | -------- | ----------------------------------------------------- | ----------------------------------------------- |
| id         | string  | Yes      | Unique identifier                                     | Format: split*{timestamp}*{random}              |
| ticker     | string  | Yes      | Affected security ticker                              | Must exist in securities.csv                    |
| date       | string  | Yes      | Effective date of split                               | ISO 8601 date                                   |
| ratio      | decimal | Yes      | Split ratio                                           | >0 (e.g., 2.0 = 2-for-1, 0.5 = 1-for-2 reverse) |
| applied    | boolean | Yes      | Whether adjustment applied to historical transactions | true or false                                   |
| created_at | string  | Yes      | Record creation timestamp                             | ISO 8601                                        |

**Split Ratio Examples:**

- 2.0 = 2-for-1 forward split (100 shares → 200 shares)
- 3.0 = 3-for-1 forward split (100 shares → 300 shares)
- 0.5 = 1-for-2 reverse split (100 shares → 50 shares)
- 0.1 = 1-for-10 reverse split (100 shares → 10 shares)

**Example Rows:**

```csv
id,ticker,date,ratio,applied,created_at
split_1598832000_abc,NASDAQ:AAPL,2020-08-31,4.0,true,2024-12-02T10:30:00Z
split_1661385600_def,NASDAQ:TSLA,2022-08-25,3.0,true,2024-12-02T10:35:00Z
split_1720656000_ghi,NASDAQ:NVDA,2024-06-10,10.0,true,2024-12-02T10:40:00Z
```

**File Characteristics:**

- Sorting: By date (descending, newest first)
- Estimated size: ~80 bytes per row
- Typically few rows (most portfolios have <10 splits)

### 2.2.6 settings.csv

**Purpose:** Store user preferences and application configuration

**Schema:**

```csv
key,value
```

**Column Specifications:**

| Column | Type   | Required | Description                                     |
| ------ | ------ | -------- | ----------------------------------------------- |
| key    | string | Yes      | Setting name (unique)                           |
| value  | string | Yes      | Setting value (stored as string, parsed by app) |

**Settings Keys and Values:**

| Key                   | Type    | Default         | Description                                            |
| --------------------- | ------- | --------------- | ------------------------------------------------------ |
| cost_basis_method     | string  | FIFO            | Cost basis calculation method: FIFO, LIFO, SPECIFIC_ID |
| base_currency         | string  | USD             | Primary reporting currency (locked to USD for MVP)     |
| display_currencies    | string  | USD,HKD,JPY,TWD | Comma-separated list of currencies to display          |
| twelve_data_api_key   | string  | (empty)         | User's Twelve Data API key                             |
| auto_refresh_on_start | boolean | true            | Fetch latest prices on app launch                      |
| last_price_update     | string  | (empty)         | ISO 8601 timestamp of last successful price fetch      |
| theme                 | string  | system          | UI theme: light, dark, system                          |
| api_call_count        | integer | 0               | Daily API call counter (resets at midnight UTC)        |
| api_call_reset_date   | string  | (empty)         | ISO date when counter last reset                       |

**Example Rows:**

```csv
key,value
cost_basis_method,FIFO
base_currency,USD
display_currencies,"USD,HKD,JPY,TWD"
twelve_data_api_key,your_api_key_here_masked
auto_refresh_on_start,true
last_price_update,2024-12-02T10:30:00Z
theme,system
api_call_count,45
api_call_reset_date,2024-12-02
```

**File Characteristics:**

- No sorting required (key-value pairs)
- Estimated size: <1KB
- Values containing commas must be quoted

---

# 3. APPLICATION STARTUP & DATA LOADING

## 3.1 App Launch Sequence

**Step 1: Initialize File System**

1. Check if application data directory exists
   - macOS: `~/Library/Application Support/PortfolioManager/`
   - If not exists: Create directory structure (data/, backups/, logs/)
2. Check if all required CSV files exist
   - If missing: Create empty CSV files with headers only
   - Show welcome screen for first-time users

**Step 2: Load Settings**

1. Read and parse `settings.csv`
2. Validate API key presence
3. Load user preferences (theme, cost basis method, etc.)
4. If API key missing: Show settings prompt before continuing

**Step 3: Load Core Data (Parallel Loading)**

1. **Load transactions.csv** (primary thread)

   - Stream CSV parsing for memory efficiency
   - Deserialize each row into Transaction struct
   - Validate data integrity (required fields, data types)
   - Store in Vec<Transaction>
   - **Target time: ~50ms for 10,000 transactions**

2. **Load prices.csv** (background thread)

   - Stream parse CSV
   - Group by ticker as loading
   - Store in HashMap<String, Vec<Price>>
   - **Target time: ~35ms for 25,000 rows**

3. **Load fx_rates.csv** (background thread)

   - Parse CSV
   - Group by currency pair
   - Store in HashMap<String, Vec<FxRate>>
   - **Target time: ~10ms for 6,250 rows**

4. **Load securities.csv** (background thread)

   - Parse CSV
   - Store in HashMap<String, Security> (ticker as key)
   - **Target time: ~1ms for 20 rows**

5. **Load splits.csv** (background thread)
   - Parse CSV
   - Store in Vec<Split>
   - **Target time: ~1ms for few rows**

**Step 4: Build In-Memory Indexes**
After all data loaded, build lookup indexes:

1. Transactions by ticker: HashMap<String, Vec<&Transaction>>
2. Transactions by date: Sorted Vec<&Transaction> (for time-range queries)
3. Current holdings: HashMap<String, Holding> (quantity, avg cost basis)
4. Price lookup: HashMap<(String, String), f64> (ticker, date) → price
5. FX rate lookup: HashMap<(String, String), f64> (pair, date) → rate

**Index building time: ~10ms**

**Step 5: Data Validation**

1. Check referential integrity:
   - All tickers in transactions exist in securities
   - If missing: Queue for metadata fetch
2. Validate holdings calculation:
   - Sum(buys) - Sum(sells) = current holdings
   - If mismatch: Log warning, show to user
3. Check for price data gaps:
   - Missing prices for owned securities
   - If missing: Show notification "Price data incomplete. Refresh prices?"

**Step 6: Auto-Refresh Prices (If Enabled)**

- If `auto_refresh_on_start == true` and last update > 24 hours ago:
  - Trigger background price fetch for all owned securities
  - Show progress: "Updating prices... (15/20)"
  - Non-blocking: UI renders while fetching

**Total Startup Time Target:**

- Cold start (typical portfolio): **< 150ms**
- Breakdown:
  - File loading: 96ms
  - Index building: 10ms
  - Validation: 5ms
  - UI render: 40ms
- Hot start (cached): **< 50ms**

## 3.2 Error Handling During Startup

**Scenario: Corrupt CSV File**

1. CSV parse error detected (malformed row, invalid UTF-8, etc.)
2. Show error dialog:
   - Title: "Data File Corrupted"
   - Message: "transactions.csv could not be loaded. Row 1,245 has invalid data."
   - Options:
     - "Restore from Latest Backup" (automatic, recommended)
     - "Try to Repair" (skip bad rows, log errors)
     - "View Error Details" (show raw error)
     - "Start Fresh" (backup corrupt file, create new empty file)
3. User selects option, app proceeds
4. Log error details to app.log

**Scenario: Missing Data Files**

1. One or more CSV files missing (e.g., prices.csv deleted)
2. App creates empty file with header row
3. Show notification: "Price data file was missing and has been recreated. You may need to refresh prices."
4. App continues normally with empty data for that file

**Scenario: API Key Not Set**

1. settings.csv has empty twelve_data_api_key
2. Show prominent banner: "API key not configured. Price updates disabled."
3. Click banner → Opens settings page
4. User enters API key → Test connection → Save
5. Enable "Refresh Prices" button

**Scenario: Out of Memory (Very Large Portfolio)**

1. If loading fails due to memory (e.g., 1 million transactions)
2. Show error: "Portfolio too large to load entirely. Please contact support."
3. Future enhancement: Implement pagination/virtual scrolling

---

# 4. TRANSACTION MANAGEMENT

## 4.1 Transaction Entry

### 4.1.1 Manual Transaction Entry Form

**Access Points:**

- Dashboard: Large "+" button (floating action button)
- Transactions page: "Add Transaction" button in header
- Keyboard shortcut: Cmd+N (macOS)

**Form Layout (Modal Dialog):**

**Section 1: Basic Information**

- **Date** (required)

  - Date picker component
  - Default: Today
  - Validation: Cannot be future date
  - Format: YYYY-MM-DD displayed as "Dec 2, 2024"

- **Ticker** (required)

  - Text input with autocomplete dropdown
  - Searches securities.csv for matching tickers/names
  - Format: Free text, e.g., "AAPL", "NASDAQ:AAPL", "0700.HK"
  - On blur: Auto-format to standard format (add exchange prefix if missing)
  - If ticker not found: Show "New security. Metadata will be fetched."

- **Type** (required)
  - Dropdown with icons:
    - 📈 Buy
    - 📉 Sell
    - 💰 Dividend
    - 💸 Fee
    - ⬇️ Deposit
    - ⬆️ Withdrawal
  - Default: Buy

**Section 2: Transaction Details (conditionally shown based on type)**

- **Quantity** (required for BUY/SELL/DIVIDEND)

  - Number input
  - Supports decimals (for fractional shares, crypto)
  - Min: 0.00000001 (for crypto)
  - Placeholder: "0.00"
  - For SELL: Show warning if quantity > current holdings

- **Price** (required for BUY/SELL/DIVIDEND)

  - Number input
  - Supports decimals
  - Min: 0.01
  - Placeholder: "0.00"
  - Suffix: Per unit

- **Fee** (optional, all types)

  - Number input
  - Default: 0.00
  - Min: 0.00
  - Placeholder: "0.00"

- **Currency** (required)
  - Dropdown with flags:
    - 🇺🇸 USD
    - 🇭🇰 HKD
    - 🇯🇵 JPY
    - 🇹🇼 TWD
    - (other currencies)
  - Auto-selected based on ticker's native currency if available
  - User can override

**Section 3: Additional Information**

- **Notes** (optional)
  - Multi-line text area
  - Max: 500 characters
  - Character counter shown
  - Placeholder: "Add notes about this transaction..."

**Form Footer:**

- **Calculated Amount Display** (live update):
  - For BUY: `Total: $1,800.90 (10 shares × $179.90 + $1.00 fee)`
  - For SELL: `Proceeds: $1,698.96 (10 shares × $170.00 - $1.04 fee)`
  - For DIVIDEND: `Income: $4.41 (10 shares × $0.63 - $1.89 fee)`
- **Buttons:**
  - "Cancel" (secondary, left)
  - "Save Transaction" (primary, right, disabled until form valid)

**Form Validation:**

1. All required fields filled
2. Date not in future
3. Quantity/Price > 0 for applicable types
4. Fee ≥ 0
5. For SELL: Quantity ≤ current holdings (warning, not blocker)
6. Ticker format valid

**On Save:**

1. Generate unique ID (tx*{unix_timestamp}*{random_5_chars})
2. Set created_at and updated_at to current timestamp
3. Append row to transactions.csv
4. Update in-memory transaction list
5. Recalculate holdings
6. If new ticker: Queue security metadata fetch
7. Show toast notification: "Transaction added successfully"
8. Close modal
9. Refresh relevant views (dashboard, holdings)

### 4.1.2 Quick Entry Mode (Future Enhancement)

**For power users entering multiple transactions:**

- Spreadsheet-like inline editing
- Tab between fields
- Enter to save and start new row
- Copy-paste multiple rows from Excel

### 4.1.3 Transaction Templates (Future Enhancement)

**For recurring transactions:**

- Save transaction as template
- Quick fill with template
- Edit amounts and date
- Example: Monthly dividend from same stock

## 4.2 Transaction Editing

**Access:** Click any transaction row in transaction list

**Edit Form:**

- Same as entry form, pre-filled with transaction data
- Additional field shown: Last modified timestamp
- "Delete" button added (red, bottom-left)
- "Save Changes" button (primary, bottom-right)

**On Save:**

1. Update transaction row in transactions.csv
2. Update updated_at timestamp
3. Recalculate holdings if quantity/price/type changed
4. Show toast: "Transaction updated"

**Validation:**

- Same as entry form
- If SELL quantity increased beyond holdings: Show warning but allow (for corrections)

## 4.3 Transaction Deletion

**Confirmation Required:**

- Dialog: "Delete this transaction?"
- Show transaction details for confirmation
- Warning: "This action cannot be undone."
- Buttons: "Cancel" / "Delete" (destructive red)

**On Delete:**

1. Remove row from transactions.csv
2. Rewrite entire file (or mark as deleted with flag)
3. Remove from in-memory list
4. Recalculate holdings
5. Show toast: "Transaction deleted"

**Bulk Delete (Future Enhancement):**

- Select multiple transactions (checkboxes)
- "Delete Selected" button
- Confirm with count: "Delete 15 transactions?"

## 4.4 Transaction List View

**Location:** Dedicated "Transactions" page in main navigation

**Layout:**

**Header Section:**

- Title: "Transactions"
- Search box (top-right): Search by ticker, notes
- "Add Transaction" button (primary, top-right)
- "Import CSV" button (secondary)
- "Export CSV" button (secondary)

**Filter Bar:**

- **Date Range:** Dropdown (All time, YTD, Last year, Last 6 months, Custom)
  - Custom: Shows date range picker
- **Type:** Multi-select dropdown (BUY, SELL, DIVIDEND, FEE, DEPOSIT, WITHDRAWAL)
  - Default: All selected
- **Ticker:** Multi-select dropdown (populated from owned securities)
  - Default: All selected
- **Currency:** Multi-select dropdown (USD, HKD, JPY, TWD, etc.)
  - Default: All selected
- "Reset Filters" link

**Transaction Table:**

**Columns:**

1. Date (sortable, default sort descending)
2. Ticker (sortable, clickable to filter)
3. Type (badge with color: green=BUY, red=SELL, blue=DIVIDEND, gray=FEE/DEPOSIT/WITHDRAWAL)
4. Quantity (right-aligned, 2-8 decimals depending on asset)
5. Price (right-aligned, native currency symbol)
6. Fee (right-aligned, native currency symbol)
7. Amount (right-aligned, calculated, in USD or native currency toggle)
8. Currency (3-letter code)
9. Notes (truncated to 50 chars, tooltip on hover shows full text)
10. Actions (Edit icon, Delete icon)

**Table Features:**

- Pagination: 50 rows per page (configurable: 25/50/100/All)
- Page navigation: Previous, 1, 2, 3, ..., Next
- Total count shown: "Showing 1-50 of 1,234 transactions"
- Click row: Expands to show full details and edit button
- Hover: Highlight row
- Keyboard navigation: Arrow keys to navigate, Enter to expand

**Responsive Behavior:**

- On smaller screens (<1280px): Hide less important columns (Fee, Notes, Currency)
- Show "View Details" button to see full info in modal

**Empty State:**

- No transactions: Show illustration + "Get Started" card
- Text: "You haven't added any transactions yet."
- Button: "Add Your First Transaction" or "Import from CSV"

**Performance:**

- Virtual scrolling for large lists (>1,000 rows)
- Only render visible rows + buffer
- Target: Smooth 60fps scrolling

## 4.5 Transaction Validation Rules

**Hard Validation (Blocks Save):**

1. Date is valid and not in future
2. Ticker is not empty
3. Type is one of allowed values
4. Quantity > 0 for BUY/SELL/DIVIDEND
5. Price > 0 for BUY/SELL/DIVIDEND
6. Fee ≥ 0
7. Currency is valid ISO 4217 code

**Soft Validation (Warnings, Allows Save):**

1. SELL quantity > current holdings
   - Warning: "You're selling more than you own. Current holdings: 50 shares"
   - Allow override (for corrections, transferred positions)
2. Price significantly different from recent prices (>50% change)
   - Warning: "Price seems unusual. Recent price: $100. Entered: $200. Verify?"
3. Very old date (>10 years ago)
   - Warning: "Old transaction date. Please confirm: Jan 1, 2010"
4. Very large amount (>$1M)
   - Warning: "Large transaction amount: $5,000,000. Verify?"

**Data Integrity Checks:**

1. No duplicate transaction IDs
2. All tickers in transactions exist in securities (if not, queue fetch)
3. Holdings calculation matches (sum of buys - sells)
4. FX rates available for all transaction dates (if not, fetch or use nearest)

---

# 5. SECURITIES MANAGEMENT

## 5.1 Automatic Security Registration

**Trigger:** When user enters first transaction for a new ticker

**Process:**

1. User enters transaction with ticker "TSLA"
2. Check if "TSLA" or "NASDAQ:TSLA" exists in securities.csv
3. If not found:
   - Show inline notification: "TSLA is a new security. Fetching details..."
   - Save transaction (don't block on metadata fetch)
   - Queue background task: Fetch security metadata

**Metadata Fetch Process:**

1. Normalize ticker format (add exchange prefix if missing)
   - "TSLA" → "NASDAQ:TSLA" (check NASDAQ, then NYSE)
   - "0700" → "0700.HK" (Hong Kong)
   - "2330" → "2330.TW" (Taiwan)
2. Determine data source based on ticker:
   - Exchange prefix present → Twelve Data
   - No prefix, check common crypto symbols → CoinGecko
3. Call appropriate API:
   - **Twelve Data:** GET /stocks/profile or /etf/profile
   - **CoinGecko:** GET /coins/{id}
4. Parse response, extract:
   - Full name
   - Exchange
   - Currency
   - Type (STOCK, ETF, CRYPTO)
   - Sector (if available)
   - API symbol (for future calls)
5. Create row in securities.csv
6. Update in-memory securities HashMap
7. Show toast: "TSLA details updated: Tesla, Inc."

**Error Handling:**

- If API call fails (network error, rate limit, invalid ticker):
  - Create placeholder row with basic info:
    - ticker: "NASDAQ:TSLA"
    - name: "TSLA (pending)"
    - exchange: "NASDAQ" (guessed from prefix)
    - currency: "USD" (guessed)
    - type: "STOCK" (guessed)
    - data_source: "twelve_data"
  - Show warning: "Could not fetch details for TSLA. Please verify manually in Settings."
  - Allow user to edit manually later

## 5.2 Securities List View

**Location:** Settings page, "Securities" tab

**Purpose:** Review and manually edit security metadata

**Table Columns:**

1. Ticker (sortable)
2. Name (sortable, editable)
3. Exchange (badge)
4. Type (badge: STOCK/ETF/CRYPTO)
5. Currency (3-letter code)
6. Sector (dropdown editable)
7. Last Updated (timestamp, relative: "2 days ago")
8. Actions (Edit icon, Refresh icon, Delete icon)

**Actions:**

- **Edit:** Open modal with all fields editable
- **Refresh:** Re-fetch metadata from API (updates name, sector, etc.)
- **Delete:** Only allowed if no transactions exist for this ticker
  - If transactions exist: Show error "Cannot delete. 45 transactions reference this security."

**Manual Add Security:**

- Button: "Add Security Manually"
- Form: Same fields as securities.csv schema
- Use case: For securities not available via API (private companies, unlisted assets)

**Bulk Operations:**

- "Refresh All" button: Re-fetch metadata for all securities (respects rate limits)
- Progress bar: "Refreshing... 12/20"

## 5.3 Ticker Format Normalization

**Supported Formats:**

**Input → Normalized Format:**

- "AAPL" → "NASDAQ:AAPL" (check NASDAQ first, fallback to NYSE)
- "GOOGL" → "NASDAQ:GOOGL"
- "BRK.B" → "NYSE:BRK.B"
- "0700.HK" → "0700.HK" (already normalized)
- "0700" → "0700.HK" (add exchange suffix)
- "2330.TW" → "2330.TW"
- "2330" → "2330.TW"
- "9984.T" → "9984.T"
- "9984" → "9984.T"
- "BTC" → "BTC-USD" (crypto, normalize to trading pair)
- "ETH" → "ETH-USD"

**Exchange Prefixes:**

- NASDAQ:
- NYSE:
- HKEX: (Hong Kong, alternative format: .HK suffix)
- TWSE: (Taiwan, alternative format: .TW suffix)
- TSE: (Tokyo, alternative format: .T suffix)
- CRYPTO: (for crypto pairs like BTC-USD)

**Normalization Logic:**

1. Check if already normalized (has prefix or recognized suffix)
2. If not, try to detect exchange:
   - 4-letter US symbols → Try NASDAQ API, fallback to NYSE
   - 4-digit numbers → Check if Asian markets (.HK, .TW, .T)
   - Common crypto symbols → Convert to {SYMBOL}-USD
3. If ambiguous: Show picker dialog
   - "AAPL found on multiple exchanges: NASDAQ, OTC. Select:"
   - User chooses → Save preference for future

---

# 6. PRICE DATA MANAGEMENT

## 6.1 Price Data Sources

### 6.1.1 Twelve Data API (Stocks & ETFs)

**API Endpoints Used:**

- **Time Series:** `/time_series`
  - Get historical daily prices
  - Parameters: symbol, interval=1day, outputsize=5000 (max)
- **Quote:** `/quote`

  - Get latest price (real-time or 15-min delayed)
  - Parameters: symbol

- **Forex:** `/forex_time_series`
  - Get FX rates
  - Parameters: symbol (e.g., "HKD/USD"), interval=1day

**Rate Limits (Free Tier):**

- 800 API credits per day
- 8 credits per minute
- Credits reset at midnight UTC

**Credit Usage:**

- Time series request: 1 credit per call
- Quote request: 1 credit per call
- Most efficient: Batch quotes (1 credit for up to 120 symbols)

### 6.1.2 CoinGecko API (Cryptocurrencies)

**API Endpoints Used:**

- **Market Chart:** `/coins/{id}/market_chart`

  - Get historical daily prices
  - Parameters: id (e.g., "bitcoin"), vs_currency=usd, days=365

- **Simple Price:** `/simple/price`
  - Get current price
  - Parameters: ids (comma-separated), vs_currencies=usd

**Rate Limits (Free Tier):**

- 10-30 calls per minute (unofficial, API doesn't specify)
- No daily limit

**Coin ID Mapping:**

- BTC → bitcoin
- ETH → ethereum
- Common symbols automatically mapped
- Full list: https://api.coingecko.com/api/v3/coins/list

## 6.2 Historical Price Fetch (Initial Load)

**Trigger:** When new security added (first transaction entered)

**Process:**

1. New transaction saved with ticker "NASDAQ:AAPL"
2. Security metadata fetch completes → data_source = "twelve_data"
3. Queue historical price fetch task
4. Background worker:
   - Check if prices already exist for this ticker
   - If exists: Skip (or update only missing dates)
   - If not exists: Fetch full history

**Fetch Strategy:**

- **For stocks/ETFs (Twelve Data):**
  - Call `/time_series` with outputsize=5000
  - Returns up to ~20 years of daily data (5000 trading days)
  - Parse response: array of {datetime, close}
  - Insert all rows into prices.csv (sorted by date)
- **For crypto (CoinGecko):**
  - Call `/market_chart` with days=max (all available history)
  - Parse response: array of [timestamp, price]
  - Convert to daily close prices
  - Insert into prices.csv

**Error Handling:**

- Rate limit hit: Exponential backoff (1min → 5min → 15min)
- Invalid symbol: Show error "AAPL not found. Verify ticker symbol."
- Network error: Retry 3 times, then fail gracefully
  - Show notification: "Could not fetch prices for AAPL. You can retry manually."

**Progress Indication:**

- If multiple tickers queued: Show progress bar
  - "Fetching historical prices... (3/5)"
- For single ticker: Show spinner on security row
  - "Fetching prices for AAPL..."

**Data Validation:**

- Check for gaps (missing trading days)
- Check for outliers (price change >100% in one day)
- Log warnings for manual review

## 6.3 Daily Price Updates

**Trigger Options:**

1. **On app start** (if auto_refresh_on_start enabled)

   - Check if last_price_update > 24 hours ago
   - If yes: Trigger update for all owned securities

2. **Manual refresh**

   - "Refresh Prices" button in dashboard header
   - Tooltip: "Last updated: 2 hours ago"

3. **Scheduled** (future enhancement)
   - Background task runs every 4 hours (during market hours)
   - macOS: Use launchd for scheduling

**Update Process:**

1. Get list of all unique tickers from current holdings
2. Determine last date in prices.csv for each ticker
3. Fetch prices only for missing dates (today if already updated)
4. Use batch API calls where possible (Twelve Data supports up to 120 symbols)

**Batch API Call (Twelve Data):**

- Endpoint: `/quote` with symbol=AAPL,GOOGL,TSLA,... (up to 120)
- Returns: Array of current quotes
- 1 API credit for entire batch (very efficient!)

**Sequential Updates (CoinGecko):**

- CoinGecko doesn't support batch
- Call `/simple/price` per crypto asset
- Rate limit: Max 1 call per second

**Update Logic:**

- Check current time and date
- If market closed (weekend, after hours): Use last closing price
- If market open: Fetch latest quote (may be delayed 15 minutes)
- Append new row(s) to prices.csv

**Progress UI:**

- Dashboard banner: "Updating prices... 15/20"
- Non-blocking: User can continue using app
- On complete: Toast "Prices updated successfully"
- Update NAV and performance charts automatically

**Error Handling:**

- Rate limit: Show notification "Rate limit reached. Resuming in X minutes."
- Failed symbols: Log and skip, show warning "Could not update: TSLA (network error)"
- Partial success: Update what succeeded, retry failed later

## 6.4 FX Rate Management

**FX Rate Fetch Strategy:**

- Fetch alongside stock prices (same Twelve Data API)
- Endpoint: `/forex_time_series` or `/quote` for forex
- Pairs to maintain: HKD/USD, JPY/USD, TWD/USD, EUR/USD, GBP/USD, SGD/USD

**Historical FX Rates:**

- Fetched once when first transaction in foreign currency entered
- Example: First HKD transaction on 2020-01-15
  - Fetch HKD/USD rates from 2020-01-15 to today
  - Append all to fx_rates.csv

**Daily FX Rate Updates:**

- Update alongside daily price updates
- Fetch latest rate for all pairs in use
- Append to fx_rates.csv if date doesn't exist

**Missing FX Rate Handling:**

- Transaction date: 2020-05-03 (Sunday, no FX market)
- Check fx_rates.csv for HKD/USD on 2020-05-03
- If not found: Use nearest date (2020-05-01 Friday)
- Log: "Using FX rate from 2020-05-01 for 2020-05-03 (weekend)"

## 6.5 Rate Limiting & Backoff

**API Call Tracking:**

- Increment `api_call_count` in settings.csv after each call
- Check if api_call_reset_date is today; if not, reset counter to 0

**Rate Limit Detection:**

- Twelve Data returns HTTP 429 when limit hit
- CoinGecko returns HTTP 429 or 503

**Exponential Backoff Strategy:**

1. First rate limit: Wait 1 minute, retry
2. Second failure: Wait 5 minutes, retry
3. Third failure: Wait 15 minutes, retry
4. Fourth failure: Wait 1 hour, stop auto-retry
5. Show persistent notification: "Rate limit reached. Prices will update tomorrow."

**Manual Override:**

- User can click "Retry Now" button
- Attempts immediate refresh (may hit rate limit again)

**Rate Limit UI Indicators:**

- Settings page shows:
  - "API Calls Today: 425 / 800"
  - Progress bar: 53% filled
  - Color: Green (<600), Yellow (600-750), Red (>750)
- When nearing limit:
  - Warning: "Approaching daily API limit. Automatic updates may be restricted."

## 6.6 Offline Mode

**When Network Unavailable:**

- App loads normally with cached price data
- Dashboard shows banner: "Offline. Prices may be outdated."
- "Last updated" timestamp displayed prominently
- NAV calculated with latest cached prices
- User can still:
  - Add/edit transactions
  - View portfolio
  - Use all non-network features

**When Network Restored:**

- Auto-detect network availability
- Show notification: "Back online. Refresh prices?"
- User clicks: Triggers price update

---

# 7. NAV (NET ASSET VALUE) CALCULATION

## 7.1 NAV Formula

**Basic Formula:**

```
NAV = Cash Balance + Market Value of All Holdings - Liabilities

Where:
- Cash Balance = ΣDeposits - ΣWithdrawals - ΣPurchases + ΣSales - ΣFees + ΣDividends
- Market Value = Σ(Current Holdings × Latest Price × FX Rate)
- Liabilities = 0 (not tracking margin/loans in MVP)
```

**Detailed Calculation Steps:**

**Step 1: Calculate Cash Balance (in USD)**

```
For each transaction in transactions.csv:
  If type == DEPOSIT:
    cash += amount (converted to USD using FX rate on transaction date)
  If type == WITHDRAWAL:
    cash -= amount (converted to USD)
  If type == BUY:
    cash -= (quantity × price + fee) (converted to USD)
  If type == SELL:
    cash += (quantity × price - fee) (converted to USD)
  If type == DIVIDEND:
    cash += (quantity × price - fee) (converted to USD)
  If type == FEE:
    cash -= fee (converted to USD)
```

**Step 2: Calculate Current Holdings**

```
For each unique ticker in transactions:
  total_bought = Σ(quantity) where type == BUY
  total_sold = Σ(quantity) where type == SELL
  current_quantity = total_bought - total_sold

  If current_quantity > 0:
    Add to holdings list
```

**Step 3: Get Latest Prices**

```
For each holding:
  latest_price = Get most recent close price from prices.csv for this ticker
  If not found or too old (>7 days):
    Mark as "Price unavailable"
    Use last known price with warning
```

**Step 4: Calculate Market Value (in USD)**

```
For each holding:
  native_value = quantity × latest_price
  fx_rate = Get FX rate for (holding.currency, USD) on today's date
  usd_value = native_value × fx_rate

  market_value_total += usd_value
```

**Step 5: Calculate Total NAV**

```
NAV = cash_balance + market_value_total
```

## 7.2 NAV Display

### 7.2.1 Current NAV (Dashboard Hero Section)

**Layout:**

```
┌─────────────────────────────────────────────┐
│  Net Asset Value                            │
│  $125,432.18                    [large]     │
│  ↑ $1,234.56 (+0.99%)           [green]     │
│  Today                                      │
│  Last updated: 2 minutes ago                │
└─────────────────────────────────────────────┘
```

**Features:**

- **Large, prominent display** of current NAV
- **Today's change:**
  - Absolute: +$1,234.56 or -$1,234.56
  - Percentage: (+0.99%) or (-0.99%)
  - Color: Green (positive), Red (negative), Gray (zero)
  - Arrow: ↑ (up), ↓ (down), → (flat)
- **Last updated timestamp:**
  - Relative time: "2 minutes ago", "1 hour ago", "yesterday"
  - Hover: Shows exact timestamp "Dec 2, 2024, 10:30:45 AM"
- **Refresh button:**
  - Icon button next to timestamp
  - Triggers price refresh
  - Shows spinner while loading

**Calculation of Today's Change:**

```
Yesterday's NAV = Calculate NAV using yesterday's closing prices
Today's NAV = Calculate NAV using today's latest prices
Change = Today's NAV - Yesterday's NAV
Change % = (Change / Yesterday's NAV) × 100
```

### 7.2.2 Historical NAV

**Purpose:** Track portfolio value over time for performance charting

**Calculation Frequency:**

- Daily (at market close)
- Calculated retroactively when viewing historical periods

**Calculation Method:**

```
For each date in date_range:
  1. Get all transactions up to this date
  2. Calculate cash balance as of this date
  3. Calculate holdings as of this date
  4. Get closing prices on this date (from prices.csv)
  5. Get FX rates on this date (from fx_rates.csv)
  6. Calculate market value
  7. NAV = cash_balance + market_value
  8. Store: {date, nav_value}
```

**Optimization:**

- Cache historical NAV calculations
- Only recalculate when transactions added/edited
- Store in memory, don't persist to disk (can always recalculate)

**Performance:**

- Calculate 365 days of NAV: ~50ms
- Calculate 1,825 days (5 years): ~250ms

### 7.2.3 Multi-Currency NAV Display

**Toggle Control:**

- Dropdown in NAV card header: "USD ▼"
- Options: USD (default), HKD, JPY, TWD, EUR, GBP, SGD
- Selection changes display currency

**Conversion:**

```
NAV_in_currency = NAV_in_USD / FX_rate
```

**Example:**

```
USD: $125,432.18
HKD: HK$979,372.00  (rate: 7.8065)
JPY: ¥18,813,777    (rate: 149.95)
TWD: NT$3,968,678   (rate: 31.63)
```

**UI Implementation:**

- Same card layout
- Currency symbol changes
- Formatting adjusts (e.g., JPY no decimals)
- Today's change recalculated in selected currency

## 7.3 Holdings Calculation

### 7.3.1 Current Holdings Summary

**Data Structure:**

```
Holding {
  ticker: String
  name: String
  quantity: f64
  avg_cost_basis: f64  (per unit, in native currency)
  total_cost_basis: f64  (total, in USD)
  current_price: f64  (per unit, in native currency)
  market_value: f64  (total, in USD)
  unrealized_pl: f64  (in USD)
  unrealized_pl_pct: f64  (percentage)
  allocation_pct: f64  (% of total portfolio)
  currency: String
}
```

**Calculation:**

```
For each ticker with quantity > 0:

  1. Calculate quantity:
     quantity = Σ(BUY quantities) - Σ(SELL quantities)
     Apply stock splits if any

  2. Calculate average cost basis (using FIFO/LIFO):
     total_cost = Σ(BUY price × quantity + fees) for unsold shares
     avg_cost_basis = total_cost / quantity

  3. Get current price:
     current_price = Latest price from prices.csv

  4. Calculate market value:
     native_market_value = quantity × current_price
     fx_rate = Get current FX rate
     market_value_usd = native_market_value × fx_rate

  5. Calculate unrealized P&L:
     total_cost_usd = Convert total_cost to USD using purchase date FX rates
     unrealized_pl = market_value_usd - total_cost_usd
     unrealized_pl_pct = (unrealized_pl / total_cost_usd) × 100

  6. Calculate allocation:
     allocation_pct = (market_value_usd / total_NAV) × 100
```

### 7.3.2 Holdings Table Display

**Location:** Holdings page (dedicated nav item)

**Table Columns:**

1. **Ticker** (sortable, clickable)

   - Bold font
   - Click: Opens security detail page

2. **Name** (sortable)

   - Secondary text below ticker
   - Truncated if too long

3. **Quantity** (right-aligned, sortable)

   - Format: Up to 8 decimals for crypto, 2-4 for stocks
   - Example: "10.00" or "0.12345678"

4. **Avg Cost** (right-aligned, sortable)

   - Per unit, in native currency
   - Format: "$179.90" or "HK$420.50"

5. **Current Price** (right-aligned, sortable)

   - Per unit, in native currency
   - Format: "$189.50"
   - Update indicator: Green ↑ or Red ↓ if changed today

6. **Cost Basis** (right-aligned, sortable)

   - Total cost, in USD
   - Format: "$1,799.00"

7. **Market Value** (right-aligned, sortable, default sort descending)

   - Total value, in USD
   - Format: "$1,895.00"

8. **Unrealized P&L** (right-aligned, sortable)

   - Absolute: "$96.00"
   - Percentage: "(+5.34%)"
   - Color: Green (positive), Red (negative), Gray (zero)

9. **Allocation** (right-aligned, sortable)

   - Percentage of portfolio: "12.5%"
   - Progress bar visualization (optional)

10. **Actions**
    - View details icon
    - Quick sell button

**Table Footer (Summary Row):**

- Total Market Value: Sum of all holdings in USD
- Total Unrealized P&L: Sum of all P&L
- Total Allocation: 100%

**Sorting:**

- Default: By Market Value (descending, largest holdings first)
- Click column header to sort
- Multi-sort: Shift+click (future enhancement)

**Filtering:**

- By currency (USD, HKD, JPY, TWD)
- By type (STOCK, ETF, CRYPTO)
- By allocation (>1%, >5%, >10%)
- Search by ticker or name

**Empty State:**

- No holdings: "Your portfolio is empty. Add a transaction to get started."

## 7.4 Cash Balance Tracking

**Separate Display:**

- Cash balance shown separately from holdings
- Dashboard card: "Cash Balance"
  - Amount: "$12,543.18"
  - Breakdown by currency (if multi-currency):
    - USD: $10,000.00
    - HKD: HK$5,000.00 ($640.32 USD)
    - JPY: ¥150,000 ($1,000.50 USD)
    - TWD: NT$30,000 ($948.77 USD)

**Cash Transactions:**

- All DEPOSIT/WITHDRAWAL transactions affect cash
- All BUY/SELL transactions affect cash
- All DIVIDEND payments increase cash
- All FEE payments decrease cash

**Cash Balance Validation:**

- If calculated cash balance is negative: Show warning
  - "Negative cash balance: -$500.00. Your records may be incomplete."
- User can add DEPOSIT transaction to correct

---

# 8. COST BASIS & REALIZED GAINS

## 8.1 Cost Basis Methods

### 8.1.1 FIFO (First In, First Out)

**Default method**

**Logic:**

- When selling shares, match with oldest purchased shares first
- Used for tax purposes in most jurisdictions

**Example:**

```
Transactions:
1. 2020-01-15: BUY 100 shares @ $50 = $5,000 cost
2. 2021-03-20: BUY 50 shares @ $75 = $3,750 cost
3. 2022-06-10: SELL 120 shares @ $100 = $12,000 proceeds

FIFO Calculation:
- Sell 100 shares from lot #1: Cost = $5,000 (100 × $50)
- Sell 20 shares from lot #2: Cost = $1,500 (20 × $75)
- Total cost: $6,500
- Realized gain: $12,000 - $6,500 = $5,500

Remaining holdings:
- Lot #2: 30 shares @ $75 (avg cost basis = $75)
```

### 8.1.2 LIFO (Last In, First Out)

**Logic:**

- When selling shares, match with most recently purchased shares first
- May result in different tax implications

**Example (same transactions as above):**

```
LIFO Calculation:
- Sell 50 shares from lot #2: Cost = $3,750 (50 × $75)
- Sell 70 shares from lot #1: Cost = $3,500 (70 × $50)
- Total cost: $7,250
- Realized gain: $12,000 - $7,250 = $4,750

Remaining holdings:
- Lot #1: 30 shares @ $50 (avg cost basis = $50)
```

### 8.1.3 Specific Identification (Future)

**Logic:**

- User manually selects which specific lots to sell
- Maximum control over tax implications

**UI Flow:**

- When entering SELL transaction, user sees list of purchase lots
- User selects which lots to sell from
- App calculates realized gain based on selection

**Not in MVP** - requires lot tracking and selection UI

## 8.2 Realized Gains Calculation

**Trigger:** When SELL transaction is saved

**Calculation Process:**

```
1. Get all BUY transactions for this ticker, sorted by date
2. Get all previous SELL transactions for this ticker
3. Determine which BUY lots still have remaining shares (apply FIFO/LIFO to previous sells)
4. Match current SELL quantity with available BUY lots using selected method
5. For each matched lot:
   - Calculate cost: lot_quantity × lot_price + proportional_fee
   - Convert to USD using FX rate on BUY date
6. Calculate proceeds: sell_quantity × sell_price - sell_fee
   - Convert to USD using FX rate on SELL date
7. Realized gain = proceeds - total_cost
8. Store realized gain (not persisted, calculated on demand)
```

**Handling Fees:**

- BUY fees added to cost basis
- SELL fees subtracted from proceeds
- Fees proportionally allocated if partial lot sold

**Example with Fees:**

```
BUY: 100 shares @ $50 + $10 fee = $5,010 total cost
  Cost per share: $50.10

SELL: 50 shares @ $60 - $8 fee = $2,992 proceeds
  Cost basis for 50 shares: 50 × $50.10 = $2,505
  Realized gain: $2,992 - $2,505 = $487
```

## 8.3 Realized Gains Display

### 8.3.1 Per-Transaction Display

**In transaction list:**

- For SELL transactions, show calculated realized gain
- Column: "Realized P&L"
- Format: "$487.00 (+19.4%)"
- Color-coded: Green (gain), Red (loss)

**Transaction detail view:**

- Expand SELL transaction row
- Show breakdown:

  ```
  Cost Basis Calculation (FIFO):
  - 50 shares from 2020-01-15 lot @ $50.10 = $2,505.00

  Proceeds:
  - 50 shares @ $60.00 = $3,000.00
  - Fee: -$8.00
  - Net proceeds: $2,992.00

  Realized Gain: $487.00 (+19.4%)
  ```

### 8.3.2 Summary Statistics

**Dashboard Card: "Realized Gains"**

- YTD realized gains: "$5,432.10"
- All-time realized gains: "$12,345.67"
- Color: Green (net gain), Red (net loss)

**Realized Gains Report (Future):**

- Filter by date range, ticker, type
- Export for tax purposes
- Breakdown by short-term vs long-term (based on holding period)

## 8.4 Cost Basis Method Toggle

**Location:** Settings page, "Calculation" section

**UI:**

- Radio buttons:
  - ⦿ FIFO (First In, First Out) - Recommended
  - ○ LIFO (Last In, First Out)
  - ○ Specific Identification (Coming soon - disabled)

**Behavior:**

- Changing method triggers recalculation of all realized gains
- Shows confirmation dialog:
  - "Changing cost basis method will recalculate all realized gains. This may affect your records. Continue?"
- After confirmation:
  - Recalculate all SELL transactions
  - Update unrealized P&L for current holdings
  - Refresh all views
  - Show toast: "Cost basis method changed to LIFO. All gains recalculated."

**Performance:**

- Recalculation for 1,000 transactions with 200 sells: ~500ms
- Non-blocking: Show progress spinner

---

# 9. STOCK SPLITS HANDLING

## 9.1 Split Detection

**Automatic Detection (Future Enhancement):**

- When fetching historical prices, detect significant ratio changes
- Example: AAPL price on 2020-08-30 = $500, on 2020-08-31 = $125
- Ratio: 500/125 = 4.0 → Likely a 4-for-1 split
- Show notification: "Possible stock split detected for AAPL on 2020-08-31 (4:1 ratio). Add to records?"

**Manual Entry (MVP):**

- User enters split information manually
- Access: Settings → Securities → Select ticker → "Add Split" button

## 9.2 Split Entry Form

**Form Fields:**

- **Ticker** (auto-filled if accessed from security row, else dropdown)
- **Date** (date picker, required)
  - Effective date of split
- **Ratio** (number input, required)
  - Placeholder: "2.0 for 2-for-1 split"
  - Validation: Must be > 0
  - Help text: "Enter 2 for 2-for-1 split, 0.5 for 1-for-2 reverse split"

**Examples Shown:**

- 2-for-1 split: Enter 2.0
- 3-for-1 split: Enter 3.0
- 1-for-2 reverse split: Enter 0.5
- 1-for-10 reverse split: Enter 0.1

**On Save:**

1. Validate inputs
2. Create row in splits.csv with applied=false
3. Show confirmation dialog: "Apply split adjustment to historical transactions?"
   - "Yes, Apply Now" → Triggers adjustment
   - "No, I'll Apply Later" → Saves split but doesn't adjust

## 9.3 Split Adjustment Logic

**When Split Applied:**

```
For each transaction WHERE ticker = split_ticker AND date < split_date:
  If type == BUY or SELL or DIVIDEND:
    new_quantity = old_quantity × split_ratio
    new_price = old_price / split_ratio
    # Cost basis remains unchanged

For each price record WHERE ticker = split_ticker AND date < split_date:
  new_close = old_close / split_ratio
```

**Example:**

```
Split: AAPL 4-for-1 on 2020-08-31

Before Split:
- Transaction: 2020-01-15, BUY 100 shares @ $320, cost = $32,000
- Price: 2020-08-30, close = $500

After Split:
- Transaction: 2020-01-15, BUY 400 shares @ $80, cost = $32,000 ✓
- Price: 2020-08-30, close = $125 ✓
```

**Process:**

1. Get split record from splits.csv
2. Filter all transactions for this ticker before split date
3. Update quantity and price fields for each transaction
4. Update all price records before split date
5. Mark split as applied=true in splits.csv
6. Rewrite transactions.csv and prices.csv
7. Reload data into memory
8. Recalculate holdings and NAV
9. Show success: "Split adjustment applied. 45 transactions updated."

**Validation:**

- Prevent applying same split twice (check applied flag)
- Warn if split date is before any transactions for this ticker
  - "Split date is before your first transaction. No adjustments needed."

## 9.4 Split Unapply (Reversal)

**Use Case:** User applied split by mistake or entered wrong ratio

**Access:** Settings → Securities → Select ticker → Split history table → "Unapply" button

**Confirmation Dialog:**

- "Unapply split adjustment for AAPL 4-for-1 on 2020-08-31?"
- "This will reverse all quantity and price adjustments. Your original data will be restored."
- Buttons: "Cancel" / "Unapply Split"

**Process:**

1. Reverse all adjustments (divide quantities by ratio, multiply prices by ratio)
2. Mark split as applied=false
3. Rewrite files and reload
4. Show success: "Split adjustment reversed."

## 9.5 Split History Display

**Location:** Settings → Securities → Select ticker → "Split History" tab

**Table:**
| Date | Ratio | Status | Actions |
|------|-------|--------|---------|
| 2020-08-31 | 4.0 | Applied | Unapply |
| 2024-06-10 | 10.0 | Not Applied | Apply |

**Actions:**

- Apply: Triggers adjustment
- Unapply: Reverses adjustment
- Delete: Removes split record (only if not applied)

---

# 10. PERFORMANCE METRICS

## 10.1 Time Period Returns

**Supported Periods:**

- **MTD** (Month-to-Date): From 1st of current month to today
- **1M** (1 Month): From 30 days ago to today
- **3M** (3 Months): From 90 days ago to today
- **6M** (6 Months): From 180 days ago to today
- **YTD** (Year-to-Date): From Jan 1 of current year to today
- **1Y** (1 Year): From 365 days ago to today
- **3Y** (3 Years): From 3 years ago to today
- **5Y** (5 Years): From 5 years ago to today (future)
- **All** (All-Time): From first transaction to today

## 10.2 Return Calculation

### 10.2.1 Time-Weighted Return (TWR)

**Formula:**

```
TWR = ((Ending NAV - Net Deposits) / Beginning NAV) - 1

Where:
- Ending NAV = NAV on end date
- Beginning NAV = NAV on start date
- Net Deposits = Total deposits - Total withdrawals during period
```

**Why TWR:**

- Eliminates impact of cash flows (deposits/withdrawals)
- Measures investment performance independent of investor actions
- Industry standard for comparing with benchmarks

**Example:**

```
Period: 2024-01-01 to 2024-12-02

Beginning NAV (Jan 1): $100,000
Ending NAV (Dec 2): $125,432
Net Deposits during period: $10,000 (deposited on Jun 1)

TWR = ((125,432 - 10,000) / 100,000) - 1
    = (115,432 / 100,000) - 1
    = 1.15432 - 1
    = 0.15432
    = +15.43%
```

### 10.2.2 Annualized Return

**Formula:**

```
Annualized Return = ((1 + Total Return) ^ (365 / days)) - 1
```

**Applied to periods ≥ 1 year:**

- 1Y: Annualized
- 3Y: Annualized
- All-Time: Annualized

**Example:**

```
3Y Total Return: +50%
Days: 1,095 (3 years)

Annualized = ((1 + 0.50) ^ (365 / 1,095)) - 1
           = (1.50 ^ 0.3333) - 1
           = 1.1447 - 1
           = +14.47% per year
```

## 10.3 Performance Display

### 10.3.1 Performance Summary Table

**Location:** Dashboard, below NAV card

**Table Layout:**

| Period | Your Return          | S&P 500             | Difference | Status            |
| ------ | -------------------- | ------------------- | ---------- | ----------------- |
| MTD    | +2.5%                | +1.8%               | +0.7%      | ✓ Outperforming   |
| 1M     | +3.2%                | +2.1%               | +1.1%      | ✓ Outperforming   |
| 3M     | +8.5%                | +7.2%               | +1.3%      | ✓ Outperforming   |
| 6M     | +12.8%               | +14.1%              | -1.3%      | ✗ Underperforming |
| YTD    | +18.3%               | +20.5%              | -2.2%      | ✗ Underperforming |
| 1Y     | +22.7%               | +24.3%              | -1.6%      | ✗ Underperforming |
| 3Y     | +45.2% (13.2% ann.)  | +38.9% (11.6% ann.) | +6.3%      | ✓ Outperforming   |
| All    | +125.4% (18.5% ann.) | +95.2% (14.8% ann.) | +30.2%     | ✓ Outperforming   |

**Features:**

- Color coding:
  - Your Return: Bold, primary color
  - Positive difference: Green text, ✓ icon
  - Negative difference: Red text, ✗ icon
- Annualized returns shown in parentheses for 1Y+
- Sortable columns
- Click row: Expands to show detailed breakdown

### 10.3.2 Quick Stats Cards (Dashboard)

**Four Cards in a Row:**

**Card 1: Total Gain/Loss**

```
┌─────────────────────────┐
│ Total Gain/Loss         │
│ $45,432.18              │
│ +56.79%                 │
│ All-time                │
└─────────────────────────┘
```

**Card 2: Realized Gains**

```
┌─────────────────────────┐
│ Realized Gains          │
│ $12,345.67              │
│ From 45 trades          │
│ YTD: $5,432.10          │
└─────────────────────────┘
```

**Card 3: Unrealized Gains**

```
┌─────────────────────────┐
│ Unrealized Gains        │
│ $33,086.51              │
│ +42.37%                 │
│ Current holdings        │
└─────────────────────────┘
```

**Card 4: Total Dividends**

```
┌─────────────────────────┐
│ Dividend Income         │
│ $3,241.89               │
│ YTD: $1,234.56          │
│ Avg yield: 2.1%         │
└─────────────────────────┘
```

---

# 11. BENCHMARK COMPARISON

## 11.1 S&P 500 Benchmark

**Ticker:** ^GSPC (S&P 500 Index)

**Data Source:** Twelve Data API

**Initial Load:**

- Fetch historical daily closes for ^GSPC from user's first transaction date to today
- Store in prices.csv like any other ticker
- Size: ~10-20 years of data = ~2,500-5,000 rows

**Daily Updates:**

- Update alongside user's holdings
- Fetch latest ^GSPC price
- 1 API call per day

## 11.2 Performance Chart

### 11.2.1 Chart Layout

**Location:** Dashboard, main chart (full width)

**Chart Type:** Line chart with two series

**X-Axis:**

- Time (dates)
- Range based on selected period (1M, 3M, 6M, YTD, 1Y, 3Y, All)
- Format: "Jan 2024", "Feb", "Mar" (month abbreviations)

**Y-Axis:**

- Cumulative return percentage (%)
- Range: Auto-scale based on data (-20% to +50%, for example)
- Grid lines every 10%

**Two Lines:**

1. **Your Portfolio** (primary color, blue, thicker line)
   - Data points: Daily NAV converted to % return from period start
2. **S&P 500** (secondary color, gray, thinner line)
   - Data points: Daily ^GSPC price converted to % return from period start

**Normalization:**

- Both lines start at 0% on the start date
- Y-value = ((Current Value / Start Value) - 1) × 100

**Example:**

```
Period: YTD (Jan 1 - Dec 2, 2024)

Your Portfolio:
- Jan 1 NAV: $100,000 → 0%
- Jun 1 NAV: $110,000 → +10%
- Dec 2 NAV: $118,300 → +18.3%

S&P 500:
- Jan 1 Price: 4,700 → 0%
- Jun 1 Price: 5,265 → +12.0%
- Dec 2 Price: 5,662 → +20.5%
```

### 11.2.2 Time Period Selector

**UI Component:** Segmented control / tab bar above chart

**Tabs:**

```
[ 1M ] [ 3M ] [ 6M ] [ YTD ] [ 1Y ] [ 3Y ] [ All ]
```

**Behavior:**

- Click tab: Updates chart to show selected period
- Default: YTD
- Persists selection in local state (not in settings.csv)

**Data Loading:**

- On period change:
  - Calculate date range
  - Filter NAV data and ^GSPC data for range
  - Normalize both to 0% at start
  - Render chart
  - Target: <50ms (smooth transition)

### 11.2.3 Chart Interactions

**Hover/Tooltip:**

- On hover over any point:
  - Show tooltip with date, your return, S&P return
  - Example:
    ```
    Jun 15, 2024
    Your Portfolio: +12.3% ($112,300)
    S&P 500: +10.8%
    ```
  - Vertical crosshair line
  - Highlight both data points

**Zoom (Future Enhancement):**

- Pinch to zoom on chart
- Drag to pan
- Reset zoom button

**Legend:**

- Top-right corner
- ■ Your Portfolio (blue)
- ■ S&P 500 (gray)
- Clickable to toggle series visibility

### 11.2.4 Chart Library

**Library:** Recharts (React charts based on D3)

**Why Recharts:**

- Native React components
- Responsive
- Customizable
- Good performance (handles 1000s of data points)

**Chart Component:**

- `<LineChart>`
- `<Line>` for each series
- `<Tooltip>` for hover
- `<Legend>`
- `<CartesianGrid>` for grid lines

## 11.3 Relative Performance Display

**Additional Visualization:** Area chart showing difference between your portfolio and S&P 500

**Chart Type:** Area chart with single series

**Y-Axis:** Percentage point difference

- Positive area (green): You're outperforming
- Negative area (red): You're underperforming
- Zero line: Performance matches benchmark

**Example:**

```
Date: Jun 15
Your return: +12.3%
S&P return: +10.8%
Difference: +1.5 percentage points → Green area above zero line
```

**Toggle:** Button to switch between "Absolute Returns" and "Relative Performance" views

---

# 12. IMPORT & EXPORT

## 12.1 CSV Import

### 12.1.1 Import Flow

**Step 1: File Selection**

- Button: "Import CSV" (Transactions page, Dashboard)
- Click → Native file picker opens
- File type filter: .csv files only
- User selects file

**Step 2: File Parse & Validation**

1. Read file, detect encoding (UTF-8, UTF-16, ISO-8859-1)
2. Detect delimiter (comma, semicolon, tab)
3. Parse first row as headers
4. Parse all data rows

**Step 3: Column Mapping**

- Auto-detect columns by header name (case-insensitive fuzzy match):

  - "Date", "Transaction Date", "Trade Date" → date
  - "Stock", "Ticker", "Symbol" → ticker
  - "Type", "Action", "Transaction Type" → type
  - "Quantity", "Shares", "Units" → quantity
  - "Price", "Unit Price", "Transacted Price" → price
  - "Fees", "Fee", "Commission" → fee
  - "Stock Split Ratio", "Split Ratio" → split_ratio (optional column)

- If mapping ambiguous or missing:
  - Show mapping dialog
  - Dropdowns: CSV Column → App Field
  - User manually maps
  - Save mapping preference for future imports

**Step 4: Data Validation**

- For each row:
  - Date: Valid format, not future
  - Type: Recognized value (BUY/SELL/etc.), normalize case
  - Quantity/Price: Positive numbers, valid format
  - Currency: Detected from ticker or default to USD
- Collect errors:

  - Row 15: Invalid date "13/32/2024"
  - Row 23: Missing quantity for BUY transaction
  - Row 47: Negative price "-10.50"

- If errors found:
  - Show error table with row numbers and messages
  - Options: "Skip Invalid Rows" / "Cancel Import"

**Step 5: Preview**

- Show first 10 + last 3 rows in table
- Summary stats:

  - Total rows: 250
  - Valid: 248
  - Invalid: 2
  - Breakdown: 150 BUY, 50 SELL, 40 DIVIDEND, 8 FEE
  - New tickers: AAPL, GOOGL, TSLA (will fetch metadata)

- Buttons: "Import Valid Rows" / "Cancel"

**Step 6: Import Process**

1. For each valid row:
   - Generate unique ID
   - Set created_at, updated_at timestamps
   - Normalize ticker format
   - Add to transactions list
2. Sort by date
3. Append to transactions.csv (or rewrite entire file sorted)
4. Detect new tickers, queue metadata & price fetch
5. If split ratios present: Create split records in splits.csv
6. Show progress: "Importing... 150/248"

**Step 7: Post-Import**

- Success notification: "Imported 248 transactions successfully"
- If new tickers: "Fetching data for 3 new securities..."
- If splits detected:
  - Dialog: "3 stock splits detected. Apply adjustments now?"
  - Options: "Apply Now" / "Skip for Now"
- Refresh all views

### 12.1.2 Import Error Handling

**Duplicate Detection:**

- Check if transaction with same date, ticker, type, quantity, price already exists
- If found: Mark as potential duplicate
- Show warning: "15 potential duplicates found. Import anyway?"
- Options: "Import All" / "Skip Duplicates" / "Review Each"

**Currency Auto-Detection:**

- NASDAQ:xxx, NYSE:xxx → USD
- .HK → HKD
- .TW → TWD
- .T → JPY
- Unknown → Default to USD, allow user to change

**Type Normalization:**

- Accept variations: "buy", "Buy", "BUY", "purchase"
- Normalize to uppercase: BUY, SELL, DIVIDEND, FEE, DEPOSIT, WITHDRAWAL
- If unrecognized: Show error "Row 25: Invalid type 'sale'. Did you mean 'SELL'?"

**Large File Handling:**

- If >10,000 rows: Show warning "Large file. Import may take a minute."
- Stream processing (don't load entire file into memory)
- Progress bar: "Processing... 5,432 / 12,000"

### 12.1.3 Import Settings

**Settings Page → Import Preferences:**

- **Default currency:** Dropdown (USD, HKD, JPY, TWD)
  - Used when currency cannot be auto-detected
- **Duplicate check:** Checkbox "Check for duplicates during import" (default: on)
- **Auto-fetch prices:** Checkbox "Fetch price data for new tickers automatically" (default: on)
- **Column mapping presets:**
  - Save current mapping: Button "Save as Preset"
  - Load saved mapping: Dropdown of presets, "Load Preset"
  - Useful for regular imports from same broker

## 12.2 CSV Export

### 12.2.1 Export Transactions

**Access:** Transactions page → "Export CSV" button

**Export Dialog:**

**Section 1: Filters**

- **Date Range:**

  - Radio buttons: All time / YTD / Last year / Custom range
  - Custom: Date pickers for start and end

- **Transaction Types:**

  - Checkboxes: BUY, SELL, DIVIDEND, FEE, DEPOSIT, WITHDRAWAL
  - Default: All selected

- **Tickers:**

  - Multi-select dropdown
  - Options: All / Select specific tickers
  - Search within dropdown

- **Currencies:**
  - Checkboxes: USD, HKD, JPY, TWD, Other
  - Default: All

**Section 2: Options**

- **Sort order:**

  - Radio: Date ascending (oldest first) / Date descending (newest first)
  - Default: Ascending

- **Include columns:**

  - Checkboxes: All / Select specific columns
  - Options: ID, Date, Ticker, Type, Quantity, Price, Fee, Currency, Notes, Created At, Updated At
  - Default: All except ID, Created At, Updated At

- **Additional columns:** (calculated, optional)

  - Checkbox: Market Value (at transaction date)
  - Checkbox: Cumulative Holdings (after transaction)

- **File format:**
  - Radio: CSV (comma-separated) / TSV (tab-separated) / Excel CSV (with BOM)
  - Default: CSV

**Section 3: Output**

- **Filename:**

  - Text input
  - Default: `portfolio-transactions-YYYY-MM-DD.csv`
  - Editable

- **Buttons:**
  - "Cancel"
  - "Export" (primary)

**Export Process:**

1. Filter transactions based on criteria
2. Sort per selection
3. Generate CSV data
4. Trigger download
5. Show success: "Exported 150 transactions to portfolio-transactions-2024-12-02.csv"

### 12.2.2 Export Holdings

**Access:** Holdings page → "Export Holdings" button

**CSV Format:**

```csv
Ticker,Name,Quantity,Avg Cost Basis,Current Price,Cost Basis (USD),Market Value (USD),Unrealized P&L (USD),Unrealized P&L %,Allocation %
NASDAQ:AAPL,Apple Inc.,100,175.50,189.50,17550.00,18950.00,1400.00,7.98%,12.5%
0700.HK,Tencent Holdings Ltd,200,425.00,440.00,10830.40,11264.00,433.60,4.00%,7.4%
```

**Filename:** `portfolio-holdings-YYYY-MM-DD.csv`

**Use Cases:**

- Snapshot for external analysis
- Share with financial advisor
- Import into other tools (Excel, Google Sheets)

### 12.2.3 Full Data Export

**Access:** Settings page → "Export All Data" button

**Creates ZIP file containing:**

- transactions.csv
- prices.csv
- fx_rates.csv
- securities.csv
- splits.csv
- settings.csv (with API key masked)

**Filename:** `portfolio-full-backup-YYYY-MM-DD.zip`

**Use Cases:**

- Complete backup
- Migrate to another device
- Data portability

**Process:**

1. Copy all 6 CSV files to temp directory
2. Compress into ZIP
3. Trigger download
4. Clean up temp files
5. Success: "Full data exported"

---

# 13. BACKUP & RECOVERY

## 13.1 Automatic Backups

**Trigger:** Before every CSV file save operation

**Process:**

1. Check if target file (e.g., transactions.csv) exists
2. If exists:
   - Create backup directory for today (if not exists): `backups/YYYY-MM-DD-HHMM/`
   - Copy current file to backup directory
   - Continue with save operation

**Backup Retention:**

- Keep last 30 backups
- Purge backups older than 30 days automatically
- Run purge check daily on app start

**Storage:**

- Typical backup size: ~3MB (all 6 files)
- 30 backups: ~90MB total
- Negligible on modern systems

**Backup Visibility:**

- Settings page shows:
  - "Last backup: 2 hours ago (Dec 2, 2024 10:30 AM)"
  - "Backup storage: 87 MB (28 backups)"
  - Button: "Open Backup Folder" (opens in Finder/Explorer)

## 13.2 Manual Backup

**Access:** Settings page → "Create Backup Now" button

**Process:**

1. Create timestamped ZIP file with all 6 CSVs
2. Native file picker to choose save location
3. Default location: Desktop
4. Default filename: `portfolio-backup-YYYY-MM-DD-HHMM.zip`
5. User selects location and confirms
6. Create and save ZIP
7. Success toast: "Backup created successfully"

**Scheduled Backups (Future Enhancement):**

- Setting: "Automatic backup frequency"
  - Options: Never / Daily / Weekly / Monthly
- Setting: "Backup location"
  - File picker to select folder (e.g., Dropbox, iCloud Drive)
- App creates backup on schedule, saves to location

## 13.3 Data Restore

**Access:** Settings page → "Restore from Backup" button

**Restore Flow:**

**Step 1: Backup Selection**

- File picker to select backup ZIP or individual CSV
- Can select:
  - Full backup ZIP (from manual backup)
  - Individual CSV from backups/ directory

**Step 2: Preview**

- Show backup info:
  - Backup date: Dec 1, 2024 10:30 AM
  - Transaction count: 1,234
  - Date range: Jan 15, 2018 - Dec 1, 2024
  - Number of tickers: 18
  - NAV on backup date: $120,543.21

**Step 3: Confirmation**

- Warning dialog:
  - Title: "Restore Data from Backup?"
  - Message: "This will overwrite all current data. Your current data will be backed up before restore."
  - Checkbox: "I understand this will replace all current data"
  - Type to confirm: "RESTORE" (required)
  - Buttons: "Cancel" / "Restore" (destructive red, disabled until confirmed)

**Step 4: Restore Process**

1. Create backup of current data (safety net)
2. Extract backup ZIP to temp directory
3. Validate all CSV files (check format, required columns)
4. If validation passes:
   - Copy backup CSVs over current CSVs
   - Reload all data into memory
   - Rebuild indexes
   - Refresh all views
5. Success notification: "Data restored from Dec 1, 2024 backup"

**Step 5: Post-Restore**

- Show banner: "Data restored. Refreshing prices is recommended."
- Button: "Refresh Prices Now"

**Error Handling:**

- Invalid backup file: "Backup file is corrupt or invalid"
- Validation fails: "Backup data has errors. Restore cancelled."
- Restore fails mid-process: Auto-rollback to pre-restore state

## 13.4 Merge Import (Future Enhancement)

**Use Case:** Recover accidentally deleted transactions without overwriting everything

**Flow:**

1. Select backup file
2. Show comparison:
   - Current data: 1,234 transactions
   - Backup data: 1,250 transactions
   - Difference: 16 transactions in backup not in current
3. Options:
   - "Import Missing Transactions" (add 16 to current)
   - "Show Conflicts" (transactions different between current and backup)
4. Conflict resolution UI:
   - Side-by-side comparison
   - Radio buttons: Keep Current / Use Backup / Skip
5. Apply merge
6. Success: "Merged 16 transactions from backup"

---

# 14. SETTINGS & PREFERENCES

## 14.1 Settings Page Layout

**Navigation:** Settings icon in sidebar or header

**Page Structure:** Tabbed interface

**Tabs:**

1. General
2. API Keys
3. Securities
4. Calculation
5. Data Management
6. About

### 14.1.1 General Tab

**Section: Appearance**

- **Theme:**
  - Radio buttons: Light / Dark / System (default)
  - Changes immediately

**Section: Display**

- **Base Currency:**
  - Dropdown: USD (locked for MVP)
  - Help text: "Currency for all reports and NAV display"
- **Display Currencies:**
  - Multi-select checkboxes: USD, HKD, JPY, TWD, EUR, GBP, SGD, CNY
  - Help text: "Additional currencies to show in NAV card"

**Section: Updates**

- **Auto-refresh prices on app start:**
  - Toggle switch (on/off)
  - Default: On
  - Help text: "Fetch latest prices when app launches"

### 14.1.2 API Keys Tab

**Section: Twelve Data**

- **API Key:**
  - Text input (password field, masked)
  - Show/Hide button (eye icon)
  - Help text: "Get your free API key at twelvedata.com"
  - Link: "Get API Key" (opens https://twelvedata.com)
- **Test Connection:**

  - Button: "Test Connection"
  - On click: Makes test API call
  - Shows result: "✓ Connected successfully" (green) or "✗ Connection failed: Invalid API key" (red)

- **API Usage:**
  - Display: "API Calls Today: 425 / 800"
  - Progress bar (color-coded: green/yellow/red)
  - Help text: "Resets daily at midnight UTC"

**Section: CoinGecko** (Future, if API key required)

- Similar to Twelve Data section

### 14.1.3 Securities Tab

**Securities List** (embedded table)

- See section 5.2 for full spec
- Columns: Ticker, Name, Exchange, Type, Sector, Actions
- Actions: Edit, Refresh, Delete
- Button: "Add Security Manually"

### 14.1.4 Calculation Tab

**Section: Cost Basis Method**

- **Method:**

  - Radio buttons:
    - FIFO (First In, First Out) - Recommended
    - LIFO (Last In, First Out)
    - Specific Identification (Coming Soon - disabled)
  - Help text with examples for each method

- **Change Warning:**
  - When user changes method: Show confirmation dialog
  - "Changing cost basis method will recalculate all realized gains. Continue?"

**Section: Split Adjustments**

- **Splits Applied:**
  - List of all splits with status
  - See section 9.5 for full spec

### 14.1.5 Data Management Tab

**Section: Import/Export**

- Button: "Import Transactions from CSV"
- Button: "Export Transactions to CSV"
- Button: "Export Current Holdings"
- Button: "Export All Data" (ZIP)

**Section: Backup & Restore**

- Display: "Last backup: 2 hours ago"
- Display: "Backup storage: 87 MB (28 backups)"
- Button: "Create Backup Now"
- Button: "Restore from Backup"
- Button: "Open Backup Folder"
- Setting: "Backup retention period"
  - Dropdown: 7 / 14 / 30 / 60 / 90 days
  - Default: 30 days

**Section: Data Location**

- Display: "Data directory: /Users/kf/Library/Application Support/PortfolioManager"
- Button: "Open Data Folder" (opens in Finder)
- Button: "Change Data Location" (move all files to new directory)

**Section: Danger Zone** (red background)

- Button: "Clear All Data" (red, destructive)
- On click: Confirmation dialog
  - Title: "Clear All Data?"
  - Message: "This will permanently delete all transactions, prices, and settings. A final backup will be created."
  - Type to confirm: "DELETE ALL DATA"
  - Buttons: "Cancel" / "Clear All Data" (red)

### 14.1.6 About Tab

**App Information:**

- App name: Portfolio Manager
- Version: 1.0.0
- Build: 2024.12.02
- Platform: macOS (Apple Silicon / Intel)

**Credits:**

- Built with: Rust, Tauri, React, shadcn/ui
- Data sources: Twelve Data, CoinGecko
- License: MIT (or proprietary)

**Links:**

- Website: https://example.com
- GitHub: https://github.com/username/portfolio-manager
- Support: support@example.com

**Data Location:**

- Display: Full path to data directory
- Button: "Open in Finder"

**Logs:**

- Button: "Export Logs" (for troubleshooting)
- Downloads app.log file

---

# 15. DASHBOARD LAYOUT

## 15.1 Dashboard Structure

**Main Content Area (scrollable):**

### Section 1: NAV Hero (Top)

- Large NAV card (full width)
  See section 7.2.1 for full spec

### Section 2: Quick Stats Row

- 4 cards in equal width
- See section 10.3.2 for full spec
- Cards: Total Gain/Loss, Realized Gains, Unrealized Gains, Total Dividends

### Section 3: Performance Chart (Full Width)

- Line chart: Your portfolio vs S&P 500
- Time period selector above chart
- See section 11.2 for full spec

### Section 4: Two-Column Layout

**Left Column (60% width):**

**Top Holdings Table:**

- Title: "Top Holdings"
- Table with 5 largest holdings by market value
- Columns: Ticker, Market Value, Allocation %, Unrealized P&L
- Link: "View All Holdings →"

**Recent Transactions:**

- Title: "Recent Transactions"
- Last 10 transactions
- Compact view: Date, Ticker, Type badge, Amount
- Link: "View All Transactions →"

**Right Column (40% width):**

**Allocation Breakdown Pie Chart:**

- Title: "Allocation by Currency"
- Pie chart with labels
- Legend: USD 60%, HKD 25%, JPY 10%, TWD 5%
- Interactive: Click slice to filter holdings

**Performance Summary:**

- Title: "Performance vs S&P 500"
- Mini table with key periods
- Rows: YTD, 1Y, 3Y, All
- Columns: Your Return, S&P 500, Difference
- Color-coded differences

### Section 5: System Status (Bottom)

- Last price update timestamp
- API calls remaining today
- Backup status
- Small, unobtrusive

## 15.2 Responsive Behavior

**Desktop (>1280px):**

- Full layout as described above
- Sidebar visible
- Two-column layout

**Tablet (768px - 1280px):**

- Sidebar collapsible
- Two-column layout becomes single column (stack)
- Charts remain full width

**Mobile (<768px):** (Future)

- Simplified dashboard
- Single column
- Prioritize NAV, quick stats, recent transactions
- Charts simplified or hidden

---

# 16. ERROR HANDLING & LOGGING

## 16.1 Error Categories

### 16.1.1 User Errors (Recoverable)

- Invalid form input
- Attempting to sell more than owned
- Deleting transaction with dependencies
- Importing invalid CSV

**Handling:**

- Show inline validation messages
- Block action until corrected
- Provide helpful error text
- No logging needed (expected user behavior)

### 16.1.2 Data Errors (Recoverable)

- Corrupt CSV file
- Missing price data
- FX rate unavailable
- Holdings calculation mismatch

**Handling:**

- Show notification with explanation
- Offer recovery options (restore from backup, skip, manual fix)
- Log to app.log with WARN level
- Don't crash app

### 16.1.3 System Errors (Potentially Unrecoverable)

- Out of memory
- Disk full
- File permission denied
- Unable to write to data directory

**Handling:**

- Show error dialog with details
- Log to app.log with ERROR level
- Attempt graceful shutdown
- Suggest user actions (free disk space, check permissions)

### 16.1.4 Network Errors (Transient)

- API request timeout
- Rate limit exceeded
- Network unavailable
- DNS resolution failed

**Handling:**

- Retry with exponential backoff
- Show notification if user-initiated (manual refresh)
- Log to app.log with INFO level
- Enter offline mode gracefully

## 16.2 Logging

**Log File Location:** `~/Library/Application Support/PortfolioManager/logs/app.log`

**Log Levels:**

- **DEBUG:** Verbose, development only
- **INFO:** Informational messages (API calls, file operations)
- **WARN:** Warnings (missing data, using fallbacks)
- **ERROR:** Errors (recoverable failures)
- **CRITICAL:** Critical errors (app cannot continue)

**Log Format:**

```
[2024-12-02 10:30:45.123] [INFO] [price_fetcher] Fetching prices for 20 tickers
[2024-12-02 10:30:46.456] [WARN] [price_fetcher] Price unavailable for TSLA on 2024-12-02, using 2024-12-01
[2024-12-02 10:30:50.789] [ERROR] [api_client] API request failed: Rate limit exceeded (HTTP 429)
```

**Log Rotation:**

- Max file size: 10MB
- Keep last 5 log files
- Rotate on size limit or daily

**Log Viewing:**

- Settings → About → "Export Logs" button
- Opens file picker, saves app.log
- For user to share when requesting support

## 16.3 Error Notifications

### 16.3.1 Toast Notifications (Transient)

- Success: Green, auto-dismiss after 3 seconds
- Info: Blue, auto-dismiss after 5 seconds
- Warning: Yellow, auto-dismiss after 5 seconds or manual dismiss
- Error: Red, manual dismiss required

**Examples:**

- Success: "Transaction added successfully"
- Info: "Prices updated for 20 securities"
- Warning: "Price data outdated for 3 securities. Refresh recommended."
- Error: "Failed to save transaction. Please try again."

### 16.3.2 Banner Notifications (Persistent)

- Shown at top of page until dismissed or resolved
- Types: Info, Warning, Error

**Examples:**

- Info: "Offline. Prices may be outdated."
- Warning: "API key not configured. Price updates disabled."
- Error: "Data file corrupted. Restore from backup recommended."

### 16.3.3 Error Dialogs (Blocking)

- For critical errors requiring user action
- Modal dialog with explanation and options

**Example:**

```
Title: "Unable to Load Data"
Message: "transactions.csv could not be loaded. The file may be corrupt."
Options:
  - Restore from Latest Backup
  - Try to Repair
  - View Error Details
  - Start Fresh
```

## 16.4 Data Validation Errors

**On CSV Load:**

- Invalid row detected → Log error with row number
- Continue loading valid rows
- Show summary notification: "Loaded 1,234 transactions. 5 rows skipped due to errors."
- Button: "View Errors" (opens list of skipped rows with reasons)

**On Transaction Save:**

- Validation fails → Show inline error under field
- Block save until corrected
- Don't log (expected user behavior)

**On Holdings Calculation:**

- Mismatch detected → Log warning
- Show notification: "Holdings calculation error for AAPL. Expected 100, calculated 95. Review transactions."
- Link: "Review AAPL Transactions" (filters transaction list)

---

# 17. PERFORMANCE REQUIREMENTS

## 17.1 Load Time Targets

**App Launch:**

- Cold start (no cache): < 150ms
- Hot start (cached): < 50ms

**CSV Loading:**

- transactions.csv (10k rows): < 50ms
- prices.csv (25k rows): < 35ms
- fx_rates.csv (6k rows): < 10ms
- All files combined: < 100ms

**Page Navigation:**

- Dashboard → Holdings: < 50ms
- Any page transition: < 100ms

## 17.2 Interaction Responsiveness

**Transaction Entry:**

- Form open: < 50ms
- Form field input: < 16ms (60fps)
- Save transaction: < 100ms

**Transaction List:**

- Render 50 rows: < 50ms
- Scroll: 60fps (< 16ms per frame)
- Filter/search: < 100ms

**Charts:**

- Render chart (365 data points): < 100ms
- Period change: < 50ms
- Hover/tooltip: < 16ms (60fps)

## 17.3 Data Operations

**NAV Calculation:**

- Calculate current NAV: < 10ms
- Calculate historical NAV (365 days): < 50ms

**Holdings Calculation:**

- Calculate all holdings (20 tickers): < 10ms

**Price Fetch:**

- Fetch 20 latest prices (batch API): < 2 seconds
- Fetch historical prices for 1 ticker: < 3 seconds

**Cost Basis Calculation:**

- FIFO/LIFO for single SELL: < 5ms
- Recalculate all realized gains (200 sells): < 500ms

## 17.4 Memory Usage

**Target:** < 200MB RAM for typical portfolio

**Breakdown:**

- App framework (Tauri + React): ~50MB
- In-memory data:
  - 10k transactions: ~20MB
  - 25k prices: ~15MB
  - Other data: ~5MB
- UI components: ~30MB
- Chart rendering: ~20MB
- Buffer: ~60MB

**Optimization:**

- Lazy load prices (only when needed)
- Virtual scrolling for large tables
- Unload off-screen chart data

## 17.5 Disk Usage

**Data Files:**

- transactions.csv: ~1.5MB (10k rows)
- prices.csv: ~1MB (25k rows)
- fx_rates.csv: ~220KB
- Other CSVs: ~10KB
- **Total: ~3MB**

**Backups:**

- 30 backups × 3MB = ~90MB

**Logs:**

- app.log: ~10MB (with rotation)

**Total Disk Usage: ~100MB**

## 17.6 Scalability Limits (MVP)

**Supported Portfolio Size:**

- Transactions: Up to 50,000 (tested)
- Tickers: Up to 100
- Price history: Up to 10 years per ticker
- Load time at max: ~500ms (acceptable)

**Beyond MVP:**

- For larger portfolios: Consider SQLite or pagination
- For 100+ tickers: Per-ticker price CSV files
- For 10+ years: Archive old transactions

---

# 18. SECURITY & PRIVACY

## 18.1 Data Storage Security

**Local Storage Only:**

- All data stored on user's device
- No cloud sync (MVP)
- No telemetry, analytics, or tracking
- App never sends data to any server except:
  - Twelve Data API (for prices)
  - CoinGecko API (for crypto prices)

**File Permissions:**

- Data files: User read/write only (chmod 600)
- Config files: User read/write only
- No world-readable files

**API Key Storage:**

- Stored in settings.csv in plain text (MVP)
- Masked in UI (password field)
- Future: Store in OS keychain (macOS Keychain, Windows Credential Manager)

## 18.2 Network Security

**HTTPS Only:**

- All API calls use HTTPS
- Certificate validation enforced
- No insecure HTTP connections

**API Endpoints:**

- Twelve Data: https://api.twelvedata.com/
- CoinGecko: https://api.coingecko.com/

**No Third-Party Analytics:**

- No Google Analytics, Mixpanel, etc.
- No crash reporting services (MVP)
- No advertising SDKs

## 18.3 Privacy Guarantees

**No Personal Data Collection:**

- App doesn't collect name, email, address
- No registration or login required
- No user accounts

**Local Processing:**

- All calculations done locally
- No server-side processing
- No data uploaded to any cloud service

**Data Export Control:**

- User explicitly controls all exports
- No automatic uploads or syncing
- User can delete all data anytime

## 18.4 Audit Trail

**Transaction History:**

- All transactions logged with timestamps
- created_at and updated_at tracked
- Cannot be modified retroactively (edit shows updated_at)

**Change Tracking:**

- Settings changes not logged (MVP)
- Future: Audit log for sensitive operations

## 18.5 Secure Delete (Future)

**Feature: Permanently delete all data**

- Overwrites all CSV files with random data
- Deletes all backup files
- Clears all cached data
- Unrecoverable deletion

**Not in MVP:** Simple file deletion sufficient

---

# 19. FUTURE ENHANCEMENTS (Post-MVP)

## 19.1 Phase 2 Features

**Sector Allocation:**

- Track sector breakdown (Technology, Healthcare, etc.)
- Compare with S&P 500 sector weights
- Pie chart visualization

**Additional Benchmarks:**

- NASDAQ Composite
- Russell 2000
- International indices (HSI, N225, FTSE)
- Custom benchmarks (user-defined index)

**Advanced Charts:**

- Drawdown chart (peak-to-trough decline)
- Allocation over time (stacked area chart)
- Dividend income over time (bar chart)
- Correlation matrix (holdings vs benchmark)

**CSV Import from Brokers:**

- Pre-built parsers for popular brokers:
  - Charles Schwab
  - Fidelity
  - Interactive Brokers
  - Robinhood
- Auto-detect broker format

**Reports:**

- Realized gains report (for tax purposes)
- Dividend income report
- Annual performance summary
- Portfolio rebalancing suggestions

## 19.2 Phase 3 Features

**Stock Dividends & Spinoffs:**

- Handle stock dividend transactions (receive shares)
- Handle spinoff events (ticker changes, new positions)

**Cloud Sync (Optional):**

- End-to-end encrypted sync
- Multi-device support
- Conflict resolution
- Privacy-first approach (no server access to data)

**Collaboration:**

- Share portfolio (read-only) with family, advisor
- Encrypted share links

**Tax Optimization:**

- Tax-loss harvesting suggestions
- Wash sale detection
- Short-term vs long-term gain tracking
- Capital gains/losses report

## 19.3 Phase 4 Features

**Mobile Apps:**

- iOS app (read-only for MVP)
- Android app (read-only for MVP)
- Sync with desktop app via local network or cloud

**Advanced Analytics:**

- Sharpe ratio, Sortino ratio, Alpha, Beta
- Maximum drawdown analysis
- Value at Risk (VaR)
- Monte Carlo simulations

**Goals & Planning:**

- Set investment goals (retirement, house, etc.)
- Track progress toward goals
- Projection charts

**Alerts:**

- Price alerts (notify when ticker reaches target price)
- Rebalancing alerts (allocation drifts >5%)
- Dividend payment reminders

**Integrations:**

- Direct broker API integration (read trades automatically)
- Google Sheets export/sync
- Zapier integration

---

# 20. TESTING REQUIREMENTS

## 20.1 Unit Tests

**Rust Backend:**

- CSV parsing and serialization
- Transaction validation logic
- NAV calculation functions
- Cost basis calculation (FIFO/LIFO)
- Holdings aggregation
- FX conversion
- Split adjustment logic

**Target:** >80% code coverage

## 20.2 Integration Tests

**File Operations:**

- Load all CSVs, verify data structure
- Save transactions, verify file updated correctly
- Backup/restore cycle, verify data integrity

**API Integration:**

- Mock API responses (Twelve Data, CoinGecko)
- Test rate limiting and backoff
- Test error handling (404, 429, 500)

**Data Flow:**

- Add transaction → Holdings updated → NAV recalculated
- Import CSV → New tickers → Metadata fetched
- Apply split → Transactions adjusted → Prices adjusted

## 20.3 End-to-End Tests

**User Workflows:**

1. New user onboarding
   - Launch app → Enter API key → Add first transaction → See dashboard
2. Daily usage
   - Launch app → Prices auto-refresh → View updated NAV → Add transaction
3. Import existing portfolio
   - Click Import CSV → Map columns → Preview → Import → Verify data
4. Performance review
   - View dashboard → Check performance chart → Compare with S&P 500
5. Backup and restore
   - Create backup → Make changes → Restore backup → Verify data reverted

## 20.4 Performance Tests

**Load Testing:**

- Load 10,000 transactions: < 100ms
- Load 50,000 transactions: < 500ms
- Calculate NAV with 100 holdings: < 20ms

**Stress Testing:**

- Import CSV with 100,000 rows
- Render transaction list with 50,000 rows
- Chart with 10 years of daily data (3,650 points)

## 20.5 Manual Testing

**UI/UX:**

- All forms functional
- All buttons clickable
- Charts interactive
- Tooltips appear on hover
- Modals open/close correctly

**Error Handling:**

- Corrupt CSV file → Graceful error
- Network offline → Offline mode works
- Rate limit hit → Backoff works
- Invalid API key → Clear error message

**Cross-Platform (Future):**

- macOS Intel vs Apple Silicon
- Windows 10 vs 11
- iOS vs Android

---

# 21. DOCUMENTATION REQUIREMENTS

## 21.1 In-App Help

**Tooltips:**

- Every form field has hover tooltip with explanation
- Every setting has help text below

**Empty States:**

- Helpful guidance when no data exists
- Call-to-action buttons (Add Transaction, Import CSV)

**Onboarding:**

- First-time user: Welcome dialog with quick setup steps
- Optional tutorial overlay highlighting key features

## 21.2 External Documentation

**User Guide:**

- Getting started tutorial
- CSV import guide with examples
- How to read performance metrics
- Troubleshooting common issues
- FAQ

**CSV Template:**

- Downloadable sample CSV with correct format
- Example rows for each transaction type
- Available from Import dialog

**API Setup Guide:**

- How to get Twelve Data API key
- How to get CoinGecko API key (if needed)
- API usage limits and best practices

## 21.3 Developer Documentation

**Code Documentation:**

- Rust code: Doc comments for all public functions
- React components: PropTypes or TypeScript interfaces
- README with build instructions

**Architecture Docs:**

- Data flow diagrams
- File structure explanation
- API integration details

**Contribution Guide:**

- How to set up dev environment
- How to run tests
- How to submit pull requests

---

# SUMMARY

This comprehensive requirements document defines a **desktop portfolio management application** with the following core characteristics:

**Data Storage:**

- Pure CSV architecture (6 files: transactions, prices, fx_rates, securities, splits, settings)
- Human-readable, Excel-editable
- Automatic backups (30-day retention)
- ~3MB storage for typical portfolio

**Key Features:**

- Multi-currency support (USD, HKD, JPY, TWD)
- Real-time NAV calculation with FX conversion
- Cost basis tracking (FIFO/LIFO)
- Stock split handling
- Performance metrics (MTD, 1M, 3M, 6M, YTD, 1Y, 3Y, All)
- S&P 500 benchmark comparison
- Interactive performance charts
- CSV import/export
- Offline-first, privacy-focused

**Performance:**

- App launch: <150ms
- NAV calculation: <10ms
- Transaction entry: <100ms
- Chart rendering: <100ms
- Supports 10,000+ transactions smoothly

**Platform:**

- macOS (MVP)
- Future: Windows, iOS, Android

**Tech Stack:**

- Rust + Tauri (backend)
- React + TypeScript + shadcn/ui (frontend)
- Recharts (charts)
- Twelve Data + CoinGecko (price data)

**Next Steps:**

1. Review and approve requirements
2. Design system architecture
3. Create UI mockups
4. Set up development environment
5. Begin iterative development
