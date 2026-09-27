import { describe, expect, test } from 'vitest';
import { parseCount, slugify, snowflakeTime, tweetIdFromInput } from '../lib/text';

describe('parseCount', () => {
  test.each([
    [undefined, 0],
    ['', 0],
    ['0', 0],
    ['82', 82],
    ['12,345', 12345],
    ['47.1K', 47100],
    ['3M', 3_000_000],
    ['1.5m', 1_500_000],
    [42, 42],
  ])('%s -> %s', (input, expected) => {
    expect(parseCount(input)).toBe(expected);
  });

  test('returns null for garbage', () => {
    expect(parseCount('n/a')).toBeNull();
  });
});

describe('snowflakeTime', () => {
  test('decodes the creation time from the id', () => {
    // First tweet of a thread whose legacy date was wrong (it had the quoted tweet date)
    expect(snowflakeTime('1610940502609723393')).toBe('2023-01-05T10:05:20.306Z');
  });
});

describe('slugify', () => {
  test.each([
    ['resolución-de-problemas-complejos', 'resolucion-de-problemas-complejos'],
    ['lectura-de-señales', 'lectura-de-senales'],
    ['Sociología', 'sociologia'],
    ['Factor X', 'factor-x'],
    ['  El contexto manda! ', 'el-contexto-manda'],
  ])('%s -> %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('tweetIdFromInput', () => {
  test.each([
    ['1610940502609723393', '1610940502609723393'],
    ['https://x.com/Recuenco/status/1610940502609723393', '1610940502609723393'],
    ['https://twitter.com/Recuenco/status/1610940502609723393?s=20', '1610940502609723393'],
    ['https://x.com/Recuenco/status/1610940502609723393/photo/1', '1610940502609723393'],
  ])('%s', (input, expected) => {
    expect(tweetIdFromInput(input)).toBe(expected);
  });

  test('rejects other input', () => {
    expect(() => tweetIdFromInput('https://example.com/status/1')).toThrow();
  });
});
