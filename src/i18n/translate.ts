/**
 * Non-React translation helper for use in services / outside React components.
 * Reads the selected language from localStorage (key: 'riskeez_language').
 * Falls back: selected lang → English → human-readable key.
 */
import { en } from './en';
import { az } from './az';

type Translations = typeof en;

const translations: Record<string, Translations> = { en, az };

function getNestedValue(obj: any, path: string): string | undefined {
  return path.split('.').reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), obj);
}

function humanReadable(key: string): string {
  const last = key.split('.').pop() || key;
  return last.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()).trim();
}

export function tn(key: string, vars?: Record<string, string | number>): string {
  const lang = typeof localStorage !== 'undefined' ? (localStorage.getItem('riskeez_language') || 'en') : 'en';
  const dict = translations[lang] || translations['en'];
  let val = getNestedValue(dict, key);
  if (val === undefined) val = getNestedValue(translations['en'], key);
  if (val === undefined) val = humanReadable(key);
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      val = (val as string).replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    });
  }
  return val as string;
}
