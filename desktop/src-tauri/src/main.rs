#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::OpenOptions;
use std::fs::{create_dir_all, read_to_string, write, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::Duration;

use chrono::{DateTime, Datelike, Duration as ChronoDuration, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Clone)]
struct Transaction {
    date: String,
    stock: String,
    transaction_type: String,
    quantity: String,
    price: String,
    fees: String,
    split_ratio: String,
    currency: String,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello from Rust, {name}! 👋")
}

const FX_RATES_HEADER: &str = "currency_pair,date,rate,source,updated_at\n";
const SETTINGS_HEADER: &str = "key,value\n";
const SECURITIES_HEADER: &str =
    "ticker,name,exchange,currency,type,sector,data_source,api_symbol,last_updated\n";
#[derive(Clone, Debug)]
struct PriceRecordEntry {
    symbol: String,
    date: NaiveDate,
    close: f64,
    open: Option<f64>,
    high: Option<f64>,
    low: Option<f64>,
    volume: Option<f64>,
    source: String,
}

#[derive(Deserialize)]
struct YahooChartQuote {
    open: Option<Vec<Option<f64>>>,
    high: Option<Vec<Option<f64>>>,
    low: Option<Vec<Option<f64>>>,
    close: Option<Vec<Option<f64>>>,
    volume: Option<Vec<Option<f64>>>,
}

#[derive(Deserialize)]
struct YahooChartResult {
    timestamp: Option<Vec<i64>>,
    indicators: Option<YahooIndicators>,
}

#[derive(Deserialize)]
struct YahooIndicators {
    quote: Option<Vec<YahooChartQuote>>,
}

#[derive(Deserialize)]
struct YahooChartResponse {
    chart: Option<YahooChartData>,
}

#[allow(dead_code)]
#[derive(Deserialize)]
struct YahooChartData {
    result: Option<Vec<YahooChartResult>>,
    error: Option<YahooError>,
}

#[allow(dead_code)]
#[derive(Deserialize)]
struct YahooError {
    code: Option<String>,
    description: Option<String>,
}

fn ensure_file_with_header(file_path: &Path, header: &str) -> Result<(), String> {
    if file_path.exists() {
        return Ok(());
    }

    if let Some(parent) = file_path.parent() {
        create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory {:?}: {}", parent, e))?;
    }

    let mut file = File::create(file_path)
        .map_err(|e| format!("Failed to create file {:?}: {}", file_path, e))?;
    file.write_all(header.as_bytes())
        .map_err(|e| format!("Failed to write header for {:?}: {}", file_path, e))
}

fn read_csv_file(file_path: &str, currency: &str) -> Result<Vec<Transaction>, String> {
    let file = File::open(file_path).map_err(|e| format!("Failed to open {}: {}", file_path, e))?;

    let mut reader = csv::Reader::from_reader(file);
    let mut transactions = Vec::new();

    for result in reader.records() {
        let record = result.map_err(|e| format!("Failed to parse CSV record: {}", e))?;

        // Skip empty rows
        if record.len() >= 7 && !record.get(0).unwrap_or("").is_empty() {
            transactions.push(Transaction {
                date: record.get(0).unwrap_or("").to_string(),
                stock: record.get(1).unwrap_or("").to_string(),
                transaction_type: record.get(2).unwrap_or("").to_string(),
                quantity: record.get(3).unwrap_or("").to_string(),
                price: record.get(4).unwrap_or("").to_string(),
                fees: record.get(5).unwrap_or("").to_string(),
                split_ratio: record.get(6).unwrap_or("").to_string(),
                currency: currency.to_string(),
            });
        }
    }

    Ok(transactions)
}

#[tauri::command]
fn read_csv(app_handle: tauri::AppHandle) -> Result<String, String> {
    let resource_dir = app_handle
        .path_resolver()
        .resource_dir()
        .ok_or("Failed to get resource directory")?;

    let mut all_transactions = Vec::new();

    let files = vec![
        ("US_Trx.csv", "USD"),
        ("TW_Trx.csv", "TWD"),
        ("JP_Trx.csv", "JPY"),
        ("HK_Trx.csv", "HKD"),
    ];

    for (filename, currency) in files {
        let paths = vec![
            resource_dir.join("data").join(filename),
            std::path::PathBuf::from(format!("imported_data/{}", filename)),
            std::path::PathBuf::from(format!("../imported_data/{}", filename)),
            std::path::PathBuf::from(format!("data/{}", filename)), // legacy path for compatibility
            std::path::PathBuf::from(format!("../data/{}", filename)), // legacy path for compatibility
        ];

        for path in paths {
            if let Ok(mut txns) = read_csv_file(path.to_str().unwrap_or(""), currency) {
                all_transactions.append(&mut txns);
                break;
            }
        }
    }

    all_transactions.sort_by(|a, b| a.date.cmp(&b.date));

    // Serialize to JSON for frontend
    serde_json::to_string(&all_transactions)
        .map_err(|e| format!("Failed to serialize transactions: {}", e))
}

fn ensure_dir(path: &Path) -> Result<(), String> {
    if !path.exists() {
        create_dir_all(path)
            .map_err(|e| format!("Failed to create directory {:?}: {}", path, e))?;
    }
    Ok(())
}

