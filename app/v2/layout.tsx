import { Anton, Geist, Geist_Mono } from 'next/font/google';

const geist = Geist({ variable: '--font-geist', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const anton = Anton({ variable: '--font-anton', subsets: ['latin'], weight: '400' });

/** Fonts and base colours for v2 only (the XPLR v2 system); the classic pages keep their own. */
export default function V2Layout({ children }: { children: React.ReactNode }) {
  return <div className={`xplr-v2 ${geist.variable} ${geistMono.variable} ${anton.variable} font-ui bg-ink text-paper min-h-screen antialiased`}>{children}</div>;
}
