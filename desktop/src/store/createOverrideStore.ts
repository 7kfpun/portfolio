import { create, StateCreator } from 'zustand';

export type ViewMode = 'chart' | 'table';

export interface EditableRow<T extends Record<string, any> = Record<string, any>> {
  _rowId: string;
  original?: T;
  _originalDate?: string;
  _markedForDeletion?: boolean;
  [key: string]: any;
}

export interface Feedback {
  status: 'success' | 'error';
  message: string;
}

interface ItemState<T extends Record<string, any>> {
  rows: EditableRow<T>[];
  pending: Record<string, T>;
  viewMode: ViewMode;
  page: number;
  saving: boolean;
  feedback?: Feedback;
}

interface OverrideState<T extends Record<string, any>> {
  items: Record<string, ItemState<T>>;
  ensureItem: (key: string, rows: T[]) => void;
  setViewMode: (key: string, mode: ViewMode) => void;
  addRow: (key: string, template: Partial<T>) => void;
  updateRowField: (key: string, rowId: string, field: string, value: string) => void;
  revertRow: (key: string, rowId: string) => void;
  removeRow: (key: string, rowId: string) => void;
  replaceRows: (key: string, rows: T[]) => void;
  setPage: (key: string, page: number) => void;
  setSaving: (key: string, saving: boolean) => void;
  setFeedback: (key: string, feedback?: Feedback) => void;
  clearPending: (key: string) => void;
  getPendingRows: (key: string) => T[];
}

const generateRowId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const getSortableDateValue = (date: string) => {
  if (!date) return Number.POSITIVE_INFINITY;
  const timestamp = new Date(date).getTime();
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
};

