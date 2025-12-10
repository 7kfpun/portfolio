import React from 'react';
import styled from 'styled-components';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getExpandedRowModel,
    flexRender,
    ColumnDef,
    SortingState,
    ExpandedState,
    Row,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown } from 'lucide-react';

const TableContainer = styled.div`
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  overflow: hidden;
  background: white;
`;

const TableWrapper = styled.div`
  overflow-x: auto;
  max-height: 600px;
  overflow-y: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
`;

const Thead = styled.thead`
  position: sticky;
  top: 0;
  background: #f8fafc;
  z-index: 10;
`;

const Th = styled.th<{ $sortable?: boolean }>`
  padding: 0.6rem 0.75rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #475569;
  border-bottom: 2px solid #cbd5e1;
  white-space: nowrap;
  cursor: ${props => (props.$sortable ? 'pointer' : 'default')};
  user-select: none;

  &:hover {
    background: ${props => (props.$sortable ? '#e2e8f0' : 'transparent')};
  }
`;

const SortIcon = styled.span`
  display: inline-flex;
  align-items: center;
  margin-left: 0.25rem;
  vertical-align: middle;
`;

const Tbody = styled.tbody``;

const Tr = styled.tr<{ $clickable?: boolean; $expanded?: boolean }>`
  &:nth-child(even) {
    background: ${props => (props.$expanded ? '#f1f5f9' : '#f8fafc')};
  }

  &:hover {
    background: #f1f5f9;
  }

  cursor: ${props => (props.$clickable ? 'pointer' : 'default')};
`;

const Td = styled.td`
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #e2e8f0;
  color: #1e293b;
`;

const ExpandedRow = styled.tr`
  background: #fefefe;
`;

const ExpandedCell = styled.td`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
`;

const EmptyState = styled.div`
  padding: 2rem;
  text-align: center;
  color: #64748b;
  font-size: 0.875rem;
`;

export interface TanStackTableProps<TData> {
    data: TData[];
    columns: ColumnDef<TData, any>[];
    onRowClick?: (row: Row<TData>) => void;
    renderExpandedRow?: (row: Row<TData>) => React.ReactNode;
    getRowCanExpand?: (row: Row<TData>) => boolean;
    emptyMessage?: string;
    initialSorting?: SortingState;
}

export function TanStackTable<TData>({
    data,
    columns,
    onRowClick,
    renderExpandedRow,
    getRowCanExpand,
    emptyMessage = 'No data available',
    initialSorting = [],
}: TanStackTableProps<TData>) {
    const [sorting, setSorting] = React.useState<SortingState>(initialSorting);
    const [expanded, setExpanded] = React.useState<ExpandedState>({});

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            expanded,
        },
        onSortingChange: setSorting,
        onExpandedChange: setExpanded,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        getRowCanExpand: getRowCanExpand || (() => !!renderExpandedRow),
    });

    return (
        <TableContainer>
            <TableWrapper>
                <Table>
                    <Thead>
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => {
                                    const canSort = header.column.getCanSort();
                                    const sortDirection = header.column.getIsSorted();

                                    return (
                                        <Th
                                            key={header.id}
                                            $sortable={canSort}
                                            onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                                            style={header.column.columnDef.meta?.headerStyle}
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(header.column.columnDef.header, header.getContext())}
                                            {canSort && (
                                                <SortIcon>
                                                    {sortDirection === 'asc' && <ChevronUp size={14} />}
                                                    {sortDirection === 'desc' && <ChevronDown size={14} />}
                                                </SortIcon>
                                            )}
                                        </Th>
                                    );
                                })}
                            </tr>
                        ))}
                    </Thead>
                    <Tbody>
                        {table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <Td colSpan={columns.length}>
                                    <EmptyState>{emptyMessage}</EmptyState>
                                </Td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map(row => (
                                <React.Fragment key={row.id}>
                                    <Tr
                                        $clickable={!!onRowClick}
                                        $expanded={row.getIsExpanded()}
                                        onClick={() => onRowClick?.(row)}
                                    >
                                        {row.getVisibleCells().map(cell => (
                                            <Td key={cell.id} style={cell.column.columnDef.meta?.cellStyle}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </Td>
                                        ))}
                                    </Tr>
                                    {row.getIsExpanded() && renderExpandedRow && (
                                        <ExpandedRow>
                                            <ExpandedCell colSpan={columns.length}>
                                                {renderExpandedRow(row)}
                                            </ExpandedCell>
                                        </ExpandedRow>
                                    )}
                                </React.Fragment>
                            ))
                        )}
                    </Tbody>
                </Table>
            </TableWrapper>
        </TableContainer>
    );
}

// Extend ColumnMeta to support custom styles
declare module '@tanstack/react-table' {
    interface ColumnMeta<TData, TValue> {
        headerStyle?: React.CSSProperties;
        cellStyle?: React.CSSProperties;
    }
}
