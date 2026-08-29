"use client";

import Link from "next/link";
import { useState } from "react";
import { FilingShell } from "../FilingShell";
import { useLanguage } from "../../useLanguage";
import { useDraft, draftFields } from "../../lib/useDraft";
import { useVoice } from "../../lib/useVoice";
import { STATES_AND_UTS } from "../../lib/states";
import { IconArrowRight, IconSpark, IconStop, IconMic } from "../../icons";

export default function FormClient() {
  const { t, meta, ready: langReady } = useLanguage();
  const { draft, update, ready } = useDraft();
  const voice = useVoice(meta.speech);
  const [dictating, setDictating] = useState<string | null>(null);

  if (!ready || !langReady) return <div className="portalBoot" />;

  const set = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => update({ [field]: e.target.value });

  /** Reads a field's label and guidance aloud, for low-literacy users. */
  const readAloud = (text: string) => voice.speak(text, meta.english);

  /** Dictate straight into a single field. */
  async function dictate(field: string) {
    if (dictating === field) {
      const text = await voice.stopAndTranscribe();
      setDictating(null);
      if (text) update({ [field]: text });
      return;
    }
    try {
      await voice.start();
      setDictating(field);
    } catch {
      setDictating(null);
    }
  }

  const filled = draftFields.filter((f) => String(draft[f] || "").trim()).length;

  return (
    <FilingShell draft={draft} active="form">
      <section className="formWrap">
        <div className="formMain">
          <p className="portalPageKicker">{t.stepLabel}</p>
          <h1>{t.modeManualTitle}</h1>
          <p className="portalPageIntro">{t.detailsBody}</p>

          <label className="formField wide">
            <span>
              {t.describeLabel} <em>{t.requiredWord}</em>
              <button type="button" className="fieldSpeak" onClick={() => readAloud(t.natural)} aria-label={t.voiceStart}>
                <IconSpark size={13} />
              </button>
            </span>
            <textarea
              value={draft.description}
              onChange={set("description")}
              maxLength={2000}
              rows={5}
              placeholder={t.placeholder}
            />
            <div className="fieldFoot">
              <button type="button" className={`dictate ${dictating === "description" ? "on" : ""}`} onClick={() => dictate("description")}>
                {dictating === "description" ? <IconStop size={13} /> : <IconMic size={13} />}
                {dictating === "description" ? t.voiceStop : t.voiceStart}
              </button>
              <small>{draft.description.length} / 2,000</small>
            </div>
          </label>

          <div className="formGrid">
            <label className="formField">
              <span>{t.fState} <em>{t.requiredWord}</em></span>
              <select value={draft.state} onChange={set("state")}>
                <option value="">{t.selectState}</option>
                {STATES_AND_UTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="formField">
              <span>{t.fDistrict}</span>
              <input value={draft.district} onChange={set("district")} placeholder={t.phDistrict} />
            </label>
            <label className="formField">
              <span>{t.fBlock}</span>
              <input value={draft.blockTehsil} onChange={set("blockTehsil")} placeholder={t.phBlock} />
            </label>
            <label className="formField">
              <span>{t.fPanchayat}</span>
              <input value={draft.gramPanchayat} onChange={set("gramPanchayat")} placeholder={t.phPanchayat} />
            </label>
            <label className="formField">
              <span>{t.fVillage}</span>
              <input value={draft.locality} onChange={set("locality")} placeholder={t.phVillage} />
            </label>
            <label className="formField">
              <span>{t.fStarted}</span>
              <input type="date" value={draft.startedOn} onChange={set("startedOn")} />
            </label>
            <label className="formField">
              <span>{t.fFrequency}</span>
              <select value={draft.frequency} onChange={set("frequency")}>
                <option value="">—</option>
                <option value="Ongoing">{t.freqOngoing}</option>
                <option value="Every day">{t.freqDaily}</option>
                <option value="Intermittent">{t.freqIntermittent}</option>
                <option value="One-time incident">{t.freqOneTime}</option>
              </select>
            </label>
            <label className="formField">
              <span>{t.fAffected}</span>
              <input inputMode="numeric" value={draft.affectedPeople} onChange={set("affectedPeople")} placeholder={t.phAffected} />
            </label>
            <label className="formField wide">
              <span>{t.fOutcome}</span>
              <input value={draft.requestedResolution} onChange={set("requestedResolution")} placeholder={t.phOutcome} />
            </label>
          </div>

          <Link href="/" className="primary compact formSubmit">
            {t.prepare}
            <IconArrowRight size={16} />
          </Link>
        </div>

        {/* The assistant stays available here: the same draft, read aloud. */}
        <aside className="formAside">
          <div className="asideCard">
            <span className="asideIcon"><IconSpark size={18} /></span>
            <b>{t.modeAiTitle}</b>
            <p>{t.modeAiBody}</p>
            <Link href="/file/assistant" className="secondary">
              {t.modeAiCta}
              <IconArrowRight size={14} />
            </Link>
          </div>
          <div className="asideCard subtle">
            <b>{t.detailsTitle}</b>
            <p className="asideProgress">
              {filled} / {draftFields.length}
            </p>
            <p>{t.aiNote}</p>
          </div>
        </aside>
      </section>
    </FilingShell>
  );
}
