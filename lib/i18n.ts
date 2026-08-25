/**
 * Dashboard localization (English + Arabic / RTL).
 *
 * Pure dictionary + helper module - safe to import from client components,
 * server components, and the bot runtime. No server-only imports.
 */

export type Language = 'en' | 'ar';

export const SUPPORTED_LANGUAGES: Language[] = ['en', 'ar'];
export const LANG_COOKIE = 'jersuit_lang';

export const translations: Record<Language, Record<string, string>> = {
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.systemHealth': 'System Health',
    'nav.activity': 'Activity',
    'nav.logs': 'Logs',
    'nav.runtime': 'Runtime',
    'nav.presence': 'Presence',
    'nav.commands': 'Commands',
    'nav.botConfig': 'Bot Config',
    'nav.servers': 'Servers',
    'nav.serverOwners': 'Server Owners',
    'nav.customCommands': 'Custom Commands',
    'nav.embedBuilder': 'Embed Builder',
    'nav.communication': 'Communication',
    'nav.appearance': 'Appearance',
    'nav.database': 'Database',
    'nav.security': 'Security',
    'nav.configuration': 'Configuration',
    'nav.settings': 'Settings',
    'nav.adminUsers': 'Admin Users',
    'nav.auditLogs': 'Audit Logs',
    'nav.controlCenter': 'JerSuit Control Center',
    'nav.ownerAccess': 'Owner access',

    'overview.title': 'Platform overview',
    'overview.heading': 'A clearer view of your Discord ecosystem.',
    'overview.subtitle': 'Monitor your infrastructure, configure JerSuit, and keep every community running smoothly from one calm workspace.',

    'common.save': 'Save',
    'common.saving': 'Saving...',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.enable': 'Enable',
    'common.disable': 'Disable',
    'common.search': 'Search...',
    'common.loading': 'Loading...',
    'common.all': 'All',
    'common.created': 'Created',
    'common.updated': 'Updated',
    'common.actions': 'Actions',
  },
  ar: {
    'nav.dashboard': 'لوحة التحكم',
    'nav.systemHealth': 'صحة النظام',
    'nav.activity': 'النشاط',
    'nav.logs': 'السجلات',
    'nav.runtime': 'الوقت الفعلي',
    'nav.presence': 'الحضور',
    'nav.commands': 'الأوامر',
    'nav.botConfig': 'إعدادات البوت',
    'nav.servers': 'السيرفرات',
    'nav.serverOwners': 'مالكو السيرفرات',
    'nav.customCommands': 'الأوامر المخصصة',
    'nav.embedBuilder': 'منشئ المربعات',
    'nav.communication': 'التواصل',
    'nav.appearance': 'المظهر',
    'nav.database': 'قاعدة البيانات',
    'nav.security': 'الأمان',
    'nav.configuration': 'الإعدادات العامة',
    'nav.settings': 'الإعدادات',
    'nav.adminUsers': 'مستخدمو الإدارة',
    'nav.auditLogs': 'سجلات التدقيق',
    'nav.controlCenter': 'مركز تحكم JerSuit',
    'nav.ownerAccess': 'صلاحية المالك',

    'overview.title': 'نظرة عامة على المنصة',
    'overview.heading': 'رؤية أوضح لنظام Discord البيئي.',
    'overview.subtitle': 'راقب البنية التحتية، وعدّل إعدادات JerSuit، وابقِ كل مجتمع يعمل بسلاسة من مساحة عمل واحدة هادئة.',

    'common.save': 'حفظ',
    'common.saving': 'جاري الحفظ...',
    'common.cancel': 'إلغاء',
    'common.delete': 'حذف',
    'common.edit': 'تعديل',
    'common.enable': 'تفعيل',
    'common.disable': 'تعطيل',
    'common.search': 'بحث...',
    'common.loading': 'جارٍ التحميل...',
    'common.all': 'الكل',
    'common.created': 'إنشاء',
    'common.updated': 'تحديث',
    'common.actions': 'إجراءات',
  },
};

/** Translate a key. Falls back to English and then to the key itself. */
export function translate(lang: Language | string, key: string): string {
  const l = (SUPPORTED_LANGUAGES as string[]).includes(lang) ? (lang as Language) : 'en';
  const table = translateTable(l);
  const enTable = translations.en;
  if (key in table) return table[key];
  if (key in enTable) return enTable[key];
  return key;
}

export function translateTable(lang: Language | string): Record<string, string> {
  const l = (SUPPORTED_LANGUAGES as string[]).includes(lang) ? (lang as Language) : 'en';
  return translations[l] ?? translations.en;
}

export function isRtl(lang: Language | string): boolean {
  return lang === 'ar';
}

/** Read the client-side language cookie (browser only). */
export function getBrowserLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  try {
    const v = document.cookie.split(';').map((s) => s.trim()).find((c) => c.startsWith(`${LANG_COOKIE}=`));
    if (v) {
      const value = v.split('=')[1];
      if ((SUPPORTED_LANGUAGES as string[]).includes(value)) return value as Language;
    }
  } catch { /* ignore */ }
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ar')) return 'ar';
  return 'en';
}
