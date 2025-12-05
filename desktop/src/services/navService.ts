import { invoke } from '@tauri-apps/api/tauri';

export interface NavSnapshotEntry {
  stock: string;
  currency: string;
  shares: number;
  average_cost: number;
  latest_price: number;
  market_value: number;
  market_value_usd: number;
  status: string;
  last_transaction: string | null;
}

export interface NavSnapshotPayload {
  timestamp: string;
  base_currency: string;
  total_value_usd: number;
  entries: NavSnapshotEntry[];
}

export interface PositionSnapshotPayload {
  timestamp: string;
  stock: string;
  currency: string;
  shares: number;
  average_cost: number;
  latest_price: number;
  market_value: number;
  market_value_usd: number;
  status: string;
  last_transaction: string | null;
}

export interface NavHistoryPoint {
  date: string;
  close: number;
  shares: number;
  positionValue: number;
  currency: string;
  symbol: string;
}

export const navService = {
  async saveSnapshot(payload: NavSnapshotPayload): Promise<string> {
    return invoke<string>('save_nav_snapshot', { snapshot: payload });
  },

  async savePositionSnapshot(payload: PositionSnapshotPayload): Promise<string> {
    return invoke<string>('save_position_snapshot', { snapshot: payload });
  },

  async loadPositionHistory(symbol: string): Promise<NavHistoryPoint[]> {
    const csv = await invoke<string>('read_nav_file', { symbol });
    return parseNavCsv(csv);
  },
};

function parseNavCsv(csvContent: string): NavHistoryPoint[] {
  if (!csvContent || !csvContent.trim()) {
    return [];
  }

  const lines = csvContent.trim().split(/\r?\n/);
  const headerLine = lines.shift();
  if (!headerLine) {
    return [];
  }

  const headers = headerLine.split(',').map(h => h.trim().toLowerCase());
  const dateIdx = headers.indexOf('date');
  const closeIdx = headers.indexOf('close');
  const sharesIdx = headers.indexOf('shares');
  const valueIdx = headers.indexOf('position_value');
  const currencyIdx = headers.indexOf('currency');
  const symbolIdx = headers.indexOf('symbol');

  if (dateIdx === -1 || closeIdx === -1 || sharesIdx === -1 || valueIdx === -1) {
    return [];
  }

  const points: NavHistoryPoint[] = [];
  const parseCell = (value?: string) => {
    if (!value) return 0;
    const sanitized = value.replace(/,/g, '').trim();
    const parsed = Number(sanitized);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  for (const line of lines) {
    if (!line.trim()) continue;
    const raw = line.split(',');
    const date = raw[dateIdx]?.trim();
    if (!date) continue;

    const point: NavHistoryPoint = {
      date,
      close: parseCell(raw[closeIdx]),
      shares: parseCell(raw[sharesIdx]),
      positionValue: parseCell(raw[valueIdx]),
      currency: currencyIdx >= 0 ? raw[currencyIdx]?.trim() || 'USD' : 'USD',
      symbol: symbolIdx >= 0 ? raw[symbolIdx]?.trim() || '' : '',
    };

    points.push(point);
  }

  // File stored newest-first; chart expects chronological order.
  return points.reverse();
}
