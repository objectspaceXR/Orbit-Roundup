import type { Metadata } from "next";
import { Orbitron, Exo_2 } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({ subsets: ["latin"], variable: "--font-orbitron", weight: ["700", "900"] });
const exo2 = Exo_2({ subsets: ["latin"], variable: "--font-exo2" });

export const metadata: Metadata = {
  title: "Orbit Roundup",
  description: "A weekly digest of AR, XR, 3D and creative AI — curated by Tom Martin-Davies.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${orbitron.variable} ${exo2.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
