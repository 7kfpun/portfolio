import { createOverrideStore, EditableRow, Feedback } from './createOverrideStore';
import { FxRateRecord } from '../types/FxRateData';

export type FxViewMode = 'chart' | 'table';
export type EditableFxRow = EditableRow<FxRateRecord>;
export type FxPairFeedback = Feedback;

const buildPendingPayload = (row: EditableRow<FxRateRecord>): FxRateRecord | null => {
  if (!row.date) return null;
  if (Number.isNaN(row.rate)) return null;
  return {
    from_currency: row.from_currency,
    to_currency: row.to_currency,
    date: row.date,
    rate: row.rate,
    source: 'manual',
    updated_at: new Date().toISOString(),
  };
};

export const useFxOverridesStore = createOverrideStore<FxRateRecord>({
  buildPendingPayload,
  getDateField: (row) => row.date,
  shouldTrackDateChanges: true,
});

export const FX_TABLE_PAGE_SIZE = 20;
