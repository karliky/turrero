import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import "./globals.css";
import { SITE } from '@/lib/site';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : SITE.url),
  title: SITE.byline,
  description: `Biblioteca de hilos de ${SITE.byline}`,
  openGraph: {
    title: `${SITE.name} - Las turras de ${SITE.byline}`,
    description: SITE.description,
    url: SITE.url,
    siteName: SITE.name,
    locale: 'es_ES',
    type: 'website',
    images: ['/promo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} - Las turras de ${SITE.byline}`,
    description: SITE.description,
    site: SITE.xHandle,
    images: ['/promo.png'],
  },
  robots: {
    index: true,
    follow: true
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-whiskey-50`}
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
