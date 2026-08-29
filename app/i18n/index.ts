import en, { type Dict } from "./en";
import hi from "./hi";
import bn from "./bn";
import mr from "./mr";
import te from "./te";
import ta from "./ta";
import kn from "./kn";

export type { Dict };

export type LangCode =
  | "en" | "hi" | "bn" | "mr" | "te" | "ta" | "kn";

export type LanguageMeta = {
  code: LangCode;
  /** Endonym — the language's name written in its own script. */
  native: string;
  /** English name, shown as a secondary line in the picker. */
  english: string;
  /** Single glyph used for the brand mark. */
  mark: string;
  /** "JanSetu" transliterated into this script. */
  brand: string;
  /** BCP-47 tag for the Web Speech API. */
  speech: string;
  dir: "ltr" | "rtl";
};

/**
 * Picker order: English first, then by number of speakers. Adding one of the
 * remaining Eighth Schedule languages is a drop-in — write `app/i18n/<code>.ts`
 * as a `Partial<Dict>`, add the code to `LangCode`, and add a row here.
 */
export const LANGUAGES: LanguageMeta[] = [
  { code: "en", native: "English",   english: "English",   mark: "J", brand: "JanSetu",   speech: "en-IN", dir: "ltr" },
  { code: "hi", native: "हिन्दी",      english: "Hindi",     mark: "ज", brand: "जनसेतु",     speech: "hi-IN", dir: "ltr" },
  { code: "bn", native: "বাংলা",       english: "Bengali",   mark: "জ", brand: "জনসেতু",    speech: "bn-IN", dir: "ltr" },
  { code: "mr", native: "मराठी",       english: "Marathi",   mark: "ज", brand: "जनसेतू",    speech: "mr-IN", dir: "ltr" },
  { code: "te", native: "తెలుగు",       english: "Telugu",    mark: "జ", brand: "జనసేతు",    speech: "te-IN", dir: "ltr" },
  { code: "ta", native: "தமிழ்",        english: "Tamil",     mark: "ஜ", brand: "ஜன்சேது",   speech: "ta-IN", dir: "ltr" },
  { code: "kn", native: "ಕನ್ನಡ",        english: "Kannada",   mark: "ಜ", brand: "ಜನಸೇತು",   speech: "kn-IN", dir: "ltr" },
];

const overrides: Record<LangCode, Partial<Dict>> = {
  en: {}, hi, bn, mr, te, ta, kn,
};

const cache = new Map<LangCode, Dict>();

/** Dictionary for `code`, with any untranslated key falling back to English. */
export function getDict(code: LangCode): Dict {
  const hit = cache.get(code);
  if (hit) return hit;
  const merged = { ...en, ...overrides[code] } as Dict;
  cache.set(code, merged);
  return merged;
}

export function getLanguage(code: LangCode): LanguageMeta {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

export function isLangCode(value: string | null): value is LangCode {
  return !!value && LANGUAGES.some((l) => l.code === value);
}

/** Best guess from the browser's language, used to pre-highlight the picker. */
export function detectLanguage(navLang: string | undefined): LangCode {
  const base = (navLang || "en").toLowerCase().split("-")[0];
  return isLangCode(base) ? base : "en";
}

/** Fills {placeholders} in a dictionary string. */
export function fmt(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in values ? String(values[key]) : match,
  );
}
