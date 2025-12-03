import { invoke } from '@tauri-apps/api/tauri';
import { Transaction } from '../types/Transaction';

export class TransactionService {
  async loadTransactions(): Promise<Transaction[]> {
    const data = await invoke<string>('read_csv');
    const parsed = JSON.parse(data);

    return parsed.map((txn: any) => ({
      date: txn.date || '',
      stock: txn.stock || '',
      type: txn.transaction_type || '',
      quantity: txn.quantity || '',
      price: txn.price || '',
      fees: txn.fees || '',
      split_ratio: txn.split_ratio || '',
      currency: txn.currency || 'USD',
    }));
  }
}

export const transactionService = new TransactionService();
