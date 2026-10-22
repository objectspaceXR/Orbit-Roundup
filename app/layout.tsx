import type { Metadata, Viewport } from "next";
import { Anton, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// The XPLR v2 type system: Geist for words, Geist Mono for labels, Anton for posters.
const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const anton = Anton({ variable: "--font-anton", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  metadataBase: new URL("https://orbit.objectspace.co.uk"),
  title: "Orbit Roundup - XR, AI, 3D and creative tech news",
  description: "Orbit Roundup - XR, AI, 3D and creative tech news. Weekly curation by Tom Martin-Davies.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon", type: "image/png", sizes: "32x32" },
    ],
    apple: "/icon",
  },
  openGraph: {
    title: "Orbit Roundup - XR, AI, 3D and creative tech news",
    description: "Orbit Roundup - XR, AI, 3D and creative tech news. Weekly curation by Tom Martin-Davies.",
    siteName: "Orbit Roundup",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Orbit Roundup - XR, AI, 3D and creative tech news",
    description: "Orbit Roundup - XR, AI, 3D and creative tech news. Weekly curation by Tom Martin-Davies.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`xplr-v2 ${geist.variable} ${geistMono.variable} ${anton.variable} font-ui bg-ink text-paper min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}
