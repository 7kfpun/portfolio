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
    const fileContent = [
      'date,close,open,high,low,volume,source,updated_at',
      '2024-01-01,180.12,181,182,179,1000,twelve_data,2024-01-02T00:00:00.000Z',
      'INVALID,ROW',
      '2024-01-02,,',
    ].join('\n');

    invokeMock.mockImplementation(async (command: string) => {
      if (command === 'list_price_files') {
        return ['NASDAQ:AAPL'];
      }
      if (command === 'read_price_file') {
        return fileContent;
      }
      return '';
    });

    const records = await priceDataService.loadAllPrices();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      symbol: 'NASDAQ:AAPL',
      date: '2024-01-01',
      close: 180.12,
    });
  });

  it('merges and writes per-symbol price files', async () => {
    const existingFiles: Record<string, string> = {
      'NASDAQ:MSFT': [
        'date,close,open,high,low,volume,source,updated_at',
        '2024-01-01,100,,,,,,',
      ].join('\n'),
      'NASDAQ:AAPL': 'date,close,open,high,low,volume,source,updated_at\n',
    };

    const written: Record<string, string> = {};

    invokeMock.mockImplementation(async (command: string, payload: any) => {
      if (command === 'read_price_file') {
        return existingFiles[payload.symbol] ?? '';
      }
      if (command === 'write_price_file') {
        written[payload.symbol] = payload.content;
        existingFiles[payload.symbol] = payload.content;
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
        close: 101,
        source: 'twelve_data',
        updated_at: '2024-01-02T00:00:00.000Z',
      },
    ]);

    expect(Object.keys(written)).toEqual(['NASDAQ:AAPL', 'NASDAQ:MSFT']);
    const msftRows = written['NASDAQ:MSFT'].trim().split('\n').slice(1);
    expect(msftRows[0]).toBe('2024-01-01,101,,,,,twelve_data,2024-01-02T00:00:00.000Z');
  });
});
