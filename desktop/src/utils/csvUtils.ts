import Papa from 'papaparse';

const NUMBER_EXTRACTION_REGEX = /[^0-9.-]/g;

export function parseNumber(value?: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseNumericString(value: string, defaultValue = 0): number {
  if (!value) return defaultValue;
  const cleaned = value.replace(NUMBER_EXTRACTION_REGEX, '');
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : defaultValue;
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

export function parseCSVManual(csvContent: string): Record<string, string>[] {
  if (!csvContent.trim()) return [];

  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = lines[i].split(',');
    if (fields.length >= headers.length) {
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = fields[index]?.trim() || '';
      });
      records.push(record);
    }
  }

  return records;
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
