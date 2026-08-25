import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import { ThemeProvider } from '@/components/theme-provider';
import { LANG_COOKIE, type Language } from '@/lib/i18n';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'JerSuit Bot - Discord Dashboard',
  description: 'Powerful Discord moderation, automation, and server management from one unified dashboard.',
};

const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('jersuit-theme');
    var theme = stored && ['dark','light','system'].includes(stored) ? stored : 'dark';
    var resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolved);
  } catch(e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const langValue = cookieStore.get(LANG_COOKIE)?.value;
  const lang: Language = langValue === 'ar' || langValue === 'en' ? langValue : 'en';
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/سس.png" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={inter.className}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
