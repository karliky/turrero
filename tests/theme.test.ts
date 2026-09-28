import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { resolveTheme } from '../lib/theme';

const css = readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8');

/** `--color-*` variables of the first block that starts with `opening`. */
function tokens(opening: string): Map<string, string> {
  const start = css.indexOf(opening);
  expect(start, opening).toBeGreaterThanOrEqual(0);
  const block = css.slice(start, css.indexOf('}', start));
  return new Map([...block.matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!.toLowerCase()]));
}

const light = tokens('@theme {');
const dark = tokens(':root[data-theme="dark"] {');
const systemDark = tokens(':root:not([data-theme]) {');

/** WCAG 2 relative luminance and contrast ratio. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

// Text colour → backgrounds it is used on across the site. Body text needs 4.5:1 (WCAG AA).
const PAIRS: [string, string[]][] = [
  ['whiskey-950', ['whiskey-50', 'whiskey-100', 'surface']],
  ['whiskey-900', ['whiskey-50', 'whiskey-100', 'surface']],
  ['whiskey-800', ['whiskey-50', 'whiskey-100', 'surface']],
  ['whiskey-700', ['whiskey-50', 'whiskey-100', 'surface']],
  ['brand', ['whiskey-50', 'whiskey-100', 'surface']],
  // Text on the dark buttons and chips (inverted in the dark theme)
  ['whiskey-50', ['whiskey-700', 'whiskey-800', 'whiskey-900', 'whiskey-950', 'brand']],
  // Exam answers
  ['ok', ['ok-soft', 'surface']],
  ['bad', ['bad-soft', 'surface']],
  ['surface', ['ok', 'bad']],
];

describe('theme', () => {
  test('the stored choice wins, otherwise the system decides', () => {
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme(null, true)).toBe('dark');
    expect(resolveTheme('sepia', false)).toBe('light');
  });

  test('both dark blocks (chosen and system) define the same colours as the light theme', () => {
    expect([...dark.keys()].sort()).toEqual([...light.keys()].sort());
    expect(systemDark).toEqual(dark);
  });

  for (const [name, theme] of [
    ['light', light],
    ['dark', dark],
  ] as const) {
    test(`every text colour reads on its backgrounds in the ${name} theme (4.5:1 or more)`, () => {
      const failures = PAIRS.flatMap(([text, backgrounds]) =>
        backgrounds
          .map((background) => ({ pair: `${text} on ${background}`, ratio: contrast(theme.get(text)!, theme.get(background)!) }))
          .filter(({ ratio }) => ratio < 4.5)
          .map(({ pair, ratio }) => `${pair}: ${ratio.toFixed(2)}`),
      );
      expect(failures).toEqual([]);
    });
  }
});
