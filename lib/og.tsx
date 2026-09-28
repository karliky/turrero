// Share cards (Open Graph / X) rendered at build time with next/og.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };

const COLORS = {
  paper: '#f9f6f3',
  ink: '#301e1a',
  body: '#5b3b33',
  muted: '#895645',
  line: '#e4d4c4',
  brand: '#9b2335',
};

// Geist (OFL) from the `geist` package: the default next/og font has no bold weight
const FONT_DIR = join(process.cwd(), 'node_modules', 'geist', 'dist', 'fonts', 'geist-sans');
const font = (file: string) => readFileSync(join(FONT_DIR, file));
const FONTS = [
  { name: 'Geist', data: font('Geist-Regular.ttf'), weight: 400 as const, style: 'normal' as const },
  { name: 'Geist', data: font('Geist-SemiBold.ttf'), weight: 600 as const, style: 'normal' as const },
  { name: 'Geist', data: font('Geist-Black.ttf'), weight: 900 as const, style: 'normal' as const },
];

/** Collapses runs of whitespace (\s includes non-breaking spaces) into single spaces. */
const clean = (text: string) => text.replace(/\s+/g, ' ').trim();

/** Largest size that keeps the title within four lines of the card. */
function titleSize(title: string): number {
  if (title.length <= 40) return 84;
  if (title.length <= 65) return 72;
  if (title.length <= 95) return 62;
  return 52;
}

export interface ShareCard {
  /** Small label in the top-right pill (the category). */
  label: string;
  title: string;
  /** Bottom left: who and when. */
  byline: string;
  /** Bottom right: the hook (length of the thread, number of turras…). */
  highlight: string;
}

/**
 * 1200×630 card: the dotted line on the left draws a thread (a turra is a thread), the title is the
 * largest element, and the highlight tells how much there is to read.
 */
export function renderShareCard({ label, title, byline, highlight }: ShareCard): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          backgroundColor: COLORS.paper,
          fontFamily: 'Geist',
          padding: '60px 72px 56px 124px',
        }}
      >
        {/* Thread motif: a line with a dot per "tweet" */}
        <div style={{ position: 'absolute', left: 62, top: 72, bottom: 72, width: 4, backgroundColor: COLORS.line, display: 'flex' }} />
        {[72, 250, 428].map((top, i) => (
          <div
            key={top}
            style={{
              position: 'absolute',
              left: 52,
              top,
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: i === 0 ? COLORS.brand : COLORS.paper,
              border: `4px solid ${i === 0 ? COLORS.brand : COLORS.line}`,
              display: 'flex',
            }}
          />
        ))}

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', fontSize: 32, fontWeight: 900, color: COLORS.ink, letterSpacing: -0.5 }}>
              El&nbsp;<span style={{ color: COLORS.brand }}>Turrero Post</span>
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 22,
                fontWeight: 600,
                color: COLORS.paper,
                backgroundColor: COLORS.brand,
                borderRadius: 999,
                padding: '10px 22px',
                textTransform: 'uppercase',
                letterSpacing: 1.5,
              }}
            >
              {clean(label)}
            </div>
          </div>

          <div
            style={{
              display: 'block',
              width: '100%',
              fontSize: titleSize(title),
              fontWeight: 900,
              lineHeight: 1.06,
              letterSpacing: -2,
              color: COLORS.ink,
              lineClamp: 4,
            }}
          >
            {clean(title)}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 26 }}>
            <div style={{ display: 'flex', color: COLORS.muted }}>{clean(byline)}</div>
            <div
              style={{
                display: 'flex',
                fontWeight: 600,
                color: COLORS.body,
                border: `2px solid ${COLORS.line}`,
                borderRadius: 12,
                padding: '10px 18px',
              }}
            >
              {clean(highlight)}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: FONTS },
  );
}
