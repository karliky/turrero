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
  title: "El Turrero Post",
  description: "Las turras de Javier G. Recuenco",
  icons: {
    icon: '/favicon.ico',
  },
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