export function createOverrideStore<T extends Record<string, any>>(config: {
  buildPendingPayload: (row: EditableRow<T>) => T | null;
  getDateField?: (row: T) => string;
  shouldTrackDateChanges?: boolean;
}) {
  const { buildPendingPayload, getDateField, shouldTrackDateChanges = false } = config;

  const mapToEditableRows = (rows: T[]): EditableRow<T>[] => {
    const sorted = [...rows].sort((a, b) => {
      if (getDateField) {
        return getSortableDateValue(getDateField(b)) - getSortableDateValue(getDateField(a));
      }
      return 0;
    });
    return sorted.map(row => ({ ...row, _rowId: generateRowId(), original: { ...row } }));
  };

  const ensureState = (state: OverrideState<T>, key: string): ItemState<T> => {
    if (!state.items[key]) {
      state.items[key] = {
        rows: [],
        pending: {},
        viewMode: 'chart',
        page: 0,
        saving: false,
      };
    }
    return state.items[key];
  };

  const storeCreator: StateCreator<OverrideState<T>> = (set, get) => ({
    items: {},

    ensureItem: (key, rows) =>
      set(state => {
        const nextState = { ...state.items };
        if (!nextState[key]) {
          nextState[key] = {
            rows: mapToEditableRows(rows),
            pending: {},
            viewMode: 'chart',
            page: 0,
            saving: false,
          };
        }
        return { items: nextState };
      }),

    setViewMode: (key, mode) =>
      set(state => {
        const nextState = { ...state.items };
        const item = ensureState({ ...state, items: nextState }, key);
        nextState[key] = { ...item, viewMode: mode };
        return { items: nextState };
      }),

    addRow: (key, template) =>
      set(state => {
        const nextItems = { ...state.items };
        const item = ensureState({ ...state, items: nextItems }, key);
        const newRow: EditableRow<T> = {
          ...template,
          _rowId: generateRowId(),
          original: undefined,
        } as EditableRow<T>;
        nextItems[key] = {
          ...item,
          rows: [newRow, ...item.rows],
          page: 0,
        };
        return { items: nextItems };
      }),

    updateRowField: (key, rowId, field, value) =>
      set(state => {
        const nextItems = { ...state.items };
        const item = ensureState({ ...state, items: nextItems }, key);
        const rows = item.rows.map(row => {
          if (row._rowId !== rowId) return row;

          const updates: Partial<EditableRow<T>> = { [field]: value };

          if (
            shouldTrackDateChanges &&
            getDateField &&
            field === 'date' &&
            !row._originalDate &&
            row.original &&
            getDateField(row.original) !== value
          ) {
            updates._originalDate = getDateField(row.original);
          }

          return { ...row, ...updates };
        });
        const target = rows.find(r => r._rowId === rowId);
        const pending = { ...item.pending };
        const payload = target ? buildPendingPayload(target) : null;
        if (payload) {
          if (target?._originalDate) {
            (payload as any)._originalDate = target._originalDate;
          }
          pending[rowId] = payload;
        } else {
          delete pending[rowId];
        }
        nextItems[key] = { ...item, rows, pending };
        return { items: nextItems };
      }),

    revertRow: (key, rowId) =>
      set(state => {
        const nextItems = { ...state.items };
        const item = ensureState({ ...state, items: nextItems }, key);
        const target = item.rows.find(row => row._rowId === rowId);

        if (!target || !target.original) {
          return { items: nextItems };
        }

        const hasEdits = Object.keys(target.original).some(
          k => k !== '_rowId' && target[k] !== target.original![k]
        );

        if (hasEdits) {
          const rows = item.rows.map(row => {
            if (row._rowId !== rowId) return row;
            return {
              ...row,
              ...target.original!,
              _rowId: row._rowId,
              _originalDate: undefined,
              _markedForDeletion: undefined,
            };
          });
          const pending = { ...item.pending };
          delete pending[rowId];
          nextItems[key] = { ...item, rows, pending };
          return { items: nextItems };
        }

        if ((target.original as any).source === 'manual') {
          if (target._markedForDeletion) {
            const rows = item.rows.map(row => {
              if (row._rowId !== rowId) return row;
              return { ...row, _markedForDeletion: false };
            });
            const pending = { ...item.pending };
            delete pending[rowId];
            nextItems[key] = { ...item, rows, pending };
            return { items: nextItems };
          }

          const rows = item.rows.map(row => {
            if (row._rowId !== rowId) return row;
            return { ...row, _markedForDeletion: true };
          });
          const pending = { ...item.pending };
          pending[rowId] = { ...target.original, _shouldDelete: true } as any;
          nextItems[key] = { ...item, rows, pending };
          return { items: nextItems };
        }

        return { items: nextItems };
      }),

    removeRow: (key, rowId) =>
      set(state => {
        const nextItems = { ...state.items };
        const item = ensureState({ ...state, items: nextItems }, key);
        const target = item.rows.find(row => row._rowId === rowId);

        if (!target) {
          return { items: nextItems };
        }

        if (target.original && (target.original as any).source === 'manual') {
          const rows = item.rows.filter(row => row._rowId !== rowId);
          const pending = { ...item.pending };
          pending[rowId] = { ...target.original, _shouldDelete: true } as any;
          nextItems[key] = { ...item, rows, pending };
          return { items: nextItems };
        }

        if (target.original) {
          return { items: nextItems };
        }

        const rows = item.rows.filter(row => row._rowId !== rowId);
        const pending = { ...item.pending };
        delete pending[rowId];
        nextItems[key] = { ...item, rows, pending };
        return { items: nextItems };
      }),

    replaceRows: (key, rows) =>
      set(state => {
        const nextItems = { ...state.items };
        const item = ensureState({ ...state, items: nextItems }, key);
        nextItems[key] = {
          ...item,
          rows: mapToEditableRows(rows),
          pending: {},
          page: 0,
        };
        return { items: nextItems };
      }),

    setPage: (key, page) =>
      set(state => {
        const nextItems = { ...state.items };
        const item = ensureState({ ...state, items: nextItems }, key);
        nextItems[key] = { ...item, page };
        return { items: nextItems };
      }),

    setSaving: (key, saving) =>
      set(state => {
        const nextItems = { ...state.items };
        const item = ensureState({ ...state, items: nextItems }, key);
        nextItems[key] = { ...item, saving };
        return { items: nextItems };
      }),

    setFeedback: (key, feedback) =>
      set(state => {
        const nextItems = { ...state.items };
        const item = ensureState({ ...state, items: nextItems }, key);
        nextItems[key] = { ...item, feedback };
        return { items: nextItems };
      }),

    clearPending: key =>
      set(state => {
        const nextItems = { ...state.items };
        const item = ensureState({ ...state, items: nextItems }, key);
        nextItems[key] = { ...item, pending: {} };
        return { items: nextItems };
      }),

    getPendingRows: key => {
      const item = get().items[key];
      if (!item) return [];
      return Object.values(item.pending);
    },
  });

  return create<OverrideState<T>>(storeCreator);
}
