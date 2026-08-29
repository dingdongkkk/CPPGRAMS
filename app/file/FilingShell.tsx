"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLanguage } from "../useLanguage";
import { draftProgress, type Draft } from "../lib/useDraft";
import { AshokaChakra, IconArrowLeft, IconGrid, IconSpark } from "../icons";

/**
 * Chrome shared by both filing modes. The switcher is always present, and
 * both links point at the same draft, so moving between them is a change of
 * view rather than a restart.
 */
export function FilingShell({
  draft,
  active,
  children,
}: {
  draft: Draft;
  active: "assistant" | "form";
  children: ReactNode;
}) {
  const { t } = useLanguage();
  const { filled, total } = draftProgress(draft);
  return (
    <main className="filingPage">
      <div className="tricolour" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <header className="filingHeader">
        <Link href="/" className="portalBrand">
          <AshokaChakra size={24} />
          <span>
            JanSetu <small>{t.brandSub}</small>
          </span>
        </Link>

        <div className="filingSwitch" role="tablist" aria-label={t.modeTitle}>
          <Link
            href="/file/assistant"
            role="tab"
            aria-selected={active === "assistant"}
            className={active === "assistant" ? "on" : undefined}
          >
            <IconSpark size={15} />
            {t.modeAiTitle}
          </Link>
          <Link
            href="/file/form"
            role="tab"
            aria-selected={active === "form"}
            className={active === "form" ? "on" : undefined}
          >
            <IconGrid size={15} />
            {t.modeManualTitle}
          </Link>
        </div>

        <div className="filingMeta">
          <span className="filingProgress" aria-live="polite">
            {filled}/{total}
          </span>
          <Link href="/" className="portalBack">
            <IconArrowLeft size={15} />
            {t.back}
          </Link>
        </div>
      </header>
      {children}
    </main>
  );
}
