import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/lib/auth";
import NextTopLoader from "nextjs-toploader";
import { ConsentProvider } from "@/components/consent/ConsentProvider";
import { CookieBanner } from "@/components/consent/CookieBanner";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "CityRock POS — High-Performance Cloud Retail Management",
    template: "%s | CityRock POS",
  },
  description:
    "Enterprise-grade cloud POS and multi-store inventory management for modern retail brands. Offline sales, real-time stock sync, barcode scanning, thermal receipt printing, and analytics.",
  keywords: [
    "POS Software Pakistan",
    "Cloud POS",
    "Retail Point of Sale",
    "Multi-branch inventory",
    "Barcode billing system",
    "Thermal receipt printer POS",
    "CityRock POS",
  ],
  authors: [{ name: "CityRock Technologies" }],
  creator: "CityRock Technologies",
  publisher: "CityRock Technologies",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://cityrock.pk",
    siteName: "CityRock POS",
    title: "CityRock POS — Modern Cloud Retail Management Platform",
    description: "Cloud-based retail POS and multi-store inventory management for modern retail businesses.",
  },
  twitter: {
    card: "summary_large_image",
    title: "CityRock POS — Modern Cloud Retail Management Platform",
    description: "Cloud-based retail POS and multi-store inventory management for modern retail businesses.",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning className={inter.className}>
        <ConsentProvider>
          <NextTopLoader
            color="#F7931A"
            initialPosition={0.08}
            crawlSpeed={200}
            height={3}
            crawl={true}
            showSpinner={false}
            easing="ease"
            speed={200}
            shadow="0 0 12px #F7931A, 0 0 4px #FF9500"
            zIndex={99999}
          />
          <AuthProvider>
            {children}
          </AuthProvider>
          <CookieBanner />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "var(--surface-dark)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                fontSize: "13px",
                boxShadow: "var(--shadow-md)",
              },
              success: {
                iconTheme: { primary: "var(--positive)", secondary: "var(--surface-dark)" },
              },
              error: {
                iconTheme: { primary: "var(--negative)", secondary: "var(--surface-dark)" },
              },
            }}
          />
        </ConsentProvider>
      </body>
    </html>
  );
}
