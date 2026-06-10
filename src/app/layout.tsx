import type { Metadata, Viewport } from "next";
import { RegisterServiceWorker } from "@/app/register-sw";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://chorely.pro";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Chorely | Building Responsibility, One Task at a Time",
    template: "%s | Chorely"
  },
  description:
    "Chorely turns family chores into earned allowance. Kids complete chores and earn real money, parents approve the work, and responsibility grows.",
  applicationName: "Chorely",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  openGraph: {
    title: "Chorely",
    description: "Kids complete chores, earn real money, and build responsibility — with parent approval on every payout.",
    url: siteUrl,
    siteName: "Chorely",
    type: "website"
  }
};

export const viewport: Viewport = {
  themeColor: "#fef7e8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
