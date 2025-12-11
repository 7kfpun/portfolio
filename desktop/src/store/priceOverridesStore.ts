import { z } from 'zod';
import { createOverrideStore, EditableRow, Feedback } from './createOverrideStore';
import { PriceRecord } from '../types/PriceData';

export type PriceViewMode = 'chart' | 'table';
export type EditablePriceRow = EditableRow<PriceRecord>;
export type PriceFeedback = Feedback;

// Zod schema for price record validation
const priceRecordSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').refine(
    (dateStr) => {
      // Parse the date string as YYYY-MM-DD
      const parts = dateStr.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      
      // Create date at midnight local time
      const inputDate = new Date(year, month - 1, day);
      
      // Check if the date is valid
      if (isNaN(inputDate.getTime())) return false;
      if (year < 1970) return false;
      
      // Compare with today at midnight
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      return inputDate >= new Date(1970, 0, 1) && inputDate < tomorrow;
    },
    { message: 'Date must be valid and not in the future' }
  ),
  close: z.number().positive('Close price must be positive').finite('Close price must be a valid number'),
  open: z.number().positive('Open price must be positive').finite().optional(),
  high: z.number().positive('High price must be positive').finite().optional(),
  low: z.number().positive('Low price must be positive').finite().optional(),
  volume: z.number().nonnegative('Volume cannot be negative').int('Volume must be an integer').finite().optional(),
  source: z.enum(['manual', 'yahoo_finance', 'twelve_data']),
  updated_at: z.string(),
}).refine(
  (data) => {
    // Business logic validation: high >= low, if both present
    if (data.high !== undefined && data.low !== undefined && data.high < data.low) {
      return false;
    }
    // If open, high, low, close all present, validate relationships
    if (data.high !== undefined && data.close > data.high) {
      return false;
    }
    if (data.low !== undefined && data.close < data.low) {
      return false;
    }
    if (data.high !== undefined && data.open !== undefined && data.open > data.high) {
      return false;
    }
    if (data.low !== undefined && data.open !== undefined && data.open < data.low) {
      return false;
    }
    return true;
  },
  { message: 'Price values are inconsistent (e.g., high must be >= low, close must be between high and low)' }
);

const buildPendingPayload = (row: EditableRow<PriceRecord>): PriceRecord | null => {
  if (!row.date) return null;

  // close is required and must be a valid number
  const close = typeof row.close === 'number' ? row.close : parseFloat(row.close as any);
  if (!Number.isFinite(close)) return null;

  // Optional numeric fields - only include if they're valid numbers
  const parseOptionalNumber = (val: any): number | undefined => {
    if (val === undefined || val === null || val === '') return undefined;
    const num = typeof val === 'number' ? val : parseFloat(val);
    return Number.isFinite(num) ? num : undefined;
  };

  const payload = {
    symbol: row.symbol,
    date: row.date,
    close,
    open: parseOptionalNumber(row.open),
    high: parseOptionalNumber(row.high),
    low: parseOptionalNumber(row.low),
    volume: parseOptionalNumber(row.volume),
    source: 'manual' as const,
    updated_at: new Date().toISOString(),
  };

  // Validate with Zod schema
  const result = priceRecordSchema.safeParse(payload);
  if (!result.success) {
    // Format error messages for console
    const errors = result.error.issues.map(issue => {
      const path = issue.path.join('.');
      return `${path}: ${issue.message}`;
    }).join(', ');
    console.warn(`Price validation failed for ${payload.symbol}:`, errors);
    return null;
  }

  return result.data;
};

// Export a function to validate and get error messages
export const validatePriceRecords = (records: any[]): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  for (let i = 0; i < records.length; i++) {
    const result = priceRecordSchema.safeParse(records[i]);
    if (!result.success) {
      const recordErrors = result.error.issues.map(issue => {
        const path = issue.path.length > 0 ? issue.path.join('.') : 'record';
        return `Row ${i + 1} - ${path}: ${issue.message}`;
      });
      errors.push(...recordErrors);
    }
  }

  return { valid: errors.length === 0, errors };
};

export const usePriceOverridesStore = createOverrideStore<PriceRecord>({
  buildPendingPayload,
  getDateField: (row) => row.date,
  shouldTrackDateChanges: true,
});

export const PRICE_TABLE_PAGE_SIZE = 20;
