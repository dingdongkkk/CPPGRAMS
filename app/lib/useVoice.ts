"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Microphone capture and playback for the assistant.
 *
 * Recording goes through MediaRecorder and the server transcription route
 * rather than the browser's SpeechRecognition API: that API is missing on
 * Firefox and most Android browsers, and its accuracy on Indian place names
 * and code-switched speech is poor.
 */
/**
 * Picks the best installed voice for a BCP-47 tag, preferring an exact match
 * ("ta-IN") and accepting the bare language ("ta") before giving up. Voices
 * load asynchronously in some browsers, hence the one-shot wait.
 */
async function voicesReady(): Promise<SpeechSynthesisVoice[]> {
  const synth = window.speechSynthesis;
  if (!synth) return [];
  const now = synth.getVoices();
  if (now.length) return now;
  return new Promise((resolve) => {
    const done = () => resolve(synth.getVoices());
    synth.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 800);
  });
}

async function speakLocally(
  text: string,
  language: string,
  setSpeaking: (v: boolean) => void,
  ref: { current: SpeechSynthesisUtterance | null },
): Promise<boolean> {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  if (!synth) return false;
  const voices = await voicesReady();
  const base = language.split("-")[0].toLowerCase();
  const voice =
    voices.find((v) => v.lang.toLowerCase() === language.toLowerCase()) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(base + "-")) ||
    voices.find((v) => v.lang.toLowerCase() === base);
  // No voice for this language: let the caller try the server instead, rather
  // than reading Tamil aloud in an English voice.
  if (!voice) return false;

  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.95; // a little slower reads as calmer and is easier to follow
  ref.current = utterance;
  setSpeaking(true);
  await new Promise<void>((resolve) => {
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    synth.speak(utterance);
  });
  setSpeaking(false);
  ref.current = null;
  return true;
}

type SpeechResultEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};
type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
};

function getRecognition(): (new () => RecognitionLike) | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as typeof window & {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function useVoice(language: string) {
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [busy, setBusy] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const finalTextRef = useRef("");
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const start = useCallback(async () => {
    // Browser recognition is free and needs no key, so it is tried first.
    // It also returns text directly, avoiding an upload round trip.
    const Recognition = getRecognition();
    if (Recognition) {
      const recognition = new Recognition();
      recognition.lang = language;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      finalTextRef.current = "";
      recognition.onresult = (event: SpeechResultEvent) => {
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          if (event.results[i].isFinal) {
            finalTextRef.current += `${event.results[i][0].transcript} `;
          }
        }
      };
      recognition.onerror = () => {};
      recognitionRef.current = recognition;
      recognition.start();
      setRecording(true);
      return;
    }

    // Firefox and most Android browsers have no SpeechRecognition, so record
    // audio and let the server transcribe it instead.
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
  }, [language]);

  /** Stops recording and resolves with the transcript ("" if nothing usable). */
  const stopAndTranscribe = useCallback(async () => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.stop();
      recognitionRef.current = null;
      setRecording(false);
      // Give the engine a moment to flush its last final result.
      await new Promise((r) => setTimeout(r, 350));
      return finalTextRef.current.trim();
    }

    const recorder = recorderRef.current;
    if (!recorder) return "";
    const done = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: "audio/webm" }));
    });
    recorder.stop();
    recorder.stream.getTracks().forEach((t) => t.stop());
    recorderRef.current = null;
    setRecording(false);

    const blob = await done;
    if (blob.size < 1200) return ""; // effectively silence
    setBusy(true);
    try {
      const form = new FormData();
      form.append("audio", blob, "answer.webm");
      form.append("language", language);
      const response = await fetch("/api/voice/transcribe", { method: "POST", body: form });
      if (!response.ok) return "";
      const { text } = (await response.json()) as { text?: string };
      return (text || "").trim();
    } catch {
      return "";
    } finally {
      setBusy(false);
    }
  }, [language]);

  /**
   * Speaks text and resolves when playback ends, so callers can chain turns.
   *
   * Tries the browser's own speechSynthesis first: it costs nothing, needs no
   * key, plays instantly because nothing crosses the network, and on Android —
   * where most of these citizens are — the Indian-language voices are
   * generally installed. A server TTS route, if one is configured, is used
   * only when the device has no voice for the chosen language.
   */
  const speak = useCallback(
    async (text: string, languageName: string) => {
      const clean = text.trim();
      if (!clean) return;

      if (await speakLocally(clean, language, setSpeaking, utteranceRef)) return;

      // Fall back to server TTS only if it is actually configured.
      try {
        const response = await fetch("/api/voice/speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: clean, languageName }),
        });
        if (!response.ok) return;
        const url = URL.createObjectURL(await response.blob());
        const audio = new Audio(url);
        audioRef.current = audio;
        setSpeaking(true);
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          void audio.play().catch(() => resolve());
        });
        URL.revokeObjectURL(url);
      } catch {
        /* silence is better than a broken turn */
      } finally {
        setSpeaking(false);
        audioRef.current = null;
      }
    },
    [language],
  );

  const stopSpeaking = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    window.speechSynthesis?.cancel();
    utteranceRef.current = null;
    setSpeaking(false);
  }, []);

  return { recording, speaking, busy, start, stopAndTranscribe, speak, stopSpeaking };
}
