"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  LANGUAGES,
  detectLanguage,
  fmt,
  getDict,
  getLanguage,
  isLangCode,
  type Dict,
  type LangCode,
} from "./i18n";

type Screen =
  | "home"
  | "describe"
  | "review"
  | "track"
  | "confirm"
  | "appeal"
  | "appeal-track"
  | "closed";
type PortalPanel =
  | "about"
  | "contact"
  | "help"
  | "sitemap"
  | "officers"
  | "process"
  | "appeal-authority"
  | "mobile"
  | "signin"
  | null;
type Analysis = {
  department: string;
  category: string;
  location: string;
  issueType: string;
  keyDetails: string[];
  summary: string;
  urgency: "Critical" | "High" | "Medium" | "Low";
  urgencyReason: string;
  assignedOfficer: string;
  emergencyWarning: boolean;
  source?: string;
};
type GpsLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
  label: string;
  address?: string;
  state?: string;
};
type ComplaintDetails = {
  district: string;
  blockTehsil: string;
  gramPanchayat: string;
  locality: string;
  startedOn: string;
  frequency: string;
  affectedPeople: string;
  requestedResolution: string;
};
type TrackingRecord = {
  issueNumber: string;
  department: string;
  category: string;
  location: string;
  status: string;
  stage: number;
  createdAt: string;
  urgency: "Critical" | "High" | "Medium" | "Low";
  urgencyReason: string;
  assignedOfficer: string;
};
type SpeechResultEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
};

/**
 * Speech-recognition options: every UI language first (so the voice language
 * follows the language the citizen picked), then widely-spoken extras that the
 * interface itself is not translated into yet.
 */
const extraVoiceLanguages = [
  ["gu-IN", "ગુજરાતી"],
  ["ml-IN", "മലയാളം"],
  ["pa-IN", "ਪੰਜਾਬੀ"],
  ["ur-IN", "اردو"],
  ["or-IN", "ଓଡ଼ିଆ"],
  ["as-IN", "অসমীয়া"],
  ["ne-NP", "नेपाली"],
  ["bn-BD", "বাংলা (Bangladesh)"],
] as const;

const statesAndUTs = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Chandigarh",
  "Puducherry",
  "Andaman and Nicobar Islands",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Lakshadweep",
];

/** Timeline stages, resolved against the active dictionary. */
function buildStages(t: Dict) {
  return [
    { title: t.s1Title, detail: t.s1Detail, sla: t.s1Sla },
    { title: t.s2Title, detail: t.s2Detail, sla: t.s2Sla },
    { title: t.s3Title, detail: t.s3Detail, sla: t.s3Sla },
    { title: t.s4Title, detail: t.s4Detail, sla: t.s4Sla },
    { title: t.s5Title, detail: t.s5Detail, sla: t.s5Sla },
  ];
}

