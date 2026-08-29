"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useLanguage } from "./useLanguage";
import type { Dict } from "./i18n";
import {
  AshokaChakra,
  IconArrowLeft,
  IconArrowRight,
  IconMail,
  IconPhone,
  IconSearch,
} from "./icons";

/* ── Shared shell ──────────────────────────────────────────────────
   These were modals. As full pages they get their own URL, work with
   the back button, survive a refresh and can be linked to directly —
   none of which a dialog can do. */
function Shell({
  t,
  kicker,
  title,
  intro,
  children,
  source,
  sourceLabel,
}: {
  t: Dict;
  kicker: string;
  title: string;
  intro: string;
  children: ReactNode;
  source: string;
  sourceLabel: string;
}) {
  return (
    <main className="portalPage">
      <div className="tricolour" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <header className="portalPageHeader">
        <Link href="/" className="portalBrand">
          <AshokaChakra size={26} />
          <span>
            JanSetu <small>{t.brandSub}</small>
          </span>
        </Link>
        <Link href="/" className="portalBack">
          <IconArrowLeft size={15} />
          {t.back}
        </Link>
      </header>

      <article className="portalBody">
        <p className="portalPageKicker reveal" style={{ "--i": 0 } as React.CSSProperties}>
          {kicker}
        </p>
        <h1 className="reveal" style={{ "--i": 1 } as React.CSSProperties}>
          {title}
        </h1>
        <p className="portalPageIntro reveal" style={{ "--i": 2 } as React.CSSProperties}>
          {intro}
        </p>
        {children}
        <a
          className="portalSource reveal"
          style={{ "--i": 8 } as React.CSSProperties}
          href={source}
          target="_blank"
          rel="noreferrer"
        >
          {sourceLabel}
          <IconArrowRight size={14} />
        </a>
      </article>
    </main>
  );
}

