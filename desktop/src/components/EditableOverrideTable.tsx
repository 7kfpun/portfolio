import { useMemo } from 'react';
import styled from 'styled-components';
import { SmallButton } from './PageLayout';

const TableWrapper = styled.div`
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
`;

const EditableTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;

  th,
  td {
    padding: 0.5rem;
    border-bottom: 1px solid #e2e8f0;
    text-align: left;
    white-space: nowrap;
  }

  th {
    background: #f8fafc;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #475569;
  }
`;

const EditableInput = styled.input`
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 0.25rem 0.375rem;
  font-size: 0.8rem;
  font-family: 'Inter', sans-serif;

  &:focus {
    border-color: #6366f1;
    outline: none;
    box-shadow: 0 0 0 1px #6366f1;
  }

  &:disabled {
    background: #f1f5f9;
    cursor: not-allowed;
  }
`;

const TableActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

const InlineBadge = styled.span<{ $tone?: 'neutral' | 'success' | 'error' }>`
  font-size: 0.75rem;
  border-radius: 12px;
  padding: 0.2rem 0.5rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: ${props => {
    switch (props.$tone) {
      case 'success':
        return '#dcfce7';
      case 'error':
        return '#fee2e2';
      default:
        return '#e2e8f0';
    }
  }};
  color: ${props => {
    switch (props.$tone) {
      case 'success':
        return '#15803d';
      case 'error':
        return '#b91c1c';
      default:
        return '#475569';
    }
  }};
`;

const PaginationControls = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
`;

const PaginationButton = styled.button`
  border: 1px solid #cbd5e1;
  background: #fff;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.1s;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    background: #f1f5f9;
  }
`;

export interface EditableRow<T extends Record<string, any> = Record<string, any>> {
  _rowId: string;
  original?: T;
  _originalDate?: string;
  _markedForDeletion?: boolean;
  [key: string]: any;
}

export interface ColumnConfig<T extends Record<string, any>> {
  key: string;
  header: string;
  width?: string;
  render?: (row: EditableRow<T>, value: any, isDisabled: boolean, onChange: (value: string) => void) => React.ReactNode;
  editable?: boolean;
  type?: 'text' | 'number' | 'date';
  step?: string;
  pattern?: string;
}

interface EditableOverrideTableProps<T extends Record<string, any>> {
  rows: EditableRow<T>[];
  columns: ColumnConfig<T>[];
  pageSize?: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onAddRow: () => void;
  onEditField: (rowId: string, field: string, value: string) => void;
  onRevertRow: (rowId: string) => void;
  onRemoveRow: (rowId: string) => void;
  onSave: () => void;
  saving?: boolean;
  feedback?: { status: 'success' | 'error'; message: string };
  pendingCount: number;
  addRowLabel?: string;
  saveLabel?: string;
}

export function EditableOverrideTable<T extends Record<string, any>>({
  rows,
  columns,
  pageSize = 20,
  currentPage,
  onPageChange,
  onAddRow,
  onEditField,
  onRevertRow,
  onRemoveRow,
  onSave,
  saving = false,
  feedback,
  pendingCount,
  addRowLabel = '+ Add Row',
  saveLabel = 'Save overrides',
}: EditableOverrideTableProps<T>) {
  const totalRowCount = rows.length;
  const totalPages = totalRowCount > 0 ? Math.ceil(totalRowCount / pageSize) : 1;
  const validPage = Math.min(currentPage, Math.max(totalPages - 1, 0));
  const pageStartIndex = validPage * pageSize;
  const pagedRows = totalRowCount > 0 ? rows.slice(pageStartIndex, pageStartIndex + pageSize) : [];
  const pageStartDisplay = totalRowCount > 0 ? pageStartIndex + 1 : 0;
  const pageEndDisplay = totalRowCount > 0 ? pageStartIndex + pagedRows.length : 0;
  const canGoPrev = validPage > 0;
  const canGoNext = validPage < totalPages - 1 && totalRowCount > 0;
  const dirty = pendingCount > 0;

  return (
    <>
      <TableActions>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <SmallButton $variant="ghost" onClick={onAddRow}>
            {addRowLabel}
          </SmallButton>
          {dirty && <InlineBadge $tone="neutral">Unsaved changes</InlineBadge>}
          {feedback && <InlineBadge $tone={feedback.status}>{feedback.message}</InlineBadge>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <SmallButton
            $variant="primary"
            onClick={onSave}
            disabled={saving}
            $loading={saving}
            style={{ minWidth: '120px' }}
          >
            {saving ? 'Saving…' : saveLabel}
          </SmallButton>
        </div>
      </TableActions>
      <TableWrapper>
        <EditableTable>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} style={{ width: col.width }}>
                  {col.header}
                </th>
              ))}
              <th style={{ width: '110px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {totalRowCount === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} style={{ textAlign: 'center', padding: '1rem' }}>
                  No data available
                </td>
              </tr>
            ) : (
              pagedRows.map(row => {
                const isNewRow = !row.original;
                const isManualOverride = row.original?.source === 'manual';
                const hasEdits = useMemo(() => {
                  if (!row.original) return false;
                  return columns.some(col => {
                    if (!col.editable) return false;
                    return row[col.key] !== row.original?.[col.key];
                  });
                }, [row, columns]);
                const isMarkedForDeletion = row._markedForDeletion === true;
                const canRevert = isManualOverride || hasEdits;
                const revertLabel = isMarkedForDeletion ? 'Undo' : hasEdits ? 'Revert' : 'Delete';
                const rowStyle = isMarkedForDeletion
                  ? { opacity: 0.5, textDecoration: 'line-through' as const }
                  : {};

                return (
                  <tr key={row._rowId} style={rowStyle}>
                    {columns.map(col => {
                      const value = row[col.key];
                      const isDisabled = isMarkedForDeletion;

                      if (col.render) {
                        return (
                          <td key={col.key}>
                            {col.render(row, value, isDisabled, (newValue: string) =>
                              onEditField(row._rowId, col.key, newValue)
                            )}
                          </td>
                        );
                      }

                      if (col.editable) {
                        const displayValue =
                          value === null || value === undefined || Number.isNaN(value)
                            ? ''
                            : value;

                        return (
                          <td key={col.key}>
                            <EditableInput
                              type={col.type || 'text'}
                              step={col.step}
                              pattern={col.pattern}
                              value={displayValue}
                              disabled={isDisabled}
                              onChange={e => onEditField(row._rowId, col.key, e.target.value)}
                            />
                          </td>
                        );
                      }

                      return <td key={col.key}>{value}</td>;
                    })}
                    <td>
                      {isNewRow ? (
                        <SmallButton $variant="ghost" onClick={() => onRemoveRow(row._rowId)}>
                          Remove
                        </SmallButton>
                      ) : (
                        <SmallButton
                          $variant="ghost"
                          disabled={!canRevert}
                          onClick={() => onRevertRow(row._rowId)}
                        >
                          {revertLabel}
                        </SmallButton>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </EditableTable>
      </TableWrapper>
      {totalRowCount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <PaginationControls>
            <span>
              Showing {pageStartDisplay}-{pageEndDisplay} of {totalRowCount}
            </span>
            <PaginationButton
              type="button"
              onClick={() => onPageChange(validPage - 1)}
              disabled={!canGoPrev}
            >
              Prev
            </PaginationButton>
            <PaginationButton
              type="button"
              onClick={() => onPageChange(validPage + 1)}
              disabled={!canGoNext}
            >
              Next
            </PaginationButton>
          </PaginationControls>
        </div>
      )}
    </>
  );
}
