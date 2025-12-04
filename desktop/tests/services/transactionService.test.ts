import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionService } from '../../src/services/transactionService';
import { invoke } from '@tauri-apps/api/tauri';

vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn(),
}));

describe('TransactionService', () => {
  let service: TransactionService;

  beforeEach(() => {
    service = new TransactionService();
    vi.clearAllMocks();
  });

  describe('loadTransactions', () => {
    it('should load and transform transactions correctly', async () => {
      const mockData = [
        {
          date: '2024-01-01',
          stock: 'AAPL',
          transaction_type: 'Buy',
          quantity: '10',
          price: '150',
          fees: '1',
          split_ratio: '1',
          currency: 'USD',
        },
        {
          date: '2024-01-02',
          stock: '2330',
          transaction_type: 'Sell',
          quantity: '100',
          price: '600',
          fees: '20',
          split_ratio: '1',
          currency: 'TWD',
        },
      ];

      vi.mocked(invoke).mockResolvedValue(JSON.stringify(mockData));

      const result = await service.loadTransactions();

      expect(invoke).toHaveBeenCalledWith('read_csv');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: '2024-01-01',
        stock: 'AAPL',
        type: 'Buy',
        quantity: '10',
        price: '150',
        fees: '1',
        split_ratio: '1',
        currency: 'USD',
      });
      expect(result[1]).toEqual({
        date: '2024-01-02',
        stock: '2330',
        type: 'Sell',
        quantity: '100',
        price: '600',
        fees: '20',
        split_ratio: '1',
        currency: 'TWD',
      });
    });

    it('should handle missing fields with defaults', async () => {
      const mockData = [
        {
          date: '2024-01-01',
          stock: 'AAPL',
          transaction_type: 'Buy',
        },
      ];

      vi.mocked(invoke).mockResolvedValue(JSON.stringify(mockData));

      const result = await service.loadTransactions();

      expect(result[0]).toEqual({
        date: '2024-01-01',
        stock: 'AAPL',
        type: 'Buy',
        quantity: '',
        price: '',
        fees: '',
        split_ratio: '',
        currency: 'USD',
      });
    });

    it('should handle empty data', async () => {
      vi.mocked(invoke).mockResolvedValue(JSON.stringify([]));

      const result = await service.loadTransactions();

      expect(result).toEqual([]);
    });

    it('should handle invoke errors', async () => {
      vi.mocked(invoke).mockRejectedValue(new Error('Failed to read CSV'));

      await expect(service.loadTransactions()).rejects.toThrow('Failed to read CSV');
    });

    it('should default currency to USD when not provided', async () => {
      const mockData = [
        {
          date: '2024-01-01',
          stock: 'AAPL',
          transaction_type: 'Buy',
          quantity: '10',
          price: '150',
          fees: '1',
          split_ratio: '1',
        },
      ];

      vi.mocked(invoke).mockResolvedValue(JSON.stringify(mockData));

      const result = await service.loadTransactions();

      expect(result[0].currency).toBe('USD');
    });
  });
});
