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
export function useVoice(language: string) {
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [busy, setBusy] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
  }, []);

  /** Stops recording and resolves with the transcript ("" if nothing usable). */
  const stopAndTranscribe = useCallback(async () => {
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

  /** Speaks text and resolves when playback ends, so callers can chain turns. */
  const speak = useCallback(
    async (text: string, languageName: string) => {
      if (!text.trim()) return;
      try {
        const response = await fetch("/api/voice/speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, languageName }),
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
      } finally {
        setSpeaking(false);
        audioRef.current = null;
      }
    },
    [],
  );

  const stopSpeaking = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setSpeaking(false);
  }, []);

  return { recording, speaking, busy, start, stopAndTranscribe, speak, stopSpeaking };
}