fn get_exchange_and_symbol(stock: &str) -> (Option<String>, String) {
    if !stock.contains(':') {
        return (None, stock.to_string());
    }

    let mut parts = stock.splitn(2, ':');
    let first = parts.next().unwrap_or("").to_string();
    let second = parts.next().unwrap_or("").to_string();
    let known = ["NASDAQ", "NYSE", "NYSEARCA", "TWSE", "JPX", "HKEX"];

    if known.iter().any(|ex| ex == &first) {
        return (Some(first), second);
    }
    if known.iter().any(|ex| ex == &second) {
        return (Some(second), first);
    }

    (None, stock.to_string())
}

fn yahoo_symbol_for(exchange: Option<&str>, base_symbol: &str) -> String {
    match exchange {
        Some("HKEX") => format!("{}.HK", base_symbol),
        Some("TWSE") => format!("{}.TW", base_symbol),
        Some("JPX") => format!("{}.T", base_symbol),
        Some("NYSE") | Some("NASDAQ") | Some("NYSEARCA") | Some("NYSEAMERICAN") => {
            base_symbol.to_string()
        }
        Some("OTCMKTS") => base_symbol.to_string(),
        _ => base_symbol.to_string(),
    }
}

fn fetch_yahoo_chunk(
    yahoo_symbol: &str,
    canonical_symbol: &str,
    start: NaiveDate,
    end: NaiveDate,
) -> Result<Vec<PriceRecordEntry>, String> {
    let mut url = url::Url::parse(&format!(
        "https://query1.finance.yahoo.com/v8/finance/chart/{}",
        yahoo_symbol
    ))
    .map_err(|e| format!("Failed to build Yahoo URL: {}", e))?;

    url.query_pairs_mut()
        .append_pair(
            "period1",
            &start
                .and_hms_opt(0, 0, 0)
                .unwrap()
                .and_utc()
                .timestamp()
                .to_string(),
        )
        .append_pair(
            "period2",
            &end.and_hms_opt(23, 59, 59)
                .unwrap()
                .and_utc()
                .timestamp()
                .max(start.and_hms_opt(0, 0, 1).unwrap().and_utc().timestamp())
                .to_string(),
        )
        .append_pair("interval", "1d")
        .append_pair("events", "div,splits")
        .append_pair("includeAdjustedClose", "false");

    let client = reqwest::blocking::Client::new();
    let response = client
        .get(url)
        .send()
        .map_err(|e| format!("Yahoo request failed: {}", e))?;
    let text = response
        .text()
        .map_err(|e| format!("Failed to read Yahoo response: {}", e))?;

    let parsed: YahooChartResponse =
        serde_json::from_str(&text).map_err(|e| format!("Invalid Yahoo JSON: {}", e))?;

    let result = parsed
        .chart
        .and_then(|c| c.result)
        .and_then(|mut r| r.pop())
        .ok_or_else(|| "Yahoo response missing result".to_string())?;

    let timestamps = result.timestamp.unwrap_or_default();
    let quote = result
        .indicators
        .and_then(|ind| ind.quote)
        .and_then(|mut q| q.pop())
        .ok_or_else(|| "Yahoo response missing quote values".to_string())?;

    let closes = quote.close.unwrap_or_default();
    let opens = quote.open.unwrap_or_default();
    let highs = quote.high.unwrap_or_default();
    let lows = quote.low.unwrap_or_default();
    let volumes = quote.volume.unwrap_or_default();

    let mut records = Vec::new();
    for (idx, ts) in timestamps.into_iter().enumerate() {
        if let Some(datetime) = DateTime::from_timestamp(ts, 0) {
            let date = datetime.date_naive();
            if date < start || date > end {
                continue;
            }
            if let Some(Some(close)) = closes.get(idx) {
                records.push(PriceRecordEntry {
                    symbol: canonical_symbol.to_string(),
                    date,
                    close: *close,
                    open: opens.get(idx).and_then(|v| *v),
                    high: highs.get(idx).and_then(|v| *v),
                    low: lows.get(idx).and_then(|v| *v),
                    volume: volumes.get(idx).and_then(|v| *v),
                    source: "yahoo_finance".into(),
                });
            }
        }
    }

    Ok(records)
}

