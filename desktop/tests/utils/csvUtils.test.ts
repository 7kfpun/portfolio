import { describe, it, expect } from 'vitest';
import { parseNumber, parseNumericString, parseCSV, parseCSVManual, toCSV } from '../../src/utils/csvUtils';

describe('csvUtils', () => {
  describe('parseNumber', () => {
    it('should parse valid number strings', () => {
      expect(parseNumber('123')).toBe(123);
      expect(parseNumber('123.45')).toBe(123.45);
      expect(parseNumber('-123.45')).toBe(-123.45);
      expect(parseNumber('  456  ')).toBe(456);
    });

    it('should return undefined for invalid inputs', () => {
      expect(parseNumber(undefined)).toBeUndefined();
      expect(parseNumber('')).toBeUndefined();
      expect(parseNumber('   ')).toBeUndefined();
      expect(parseNumber('abc')).toBeUndefined();
    });

    it('should handle edge cases', () => {
      expect(parseNumber('0')).toBe(0);
      expect(parseNumber('-0')).toBe(-0);
    });
  });

  describe('parseNumericString', () => {
    it('should extract numbers from strings with special characters', () => {
      expect(parseNumericString('$123.45')).toBe(123.45);
      expect(parseNumericString('123,456.78')).toBe(123456.78);
      expect(parseNumericString('(123.45)')).toBe(123.45);
      expect(parseNumericString('  $1,234  ')).toBe(1234);
    });

    it('should return default value for invalid inputs', () => {
      expect(parseNumericString('', 0)).toBe(0);
      expect(parseNumericString('abc', 999)).toBe(999);
      expect(parseNumericString('', 10)).toBe(10);
    });

    it('should handle negative numbers', () => {
      expect(parseNumericString('-123.45')).toBe(-123.45);
      expect(parseNumericString('$-456.78')).toBe(-456.78);
    });

    it('should use default value of 0 when not specified', () => {
      expect(parseNumericString('')).toBe(0);
      expect(parseNumericString('invalid')).toBe(0);
    });
  });

  describe('parseCSV', () => {
    it('should parse valid CSV content', () => {
      const csv = 'name,age,city\nJohn,30,NYC\nJane,25,LA';
      const result = parseCSV(csv);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'John', age: '30', city: 'NYC' });
      expect(result[1]).toEqual({ name: 'Jane', age: '25', city: 'LA' });
    });

    it('should handle empty CSV', () => {
      expect(parseCSV('')).toEqual([]);
      expect(parseCSV('   ')).toEqual([]);
    });

    it('should skip empty lines', () => {
      const csv = 'name,age\nJohn,30\n\nJane,25\n\n';
      const result = parseCSV(csv);
      expect(result).toHaveLength(2);
    });

    it('should handle CSV with headers only', () => {
      const csv = 'name,age,city';
      const result = parseCSV(csv);
      expect(result).toEqual([]);
    });
  });

  describe('parseCSVManual', () => {
    it('should parse valid CSV content manually', () => {
      const csv = 'name,age,city\nJohn,30,NYC\nJane,25,LA';
      const result = parseCSVManual(csv);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'John', age: '30', city: 'NYC' });
      expect(result[1]).toEqual({ name: 'Jane', age: '25', city: 'LA' });
    });

    it('should handle empty CSV', () => {
      expect(parseCSVManual('')).toEqual([]);
      expect(parseCSVManual('   ')).toEqual([]);
    });

    it('should skip empty lines', () => {
      const csv = 'name,age\nJohn,30\n\nJane,25\n\n';
      const result = parseCSVManual(csv);
      expect(result).toHaveLength(2);
    });

    it('should handle CSV with headers only', () => {
      const csv = 'name,age,city';
      const result = parseCSVManual(csv);
      expect(result).toEqual([]);
    });

    it('should trim whitespace from fields', () => {
      const csv = 'name , age , city\n John , 30 , NYC ';
      const result = parseCSVManual(csv);
      expect(result[0]).toEqual({ name: 'John', age: '30', city: 'NYC' });
    });

    it('should handle rows with missing fields', () => {
      const csv = 'name,age,city\nJohn,30,NYC\nJane,25,LA';
      const result = parseCSVManual(csv);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'John', age: '30', city: 'NYC' });
      expect(result[1]).toEqual({ name: 'Jane', age: '25', city: 'LA' });
    });
  });

  describe('toCSV', () => {
    it('should convert data array to CSV', () => {
      const data = [
        { name: 'John', age: 30, city: 'NYC' },
        { name: 'Jane', age: 25, city: 'LA' },
      ];
      const result = toCSV(data);
      expect(result).toBe('name,age,city\nJohn,30,NYC\nJane,25,LA\n');
    });

    it('should handle empty array', () => {
      expect(toCSV([])).toBe('');
    });

    it('should respect custom headers order', () => {
      const data = [
        { name: 'John', age: 30, city: 'NYC' },
      ];
      const result = toCSV(data, ['city', 'name', 'age']);
      expect(result).toBe('city,name,age\nNYC,John,30\n');
    });

    it('should handle data with different fields', () => {
      const data = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25, city: 'LA' },
      ];
      const result = toCSV(data);
      expect(result).toContain('name,age');
      expect(result).toContain('John,30');
      expect(result).toContain('Jane,25');
    });
  });
});
