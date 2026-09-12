import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#012d1d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    template: "%s | EcoFresh",
    default: "EcoFresh | إيكو فريش — نظام إدارة التصدير",
  },
  description: "نظام إدارة موارد المؤسسة الموحد لشركات تصدير الحاصلات الزراعية المجمدة وإدارة محطات التبريد",
  applicationName: "EcoFresh ERP",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EcoFresh",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/icons/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/icons/icon-192x192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512x512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${ibmPlexSansArabic.className} ${ibmPlexSansArabic.variable}`}>
      <body className="min-h-screen bg-[#f8f9fa] text-gray-900 font-sans antialiased font-tabular-nums">
        {children}
        <PwaInstallPrompt />
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
