import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'JerSuit Control Center',
  description: 'Secure Discord management for modern communities.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/سس.jpg" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
