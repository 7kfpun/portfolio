import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/tauri';
import { priceDataService } from '../src/services/priceDataService';

vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn(),
}));

const invokeMock = vi.mocked(invoke);

describe('priceDataService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses valid rows and skips malformed data', async () => {
    const csv = [
      'symbol,date,close,open,high,low,volume,source,updated_at',
      'NASDAQ:AAPL,2024-01-01,180.12,181,182,179,1000,twelve_data,2024-01-02T00:00:00.000Z',
      'INVALID,ROW',
      'NASDAQ:MSFT,2024-01-01,',
    ].join('\n');

    invokeMock.mockResolvedValueOnce(csv);

    const records = await priceDataService.loadAllPrices();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      symbol: 'NASDAQ:AAPL',
      date: '2024-01-01',
      close: 180.12,
    });
  });

  it('merges and sorts unique price entries before writing', async () => {
    const existingCsv = [
      'symbol,date,close,open,high,low,volume,source,updated_at',
      'NASDAQ:MSFT,2024-01-01,100,,,,,,',
    ].join('\n');

    let writtenContent = '';
    invokeMock.mockImplementation(async (command: string, payload: any) => {
      if (command === 'read_data_csv') {
        return existingCsv;
      }
      if (command === 'write_data_csv') {
        writtenContent = payload.content;
        return;
      }
      return '';
    });

    await priceDataService.savePrices([
      {
        symbol: 'NASDAQ:AAPL',
        date: '2024-02-02',
        close: 200,
        source: 'twelve_data',
        updated_at: '2024-02-03T00:00:00.000Z',
      },
      {
        symbol: 'NASDAQ:MSFT',
        date: '2024-01-01',
        close: 101, // should replace existing
        source: 'twelve_data',
        updated_at: '2024-01-02T00:00:00.000Z',
      },
    ]);

    const rows = writtenContent.trim().split('\n').slice(1); // drop header
    expect(rows[0].startsWith('NASDAQ:AAPL,2024-02-02,200')).toBe(true);
    expect(rows).toContain('NASDAQ:MSFT,2024-01-01,101,,,,,twelve_data,2024-01-02T00:00:00.000Z');
  });
});
