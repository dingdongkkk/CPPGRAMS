"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dict } from "./i18n";
import { fmt } from "./i18n";
import {
  IconArrowRight,
  IconChevronLeft,
  IconChevronRight,
  IconPause,
  IconPlay,
} from "./icons";

/**
 * The seven stages a grievance passes through, as published on
 * pgportal.gov.in. Presented as a stepped rail rather than a generic image
 * slider: the point is the sequence, so the position indicator is a numbered
 * track and the whole set stays readable with autoplay switched off.
 */
export default function ProcessCarousel({
  t,
  onFile,
}: {
  t: Dict;
  onFile: () => void;
}) {
  const stages = [
    { title: t.fl1Title, body: t.fl1Body },
    { title: t.fl2Title, body: t.fl2Body },
    { title: t.fl3Title, body: t.fl3Body },
    { title: t.fl4Title, body: t.fl4Body },
    { title: t.fl5Title, body: t.fl5Body },
    { title: t.fl6Title, body: t.fl6Body },
    { title: t.fl7Title, body: t.fl7Body },
  ];
  const total = stages.length;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const region = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (next: number) => setIndex(((next % total) + total) % total),
    [total],
  );

  // Autoplay is a convenience, never the only way through: it stops on any
  // interaction, and never starts for readers who ask for reduced motion.
  useEffect(() => {
    if (!playing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => go(index + 1), 7000);
    return () => window.clearInterval(timer);
  }, [playing, index, go]);

  // Arrow keys work from the numbered track — the standard pattern for a
  // stepped control, and it keeps the handler on real buttons rather than
  // on a div that a keyboard user can tab into but not operate.
  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") {
      setPlaying(false);
      go(index + 1);
    } else if (event.key === "ArrowLeft") {
      setPlaying(false);
      go(index - 1);
    }
  }

  const active = stages[index];

  return (
    <section className="flowSection" aria-labelledby="flow-title">
      <div className="flowHead">
        <div>
          <p className="flowKicker">{t.flowKicker}</p>
          <h2 id="flow-title">{t.flowTitle}</h2>
          <p className="flowIntro">{t.flowBody}</p>
        </div>
        <div className="flowControls">
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              go(index - 1);
            }}
            aria-label={t.flowPrev}
          >
            <IconChevronLeft size={17} />
          </button>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? t.flowPause : t.flowPlay}
          >
            {playing ? <IconPause size={16} /> : <IconPlay size={16} />}
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              go(index + 1);
            }}
            aria-label={t.flowNext}
          >
            <IconChevronRight size={17} />
          </button>
        </div>
      </div>

      {/* Numbered track — doubles as the position indicator and as direct
          navigation, so no stage is more than one click away. */}
      <ol className="flowTrack">
        {stages.map((stage, i) => (
          <li key={stage.title}>
            <button
              type="button"
              className={
                i === index ? "current" : i < index ? "done" : undefined
              }
              aria-current={i === index ? "step" : undefined}
              onKeyDown={onKeyDown}
              onClick={() => {
                setPlaying(false);
                go(i);
              }}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              <i aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>

      <div
        className="flowStage"
        ref={region}
        role="group"
        aria-roledescription="carousel"
        aria-label={t.flowTitle}
      >
        <div className="flowStageInner" aria-live="polite">
          <p className="flowCount">
            {fmt(t.flowStepOf, { n: index + 1, total })}
          </p>
          <h3>{active.title}</h3>
          <p>{active.body}</p>
        </div>
        <div className="flowStageSide">
          <span className="flowBigNumber" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          {index === total - 1 ? (
            <button type="button" className="primary compact" onClick={onFile}>
              {t.start}
              <IconArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setPlaying(false);
                go(index + 1);
              }}
            >
              {t.flowNext}
              <IconArrowRight size={15} />
            </button>
          )}
        </div>
      </div>

      <p className="flowSource">{t.flowSource}</p>
    </section>
  );
}