fn ensure_history_for_symbol(
    records_map: &mut HashMap<String, Vec<PriceRecordEntry>>,
    symbol: &str,
    earliest_date: NaiveDate,
) -> Result<(), String> {
    let today = Utc::now().date_naive();
    let (exchange, base_symbol) = get_exchange_and_symbol(symbol);

    if matches!(
        exchange.as_deref(),
        Some("HKEX") | Some("TWSE") | Some("JPX")
    ) {
        return Err(format!(
            "Historical sync for {} is currently limited to US tickers via Yahoo",
            symbol
        ));
    }

    let existing_min_date = records_map
        .get(symbol)
        .and_then(|records| records.iter().map(|r| r.date).min());
    if let Some(min_date) = existing_min_date {
        if min_date <= earliest_date {
            return Ok(());
        }
    }

    let mut chunk_end = today;
    let mut any_new = false;

    loop {
        if chunk_end < earliest_date {
            break;
        }
        let chunk_start_candidate = chunk_end - ChronoDuration::days(182);
        let chunk_start = if chunk_start_candidate > earliest_date {
            chunk_start_candidate
        } else {
            earliest_date
        };

        let yahoo_symbol = yahoo_symbol_for(exchange.as_deref(), &base_symbol);
        let new_records = fetch_yahoo_chunk(&yahoo_symbol, symbol, chunk_start, chunk_end)?;

        if new_records.is_empty() {
            break;
        }

        let entries = records_map.entry(symbol.to_string()).or_default();
        for record in new_records {
            if let Some(existing) = entries.iter_mut().find(|r| r.date == record.date) {
                *existing = record.clone();
            } else {
                entries.push(record.clone());
            }
        }
        any_new = true;

        if chunk_start == earliest_date {
            break;
        }
        chunk_end = chunk_start - ChronoDuration::days(1);
    }

    if any_new {
        if let Some(entries) = records_map.get_mut(symbol) {
            entries.sort_by(|a, b| b.date.cmp(&a.date));
        }
    }

    Ok(())
}

fn get_data_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut candidates = Vec::new();

    candidates.push(PathBuf::from("data"));

    if let Some(resource_dir) = app_handle.path_resolver().resource_dir() {
        candidates.push(resource_dir.join("data"));
    }

    if let Some(app_dir) = app_handle.path_resolver().app_data_dir() {
        candidates.push(app_dir.join("data"));
    }

    for dir in candidates {
        if ensure_dir(&dir).is_ok() {
            return Ok(dir);
        }
    }

    Err("Unable to resolve a writable data directory".into())
}

fn get_backups_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_dir = app_handle
        .path_resolver()
        .app_data_dir()
        .ok_or("Failed to get app data directory")?;

    let backups_dir = app_dir.join("backups");
    create_dir_all(&backups_dir)
        .map_err(|e| format!("Failed to create backups directory: {}", e))?;
    Ok(backups_dir)
}

fn get_logs_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_dir = app_handle
        .path_resolver()
        .app_data_dir()
        .ok_or("Failed to get app data directory")?;

    let logs_dir = app_dir.join("logs");
    create_dir_all(&logs_dir).map_err(|e| format!("Failed to create logs directory: {}", e))?;
    Ok(logs_dir)
}

fn get_prices_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let data_dir = get_data_dir(app_handle)?;
    let prices_dir = data_dir.join("prices");
    ensure_dir(&prices_dir)?;
    Ok(prices_dir)
}

fn get_splits_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let data_dir = get_data_dir(app_handle)?;
    let splits_dir = data_dir.join("splits");
    ensure_dir(&splits_dir)?;
    Ok(splits_dir)
}

fn write_worker_log(app_handle: &tauri::AppHandle, message: &str) -> Result<(), String> {
    let logs_dir = get_logs_dir(app_handle)?;
    let log_file = logs_dir.join("history_worker.log");
    let timestamp = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_file)
        .map_err(|e| format!("Failed to open log file {:?}: {}", log_file, e))?;
    writeln!(file, "[{}] {}", timestamp, message).map_err(|e| format!("Failed to write log: {}", e))
}

fn initialize_storage(app_handle: &tauri::AppHandle) -> Result<(), String> {
    let data_dir = get_data_dir(app_handle)?;
    let _ = get_backups_dir(app_handle)?;
    let _ = get_logs_dir(app_handle)?;

    let required_files = vec![
        (data_dir.join("fx_rates.csv"), FX_RATES_HEADER),
        (data_dir.join("settings.csv"), SETTINGS_HEADER),
        (data_dir.join("securities.csv"), SECURITIES_HEADER),
    ];

    for (path, header) in required_files {
        ensure_file_with_header(&path, header)?;
    }

    Ok(())
}

fn read_setting_value_internal(
    app_handle: &tauri::AppHandle,
    key: &str,
) -> Result<Option<String>, String> {
    let data_dir = get_data_dir(&app_handle)?;
    let settings_file = data_dir.join("settings.csv");

    if !settings_file.exists() {
        return Ok(None);
    }

    let content = read_to_string(&settings_file)
        .map_err(|e| format!("Failed to read settings.csv: {}", e))?;

    for line in content.lines().skip(1) {
        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() >= 2 && parts[0] == key {
            return Ok(Some(parts[1..].join(",")));
        }
    }

    Ok(None)
}

#[tauri::command]
fn get_setting(app_handle: tauri::AppHandle, key: String) -> Result<String, String> {
    Ok(read_setting_value_internal(&app_handle, &key)?.unwrap_or_default())
}

