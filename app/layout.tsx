import type { Metadata, Viewport } from "next";
import { Orbitron, Exo_2 } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron", weight: ["400", "500", "600", "700", "800", "900"] });
const exo2 = Exo_2({ subsets: ["latin"], variable: "--font-exo2", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://orbit.objectspace.co.uk"),
  title: "Orbit Roundup - XR, AI, 3D and creative tech news",
  description: "Orbit Roundup - XR, AI, 3D and creative tech news. Weekly curation by Tom Martin-Davies.",
  openGraph: {
    title: "Orbit Roundup - XR, AI, 3D and creative tech news",
    description: "Orbit Roundup - XR, AI, 3D and creative tech news. Weekly curation by Tom Martin-Davies.",
    siteName: "Orbit Roundup",
    type: "website",
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
      <body className={`${orbitron.variable} ${exo2.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
