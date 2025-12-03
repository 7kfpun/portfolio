import Papa from 'papaparse';

export function parseNumber(value?: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseCSV<T = any>(csvContent: string): T[] {
  if (!csvContent.trim()) return [];

  const result = Papa.parse<T>(csvContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  return result.data;
}

export function toCSV<T extends Record<string, any>>(data: T[], headers?: string[]): string {
  if (data.length === 0) return '';

  const result = Papa.unparse(data, {
    header: true,
    columns: headers,
    quotes: false,
    quoteChar: '"',
    escapeChar: '"',
    newline: '\n',
  });

  return result + '\n';
}