#[tauri::command]
fn set_setting(app_handle: tauri::AppHandle, key: String, value: String) -> Result<(), String> {
    let data_dir = get_data_dir(&app_handle)?;
    let settings_file = data_dir.join("settings.csv");

    let mut lines = vec!["key,value".to_string()];
    let mut found = false;

    if settings_file.exists() {
        let content = read_to_string(&settings_file)
            .map_err(|e| format!("Failed to read settings.csv: {}", e))?;

        for (i, line) in content.lines().enumerate() {
            if i == 0 {
                continue;
            }
            let parts: Vec<&str> = line.split(',').collect();
            if parts.len() >= 1 && parts[0] == key {
                lines.push(format!("{},{}", key, value));
                found = true;
            } else if !line.trim().is_empty() {
                lines.push(line.to_string());
            }
        }
    }

    if !found {
        lines.push(format!("{},{}", key, value));
    }

    write(&settings_file, lines.join("\n"))
        .map_err(|e| format!("Failed to write settings.csv: {}", e))
}

#[tauri::command]
fn read_storage_csv(app_handle: tauri::AppHandle, filename: String) -> Result<String, String> {
    let data_dir = get_data_dir(&app_handle)?;
    let file_path = data_dir.join(&filename);

    if !file_path.exists() {
        return Ok(String::new());
    }

    read_to_string(&file_path)
        .map_err(|e| format!("Failed to read data file '{}': {}", filename, e))
}

#[tauri::command]
fn write_storage_csv(
    app_handle: tauri::AppHandle,
    filename: String,
    content: String,
) -> Result<(), String> {
    let data_dir = get_data_dir(&app_handle)?;
    let file_path = data_dir.join(&filename);

    write(&file_path, content)
        .map_err(|e| format!("Failed to write data file '{}': {}", filename, e))
}

#[tauri::command]
fn append_storage_csv(
    app_handle: tauri::AppHandle,
    filename: String,
    content: String,
) -> Result<(), String> {
    use std::fs::OpenOptions;

    let data_dir = get_data_dir(&app_handle)?;
    let file_path = data_dir.join(&filename);

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&file_path)
        .map_err(|e| format!("Failed to open data file '{}': {}", filename, e))?;

    file.write_all(content.as_bytes())
        .map_err(|e| format!("Failed to append to data file '{}': {}", filename, e))
}

// Aliases for data directory operations (same as storage commands)
#[tauri::command]
fn read_data_csv(app_handle: tauri::AppHandle, filename: String) -> Result<String, String> {
    read_storage_csv(app_handle, filename)
}

#[tauri::command]
fn write_data_csv(
    app_handle: tauri::AppHandle,
    filename: String,
    content: String,
) -> Result<(), String> {
    write_storage_csv(app_handle, filename, content)
}

#[tauri::command]
fn append_data_csv(
    app_handle: tauri::AppHandle,
    filename: String,
    content: String,
) -> Result<(), String> {
    append_storage_csv(app_handle, filename, content)
}

#[tauri::command]
fn write_price_file(
    app_handle: tauri::AppHandle,
    symbol: String,
    content: String,
) -> Result<(), String> {
    let prices_dir = get_prices_dir(&app_handle)?;
    let safe_symbol = symbol.replace(':', "_");
    let file_path = prices_dir.join(format!("{}.csv", safe_symbol));

    write(&file_path, content)
        .map_err(|e| format!("Failed to write price file for '{}': {}", symbol, e))
}

#[tauri::command]
fn read_price_file(
    app_handle: tauri::AppHandle,
    symbol: String,
) -> Result<String, String> {
    let prices_dir = get_prices_dir(&app_handle)?;
    let safe_symbol = symbol.replace(':', "_");
    let file_path = prices_dir.join(format!("{}.csv", safe_symbol));

    if !file_path.exists() {
        return Ok(String::new());
    }

    read_to_string(&file_path)
        .map_err(|e| format!("Failed to read price file for '{}': {}", symbol, e))
}

#[tauri::command]
fn list_price_files(app_handle: tauri::AppHandle) -> Result<Vec<String>, String> {
    let prices_dir = get_prices_dir(&app_handle)?;
    let mut symbols = Vec::new();

    if let Ok(entries) = std::fs::read_dir(&prices_dir) {
        for entry in entries.flatten() {
            if let Some(filename) = entry.file_name().to_str() {
                if filename.ends_with(".csv") {
                    let symbol = filename.trim_end_matches(".csv").replace('_', ":");
                    symbols.push(symbol);
                }
            }
        }
    }

    symbols.sort();
    Ok(symbols)
}

#[tauri::command]
fn write_split_file(
    app_handle: tauri::AppHandle,
    symbol: String,
    content: String,
) -> Result<(), String> {
    let splits_dir = get_splits_dir(&app_handle)?;
    let safe_symbol = symbol.replace(':', "_");
    let file_path = splits_dir.join(format!("{}.csv", safe_symbol));

    write(&file_path, content)
        .map_err(|e| format!("Failed to write split file for '{}': {}", symbol, e))
}

#[tauri::command]
fn read_split_file(
    app_handle: tauri::AppHandle,
    symbol: String,
) -> Result<String, String> {
    let splits_dir = get_splits_dir(&app_handle)?;
    let safe_symbol = symbol.replace(':', "_");
    let file_path = splits_dir.join(format!("{}.csv", safe_symbol));

    if !file_path.exists() {
        return Ok(String::new());
    }

    read_to_string(&file_path)
        .map_err(|e| format!("Failed to read split file for '{}': {}", symbol, e))
}

