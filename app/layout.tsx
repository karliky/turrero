import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import PrelineScript from "./components/PrelineScript";
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import "./globals.css";

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
  title: {
    default: 'El Turrero Post - Las turras de Javier G. Recuenco',
    template: '%s | El Turrero Post'
  },
  description: 'Colección de turras de Javier G. Recuenco sobre resolución de problemas complejos, estrategia y más.',
  openGraph: {
    title: 'El Turrero Post - Las turras de Javier G. Recuenco',
    description: 'Colección de turras de Javier G. Recuenco sobre resolución de problemas complejos, estrategia y más.',
    url: 'https://turrero.vercel.app',
    siteName: 'El Turrero Post',
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'El Turrero Post - Las turras de Javier G. Recuenco',
    description: 'Colección de turras de Javier G. Recuenco sobre resolución de problemas complejos, estrategia y más.',
    site: '@recuenco',
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
