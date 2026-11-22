import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'AetherCommerce: Designing Trust Into Digital Commerce',
  description: 'A neuro-adaptive, anti-dark-pattern e-commerce HCI case study.',
  openGraph: {
    title: 'AetherCommerce — Neuro-Adaptive & Anti-Dark-Pattern UX Lab',
    description: 'Interactive HCI experiment comparing drip-pricing dark patterns vs. calm, transparent checkout architecture.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#07080B',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} ${mono.variable} bg-[#07080B] antialiased`}>{children}</body>
    </html>
  );
}