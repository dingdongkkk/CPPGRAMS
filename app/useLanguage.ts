"use client";

import { useEffect, useState } from "react";
import { getDict, getLanguage, isLangCode, type Dict, type LangCode } from "./i18n";

/**
 * The chosen language lives in localStorage, which server rendering cannot
 * read. Pages hold their first paint until `ready` so a reader never sees
 * English flash past before their own language loads.
 */
export function useLanguage() {
  const [language, setLanguage] = useState<LangCode>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("jansetu-lang");
    if (isLangCode(saved)) setLanguage(saved);
    setReady(true);
  }, []);

  useEffect(() => {
    const meta = getLanguage(language);
    document.documentElement.lang = language;
    document.documentElement.dir = meta.dir;
  }, [language]);

  const t: Dict = getDict(language);
  return { language, t, meta: getLanguage(language), ready };
}
