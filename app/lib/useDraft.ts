"use client";

import { useCallback, useEffect, useState } from "react";

export type ChatMessage = { role: "user" | "assistant"; text: string };

/** Everything both filing modes share. One shape, one storage key. */
export type Draft = {
  description: string;
  state: string;
  district: string;
  blockTehsil: string;
  gramPanchayat: string;
  locality: string;
  startedOn: string;
  frequency: string;
  affectedPeople: string;
  requestedResolution: string;
  messages: ChatMessage[];
};

export const emptyDraft: Draft = {
  description: "",
  state: "",
  district: "",
  blockTehsil: "",
  gramPanchayat: "",
  locality: "",
  startedOn: "",
  frequency: "",
  affectedPeople: "",
  requestedResolution: "",
  messages: [],
};

const KEY = "jansetu-filing-draft";

export function readDraft(): Draft {
  if (typeof window === "undefined") return emptyDraft;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...emptyDraft, ...(JSON.parse(raw) as Partial<Draft>) } : emptyDraft;
  } catch {
    return emptyDraft;
  }
}

/**
 * The draft behind both the conversational and manual filing screens.
 *
 * Kept in localStorage rather than component state so the two views are the
 * same document: answering a question in the chat fills the matching form
 * field, and editing that field is what the assistant sees on its next turn.
 * The `storage` listener extends that to other tabs, so the same draft open
 * twice cannot silently diverge.
 */
export function useDraft() {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDraft(readDraft());
    setReady(true);
    const onStorage = (event: StorageEvent) => {
      if (event.key === KEY) setDraft(readDraft());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((patch: Partial<Draft>) => {
    setDraft((current) => {
      const next = { ...current, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* quota or private mode — the in-memory draft still works */
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(KEY);
    setDraft(emptyDraft);
  }, []);

  return { draft, update, clear, ready };
}

/** Fields the assistant collects, in the order it asks for them. */
export const draftFields = [
  "description",
  "state",
  "district",
  "blockTehsil",
  "gramPanchayat",
  "locality",
  "startedOn",
  "frequency",
  "affectedPeople",
  "requestedResolution",
] as const;

export function draftProgress(draft: Draft) {
  const filled = draftFields.filter((f) => String(draft[f] || "").trim()).length;
  return { filled, total: draftFields.length };
}
