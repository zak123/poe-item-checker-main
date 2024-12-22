import type { Metadata, Viewport } from "next";
import { GeistSans, GeistMono } from "geist/font";
import "./globals.css";
import { Analytics } from '@vercel/analytics/react';

export const metadata: Metadata = {
  title: "PoE2 Item Checker | Fast Path of Exile Price Checking Tool",
  description: "Instantly check Path of Exile 2 item prices with our advanced item parser. Compare prices on the official trade site with just one paste. Free, fast, and accurate.",
  keywords: "Path of Exile 2, PoE2, item price checker, PoE trade, item pricing tool, Path of Exile trading",
  authors: [{ name: "Pewpewlazer" }],
  metadataBase: new URL('https://poe-item-check.vercel.app'),
  openGraph: {
    title: "PoE2 Item Checker | Fast Path of Exile Price Checking Tool",
    description: "Instantly check Path of Exile 2 item prices with our advanced item parser. Free, fast, and accurate.",
    type: "website",
    locale: "en_US",
    siteName: "PoE2 Item Checker"
  },
  twitter: {
    card: "summary_large_image",
    title: "PoE2 Item Checker | Fast Path of Exile Price Checking Tool",
    description: "Instantly check Path of Exile 2 item prices with our advanced item parser. Free, fast, and accurate."
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large'
    }
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0f17"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        {children}
        <Analytics mode="production" debug={false} />
      </body>
    </html>
  );
}