#[tauri::command]
fn list_split_files(app_handle: tauri::AppHandle) -> Result<Vec<String>, String> {
    let splits_dir = get_splits_dir(&app_handle)?;
    let mut symbols = Vec::new();

    if let Ok(entries) = std::fs::read_dir(&splits_dir) {
        for entry in entries.flatten() {
            if let Some(filename) = entry.file_name().to_str() {
                if filename.ends_with(".csv") {
                    let symbol = filename.trim_end_matches(".csv").replace('_', ":");
                    symbols.push(symbol);
                }
            }
        }
    }

    symbols.sort();
    Ok(symbols)
}

#[tauri::command]
fn sync_history_once(app_handle: tauri::AppHandle) -> Result<(), String> {
    sync_full_history(&app_handle)
}

#[tauri::command]
fn start_history_worker(app_handle: tauri::AppHandle) -> Result<(), String> {
    write_worker_log(&app_handle, "Starting background history worker")?;
    let handle = app_handle.clone();
    std::thread::spawn(move || {
        if let Err(err) = sync_full_history(&handle) {
            let _ = write_worker_log(&handle, &format!("History worker failed: {}", err));
        }
    });
    Ok(())
}

#[tauri::command]
fn get_history_log(app_handle: tauri::AppHandle) -> Result<String, String> {
    let logs_dir = get_logs_dir(&app_handle)?;
    let log_file = logs_dir.join("history_worker.log");
    if !log_file.exists() {
        return Ok(String::new());
    }
    read_to_string(&log_file).map_err(|e| format!("Failed to read history log: {}", e))
}

fn parse_f64_str(value: &str) -> Option<f64> {
    let sanitized: String = value
        .chars()
        .filter(|c| c.is_ascii_digit() || *c == '.' || *c == '-' || *c == '+')
        .collect();
    if sanitized.is_empty() {
        return None;
    }
    sanitized.parse::<f64>().ok()
}

fn load_all_transactions(app_handle: &tauri::AppHandle) -> Result<Vec<Transaction>, String> {
    let json = read_csv(app_handle.clone())?;
    serde_json::from_str(&json).map_err(|e| format!("Failed to parse transactions JSON: {}", e))
}

fn load_price_records(app_handle: &tauri::AppHandle) -> Result<Vec<PriceRecordEntry>, String> {
    let mut records = Vec::new();

    let prices_dir = match get_prices_dir(app_handle) {
        Ok(dir) => dir,
        Err(_) => return Ok(records),
    };

    let entries = match std::fs::read_dir(&prices_dir) {
        Ok(e) => e,
        Err(_) => return Ok(records),
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() || path.extension().and_then(|s| s.to_str()) != Some("csv") {
            continue;
        }

        let filename = match path.file_stem().and_then(|s| s.to_str()) {
            Some(f) => f.replace('_', ":"),
            None => continue,
        };

        let mut reader = match csv::ReaderBuilder::new()
            .has_headers(true)
            .from_path(&path)
        {
            Ok(r) => r,
            Err(_) => continue,
        };

        for result in reader.records() {
            let record = match result {
                Ok(r) => r,
                Err(_) => continue,
            };

            if record.len() < 3 {
                continue;
            }

            let date_str = record.get(0).unwrap_or("").trim();
            let date = match NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
                Ok(d) => d,
                Err(_) => continue,
            };

            let close = parse_f64_str(record.get(1).unwrap_or("").trim()).unwrap_or(0.0);
            let open = record.get(2).and_then(|v| parse_f64_str(v.trim()));
            let high = record.get(3).and_then(|v| parse_f64_str(v.trim()));
            let low = record.get(4).and_then(|v| parse_f64_str(v.trim()));
            let volume = record.get(5).and_then(|v| parse_f64_str(v.trim()));
            let source = record.get(6).unwrap_or("manual").trim().to_string();

            records.push(PriceRecordEntry {
                symbol: filename.clone(),
                date,
                close,
                open,
                high,
                low,
                volume,
                source,
            });
        }
    }

    Ok(records)
}

fn save_price_records(
    app_handle: &tauri::AppHandle,
    price_map: &HashMap<String, Vec<PriceRecordEntry>>,
) -> Result<(), String> {
    let prices_dir = get_prices_dir(app_handle)?;
    for (symbol, records) in price_map.iter() {
        let safe_symbol = symbol.replace(':', "_");
        let file_path = prices_dir.join(format!("{}.csv", safe_symbol));
        let mut entries = records.clone();
        entries.sort_by(|a, b| b.date.cmp(&a.date));

        let mut file = File::create(&file_path)
            .map_err(|e| format!("Failed to write price file for {}: {}", symbol, e))?;

        writeln!(
            file,
            "date,close,open,high,low,volume,source,updated_at"
        )
        .map_err(|e| format!("Failed to write header for {}: {}", symbol, e))?;

        let updated_at = Utc::now().to_rfc3339();
        for entry in entries {
            writeln!(
                file,
                "{},{},{},{},{},{},{},{}",
                entry.date.format("%Y-%m-%d"),
                entry.close,
                entry.open
                    .map(|v| v.to_string())
                    .unwrap_or_else(|| "".to_string()),
                entry.high
                    .map(|v| v.to_string())
                    .unwrap_or_else(|| "".to_string()),
                entry.low
                    .map(|v| v.to_string())
                    .unwrap_or_else(|| "".to_string()),
                entry.volume
                    .map(|v| v.to_string())
                    .unwrap_or_else(|| "".to_string()),
                entry.source,
                updated_at,
            )
            .map_err(|e| format!("Failed to write price row for {}: {}", symbol, e))?;
        }
    }
    Ok(())
}

