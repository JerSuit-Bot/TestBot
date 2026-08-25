'use client';

import { useEffect, useState } from 'react';
import { Languages } from 'lucide-react';
import { LANG_COOKIE, type Language } from '@/lib/i18n';

export function LanguageToggle() {
  const [lang, setLang] = useState<Language>('en');

  useEffect(() => {
    setLang(getStoredLang());
  }, []);

  const apply = (next: Language) => {
    setLang(next);
    document.cookie = `${LANG_COOKIE}=${next}; path=/; maxAge=${60 * 60 * 24 * 365}; samesite=lax`;
    document.documentElement.lang = next;
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    window.location.reload();
  };

  return (
    <button
      onClick={() => apply(lang === 'en' ? 'ar' : 'en')}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground"
      title="Language / اللغة"
      aria-label="Switch language"
    >
      <Languages size={16} />
      <span className="sr-only">{lang === 'en' ? 'العربية' : 'English'}</span>
    </button>
  );
}

function getStoredLang(): Language {
  try {
    const v = document.cookie.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${LANG_COOKIE}=`));
    if (v) {
      const value = v.split('=')[1];
      if (value === 'ar' || value === 'en') return value;
    }
  } catch { /* ignore */ }
  if (typeof navigator !== 'undefined') {
    const navLang = navigator.language?.toLowerCase() ?? '';
    if (navLang.startsWith('ar')) return 'ar';
  }
  return 'en';
}
