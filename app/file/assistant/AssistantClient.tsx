"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FilingShell } from "../FilingShell";
import { useLanguage } from "../../useLanguage";
import { useDraft, type ChatMessage } from "../../lib/useDraft";
import { useVoice } from "../../lib/useVoice";
import {
  IconArrowRight,
  IconMic,
  IconPause,
  IconPlay,
  IconStop,
  IconUser,
  IconSpark,
} from "../../icons";

type CaseContext = {
  complaints?: Array<Record<string, unknown>>;
  appeals?: Array<Record<string, unknown>>;
};

export default function AssistantClient() {
  const { t, language, meta, ready: langReady } = useLanguage();
  const { draft, update, ready } = useDraft();
  const voice = useVoice(meta.speech);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  // Conversation mode keeps the microphone cycling after each reply, so the
  // citizen can keep talking without reaching for a button between turns.
  const [conversationMode, setConversationMode] = useState(false);
  const [caseContext, setCaseContext] = useState<CaseContext>({});
  const transcriptRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef(false);
  modeRef.current = conversationMode;

  // The assistant can answer "what happened to my complaint?" only if it is
  // told what the citizen has already filed.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [c, a] = await Promise.all([
          fetch("/api/complaints?name=" + encodeURIComponent(localStorage.getItem("jansetu-account") || "")).then((r) => (r.ok ? r.json() : null)).catch(() => null),
          fetch("/api/appeals").then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);
        if (cancelled) return;
        setCaseContext({ complaints: c?.complaints ?? [], appeals: a?.appeals ?? [] });
      } catch {
        /* context is an enhancement; the interview works without it */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [draft.messages, thinking]);

  const send = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean || thinking) return;
      setError("");
      const history = [...draft.messages, { role: "user" as const, text: clean }];
      update({ messages: history });
      setInput("");
      setThinking(true);
      try {
        const response = await fetch("/api/conversation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userText: clean,
            language,
            languageName: meta.english,
            captured: {
              description: draft.description,
              state: draft.state,
              district: draft.district,
              blockTehsil: draft.blockTehsil,
              gramPanchayat: draft.gramPanchayat,
              locality: draft.locality,
              startedOn: draft.startedOn,
              frequency: draft.frequency,
              affectedPeople: draft.affectedPeople,
              requestedResolution: draft.requestedResolution,
            },
            history: history.slice(-10),
            caseContext,
          }),
        });
        const result = (await response.json()) as {
          assistantMessage?: string;
          captured?: Record<string, string>;
          error?: string;
        };
        if (!response.ok || !result.assistantMessage) {
          throw new Error(result.error || "no reply");
        }
        const reply: ChatMessage = { role: "assistant", text: result.assistantMessage };
        // Whatever the assistant understood is written straight into the
        // shared draft, which is what the manual form renders.
        update({ ...(result.captured || {}), messages: [...history, reply] });
        await voice.speak(result.assistantMessage, meta.english);
        if (modeRef.current) void listenOnce();
      } catch {
        setError(t.tPrepareFail);
      } finally {
        setThinking(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft, thinking, language, meta, caseContext, update, voice, t],
  );

  const listenOnce = useCallback(async () => {
    try {
      await voice.start();
    } catch {
      setError(t.tMicBlocked);
      setConversationMode(false);
      return;
    }
    // A fixed listening window keeps the turn-taking predictable; the
    // citizen can also stop early with the button.
    await new Promise((r) => setTimeout(r, 6000));
    const text = await voice.stopAndTranscribe();
    if (text) void send(text);
    else if (modeRef.current) void listenOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice, send, t]);

  async function togglePushToTalk() {
    if (voice.recording) {
      const text = await voice.stopAndTranscribe();
      if (text) void send(text);
      else setError(t.tNoSpeech);
      return;
    }
    try {
      await voice.start();
    } catch {
      setError(t.tMicBlocked);
    }
  }

  function toggleConversation() {
    if (conversationMode) {
      setConversationMode(false);
      voice.stopSpeaking();
      return;
    }
    setConversationMode(true);
    void listenOnce();
  }

  if (!ready || !langReady) return <div className="portalBoot" />;

  return (
    <FilingShell draft={draft} active="assistant">
      <section className="chatWrap">
        <div className="chatTranscript" ref={transcriptRef} aria-live="polite">
          {!draft.messages.length && (
            <div className="chatEmpty">
              <IconSpark size={26} />
              <h2>{t.modeAiTitle}</h2>
              <p>{t.modeAiBody}</p>
            </div>
          )}
          {draft.messages.map((m, i) => (
            <article key={i} className={`bubble ${m.role}`}>
              <span className="bubbleWho" aria-hidden="true">
                {m.role === "user" ? <IconUser size={14} /> : <IconSpark size={14} />}
              </span>
              <p>{m.text}</p>
            </article>
          ))}
          {thinking && (
            <article className="bubble assistant pending" aria-label="thinking">
              <span className="bubbleWho"><IconSpark size={14} /></span>
              <p><i /><i /><i /></p>
            </article>
          )}
        </div>

        {error && <p className="chatError" role="alert">{error}</p>}

        <div className={`chatComposer ${conversationMode ? "live" : ""}`}>
          <button
            type="button"
            className={`micButton ${voice.recording ? "on" : ""}`}
            onClick={togglePushToTalk}
            disabled={conversationMode || voice.busy}
            aria-label={voice.recording ? t.voiceStop : t.voiceStart}
          >
            {voice.recording ? <IconStop size={18} /> : <IconMic size={18} />}
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder={t.placeholder}
            disabled={conversationMode}
            aria-label={t.describeLabel}
          />
          <button
            type="button"
            className="primary compact"
            onClick={() => send(input)}
            disabled={!input.trim() || thinking}
          >
            <IconArrowRight size={16} />
          </button>
          <button
            type="button"
            className={`conversationToggle ${conversationMode ? "on" : ""}`}
            onClick={toggleConversation}
          >
            {conversationMode ? <IconPause size={15} /> : <IconPlay size={15} />}
            {conversationMode ? t.voiceStop : t.voiceStart}
          </button>
        </div>
        {conversationMode && (
          <p className="conversationHint">
            {voice.recording ? t.voiceListening : voice.speaking ? t.liveTranscription : t.voiceReady}
          </p>
        )}
      </section>
    </FilingShell>
  );
}
