import { useState, useMemo, ReactNode } from 'react';
import styled from 'styled-components';
import { ChevronUp, ChevronDown, ChevronsUpDown, GripVertical } from 'lucide-react';

type SortDirection = 'asc' | 'desc' | null;

export interface Column<T> {
  key: string;
  header: string;
  accessor: (row: T) => ReactNode;
  sortable?: boolean;
  width?: number;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
}

interface AdvancedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onSort?: (key: string, direction: SortDirection) => void;
  defaultSortKey?: string;
  defaultSortDirection?: SortDirection;
  enableSorting?: boolean;
  enableResizing?: boolean;
  enableReordering?: boolean;
  onRowClick?: (row: T) => void;
  rowIsActive?: (row: T) => boolean;
}

const TableContainer = styled.div`
  width: 100%;
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: white;
`;

const Thead = styled.thead`
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
`;

const Th = styled.th<{ $align?: string; $width?: number; $resizable?: boolean }>`
  padding: 0.875rem 1rem;
  text-align: ${props => props.$align || 'left'};
  font-size: 0.875rem;
  font-weight: 600;
  color: #475569;
  position: relative;
  user-select: none;
  white-space: nowrap;
  ${props => props.$width && `width: ${props.$width}px;`}
  ${props => props.$resizable && `min-width: 80px;`}
`;

const ThContent = styled.div<{ $sortable?: boolean; $reorderable?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: ${props => (props.$sortable || props.$reorderable) ? 'pointer' : 'default'};

  &:hover {
    color: ${props => (props.$sortable || props.$reorderable) ? '#0f172a' : '#475569'};
  }
`;

const DragHandle = styled.div`
  display: flex;
  align-items: center;
  cursor: grab;
  color: #94a3b8;

  &:hover {
    color: #64748b;
  }

  &:active {
    cursor: grabbing;
  }
`;

const SortIcon = styled.span`
  display: flex;
  align-items: center;
  color: #64748b;
`;

const Resizer = styled.div<{ $resizing?: boolean }>`
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  width: 5px;
  cursor: col-resize;
  user-select: none;
  touch-action: none;
  background: ${props => props.$resizing ? '#667eea' : 'transparent'};

  &:hover {
    background: #667eea;
  }
`;

const Tbody = styled.tbody``;

const Tr = styled.tr<{ $clickable?: boolean; $active?: boolean }>`
  border-bottom: 1px solid #e2e8f0;
  background: ${props => (props.$active ? '#eef2ff' : 'transparent')};
  cursor: ${props => (props.$clickable ? 'pointer' : 'default')};
  transition: background 120ms ease;

  &:hover {
    background: ${props => (props.$clickable ? '#f8fafc' : props.$active ? '#eef2ff' : '#f8fafc')};
  }

  &:last-child {
    border-bottom: none;
  }
`;

const Td = styled.td<{ $align?: string }>`
  padding: 0.875rem 1rem;
  text-align: ${props => props.$align || 'left'};
  color: #475569;
  font-size: 0.9rem;
`;

export function AdvancedTable<T>({
  data,
  columns: initialColumns,
  onSort,
  defaultSortKey,
  defaultSortDirection = 'asc',
  enableSorting = true,
  enableResizing = true,
  enableReordering = true,
  onRowClick,
  rowIsActive,
}: AdvancedTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey || null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection);
  const [columns, setColumns] = useState(initialColumns);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<number | null>(null);

  const handleSort = (key: string) => {
    if (!enableSorting) return;

    let newDirection: SortDirection = 'asc';

    if (sortKey === key) {
      if (sortDirection === 'asc') {
        newDirection = 'desc';
      } else if (sortDirection === 'desc') {
        newDirection = null;
      }
    }

    setSortKey(newDirection ? key : null);
    setSortDirection(newDirection);

    if (onSort) {
      onSort(key, newDirection);
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return data;

    const column = columns.find(c => c.key === sortKey);
    if (!column) return data;

    return [...data].sort((a, b) => {
      const aValue = column.accessor(a);
      const bValue = column.accessor(b);

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
      if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

      // Convert to string for comparison if not number
      const aVal = typeof aValue === 'number' ? aValue : String(aValue);
      const bVal = typeof bValue === 'number' ? bValue : String(bValue);

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDirection, columns]);

  const handleResizeStart = (e: React.MouseEvent, columnKey: string) => {
    if (!enableResizing) return;
    e.preventDefault();
    setResizingColumn(columnKey);

    const startX = e.clientX;
    const column = columns.find(c => c.key === columnKey);
    const startWidth = columnWidths[columnKey] || column?.width || 150;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientX - startX;
      const newWidth = Math.max((column?.minWidth || 80), startWidth + diff);
      setColumnWidths(prev => ({ ...prev, [columnKey]: newWidth }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!enableReordering) return;
    setDraggedColumn(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!enableReordering) return;
    e.preventDefault();
    setDragOverColumn(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    if (!enableReordering || draggedColumn === null) return;
    e.preventDefault();

    const newColumns = [...columns];
    const [draggedItem] = newColumns.splice(draggedColumn, 1);
    newColumns.splice(dropIndex, 0, draggedItem);

    setColumns(newColumns);
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const getSortIcon = (columnKey: string) => {
    if (sortKey !== columnKey) {
      return <ChevronsUpDown size={14} />;
    }
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  return (
    <TableContainer>
      <Table>
        <Thead>
          <tr>
            {columns.map((column, index) => (
              <Th
                key={column.key}
                $align={column.align}
                $width={columnWidths[column.key] || column.width}
                $resizable={enableResizing}
                draggable={enableReordering}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                style={{
                  background: dragOverColumn === index ? '#e0e7ff' : undefined,
                }}
              >
                <ThContent
                  $sortable={enableSorting && column.sortable !== false}
                  $reorderable={enableReordering}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  {enableReordering && (
                    <DragHandle>
                      <GripVertical size={14} />
                    </DragHandle>
                  )}
                  <span>{column.header}</span>
                  {enableSorting && column.sortable !== false && (
                    <SortIcon>{getSortIcon(column.key)}</SortIcon>
                  )}
                </ThContent>

                {enableResizing && (
                  <Resizer
                    $resizing={resizingColumn === column.key}
                    onMouseDown={(e) => handleResizeStart(e, column.key)}
                  />
                )}
              </Th>
            ))}
          </tr>
        </Thead>
        <Tbody>
          {sortedData.map((row, rowIndex) => (
            <Tr
              key={rowIndex}
              $clickable={Boolean(onRowClick)}
              $active={rowIsActive ? rowIsActive(row) : false}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <Td key={column.key} $align={column.align}>
                  {column.accessor(row)}
                </Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
}