fn sync_full_history(app_handle: &tauri::AppHandle) -> Result<(), String> {
    write_worker_log(app_handle, "History worker started")?;
    let transactions = load_all_transactions(app_handle)?;
    if transactions.is_empty() {
        write_worker_log(app_handle, "No transactions found; skipping history sync")?;
        return Ok(());
    }

    let mut earliest_by_symbol: HashMap<String, NaiveDate> = HashMap::new();
    for txn in &transactions {
        if txn.stock.trim().is_empty() {
            continue;
        }
        let date = NaiveDate::parse_from_str(txn.date.trim(), "%Y-%m-%d")
            .map_err(|e| format!("Invalid transaction date {}: {}", txn.date, e))?;
        earliest_by_symbol
            .entry(txn.stock.trim().to_string())
            .and_modify(|d| {
                if date < *d {
                    *d = date;
                }
            })
            .or_insert(date);
    }

    let mut price_records = load_price_records(app_handle)?;
    let mut price_map: HashMap<String, Vec<PriceRecordEntry>> = HashMap::new();
    for record in price_records.drain(..) {
        price_map
            .entry(record.symbol.clone())
            .or_default()
            .push(record);
    }

    for (symbol, date) in earliest_by_symbol.iter() {
        write_worker_log(
            app_handle,
            &format!("Syncing history for {} from {}", symbol, date),
        )?;
        match ensure_history_for_symbol(&mut price_map, symbol, *date) {
            Ok(()) => {
                write_worker_log(app_handle, &format!("Finished {}", symbol))?;
            }
            Err(err) => {
                if err.contains("US tickers") {
                    write_worker_log(app_handle, &format!("Skipped {}: {}", symbol, err))?;
                } else {
                    write_worker_log(app_handle, &format!("Failed to sync {}: {}", symbol, err))?;
                }
            }
        }
    }

    for records in price_map.values_mut() {
        records.sort_by(|a, b| b.date.cmp(&a.date));
    }
    let total_rows: usize = price_map.values().map(|v| v.len()).sum();
    write_worker_log(app_handle, &format!("Saving {} price rows", total_rows))?;
    save_price_records(app_handle, &price_map)?;
    write_worker_log(app_handle, "History worker completed")?;
    Ok(())
}

#[tauri::command]
fn proxy_get(url: String) -> Result<String, String> {
    let parsed = url::Url::parse(&url).map_err(|e| format!("Invalid URL: {}", e))?;
    let host = parsed.host_str().unwrap_or("").to_lowercase();

    let allowed_hosts = [
        "query1.finance.yahoo.com",
        "query2.finance.yahoo.com",
        "finance.yahoo.com",
        "yfapi.net",
    ];

    if !allowed_hosts.iter().any(|h| h.eq_ignore_ascii_case(&host)) {
        return Err(format!("Host not allowed: {}", host));
    }

    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(10))
        .user_agent("portfolio-manager-desktop/1.0")
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let response = client
        .get(parsed)
        .send()
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    let body = response
        .text()
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    if !status.is_success() {
        return Err(format!("Upstream error {}: {}", status, body));
    }

    Ok(body)
}

#[derive(Serialize, Deserialize)]
struct StockDataCoverage {
    ticker: String,
    exchange: String,
    currency: String,
    earliest_transaction: String,
    earliest_price: Option<String>,
    latest_price: Option<String>,
    total_days: i32,
    missing_days: i32,
    coverage_percent: f64,
    split_count: i32,
    last_split: Option<String>,
    status: String,
    delist_reason: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct SplitHistory {
    ticker: String,
    date: String,
    numerator: i32,
    denominator: i32,
    ratio: String,
    ratio_factor: f64,
    before_price: Option<f64>,
    after_price: Option<f64>,
}

fn parse_ratio_components(ratio: &str) -> (i32, i32) {
    let trimmed = ratio.trim();
    if trimmed.is_empty() {
        return (1, 1);
    }

    if let Some((num_str, den_str)) = trimmed.split_once(':') {
        let numerator = num_str.trim().parse::<i32>().unwrap_or(1).max(1);
        let denominator = den_str.trim().parse::<i32>().unwrap_or(1).max(1);
        return (numerator, denominator);
    }

    if let Ok(value) = trimmed.parse::<f64>() {
        if value > 1.0 {
            return (value.round() as i32, 1);
        } else if value > 0.0 {
            let denominator = (1.0 / value).round() as i32;
            return (1, denominator.max(1));
        }
    }

    (1, 1)
}

fn parse_price_field(field: Option<&&str>) -> Option<f64> {
    field.and_then(|value| {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            None
        } else {
            trimmed.parse::<f64>().ok()
        }
    })
}