/* ── Redress process ───────────────────────────────────────────── */
export function ProcessPage() {
  const { t, ready } = useLanguage();
  if (!ready) return <div className="portalBoot" />;
  const steps = [
    [t.processStep1Title, t.processStep1Body],
    [t.processStep2Title, t.processStep2Body],
    [t.processStep3Title, t.processStep3Body],
    [t.processStep4Title, t.processStep4Body],
    [t.processStep5Title, t.processStep5Body],
  ];
  return (
    <Shell
      t={t}
      kicker={t.portalProcessKicker}
      title={t.portalProcessTitle}
      intro={t.portalProcessBody}
      source="https://pgportal.gov.in/Home/ProcessFlow"
      sourceLabel={t.portalOfficialProcess}
    >
      <ol className="processTimeline">
        {steps.map(([stepTitle, body], i) => (
          <li
            className="processStep reveal"
            key={stepTitle}
            style={{ "--i": i + 3 } as React.CSSProperties}
          >
            <b>{String(i + 1).padStart(2, "0")}</b>
            <div>
              <h2>{stepTitle}</h2>
              <p>{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Shell>
  );
}

/* ── Nodal officers ────────────────────────────────────────────── */
export function OfficersPage() {
  const { t, ready } = useLanguage();
  const [query, setQuery] = useState("");
  if (!ready) return <div className="portalBoot" />;
  const officers = [
    ["Administrative Reforms & Public Grievances", "Sardendu Kumar Pandey", "Director", "01123401455", "Director-pg@gov.in"],
    ["Agriculture & Farmers Welfare", "Rajesh Kumar", "Deputy Secretary PG", "01123074238", "rajesh.kumar67@nic.in"],
    ["Agriculture Research & Education", "Narendra Kumar", "Deputy Secretary", "01123046678", "narendra.kumar74@nic.in"],
    ["Animal Husbandry, Dairying", "RPS Rathore", "Director", "01123385797", "r.rathore@gov.in"],
    ["Atomic Energy", "K.V. Madhavadas", "Deputy Secretary", "02222862516", "dsscs@dae.gov.in"],
    ["Income Tax (CBDT)", "Swapna Devireddy", "Additional Director", "01123416133", "delhi.addldit.eservices@incometax.gov.in"],
  ];
  const visible = officers.filter((o) =>
    o.join(" ").toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Shell
      t={t}
      kicker={t.portalOfficersKicker}
      title={t.portalOfficersTitle}
      intro={t.portalOfficersBody}
      source="https://pgportal.gov.in/Home/NodalPgOfficers"
      sourceLabel={t.portalOfficialDirectory}
    >
      <div className="directoryMeta reveal" style={{ "--i": 3 } as React.CSSProperties}>
        <span>{t.officerDirectoryCount}</span>
        <span>{t.officerDirectoryNote}</span>
      </div>
      <label className="directorySearch reveal" style={{ "--i": 4 } as React.CSSProperties}>
        <span>{t.directorySearchLabel}</span>
        <div>
          <IconSearch size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.directorySearchPlaceholder}
          />
        </div>
      </label>
      <div className="officerDirectory reveal" style={{ "--i": 5 } as React.CSSProperties}>
        {visible.map(([department, name, role, phone, email]) => (
          <article className="officerRow" key={department}>
            <div>
              <b>{department}</b>
              <strong>{name}</strong>
              <span>{role}</span>
            </div>
            <div className="officerContact">
              <a href={`tel:${phone}`}>
                <IconPhone size={14} />
                {phone}
              </a>
              <a href={`mailto:${email}`}>
                <IconMail size={14} />
                {email}
              </a>
            </div>
          </article>
        ))}
        {!visible.length && <p className="directoryEmpty">{t.directoryEmpty}</p>}
      </div>
    </Shell>
  );
}

/* ── FAQs ──────────────────────────────────────────────────────── */
export function FaqPage() {
  const { t, ready } = useLanguage();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(0);
  if (!ready) return <div className="portalBoot" />;
  const faqs = [
    [t.faq1Question, t.faq1Answer],
    [t.faq2Question, t.faq2Answer],
    [t.faq3Question, t.faq3Answer],
    [t.faq4Question, t.faq4Answer],
    [t.faq5Question, t.faq5Answer],
    [t.faq6Question, t.faq6Answer],
  ].filter(([question]) => question.toLowerCase().includes(query.toLowerCase()));
  return (
    <Shell
      t={t}
      kicker={t.portalHelpKicker}
      title={t.portalHelpTitle}
      intro={t.portalHelpBody}
      source="https://pgportal.gov.in/Home/Faq"
      sourceLabel={t.portalOfficialFaq}
    >
      <label className="directorySearch reveal" style={{ "--i": 3 } as React.CSSProperties}>
        <span>{t.faqSearchLabel}</span>
        <div>
          <IconSearch size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.faqSearchPlaceholder}
          />
        </div>
      </label>
      <div className="faqList reveal" style={{ "--i": 4 } as React.CSSProperties}>
        {faqs.map(([question, answer], i) => (
          <div className={`faqItem ${open === i ? "open" : ""}`} key={question}>
            <button
              onClick={() => setOpen(open === i ? -1 : i)}
              aria-expanded={open === i}
            >
              <span>{question}</span>
              <b aria-hidden="true" />
            </button>
            {/* Height animates from 0, so the answer slides rather than snaps. */}
            <div className="faqAnswer" hidden={open !== i}>
              <p>{answer}</p>
            </div>
          </div>
        ))}
        {!faqs.length && <p className="directoryEmpty">{t.directoryEmpty}</p>}
      </div>
      <div className="faqCallout reveal" style={{ "--i": 5 } as React.CSSProperties}>
        <div>
          <b>{t.faqAppealCalloutTitle}</b>
          <p>{t.faqAppealCalloutBody}</p>
        </div>
        <Link href="/appeal-authority" className="primary compact">
          {t.portalAppeal}
          <IconArrowRight size={15} />
        </Link>
      </div>
    </Shell>
  );
}

/* ── Appeal authority ──────────────────────────────────────────── */
export function AppealAuthorityPage() {
  const { t, ready } = useLanguage();
  if (!ready) return <div className="portalBoot" />;
  const officers = [
    ["Income Tax (CBDT)", "Dipi Agarwal", "01123416148"],
    ["Indirect Taxes & Customs", "Dr. Shailendra Kumar Sinha", "01123705809"],
    ["Industry & Internal Trade", "Jai Prakash Shivahare", "01123038876"],
    ["Agriculture & Farmers Welfare", "S. Rukmani", "01123381305"],
    ["Atomic Energy", "Nidhi Pandey", "02222027535"],
  ];
  return (
    <Shell
      t={t}
      kicker={t.portalAppealKicker}
      title={t.portalAppealTitle}
      intro={t.portalAppealBody}
      source="https://pgportal.gov.in/Home/NodalAuthorityForAppeal"
      sourceLabel={t.portalOfficialAppeal}
    >
      <div className="appealRule reveal" style={{ "--i": 3 } as React.CSSProperties}>
        <div>
          <b>{t.appealWindowTitle}</b>
          <p>{t.appealWindowBody}</p>
        </div>
        <span>{t.appealWindowValue}</span>
      </div>
      <div className="appealDirectory reveal" style={{ "--i": 4 } as React.CSSProperties}>
        {officers.map(([department, name, phone]) => (
          <div key={department}>
            <span>{department}</span>
            <b>{name}</b>
            <a href={`tel:${phone}`}>
              <IconPhone size={14} />
              {phone}
            </a>
          </div>
        ))}
      </div>
    </Shell>
  );
}
