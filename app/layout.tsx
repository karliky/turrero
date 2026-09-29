import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import "./globals.css";
import { SITE } from '@/lib/site';
import { THEME_SCRIPT } from '@/lib/theme';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : SITE.url),
  title: SITE.byline,
  // Defaults for the few pages without their own metadata (lib/seo.ts builds the rest)
  description: SITE.description,
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: { url: '/android-chrome-192x192.png', sizes: '192x192' },
  },
  // Every page is its own canonical, without query strings: /turras?orden=… counts as /turras
  alternates: { canonical: './' },
  openGraph: {
    title: `${SITE.name} - Las turras de ${SITE.byline}`,
    description: SITE.description,
    url: './',
    siteName: SITE.name,
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} - Las turras de ${SITE.byline}`,
    description: SITE.description,
    site: SITE.xHandle,
  },
  robots: {
    index: true,
    follow: true
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // Browser chrome on mobile follows the page background of each theme (--color-whiskey-50)
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9f6f3' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1117' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The theme script sets data-theme before React hydrates, hence suppressHydrationWarning
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body
        className={`${geistSans.variable} antialiased bg-whiskey-50`}
        suppressHydrationWarning
      >
        <main className="min-h-screen flex flex-col">
          <Header />
          <div className="grow">
            {children}
          </div>
          <Footer />
        </main>
      </body>
    </html>
  );
}