#[derive(Serialize, Deserialize)]
struct DataReadinessStats {
    total_stocks: i32,
    complete_data: i32,
    partial_data: i32,
    missing_data: i32,
    total_price_records: i32,
    oldest_date: Option<String>,
    newest_date: Option<String>,
}

#[tauri::command]
fn get_data_coverage(
    app_handle: tauri::AppHandle,
    include_completeness: Option<bool>,
) -> Result<String, String> {
    let include_completeness = include_completeness.unwrap_or(true);
    let transactions = load_all_transactions(&app_handle)?;
    let price_records = load_price_records(&app_handle)?;

    let today = Utc::now().date_naive();
    let fifteen_years_ago = today - ChronoDuration::days(15 * 365);

    let mut stock_map: HashMap<String, StockDataCoverage> = HashMap::new();

    for txn in &transactions {
        if txn.stock.trim().is_empty() {
            continue;
        }

        let txn_date = match NaiveDate::parse_from_str(txn.date.trim(), "%Y-%m-%d") {
            Ok(d) => d,
            Err(_) => continue,
        };

        if txn_date < fifteen_years_ago {
            continue;
        }

        let (exchange, _) = get_exchange_and_symbol(&txn.stock);
        let exchange_str = exchange.unwrap_or_else(|| "UNKNOWN".to_string());

        stock_map.entry(txn.stock.clone()).or_insert_with(|| {
            StockDataCoverage {
                ticker: txn.stock.clone(),
                exchange: exchange_str.clone(),
                currency: txn.currency.clone(),
                earliest_transaction: txn.date.clone(),
                earliest_price: None,
                latest_price: None,
                total_days: 0,
                missing_days: 0,
                coverage_percent: 0.0,
                split_count: 0,
                last_split: None,
                status: "missing".to_string(),
                delist_reason: None,
            }
        });

        if let Some(coverage) = stock_map.get_mut(&txn.stock) {
            if txn.date < coverage.earliest_transaction {
                coverage.earliest_transaction = txn.date.clone();
            }
        }
    }

    for (symbol, prices) in price_records.iter().fold(HashMap::new(), |mut acc, record| {
        acc.entry(record.symbol.clone())
            .or_insert_with(Vec::new)
            .push(record.clone());
        acc
    }) {
        if let Some(coverage) = stock_map.get_mut(&symbol) {
            if let Some(earliest) = prices.iter().map(|p| p.date).min() {
                coverage.earliest_price = Some(earliest.format("%Y-%m-%d").to_string());
            }
            if let Some(latest) = prices.iter().map(|p| p.date).max() {
                coverage.latest_price = Some(latest.format("%Y-%m-%d").to_string());
            }
            if include_completeness {
                let start_date = fifteen_years_ago;
                let total_days = (today - start_date).num_days() as i32;

                let price_dates: std::collections::HashSet<NaiveDate> =
                    prices.iter().map(|p| p.date).collect();
                let mut missing = 0;
                let mut current = start_date;

                while current <= today {
                    let weekday = current.weekday();
                    if weekday != chrono::Weekday::Sat && weekday != chrono::Weekday::Sun {
                        if !price_dates.contains(&current) {
                            missing += 1;
                        }
                    }
                    current += ChronoDuration::days(1);
                }

                coverage.total_days = total_days;
                coverage.missing_days = missing;
                coverage.coverage_percent = if total_days > 0 {
                    ((total_days - missing) as f64 / total_days as f64) * 100.0
                } else {
                    0.0
                };

                coverage.status = if coverage.coverage_percent >= 95.0 {
                    "complete".to_string()
                } else if coverage.coverage_percent >= 50.0 {
                    "partial".to_string()
                } else {
                    "missing".to_string()
                };
            } else if coverage.latest_price.is_some() {
                coverage.coverage_percent = 100.0;
                coverage.status = "complete".to_string();
            }
        }
    }

    // Count splits from split files
    if let Ok(splits_dir) = get_splits_dir(&app_handle) {
        if let Ok(entries) = std::fs::read_dir(&splits_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if !path.is_file() || !path.extension().map_or(false, |e| e == "csv") {
                    continue;
                }

                let filename = match path.file_stem().and_then(|s| s.to_str()) {
                    Some(f) => f.replace('_', ":"),
                    None => continue,
                };

                let content = match read_to_string(&path) {
                    Ok(c) => c,
                    Err(_) => continue,
                };

                let mut split_count = 0;
                let mut last_split_date: Option<String> = None;

                for (idx, line) in content.lines().enumerate() {
                    if idx == 0 || line.trim().is_empty() {
                        continue;
                    }

                    let fields: Vec<&str> = line.split(',').collect();
                    if fields.len() >= 2 {
                        split_count += 1;
                        let date = fields[0].to_string();
                        if last_split_date.is_none() || date > *last_split_date.as_ref().unwrap() {
                            last_split_date = Some(date);
                        }
                    }
                }

                if let Some(coverage) = stock_map.get_mut(&filename) {
                    coverage.split_count = split_count;
                    coverage.last_split = last_split_date;
                }
            }
        }
    }

    let coverage_list: Vec<StockDataCoverage> = stock_map.into_values().collect();
    serde_json::to_string(&coverage_list)
        .map_err(|e| format!("Failed to serialize coverage: {}", e))
}

