#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::fs::{create_dir_all, read_to_string, write, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::Duration;

#[derive(Serialize, Clone)]
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

const PRICES_HEADER: &str = "symbol,date,close,open,high,low,volume,source,updated_at\n";
const FX_RATES_HEADER: &str = "currency_pair,date,rate,source,updated_at\n";
const SETTINGS_HEADER: &str = "key,value\n";
const SECURITIES_HEADER: &str =
  "ticker,name,exchange,currency,type,sector,data_source,api_symbol,last_updated\n";

fn ensure_file_with_header(file_path: &Path, header: &str) -> Result<(), String> {
  if file_path.exists() {
    return Ok(());
  }

  if let Some(parent) = file_path.parent() {
    create_dir_all(parent).map_err(|e| format!("Failed to create directory {:?}: {}", parent, e))?;
  }

  let mut file = File::create(file_path)
    .map_err(|e| format!("Failed to create file {:?}: {}", file_path, e))?;
  file
    .write_all(header.as_bytes())
    .map_err(|e| format!("Failed to write header for {:?}: {}", file_path, e))
}

fn read_csv_file(file_path: &str, currency: &str) -> Result<Vec<Transaction>, String> {
  let file = File::open(file_path)
    .map_err(|e| format!("Failed to open {}: {}", file_path, e))?;
  
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

fn get_settings_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
  let app_dir = app_handle
    .path_resolver()
    .app_data_dir()
    .ok_or("Failed to get app data directory")?;

  let settings_dir = app_dir.join("settings");
  create_dir_all(&settings_dir)
    .map_err(|e| format!("Failed to create settings directory: {}", e))?;

  Ok(settings_dir)
}

fn ensure_dir(path: &Path) -> Result<(), String> {
  if !path.exists() {
    create_dir_all(path).map_err(|e| format!("Failed to create directory {:?}: {}", path, e))?;
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

fn initialize_storage(app_handle: &tauri::AppHandle) -> Result<(), String> {
  let data_dir = get_data_dir(app_handle)?;
  let _ = get_backups_dir(app_handle)?;
  let _ = get_logs_dir(app_handle)?;

  let required_files = vec![
    (data_dir.join("prices.csv"), PRICES_HEADER),
    (data_dir.join("fx_rates.csv"), FX_RATES_HEADER),
    (data_dir.join("settings.csv"), SETTINGS_HEADER),
    (data_dir.join("securities.csv"), SECURITIES_HEADER),
  ];

  for (path, header) in required_files {
    ensure_file_with_header(&path, header)?;
  }

  Ok(())
}

#[tauri::command]
fn get_setting(app_handle: tauri::AppHandle, key: String) -> Result<String, String> {
  let data_dir = get_data_dir(&app_handle)?;
  let settings_file = data_dir.join("settings.csv");

  if !settings_file.exists() {
    return Ok(String::new());
  }

  let content = read_to_string(&settings_file)
    .map_err(|e| format!("Failed to read settings.csv: {}", e))?;

  for line in content.lines().skip(1) {
    let parts: Vec<&str> = line.split(',').collect();
    if parts.len() >= 2 && parts[0] == key {
      return Ok(parts[1..].join(","));
    }
  }

  Ok(String::new())
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

  read_to_string(&file_path).map_err(|e| format!("Failed to read data file '{}': {}", filename, e))
}

#[tauri::command]
fn write_storage_csv(
  app_handle: tauri::AppHandle,
  filename: String,
  content: String,
) -> Result<(), String> {
  let data_dir = get_data_dir(&app_handle)?;
  let file_path = data_dir.join(&filename);

  write(&file_path, content).map_err(|e| format!("Failed to write data file '{}': {}", filename, e))
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

  file
    .write_all(content.as_bytes())
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
      proxy_get
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