/** Urgency comes back from the API in English; show it in the citizen's language. */
function urgencyLabel(t: Dict, urgency: Analysis["urgency"]) {
  return urgency === "Critical"
    ? t.urgencyCritical
    : urgency === "High"
      ? t.urgencyHigh
      : urgency === "Medium"
        ? t.urgencyMedium
        : t.urgencyLow;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [language, setLanguage] = useState<LangCode>("en");
  const [languageChosen, setLanguageChosen] = useState(false);
  // The saved language lives in localStorage, which is unavailable during SSR.
  // Hold the first paint until we've read it, so a returning citizen never
  // sees the picker flash before their own language loads.
  const [ready, setReady] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [toast, setToast] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [appealReason, setAppealReason] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState("auto");
  const [gpsLocation, setGpsLocation] = useState<GpsLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [selectedState, setSelectedState] = useState("");
  const [details, setDetails] = useState<ComplaintDetails>({
    district: "",
    blockTehsil: "",
    gramPanchayat: "",
    locality: "",
    startedOn: "",
    frequency: "Ongoing",
    affectedPeople: "",
    requestedResolution: "",
  });
  const [permissionPrompt, setPermissionPrompt] = useState(true);
  const [showSecurityGate, setShowSecurityGate] = useState(false);
  const [digiVerified, setDigiVerified] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaMode, setCaptchaMode] = useState<"demo" | "live">("demo");
  const [securityLoading, setSecurityLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [grievanceId, setGrievanceId] = useState("");
  const [showTrackingLookup, setShowTrackingLookup] = useState(false);
  const [trackingIssue, setTrackingIssue] = useState("");
  const [trackingName, setTrackingName] = useState("");
  const [trackingError, setTrackingError] = useState("");
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingReadOnly, setTrackingReadOnly] = useState(false);
  const [resolutionFeedback, setResolutionFeedback] = useState<"resolved" | "not-resolved" | "">("");
  const [processRating, setProcessRating] = useState(0);
  const [portalPanel, setPortalPanel] = useState<PortalPanel>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const continueListeningRef = useRef(false);
  const voiceBaseRef = useRef("");
  const voiceFinalRef = useRef("");
  const t = getDict(language);
  const activeLanguage = getLanguage(language);
  const stages = useMemo(() => buildStages(t), [t]);

  useEffect(() => {
    const draft = localStorage.getItem("jansetu-draft");
    if (draft) setDescription(draft);
    const savedLanguage = localStorage.getItem("jansetu-lang");
    if (isLangCode(savedLanguage)) {
      setLanguage(savedLanguage);
      setLanguageChosen(true);
    }
    setReady(true);
    const params = new URLSearchParams(window.location.search);
    if (
      params.get("digilocker") === "verified" ||
      params.get("digilocker") === "demo-verified"
    ) {
      setDigiVerified(true);
      setShowSecurityGate(true);
      window.history.replaceState({}, "", "/");
    }
  }, []);
  useEffect(() => {
    if (description) localStorage.setItem("jansetu-draft", description);
  }, [description]);
  // Keep the document in sync so screen readers and text selection follow suit.
  useEffect(() => {
    const meta = getLanguage(language);
    document.documentElement.lang = language;
    document.documentElement.dir = meta.dir;
  }, [language]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3600);
    return () => clearTimeout(timer);
  }, [toast]);

  const progress = useMemo(
    () =>
      screen === "describe"
        ? 0
        : screen === "review"
          ? 1
          : ["track", "appeal-track"].includes(screen)
            ? 2
            : 3,
    [screen],
  );

  async function prepareComplaint() {
    if (description.trim().length < 20) {
      setToast(t.tMoreDetail);
      return;
    }
    if (!selectedState && !gpsLocation?.state) {
      setToast(t.tSelectState);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          state: selectedState || gpsLocation?.state,
          details,
          gps: gpsLocation
            ? {
                latitude: gpsLocation.latitude,
                longitude: gpsLocation.longitude,
                accuracy: gpsLocation.accuracy,
                address: gpsLocation.address,
              }
            : null,
        }),
      });
      if (!response.ok) throw new Error("Could not analyse");
      const result = (await response.json()) as Analysis;
      setAnalysis(
        gpsLocation
          ? {
              ...result,
              location: [
                gpsLocation.address || gpsLocation.label,
                selectedState || gpsLocation.state,
              ]
                .filter(Boolean)
                .filter((value, index, all) => all.indexOf(value) === index)
                .join(", "),
            }
          : result,
      );
      setScreen("review");
    } catch {
      setToast(t.tPrepareFail);
    } finally {
      setLoading(false);
    }
  }

  async function submitGrievance() {
    if (!analysis) return;
    if (name.trim().length < 2) {
      setToast(t.tEnterName);
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filerName: name,
          department: analysis.department,
          category: analysis.category,
          location: analysis.location,
          urgency: analysis.urgency,
          urgencyReason: analysis.urgencyReason,
          assignedOfficer: analysis.assignedOfficer,
        }),
      });
      const result = (await response.json()) as {
        complaint?: { issueNumber: string };
        error?: string;
      };
      if (!response.ok || !result.complaint) {
        throw new Error(result.error || "Could not file complaint");
      }
      localStorage.removeItem("jansetu-draft");
      setGrievanceId(result.complaint.issueNumber);
      setTrackingReadOnly(false);
      setStage(1);
      setScreen("track");
      setToast(fmt(t.tFiled, { id: result.complaint.issueNumber }));
    } catch (error) {
      setToast(error instanceof Error ? error.message : t.tFileFail);
    } finally {
      setSubmitting(false);
    }
  }

  async function trackComplaint() {
    setTrackingError("");
    setTrackingLoading(true);
    try {
      const response = await fetch(
        `/api/complaints?issue=${encodeURIComponent(trackingIssue)}&name=${encodeURIComponent(trackingName)}`,
      );
      const result = (await response.json()) as {
        complaint?: TrackingRecord;
        error?: string;
      };
      if (!response.ok || !result.complaint)
        throw new Error(result.error || "Complaint not found.");
      const record = result.complaint;
      setGrievanceId(record.issueNumber);
      setTrackingReadOnly(true);
      setStage(Math.max(0, Math.min(4, record.stage)));
      setAnalysis({
        department: record.department,
        category: record.category,
        location: record.location,
        issueType: record.category,
        keyDetails: [`Filed on ${record.createdAt}`, `Current status: ${record.status}`],
        summary: `${record.category} complaint filed for ${record.location}.`,
        urgency: record.urgency,
        urgencyReason: record.urgencyReason,
        assignedOfficer: record.assignedOfficer,
        emergencyWarning: record.urgency === "Critical",
        source: "tracking",
      });
      setShowTrackingLookup(false);
      setScreen("track");
    } catch (error) {
      setTrackingError(error instanceof Error ? error.message : "Complaint not found.");
    } finally {
      setTrackingLoading(false);
    }
  }

  function advanceStage() {
    if (stage < 4) {
      const next = stage + 1;
      setStage(next);
      setToast(
        fmt(t.tStatusUpdate, {
          title: stages[next].title,
          detail: stages[next].detail,
        }),
      );
      if (next === 4) setTimeout(() => setScreen("confirm"), 800);
    }
  }

  function startVoice() {
    if (listening && recognitionRef.current) {
      continueListeningRef.current = false;
      recognitionRef.current.stop();
      return;
    }
    const speechWindow = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Recognition =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setToast(t.tVoiceUnsupported);
      return;
    }
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    continueListeningRef.current = true;
    recognition.lang =
      voiceLanguage === "auto"
        ? navigator.language || activeLanguage.speech
        : voiceLanguage;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    voiceBaseRef.current = description.trim();
    voiceFinalRef.current = "";
    recognition.onstart = () => {
      setListening(true);
      setToast(fmt(t.tMicOn, { lang: recognition.lang }));
    };
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const words = event.results[i][0].transcript;
        if (event.results[i].isFinal) voiceFinalRef.current += `${words} `;
        else interim += words;
      }
      setDescription(
        [voiceBaseRef.current, voiceFinalRef.current.trim(), interim.trim()]
          .filter(Boolean)
          .join(" "),
      );
    };
    recognition.onerror = (event) => {
      if (event.error !== "no-speech") continueListeningRef.current = false;
      const message =
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? t.tMicBlocked
          : event.error === "no-speech"
            ? t.tNoSpeech
            : fmt(t.tVoiceStopped, { error: event.error });
      setToast(message);
    };
    recognition.onend = () => {
      if (continueListeningRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          continueListeningRef.current = false;
        }
      }
      setListening(false);
      recognitionRef.current = null;
    };
    try {
      recognition.start();
    } catch {
      setListening(false);
      setToast(t.tMicStarting);
    }
  }

  function getGpsLocation() {
    if (!navigator.geolocation) {
      setToast(t.tGpsUnsupported);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const coordinates = `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)} (GPS · ±${Math.round(coords.accuracy)} m)`;
        try {
          const result = (await fetch(
            `/api/geocode/reverse?lat=${encodeURIComponent(coords.latitude)}&lon=${encodeURIComponent(coords.longitude)}&lang=${encodeURIComponent(voiceLanguage === "auto" ? navigator.language : voiceLanguage)}`,
          ).then((response) => {
            if (!response.ok) throw new Error("reverse geocoding failed");
            return response.json();
          })) as {
            address?: string;
            state?: string;
            district?: string;
            village?: string;
          };
          const location = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            label: coordinates,
            address: result.address,
            state: result.state,
          };
          setGpsLocation(location);
          if (result.state && statesAndUTs.includes(result.state))
            setSelectedState(result.state);
          setDetails((current) => ({
            ...current,
            district: current.district || result.district || "",
            locality: current.locality || result.village || "",
          }));
          setToast(
            "GPS address added and State/UT selected automatically. Please review it.",
          );
        } catch {
          setGpsLocation({
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            label: coordinates,
          });
          setToast(
            "GPS coordinates added. Select your State/UT to ensure correct routing.",
          );
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        setLocating(false);
        setToast(
          error.code === 1
            ? "Location permission is blocked. Allow location access in your browser settings, or describe your area in the complaint."
            : "We couldn’t get your GPS location. Try again outdoors or enter your area in the complaint.",
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  async function requestFeaturePermissions() {
    setPermissionPrompt(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setToast(t.tMicEnabled);
    } catch {
      setToast(t.tMicDenied);
    }
    getGpsLocation();
  }

  function chooseLanguage(code: LangCode) {
    setLanguage(code);
    setLanguageChosen(true);
    setShowPicker(false);
    localStorage.setItem("jansetu-lang", code);
    if (code !== language) {
      setToast(fmt(getDict(code).tLanguageSet, { lang: getLanguage(code).native }));
    }
  }

  async function completeSecurityCheck() {
    if (!digiVerified) {
      setToast(t.tVerifyDigi);
      return;
    }
    if (!captchaToken) {
      setToast(t.tVerifyCaptcha);
      return;
    }
    setSecurityLoading(true);
    try {
      const response = await fetch("/api/captcha/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: captchaToken }),
      });
      if (!response.ok) throw new Error("captcha failed");
      setShowSecurityGate(false);
      setScreen("describe");
      setToast(t.tSecurityOk);
    } catch {
      setToast(t.tCaptchaFail);
      setCaptchaToken("");
    } finally {
      setSecurityLoading(false);
    }
  }

  if (!ready)
    return (
      <div className="bootSplash" aria-hidden="true">
        <span className="languageMark">ज</span>
      </div>
    );

  if (!languageChosen)
    return (
      <LanguagePicker
        active={language}
        onChoose={chooseLanguage}
        firstRun
      />
    );

  if (screen === "home")
    return (
      <main className="homePage">
        <Header
          language={language}
          openPicker={() => setShowPicker(true)}
          openPanel={setPortalPanel}
        />
        <nav className="portalNav" aria-label={t.portalNavLabel}>
          <button onClick={() => setPortalPanel("about")}>{t.portalAbout}</button>
          <button onClick={() => setPortalPanel("process")}>{t.portalProcess}</button>
          <button onClick={() => setPortalPanel("officers")}>{t.portalOfficers}</button>
          <button onClick={() => setPortalPanel("help")}>{t.portalHelp}</button>
          <button onClick={() => setPortalPanel("appeal-authority")}>{t.portalAppeal}</button>
          <button onClick={() => setPortalPanel("signin")}>{t.portalSignin}</button>
          <button onClick={() => setPortalPanel("sitemap")}>{t.portalSitemap}</button>
        </nav>
        <section className="homeHero">
          <div className="homeCopy">
            <span className="servicePill">
              <i /> {t.servicePill} · {t.publicBeta}
            </span>
            <h1>{t.heroTitle}</h1>
            <p>{t.heroBody}</p>
            <div className="homeActions">
              <button
                className="primary compact"
                onClick={() => setShowSecurityGate(true)}
              >
                {t.start}
                <span>→</span>
              </button>
              <button
                className="secondary"
                onClick={() => setShowTrackingLookup(true)}
              >
                {t.existing}
              </button>
            </div>
            <div className="trustRow">
              <span>🎙 {t.trustVoice}</span>
              <span>⌖ {t.trustGps}</span>
              <span>文 {t.trustLanguages}</span>
            </div>
          </div>
          <div className="promiseCard">
            <div className="promiseTop">
              <span>{t.expectKicker}</span>
              <b>{t.sampleJourney}</b>
            </div>
            <ol>
              {[
                [t.step1Title, t.step1Body],
                [t.step2Title, t.step2Body],
                [t.step3Title, t.step3Body],
                [t.step4Title, t.step4Body],
              ].map(([title, body], i) => (
                <li key={title}>
                  <b>{i + 1}</b>
                  <div>
                    <strong>{title}</strong>
                    <p>{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <section className="loginStrip">
          <div>
            <span className="avatar">
              {name.trim()
                ? name
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase())
                    .join("")
                : t.nameWord}
            </span>
            <label htmlFor="filerName">{t.filerName}</label>
            <input
              id="filerName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.filerNamePlaceholder}
            />
          </div>
          <p>🔒 {t.prototypeNote}</p>
        </section>
        <section className="qualitySignals" aria-label={t.qualitySignalsTitle}>
          <div className="qualitySignalIntro">
            <span className="signalIcon">◎</span>
            <div>
              <span className="signalKicker">{t.qualitySignalsKicker}</span>
              <h2>{t.qualitySignalsTitle}</h2>
              <p>{t.qualitySignalsBody}</p>
            </div>
          </div>
          <div className="signalCards">
            <div><b>01</b><span>{t.signalRefiles}</span></div>
            <div><b>02</b><span>{t.signalBoilerplate}</span></div>
            <div><b>03</b><span>{t.signalRootCauses}</span></div>
          </div>
          <p className="signalNote">{t.signalDemoNote}</p>
        </section>
        {showPicker && (
          <LanguagePicker
            active={language}
            onChoose={chooseLanguage}
            close={() => setShowPicker(false)}
          />
        )}
        {showSecurityGate && (
          <SecurityGate
            t={t}
            digiVerified={digiVerified}
            captchaToken={captchaToken}
            setCaptchaToken={setCaptchaToken}
            captchaMode={captchaMode}
            setCaptchaMode={setCaptchaMode}
            loading={securityLoading}
            close={() => setShowSecurityGate(false)}
            complete={completeSecurityCheck}
          />
        )}
        {showTrackingLookup && (
          <TrackingLookup
            t={t}
            issue={trackingIssue}
            setIssue={setTrackingIssue}
            name={trackingName}
            setName={setTrackingName}
            loading={trackingLoading}
            error={trackingError}
            close={() => {
              setShowTrackingLookup(false);
              setTrackingError("");
            }}
            submit={trackComplaint}
          />
        )}
        {portalPanel && (
          <PortalPanelView
            panel={portalPanel}
            t={t}
            close={() => setPortalPanel(null)}
            openPanel={setPortalPanel}
          />
        )}
      </main>
    );

  return (
    <main>
      {toast && (
        <div className="toast" role="status">
          <span>✓</span>
          {toast}
          <button onClick={() => setToast("")} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
      <Header
        language={language}
        openPicker={() => setShowPicker(true)}
        onHome={() => setScreen("home")}
      />
      {showPicker && (
        <LanguagePicker
          active={language}
          onChoose={chooseLanguage}
          close={() => setShowPicker(false)}
        />
      )}
      {screen === "describe" && permissionPrompt && (
        <div
          className="permissionOverlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="permission-title"
        >
          <div className="permissionDialog">
            <span className="permissionIcon">◉</span>
            <div>
              <em>{t.permKicker}</em>
              <h2 id="permission-title">{t.permTitle}</h2>
              <p>{t.permBody}</p>
              <ul>
                <li>🎙 {t.permMic}</li>
                <li>⌖ {t.permLoc}</li>
              </ul>
              <small>{t.permNote}</small>
            </div>
            <div className="permissionActions">
              <button
                className="secondary"
                onClick={() => setPermissionPrompt(false)}
              >
                {t.permNo}
              </button>
              <button
                className="primary compact"
                onClick={requestFeaturePermissions}
              >
                {t.permYes}
              </button>
            </div>
          </div>
        </div>
      )}
      <section className="pageIntro">
        <div className="eyebrow">
          <span className="liveDot" /> {t.eyebrow} <b>{t.publicBeta}</b>
        </div>
        <h1>
          {screen === "describe"
            ? t.introDescribeTitle
            : screen === "review"
              ? t.introReviewTitle
              : screen === "confirm"
                ? t.introConfirmTitle
                : screen === "appeal"
                  ? t.introAppealTitle
                  : screen === "closed"
                    ? t.introClosedTitle
                    : t.introTrackTitle}
        </h1>
        <p>
          {screen === "describe"
            ? t.introDescribeBody
            : screen === "review"
              ? t.introReviewBody
              : screen === "confirm"
                ? t.introConfirmBody
                : screen === "appeal"
                  ? t.introAppealBody
                  : screen === "closed"
                    ? t.introClosedBody
                    : t.introTrackBody}
        </p>
      </section>
      <Journey progress={progress} t={t} />

      {screen === "describe" && (
        <Describe
          t={t}
          description={description}
          setDescription={setDescription}
          loading={loading}
          prepare={prepareComplaint}
          startVoice={startVoice}
          listening={listening}
          voiceLanguage={voiceLanguage}
          setVoiceLanguage={setVoiceLanguage}
          gpsLocation={gpsLocation}
          locating={locating}
          getGpsLocation={getGpsLocation}
          selectedState={selectedState}
          setSelectedState={setSelectedState}
          details={details}
          setDetails={setDetails}
          files={files}
          setFiles={setFiles}
          fileRef={fileRef}
        />
      )}
      {screen === "review" && analysis && (
        <Review
          analysis={analysis}
          setAnalysis={setAnalysis}
          back={() => setScreen("describe")}
          submit={submitGrievance}
          t={t}
          details={details}
          submitting={submitting}
        />
      )}
      {(screen === "track" || screen === "appeal-track") && analysis && (
        <Track
          analysis={analysis}
          stages={stages}
          stage={stage}
          advance={advanceStage}
          grievanceId={grievanceId}
          isAppeal={screen === "appeal-track"}
          onConfirm={() => setScreen("confirm")}
          t={t}
          readOnly={trackingReadOnly}
        />
      )}
      {screen === "confirm" && (
        <Confirm
          grievanceId={grievanceId}
          yes={() => {
            setResolutionFeedback("resolved");
            setScreen("closed");
          }}
          no={() => setScreen("appeal")}
          t={t}
        />
      )}
      {screen === "appeal" && (
        <Appeal
          reason={appealReason}
          setReason={setAppealReason}
          submit={() => {
            if (appealReason.length < 10) {
              setToast(t.tAppealShort);
              return;
            }
            setScreen("appeal-track");
            setToast(t.tAppealFiled);
          }}
          back={() => setScreen("confirm")}
          t={t}
        />
      )}
      {screen === "closed" && (
        <Closed
          t={t}
          grievanceId={grievanceId}
          home={() => setScreen("home")}
          rating={processRating}
          setRating={setProcessRating}
          resolutionFeedback={resolutionFeedback}
        />
      )}
    </main>
  );
}

/**
 * First thing a citizen sees. Options are labelled in their own script, so the
 * reader never has to understand English to find their language.
 */
function LanguagePicker({
  active,
  onChoose,
  close,
  firstRun,
}: {
  active: LangCode;
  onChoose: (code: LangCode) => void;
  close?: () => void;
  firstRun?: boolean;
}) {
  // Only ever rendered on the client, so `navigator` is safe to read here.
  // On a first run there is no saved choice yet, so start from the device.
  const [highlighted, setHighlighted] = useState<LangCode>(() =>
    firstRun ? detectLanguage(navigator.language) : active,
  );
  const t = getDict(highlighted);

  return (
    <div
      className={`languageGate ${firstRun ? "fullPage" : "overlay"}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="language-title"
    >
      <section className="languageCard">
        {close && (
          <button className="gateClose" onClick={close} aria-label={t.closeWord}>
            ×
          </button>
        )}
        <span className="languageMark">{getLanguage(highlighted).mark}</span>
        <p className="languageKicker">{t.pickKicker}</p>
        <h1 id="language-title">{t.pickTitle}</h1>
        <p className="languageIntro">{t.pickBody}</p>
        <ul className="languageList">
          {LANGUAGES.map((option) => (
            <li key={option.code}>
              <button
                type="button"
                className={option.code === highlighted ? "selected" : ""}
                aria-pressed={option.code === highlighted}
                onClick={() => setHighlighted(option.code)}
                onDoubleClick={() => onChoose(option.code)}
                lang={option.code}
              >
                <b>{option.native}</b>
                <small>{option.english}</small>
                <i aria-hidden="true">✓</i>
              </button>
            </li>
          ))}
        </ul>
        <button
          className="primary languageContinue"
          onClick={() => onChoose(highlighted)}
        >
          {t.pickContinue}
          <span>→</span>
        </button>
        <small className="languageFooter">{t.pickFooter}</small>
      </section>
    </div>
  );
}

function TrackingLookup({
  t,
  issue,
  setIssue,
  name,
  setName,
  loading,
  error,
  close,
  submit,
}: {
  t: Dict;
  issue: string;
  setIssue: (value: string) => void;
  name: string;
  setName: (value: string) => void;
  loading: boolean;
  error: string;
  close: () => void;
  submit: () => void;
}) {
  return (
    <div className="trackingOverlay" role="dialog" aria-modal="true" aria-labelledby="tracking-title">
      <section className="trackingLookup">
        <button className="gateClose" onClick={close} aria-label={t.closeWord}>×</button>
        <span className="trackingIcon">#</span>
        <p className="trackingKicker">{t.tlKicker}</p>
        <h2 id="tracking-title">{t.tlTitle}</h2>
        <p className="trackingIntro">{t.tlIntro}</p>
        <label htmlFor="trackingIssue">{t.tlIssueLabel}</label>
        <input
          id="trackingIssue"
          value={issue}
          onChange={(event) => setIssue(event.target.value.toUpperCase())}
          placeholder="JS-2026-ABCDE-12345"
          autoComplete="off"
        />
        <label htmlFor="trackingName">{t.tlNameLabel}</label>
        <input
          id="trackingName"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t.tlNamePlaceholder}
          autoComplete="name"
        />
        {error && <p className="trackingError" role="alert">{error}</p>}
        <button
          className="primary"
          disabled={loading || issue.trim().length < 10 || name.trim().length < 2}
          onClick={submit}
        >
          {loading ? t.checking : t.tlButton}<span>→</span>
        </button>
        <small className="trackingPrivacy">{t.tlPrivacy}</small>
      </section>
    </div>
  );
}

function SecurityGate({
  t,
  digiVerified,
  captchaToken,
  setCaptchaToken,
  captchaMode,
  setCaptchaMode,
  loading,
  close,
  complete,
}: {
  t: Dict;
  digiVerified: boolean;
  captchaToken: string;
  setCaptchaToken: (v: string) => void;
  captchaMode: "demo" | "live";
  setCaptchaMode: (v: "demo" | "live") => void;
  loading: boolean;
  close: () => void;
  complete: () => void;
}) {
  return (
    <div
      className="securityOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="security-title"
    >
      <section className="securityGate">
        <button className="gateClose" onClick={close} aria-label={t.closeWord}>
          ×
        </button>
        <div className="securityHeading">
          <span>✓</span>
          <div>
            <em>{t.secKicker}</em>
            <h2 id="security-title">{t.secTitle}</h2>
            <p>{t.secBody}</p>
          </div>
        </div>
        <div className={`securityStep ${digiVerified ? "complete" : ""}`}>
          <span className="securityNumber">{digiVerified ? "✓" : "1"}</span>
          <div>
            <div className="securityStepTitle">
              <b>{t.secStep1Title}</b>
              <em>{digiVerified ? t.secVerified : t.secRequired}</em>
            </div>
            <p>{t.secStep1Body}</p>
            {digiVerified ? (
              <div className="verifiedIdentity">
                <b>✓ {t.secVerifiedOk}</b>
                <small>
                  {captchaMode === "demo"
                    ? t.secDemoIdentity
                    : t.secLiveIdentity}
                </small>
              </div>
            ) : (
              <a className="digiButton" href="/api/digilocker/start">
                <span className="digiMark">D</span>
                <span>
                  {t.digiVerify}
                  <small>{t.digiVerifySub}</small>
                </span>
                <b>→</b>
              </a>
            )}
          </div>
        </div>
        <div className={`securityStep ${captchaToken ? "complete" : ""}`}>
          <span className="securityNumber">{captchaToken ? "✓" : "2"}</span>
          <div>
            <div className="securityStepTitle">
              <b>{t.secStep2Title}</b>
              <em>{captchaToken ? t.secComplete : t.secRequired}</em>
            </div>
            <p>{t.secStep2Body}</p>
            <CaptchaWidget onToken={setCaptchaToken} onMode={setCaptchaMode} />
            <small className="modeNote">
              {captchaMode === "demo" ? t.secDemoCaptcha : t.secLiveCaptcha}
            </small>
          </div>
        </div>
        <div className="securityPrivacy">
          <span>🔒</span>
          <p>
            <b>{t.secPrivacyTitle}</b>
            <br />
            {t.secPrivacyBody}
          </p>
        </div>
        <button
          className="primary gateContinue"
          disabled={!digiVerified || !captchaToken || loading}
          onClick={complete}
        >
          {loading ? t.checking : t.secContinue}
          <span>→</span>
        </button>
      </section>
    </div>
  );
}

function CaptchaWidget({
  onToken,
  onMode,
}: {
  onToken: (token: string) => void;
  onMode: (mode: "demo" | "live") => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);
  useEffect(() => {
    let cancelled = false;
    let timer: number;
    async function load() {
      try {
        const config = (await fetch("/api/captcha/config").then((r) =>
          r.json(),
        )) as { siteKey: string; mode: "demo" | "live" };
        if (cancelled) return;
        onMode(config.mode);
        const attempt = () => {
          const w = window as typeof window & {
            turnstile?: {
              render: (
                el: HTMLElement,
                options: Record<string, unknown>,
              ) => string;
            };
          };
          if (w.turnstile && container.current && !rendered.current) {
            rendered.current = true;
            w.turnstile.render(container.current, {
              sitekey: config.siteKey,
              theme: "light",
              size: "flexible",
              action: "file_grievance",
              callback: (token: string) => onToken(token),
              "expired-callback": () => onToken(""),
              "error-callback": () => onToken(""),
            });
          } else if (!cancelled && !rendered.current)
            timer = window.setTimeout(attempt, 250);
        };
        attempt();
      } catch {
        onToken("");
      }
    }
    load();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [onToken, onMode]);
  return (
    <div className="captchaShell">
      <div ref={container} />
    </div>
  );
}

function Header({
  language,
  openPicker,
  onHome,
  openPanel,
}: {
  language: LangCode;
  openPicker: () => void;
  onHome?: () => void;
  openPanel?: (panel: Exclude<PortalPanel, null>) => void;
}) {
  const t = getDict(language);
  const meta = getLanguage(language);
  return (
    <header className="siteHeader">
      <button
        className="brand brandButton"
        onClick={onHome}
        aria-label={t.homeAria}
      >
        <span className="brandMark">{meta.mark}</span>
        <span>
          JanSetu <small>{meta.brand}</small>
        </span>
      </button>
      <div className="headerRight">
        {openPanel && (
          <button className="headerInfo" onClick={() => openPanel("contact")}>
            {t.portalContact}
          </button>
        )}
        <span className="demoChip">{t.publicBeta}</span>
        <button
          className="languageButton"
          onClick={openPicker}
          aria-label={t.languageCta}
        >
          <i aria-hidden="true">⟳</i>
          <span lang={language}>{meta.native}</span>
        </button>
      </div>
    </header>
  );
}

function PortalPanelView({
  panel,
  t,
  close,
  openPanel,
}: {
  panel: Exclude<PortalPanel, null>;
  t: Dict;
  close: () => void;
  openPanel: (panel: PortalPanel) => void;
}) {
  if (panel === "process") return <ProcessPanel t={t} close={close} />;
  if (panel === "officers") return <OfficersPanel t={t} close={close} />;
  if (panel === "help") return <FaqPanel t={t} close={close} openPanel={openPanel} />;
  if (panel === "appeal-authority") return <AppealAuthorityPanel t={t} close={close} />;

  const content = {
    about: {
      icon: "◎",
      kicker: t.portalAboutKicker,
      title: t.portalAboutTitle,
      body: t.portalAboutBody,
      items: [t.portalAboutItem1, t.portalAboutItem2, t.portalAboutItem3],
    },
    contact: {
      icon: "☎",
      kicker: t.portalContactKicker,
      title: t.portalContactTitle,
      body: t.portalContactBody,
      items: [t.portalContactItem1, t.portalContactItem2, t.portalContactItem3],
    },
    help: {
      icon: "?",
      kicker: t.portalHelpKicker,
      title: t.portalHelpTitle,
      body: t.portalHelpBody,
      items: [t.portalHelpItem1, t.portalHelpItem2, t.portalHelpItem3],
    },
    sitemap: {
      icon: "⌘",
      kicker: t.portalSitemapKicker,
      title: t.portalSitemapTitle,
      body: t.portalSitemapBody,
      items: [t.portalSitemapItem1, t.portalSitemapItem2, t.portalSitemapItem3],
    },
    officers: {
      icon: "◌",
      kicker: t.portalOfficersKicker,
      title: t.portalOfficersTitle,
      body: t.portalOfficersBody,
      items: [t.portalOfficersItem1, t.portalOfficersItem2, t.portalOfficersItem3],
    },
    process: {
      icon: "↗",
      kicker: t.portalProcessKicker,
      title: t.portalProcessTitle,
      body: t.portalProcessBody,
      items: [t.portalProcessItem1, t.portalProcessItem2, t.portalProcessItem3],
    },
    "appeal-authority": {
      icon: "↑",
      kicker: t.portalAppealKicker,
      title: t.portalAppealTitle,
      body: t.portalAppealBody,
      items: [t.portalAppealItem1, t.portalAppealItem2, t.portalAppealItem3],
    },
    mobile: {
      icon: "▣",
      kicker: t.portalMobileKicker,
      title: t.portalMobileTitle,
      body: t.portalMobileBody,
      items: [t.portalMobileItem1, t.portalMobileItem2, t.portalMobileItem3],
    },
    signin: {
      icon: "→",
      kicker: t.portalSigninKicker,
      title: t.portalSigninTitle,
      body: t.portalSigninBody,
      items: [t.portalSigninItem1, t.portalSigninItem2, t.portalSigninItem3],
    },
  }[panel];

  return (
    <div className="portalOverlay" role="dialog" aria-modal="true" aria-labelledby="portal-panel-title">
      <section className="portalPanel">
        <button className="gateClose" onClick={close} aria-label={t.closeWord}>×</button>
        <span className="portalPanelIcon">{content.icon}</span>
        <p className="portalPanelKicker">{content.kicker}</p>
        <h2 id="portal-panel-title">{content.title}</h2>
        <p className="portalPanelBody">{content.body}</p>
        <ul className="portalPanelList">
          {content.items.map((item) => <li key={item}><span>✓</span>{item}</li>)}
        </ul>
        {(panel === "contact" || panel === "help" || panel === "about") && (
          <a className="portalSource" href={panel === "contact" ? "https://pgportal.gov.in/Home/ContactUs" : "https://pgportal.gov.in/Home/Faq"} target="_blank" rel="noreferrer">
            ↗ {t.portalOfficialSource}
          </a>
        )}
        {panel === "help" && (
          <div className="portalPanelActions">
            <button className="secondary" onClick={() => { close(); openPanel("contact"); }}>
              {t.portalContact}
            </button>
            <button className="primary compact" onClick={close}>{t.closeWord}</button>
          </div>
        )}
        {panel !== "help" && <button className="primary compact portalPanelButton" onClick={close}>{t.closeWord}</button>}
      </section>
    </div>
  );
}

function PanelShell({ children, title, close, t }: { children: ReactNode; title: string; close: () => void; t: Dict }) {
  return (
    <div className="portalOverlay" role="dialog" aria-modal="true" aria-labelledby="portal-panel-title">
      <section className="portalPanel richPanel">
        <button className="gateClose" onClick={close} aria-label={t.closeWord}>×</button>
        {children}
      </section>
    </div>
  );
}

function ProcessPanel({ t, close }: { t: Dict; close: () => void }) {
  const steps = [
    [t.processStep1Title, t.processStep1Body],
    [t.processStep2Title, t.processStep2Body],
    [t.processStep3Title, t.processStep3Body],
    [t.processStep4Title, t.processStep4Body],
    [t.processStep5Title, t.processStep5Body],
  ];
  return (
    <PanelShell title={t.portalProcessTitle} close={close} t={t}>
      <span className="portalPanelIcon">↗</span>
      <p className="portalPanelKicker">{t.portalProcessKicker}</p>
      <h2 id="portal-panel-title">{t.portalProcessTitle}</h2>
      <p className="portalPanelBody">{t.portalProcessBody}</p>
      <div className="processTimeline">
        {steps.map(([stepTitle, body], i) => (
          <div className="processStep" key={stepTitle}>
            <b>{String(i + 1).padStart(2, "0")}</b>
            <div><h3>{stepTitle}</h3><p>{body}</p></div>
          </div>
        ))}
      </div>
      <a className="portalSource" href="https://pgportal.gov.in/Home/ProcessFlow" target="_blank" rel="noreferrer">↗ {t.portalOfficialProcess}</a>
    </PanelShell>
  );
}

function OfficersPanel({ t, close }: { t: Dict; close: () => void }) {
  const [query, setQuery] = useState("");
  const officers = [
    ["Administrative Reforms & Public Grievances", "Sardendu Kumar Pandey", "Director", "01123401455", "Director-pg@gov.in"],
    ["Agriculture & Farmers Welfare", "Rajesh Kumar", "Deputy Secretary PG", "01123074238", "rajesh.kumar67@nic.in"],
    ["Agriculture Research & Education", "Narendra Kumar", "Deputy Secretary", "01123046678", "narendra.kumar74@nic.in"],
    ["Animal Husbandry, Dairying", "RPS Rathore", "Director", "01123385797", "r.rathore@gov.in"],
    ["Atomic Energy", "K.V. Madhavadas", "Deputy Secretary", "02222862516", "dsscs@dae.gov.in"],
    ["Income Tax (CBDT)", "Swapna Devireddy", "Additional Director", "01123416133", "delhi.addldit.eservices@incometax.gov.in"],
  ];
  const visible = officers.filter((o) => o.join(" ").toLowerCase().includes(query.toLowerCase()));
  return (
    <PanelShell title={t.portalOfficersTitle} close={close} t={t}>
      <span className="portalPanelIcon">◌</span>
      <p className="portalPanelKicker">{t.portalOfficersKicker}</p>
      <h2 id="portal-panel-title">{t.portalOfficersTitle}</h2>
      <p className="portalPanelBody">{t.portalOfficersBody}</p>
      <div className="directoryMeta"><span>{t.officerDirectoryCount}</span><span>{t.officerDirectoryNote}</span></div>
      <label className="directorySearch"><span>{t.directorySearchLabel}</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.directorySearchPlaceholder} /></label>
      <div className="officerDirectory">
        {visible.map(([department, name, role, phone, email]) => (
          <article className="officerRow" key={department}>
            <div><b>{department}</b><strong>{name}</strong><span>{role}</span></div>
            <div className="officerContact"><a href={`tel:${phone}`}>☎ {phone}</a><a href={`mailto:${email}`}>✉ {email}</a></div>
          </article>
        ))}
        {!visible.length && <p className="directoryEmpty">{t.directoryEmpty}</p>}
      </div>
      <a className="portalSource" href="https://pgportal.gov.in/Home/NodalPgOfficers" target="_blank" rel="noreferrer">↗ {t.portalOfficialDirectory}</a>
    </PanelShell>
  );
}

function FaqPanel({ t, close, openPanel }: { t: Dict; close: () => void; openPanel: (panel: PortalPanel) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(0);
  const faqs = [
    [t.faq1Question, t.faq1Answer], [t.faq2Question, t.faq2Answer], [t.faq3Question, t.faq3Answer],
    [t.faq4Question, t.faq4Answer], [t.faq5Question, t.faq5Answer], [t.faq6Question, t.faq6Answer],
  ].filter(([question]) => question.toLowerCase().includes(query.toLowerCase()));
  return (
    <PanelShell title={t.portalHelpTitle} close={close} t={t}>
      <span className="portalPanelIcon">?</span>
      <p className="portalPanelKicker">{t.portalHelpKicker}</p>
      <h2 id="portal-panel-title">{t.portalHelpTitle}</h2>
      <p className="portalPanelBody">{t.portalHelpBody}</p>
      <label className="directorySearch faqSearch"><span>{t.faqSearchLabel}</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.faqSearchPlaceholder} /></label>
      <div className="faqList">
        {faqs.map(([question, answer], i) => (
          <div className={`faqItem ${open === i ? "open" : ""}`} key={question}>
            <button onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}><span>{question}</span><b>{open === i ? "−" : "+"}</b></button>
            {open === i && <p>{answer}</p>}
          </div>
        ))}
      </div>
      <div className="faqCallout"><b>{t.faqAppealCalloutTitle}</b><p>{t.faqAppealCalloutBody}</p><button onClick={() => { close(); openPanel("appeal-authority"); }}>{t.portalAppeal}</button></div>
      <a className="portalSource" href="https://pgportal.gov.in/Home/Faq" target="_blank" rel="noreferrer">↗ {t.portalOfficialFaq}</a>
    </PanelShell>
  );
}

function AppealAuthorityPanel({ t, close }: { t: Dict; close: () => void }) {
  const officers = [
    ["Income Tax (CBDT)", "Dipi Agarwal", "01123416148"],
    ["Indirect Taxes & Customs", "Dr. Shailendra Kumar Sinha", "01123705809"],
    ["Industry & Internal Trade", "Jai Prakash Shivahare", "01123038876"],
    ["Agriculture & Farmers Welfare", "S. Rukmani", "01123381305"],
    ["Atomic Energy", "Nidhi Pandey", "02222027535"],
  ];
  return (
    <PanelShell title={t.portalAppealTitle} close={close} t={t}>
      <span className="portalPanelIcon">↑</span>
      <p className="portalPanelKicker">{t.portalAppealKicker}</p>
      <h2 id="portal-panel-title">{t.portalAppealTitle}</h2>
      <p className="portalPanelBody">{t.portalAppealBody}</p>
      <div className="appealRule"><b>{t.appealWindowTitle}</b><span>{t.appealWindowValue}</span><p>{t.appealWindowBody}</p></div>
      <div className="appealDirectory">{officers.map(([department, name, phone]) => <div key={department}><span>{department}</span><b>{name}</b><a href={`tel:${phone}`}>☎ {phone}</a></div>)}</div>
      <a className="portalSource" href="https://pgportal.gov.in/Home/NodalAuthorityForAppeal" target="_blank" rel="noreferrer">↗ {t.portalOfficialAppeal}</a>
  </PanelShell>
  );
}
function Journey({ progress, t }: { progress: number; t: Dict }) {
  const labels = [t.jDescribe, t.jReview, t.jTrack, t.jConfirm];
  return (
    <nav className="journey" aria-label="Grievance journey">
      {labels.map((label, i) => (
        <span key={label} className={i <= progress ? "active" : ""}>
          <b>{i < progress ? "✓" : i + 1}</b>
          <em>{label}</em>
          {i < 3 && <i />}
        </span>
      ))}
    </nav>
  );
}

function Describe({
  t,
  description,
  setDescription,
  loading,
  prepare,
  startVoice,
  listening,
  voiceLanguage,
  setVoiceLanguage,
  gpsLocation,
  locating,
  getGpsLocation,
  selectedState,
  setSelectedState,
  details,
  setDetails,
  files,
  setFiles,
  fileRef,
}: {
  t: Dict;
  description: string;
  setDescription: (v: string) => void;
  loading: boolean;
  prepare: () => void;
  startVoice: () => void;
  listening: boolean;
  voiceLanguage: string;
  setVoiceLanguage: (v: string) => void;
  gpsLocation: GpsLocation | null;
  locating: boolean;
  getGpsLocation: () => void;
  selectedState: string;
  setSelectedState: (v: string) => void;
  details: ComplaintDetails;
  setDetails: (v: ComplaintDetails) => void;
  files: string[];
  setFiles: (v: string[]) => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="contentGrid">
      <section className="formCard">
        <div className="stepLabel">{t.stepLabel}</div>
        <h2>{t.what}</h2>
        <p className="muted">{t.natural}</p>
        <div className="voicePanel">
          <div className="voicePanelTop">
            <div>
              <span className={`micOrb ${listening ? "active" : ""}`}>●</span>
              <div>
                <b>{listening ? t.voiceListening : t.voiceIdle}</b>
                <small>
                  {listening ? t.voiceListeningSub : t.voiceIdleSub}
                </small>
              </div>
            </div>
            <button
              className={listening ? "stopVoice" : "startVoice"}
              onClick={startVoice}
            >
              {listening ? `■ ${t.voiceStop}` : `🎙 ${t.voiceStart}`}
            </button>
          </div>
          <label htmlFor="voice-language">{t.voiceLangLabel}</label>
          <select
            id="voice-language"
            value={voiceLanguage}
            onChange={(e) => setVoiceLanguage(e.target.value)}
            disabled={listening}
          >
            <option value="auto">{t.voiceAuto}</option>
            {LANGUAGES.map((option) => (
              <option key={option.speech} value={option.speech}>
                {option.native} — {option.english}
              </option>
            ))}
            {extraVoiceLanguages.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <p>{t.voiceLangHint}</p>
        </div>
        <label htmlFor="issue">{t.describeLabel}</label>
        <textarea
          id="issue"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          placeholder={t.placeholder}
        />
        <div className="textareaMeta">
          <span className={listening ? "recordingStatus" : ""}>
            ● {listening ? t.liveTranscription : t.voiceReady}
          </span>
          <span>{description.length} / 2,000</span>
        </div>
        <div className="structuredFields">
          <div className="sectionHeading">
            <div>
              <b>{t.detailsTitle}</b>
              <p>{t.detailsBody}</p>
            </div>
            <span>{t.aiGuided}</span>
          </div>
          <div className="detailsGrid">
            <label>
              {t.fState} <em>{t.requiredWord}</em>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
              >
                <option value="">{t.selectState}</option>
                {statesAndUTs.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </label>
            <label>
              {t.fDistrict}
              <input
                value={details.district}
                onChange={(e) => setDetails({ ...details, district: e.target.value })}
                placeholder={t.phDistrict}
              />
            </label>
            <label>
              {t.fBlock}
              <input
                value={details.blockTehsil}
                onChange={(e) => setDetails({ ...details, blockTehsil: e.target.value })}
                placeholder={t.phBlock}
              />
            </label>
            <label>
              {t.fPanchayat}
              <input
                value={details.gramPanchayat}
                onChange={(e) => setDetails({ ...details, gramPanchayat: e.target.value })}
                placeholder={t.phPanchayat}
              />
            </label>
            <label>
              {t.fVillage}
              <input
                value={details.locality}
                onChange={(e) => setDetails({ ...details, locality: e.target.value })}
                placeholder={t.phVillage}
              />
            </label>
            <label>
              {t.fStarted}
              <input
                type="date"
                value={details.startedOn}
                onChange={(e) => setDetails({ ...details, startedOn: e.target.value })}
              />
            </label>
            <label>
              {t.fFrequency}
              <select
                value={details.frequency}
                onChange={(e) => setDetails({ ...details, frequency: e.target.value })}
              >
                <option value="Ongoing">{t.freqOngoing}</option>
                <option value="Every day">{t.freqDaily}</option>
                <option value="Intermittent">{t.freqIntermittent}</option>
                <option value="One-time incident">{t.freqOneTime}</option>
              </select>
            </label>
            <label>
              {t.fAffected}
              <input
                inputMode="numeric"
                value={details.affectedPeople}
                onChange={(e) => setDetails({ ...details, affectedPeople: e.target.value })}
                placeholder={t.phAffected}
              />
            </label>
            <label className="wideField">
              {t.fOutcome}
              <input
                value={details.requestedResolution}
                onChange={(e) => setDetails({ ...details, requestedResolution: e.target.value })}
                placeholder={t.phOutcome}
              />
            </label>
          </div>
          <p className="guidedPrompt">
            ✦ {details.locality
              ? details.startedOn
                ? details.affectedPeople
                  ? details.requestedResolution
                    ? t.aiEnough
                    : t.aiQOutcome
                  : t.aiQAffected
                : t.aiQStart
              : t.aiQVillage}
          </p>
        </div>
        <div className="locationPanel">
          <span className="locationPin">⌖</span>
          <div>
            <b>{gpsLocation ? t.locAdded : t.locAdd}</b>
            <p>
              {gpsLocation
                ? gpsLocation.address || gpsLocation.label
                : t.locHint}
            </p>
            {gpsLocation?.address && <small>{gpsLocation.label}</small>}
          </div>
          <button
            className="secondary smallButton"
            onClick={getGpsLocation}
            disabled={locating}
          >
            {locating ? t.locating : gpsLocation ? t.locRefresh : t.locUse}
          </button>
        </div>
        <button
          type="button"
          className="uploadZone"
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,.pdf"
            tabIndex={-1}
            onChange={(e) =>
              setFiles(Array.from(e.target.files ?? []).map((f) => f.name))
            }
          />
          <span>＋</span>
          <div>
            <b>{t.uploadTitle}</b>
            <p>{files.length ? files.join(", ") : t.uploadHint}</p>
          </div>
        </button>
        <div className="tip">
          <span>i</span>
          <p>
            <b>{t.tipTitle}</b>
            <br />
            {t.tipBody}
          </p>
        </div>
        <button className="primary" disabled={loading} onClick={prepare}>
          {loading ? t.preparing : t.prepare}
          <span>{loading ? "✦" : "→"}</span>
        </button>
        <p className="aiNote">✦ {t.aiNote}</p>
        <p className="savedNote">✓ {t.saved}</p>
      </section>
      <Nearby t={t} state={selectedState} />
    </div>
  );
}
function Nearby({ t, state }: { t: Dict; state: string }) {
  return (
    <aside>
      <section className="nearbyCard">
        <div className="cardTop">
          <span>⌖</span>
          <div>
            <h3>{t.nearbyTitle}</h3>
            <p>{t.nearbySub}</p>
          </div>
          <b>{t.sampleData}</b>
        </div>
        <div className="mapDots">
          <span />
          <span />
          <span />
          <span />
        </div>
        <ul>
          {[
            ["water", t.catWater, t.near1],
            ["road", t.catRoads, t.near2],
            ["waste", t.catWaste, t.near3],
          ].map(([tone, label, headline]) => (
            <li key={headline}>
              <span className={`category ${tone}`}>{label}</span>
              <strong>{headline}</strong>
              <small>
                {state || t.yourState} · {t.sampleReport}
              </small>
            </li>
          ))}
        </ul>
        <p className="privacy">◉ {t.nearbyPrivacy}</p>
      </section>
      <section className="helpCard">
        <span>☎</span>
        <div>
          <b>{t.helpTitle}</b>
          <p>{t.helpBody}</p>
        </div>
      </section>
    </aside>
  );
}
function Review({
  analysis,
  setAnalysis,
  back,
  submit,
  t,
  details,
  submitting,
}: {
  analysis: Analysis;
  setAnalysis: (a: Analysis) => void;
  back: () => void;
  submit: () => void;
  t: Dict;
  details: ComplaintDetails;
  submitting: boolean;
}) {
  return (
    <section className="singleCard">
      <div className="reviewBanner">
        <span>✦</span>
        <div>
          <b>{t.rvFound}</b>
          <p>{analysis.source === "openai" ? t.rvClassified : t.rvPreview}</p>
        </div>
        <em>{t.aiAssisted}</em>
      </div>
      <div className={`triageCard urgency${analysis.urgency}`}>
        <div className="triageStep">
          <span>1</span>
          <div>
            <label>{t.rvUrgency}</label>
            <b>{urgencyLabel(t, analysis.urgency)}</b>
            <p>{analysis.urgencyReason}</p>
          </div>
        </div>
        <div className="triageArrow">→</div>
        <div className="triageStep">
          <span>2</span>
          <div>
            <label>{t.rvCategoryLabel}</label>
            <b>{analysis.category}</b>
            <p>{analysis.department}</p>
          </div>
        </div>
        <div className="triageArrow">→</div>
        <div className="triageStep">
          <span>3</span>
          <div>
            <label>{t.rvOfficerLabel}</label>
            <b>{analysis.assignedOfficer}</b>
            <p>{t.rvOfficerNote}</p>
          </div>
        </div>
      </div>
      {analysis.emergencyWarning && (
        <div className="emergencyWarning" role="alert">
          <b>⚠ {t.emergencyTitle}</b>
          <p>{t.emergencyBody}</p>
        </div>
      )}
      <div className="reviewDetails">
        <b>{t.payloadTitle}</b>
        <dl>
          <div><dt>{t.dtDistrict}</dt><dd>{details.district || t.notProvided}</dd></div>
          <div><dt>{t.dtBlock}</dt><dd>{details.blockTehsil || t.notProvided}</dd></div>
          <div><dt>{t.dtPanchayat}</dt><dd>{details.gramPanchayat || t.notProvided}</dd></div>
          <div><dt>{t.dtVillage}</dt><dd>{details.locality || t.notProvided}</dd></div>
          <div><dt>{t.dtStarted}</dt><dd>{details.startedOn || t.notProvided}</dd></div>
          <div><dt>{t.dtFrequency}</dt><dd>{details.frequency}</dd></div>
          <div><dt>{t.dtAffected}</dt><dd>{details.affectedPeople || t.notProvided}</dd></div>
          <div><dt>{t.dtOutcome}</dt><dd>{details.requestedResolution || t.notProvided}</dd></div>
        </dl>
      </div>
      <div className="reviewFields">
        <div>
          <label>{t.fDepartment}</label>
          <p>{analysis.department}</p>
        </div>
        <div>
          <label>{t.fCategory}</label>
          <p>{analysis.category}</p>
        </div>
        <div>
          <label>{t.fLocation}</label>
          <input
            value={analysis.location}
            onChange={(e) =>
              setAnalysis({ ...analysis, location: e.target.value })
            }
          />
        </div>
        <div>
          <label>{t.fIssueType}</label>
          <p>{analysis.issueType}</p>
        </div>
      </div>
      <label htmlFor="summary">{t.summaryLabel}</label>
      <textarea
        id="summary"
        className="summaryBox"
        value={analysis.summary}
        onChange={(e) => setAnalysis({ ...analysis, summary: e.target.value })}
      />
      <div className="humanCheck">✓ {t.humanCheck}</div>
      <div className="issueNumberPromise">
        <b># {t.promiseTitle}</b>
        <p>{t.promiseBody}</p>
      </div>
      <div className="buttonRow">
        <button className="secondary" onClick={back}>
          ← {t.edit}
        </button>
        <button className="primary compact" onClick={submit} disabled={submitting}>
          {submitting ? t.submitting : t.submit}
          <span>→</span>
        </button>
      </div>
    </section>
  );
}
function Track({
  analysis,
  stages,
  stage,
  advance,
  grievanceId,
  isAppeal,
  onConfirm,
  t,
  readOnly,
}: {
  analysis: Analysis;
  stages: ReturnType<typeof buildStages>;
  stage: number;
  advance: () => void;
  grievanceId: string;
  isAppeal: boolean;
  onConfirm: () => void;
  t: Dict;
  readOnly: boolean;
}) {
  const shown = isAppeal ? 2 : stage;
  return (
    <div className="trackGrid">
      <section className="timelineCard">
        <div className="caseHeader">
          <div>
            <span>{isAppeal ? t.appealIdLabel : t.grievanceIdLabel}</span>
            <h2>{isAppeal ? "AP-JS-2026-1047" : grievanceId}</h2>
          </div>
          <button onClick={() => window.print()}>⇩ {t.saveReceipt}</button>
        </div>
        {isAppeal && (
          <div className="escalationBanner">
            <b>{t.appealAcceptedTitle}</b>
            <p>{t.appealAcceptedBody}</p>
          </div>
        )}
        <div className="timeline">
          {stages.map((s, i) => (
            <div
              className={`timelineItem ${i < shown ? "done" : i === shown ? "current" : "future"}`}
              key={s.title}
            >
              <span className="timelineDot">{i < shown ? "✓" : i + 1}</span>
              <div>
                <div className="stageLine">
                  <h3>{s.title}</h3>
                  {i <= shown && (
                    <time>
                      {i === 0
                        ? "28 Aug, 10:47 AM"
                        : i === 1
                          ? "28 Aug, 11:12 AM"
                          : i === 2
                            ? "29 Aug, 9:25 AM"
                            : i === 3
                              ? "30 Aug, 3:40 PM"
                              : "31 Aug, 4:15 PM"}
                    </time>
                  )}
                </div>
                <p>{i <= shown ? s.detail : t.notYet}</p>
                <em>
                  {t.expectedWord}: {s.sla}
                </em>
              </div>
            </div>
          ))}
        </div>
        {!readOnly && <div className="demoControl">
          <span>{t.lifecycleKicker}</span>
          <p>{t.lifecycleBody}</p>
          {shown < 4 ? (
            <button className="primary compact" onClick={advance}>
              {t.next}
              <span>→</span>
            </button>
          ) : (
            <button className="primary compact" onClick={onConfirm}>
              {t.confirmResolution}
              <span>→</span>
            </button>
          )}
        </div>}
        {readOnly && (
          <div className="trackingNotice">
            <b>✓ {t.readonlyTitle}</b>
            <p>{t.readonlyBody}</p>
          </div>
        )}
      </section>
      <aside className="caseAside">
        <section className="officerCard">
          <span>{t.officerRoleLabel}</span>
          <div className="officer">
            <b>
              {isAppeal
                ? "AM"
                : analysis.assignedOfficer
                    .split(/\s+/)
                    .filter((part) => /^[A-Z]/.test(part))
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("") || "GO"}
            </b>
            <div>
              <h3>{isAppeal ? "Anil Menon" : analysis.assignedOfficer}</h3>
              <p>
                {isAppeal
                  ? t.escalationRole
                  : `${urgencyLabel(t, analysis.urgency)} ${t.priorityWord} · ${analysis.category}`}
              </p>
            </div>
          </div>
          <p className="contactRule">{t.contactRule}</p>
        </section>
        <section className="caseSummary">
          <span>{t.yourComplaint}</span>
          <h3>{analysis.category}</h3>
          <p>{analysis.summary}</p>
          <dl>
            <div>
              <dt>{t.ddDepartment}</dt>
              <dd>{analysis.department}</dd>
            </div>
            <div>
              <dt>{t.ddLocation}</dt>
              <dd>{analysis.location}</dd>
            </div>
            <div>
              <dt>{t.ddUrgency}</dt>
              <dd>{urgencyLabel(t, analysis.urgency)}</dd>
            </div>
            <div>
              <dt>{t.ddAssigned}</dt>
              <dd>{analysis.assignedOfficer}</dd>
            </div>
          </dl>
        </section>
        <section className="slaCard">
          <b>◷ {t.slaTitle}</b>
          <p>{t.slaBody}</p>
        </section>
      </aside>
    </div>
  );
}
function Confirm({
  grievanceId,
  yes,
  no,
  t,
}: {
  grievanceId: string;
  yes: () => void;
  no: () => void;
  t: Dict;
}) {
  return (
    <section className="confirmCard">
      <span className="bigCheck">✓</span>
      <p className="caseRef">
        {t.caseWord} {grievanceId} · {t.sampleData}
      </p>
      <h2>{t.confirmHeadline}</h2>
      <div className="resolutionNote">
        <span>{t.actionReported}</span>
        <p>{t.resolutionNote}</p>
        <small>{t.reportedBy}</small>
      </div>
      <h3>{t.confirmQuestion}</h3>
      <p>{t.confirmBody}</p>
      <div className="choiceRow">
        <button className="yesButton" onClick={yes}>
          <b>✓</b>
          <span>
            {t.fixed}
            <small>{t.fixedSub}</small>
          </span>
        </button>
        <button className="noButton" onClick={no}>
          <b>×</b>
          <span>
            {t.notFixed}
            <small>{t.notFixedSub}</small>
          </span>
        </button>
      </div>
    </section>
  );
}
function Appeal({
  reason,
  setReason,
  submit,
  back,
  t,
}: {
  reason: string;
  setReason: (v: string) => void;
  submit: () => void;
  back: () => void;
  t: Dict;
}) {
  return (
    <section className="singleCard appealCard">
      <div className="escalationPerson">
        <b>AM</b>
        <div>
          <span>{t.escalationKicker}</span>
          <h3>Anil Menon</h3>
          <p>{t.escalationSub}</p>
        </div>
      </div>
      <label htmlFor="appeal">{t.appealLabel}</label>
      <textarea
        id="appeal"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={t.appealPlaceholder}
      />
      <div className="appealFacts">
        <b>{t.appealIncludes}</b>
        <span>✓ {t.appealInc1}</span>
        <span>✓ {t.appealInc2}</span>
        <span>✓ {t.appealInc3}</span>
      </div>
      <div className="buttonRow">
        <button className="secondary" onClick={back}>
          ← {t.back}
        </button>
        <button className="primary compact" onClick={submit}>
          {t.appealSubmit}
          <span>→</span>
        </button>
      </div>
    </section>
  );
}
function Closed({
  t,
  grievanceId,
  home,
  rating,
  setRating,
  resolutionFeedback,
}: {
  t: Dict;
  grievanceId: string;
  home: () => void;
  rating: number;
  setRating: (value: number) => void;
  resolutionFeedback: "resolved" | "not-resolved" | "";
}) {
  return (
    <section className="confirmCard closedCard">
      <span className="bigCheck">✓</span>
      <p className="caseRef">
        {t.caseWord} {grievanceId}
      </p>
      <h2>{t.closedHeadline}</h2>
      <p>{t.closedBody}</p>
      <div className="qualityRecorded">
        <b>✓ {t.qualityRecordedTitle}</b>
        <p>{t.qualityRecordedBody}</p>
        <small>{resolutionFeedback === "resolved" ? t.qualityResolved : t.qualityNotResolved}</small>
      </div>
      <div className="rating">
        <span>{t.ratingQ}</span>
        <div>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              className={rating === value ? "selected" : ""}
              aria-pressed={rating === value}
              onClick={() => setRating(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <small>
          {t.ratingHard}
          <em>{t.ratingEasy}</em>
        </small>
      </div>
      <div className="buttonRow center">
        <button className="secondary" onClick={() => window.print()}>
          ⇩ {t.printReceipt}
        </button>
        <button className="primary compact" onClick={home}>
          {t.returnHome}
        </button>
      </div>
    </section>
  );
}
