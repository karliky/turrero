import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PrelineScript from "./components/PrelineScript";
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import "./globals.css";
import { AUTHORS } from '../infrastructure/constants';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://turrero.vercel.app'
  ),
  title: AUTHORS.MAIN,
  description: `Biblioteca de hilos de ${AUTHORS.MAIN}`,
  openGraph: {
    title: `El Turrero Post - Las turras de ${AUTHORS.MAIN}`,
    description: `Colección de turras de ${AUTHORS.MAIN} sobre resolución de problemas complejos, estrategia y más.`,
    url: 'https://turrero.vercel.app',
    siteName: 'El Turrero Post',
    locale: 'es_ES',
    type: 'website',
    images: ['/promo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: `El Turrero Post - Las turras de ${AUTHORS.MAIN}`,
    description: `Colección de turras de ${AUTHORS.MAIN} sobre resolución de problemas complejos, estrategia y más.`,
    site: '@recuenco',
    images: ['/promo.png'],
  },
  viewport: 'width=device-width, initial-scale=1',
  robots: {
    index: true,
    follow: true
  }
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
      >
        <main className="min-h-screen flex flex-col">
          <Header />
          <div className="flex-grow">
            {children}
          </div>
          <Footer />
        </main>
      </body>
      <PrelineScript />
    </html>
  );
}