#[tauri::command]
fn get_split_history(app_handle: tauri::AppHandle) -> Result<String, String> {
    let mut splits: Vec<SplitHistory> = Vec::new();
    let splits_dir = match get_splits_dir(&app_handle) {
        Ok(dir) => dir,
        Err(_) => return Ok(serde_json::to_string(&splits).unwrap()),
    };

    if let Ok(entries) = std::fs::read_dir(&splits_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_file() || !path.extension().map_or(false, |e| e == "csv") {
                continue;
            }

            let filename = match path.file_stem().and_then(|s| s.to_str()) {
                Some(f) => f.replace('_', ":"),
                None => continue,
            };

            let content = match read_to_string(&path) {
                Ok(c) => c,
                Err(_) => continue,
            };

            let mut lines = content.lines();
            let header = lines.next().unwrap_or("");
            let has_fractional_header = header
                .split(',')
                .any(|col| col.trim().eq_ignore_ascii_case("numerator"));

            for line in lines {
                if line.trim().is_empty() {
                    continue;
                }

                let fields: Vec<&str> = line.split(',').collect();
                if fields.is_empty() {
                    continue;
                }

                let date = fields.get(0).map(|s| s.trim()).unwrap_or("");
                if date.is_empty() {
                    continue;
                }

                let (numerator, denominator, before_price, after_price) = if has_fractional_header {
                    let numerator = fields
                        .get(1)
                        .and_then(|s| s.trim().parse::<i32>().ok())
                        .unwrap_or(1)
                        .max(1);
                    let denominator = fields
                        .get(2)
                        .and_then(|s| s.trim().parse::<i32>().ok())
                        .unwrap_or(1)
                        .max(1);
                    let before_price = parse_price_field(fields.get(3));
                    let after_price = parse_price_field(fields.get(4));
                    (numerator, denominator, before_price, after_price)
                } else {
                    let ratio_str = fields.get(1).map(|s| s.trim()).unwrap_or("");
                    let (numerator, denominator) = parse_ratio_components(ratio_str);
                    let before_price = parse_price_field(fields.get(2));
                    let after_price = parse_price_field(fields.get(3));
                    (numerator, denominator, before_price, after_price)
                };

                let ratio = format!("{}:{}", numerator, denominator);
                let ratio_factor = numerator as f64 / denominator as f64;

                splits.push(SplitHistory {
                    ticker: filename.clone(),
                    date: date.to_string(),
                    numerator,
                    denominator,
                    ratio,
                    ratio_factor,
                    before_price,
                    after_price,
                });
            }
        }
    }

    splits.sort_by(|a, b| b.date.cmp(&a.date));

    serde_json::to_string(&splits)
        .map_err(|e| format!("Failed to serialize split history: {}", e))
}

#[tauri::command]
fn get_data_stats(app_handle: tauri::AppHandle) -> Result<String, String> {
    let transactions = load_all_transactions(&app_handle)?;
    let price_records = load_price_records(&app_handle)?;

    let unique_stocks: std::collections::HashSet<String> =
        transactions.iter().map(|t| t.stock.clone()).collect();

    let oldest_date = price_records
        .iter()
        .map(|p| p.date)
        .min()
        .map(|d| d.format("%Y-%m-%d").to_string());

    let newest_date = price_records
        .iter()
        .map(|p| p.date)
        .max()
        .map(|d| d.format("%Y-%m-%d").to_string());

    let coverage = serde_json::from_str::<Vec<StockDataCoverage>>(
        &get_data_coverage(app_handle.clone(), None)?,
    )
    .unwrap_or_default();

    let complete_data = coverage.iter().filter(|c| c.status == "complete").count() as i32;
    let partial_data = coverage.iter().filter(|c| c.status == "partial").count() as i32;
    let missing_data = coverage.iter().filter(|c| c.status == "missing").count() as i32;

    let stats = DataReadinessStats {
        total_stocks: unique_stocks.len() as i32,
        complete_data,
        partial_data,
        missing_data,
        total_price_records: price_records.len() as i32,
        oldest_date,
        newest_date,
    };

    serde_json::to_string(&stats)
        .map_err(|e| format!("Failed to serialize stats: {}", e))
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            if let Err(e) = initialize_storage(&app.handle()) {
                return Err(Box::new(std::io::Error::new(std::io::ErrorKind::Other, e)));
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            read_csv,
            get_setting,
            set_setting,
            read_storage_csv,
            write_storage_csv,
            append_storage_csv,
            read_data_csv,
            write_data_csv,
            append_data_csv,
            write_price_file,
            read_price_file,
            list_price_files,
            write_split_file,
            read_split_file,
            list_split_files,
            sync_history_once,
            start_history_worker,
            get_history_log,
            proxy_get,
            get_data_coverage,
            get_split_history,
            get_data_stats
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
