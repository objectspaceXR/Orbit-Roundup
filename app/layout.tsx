import type { Metadata, Viewport } from "next";
import { Orbitron, Exo_2 } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron", weight: ["400", "500", "600", "700", "800", "900"] });
const exo2 = Exo_2({ subsets: ["latin"], variable: "--font-exo2", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Orbit Roundup",
  description: "A weekly digest of AR, XR, 3D and creative AI — curated by Tom Martin-Davies.",
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
