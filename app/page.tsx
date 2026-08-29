"use client";

import Link from "next/link";
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
import {
  AshokaChakra,
  IconAlert,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconClock,
  IconClose,
  IconDownload,
  IconGrid,
  IconHash,
  IconInfo,
  IconLanguages,
  IconLock,
  IconMail,
  IconMic,
  IconPhone,
  IconPin,
  IconPlus,
  IconSpark,
  IconUser,
  IconStop,
} from "./icons";
import ProcessCarousel from "./ProcessCarousel";
import { DigiCitizenProfile, DigiDocument } from "./digilocker/data";

type Screen =
  | "home"
  | "describe"
  | "review"
  | "track"
  | "confirm"
  | "appeal"
  | "appeal-track"
  | "closed"
  | "dashboard";
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
type DashboardUpdate = {
  title: string;
  detail: string;
  date: string;
  done: boolean;
  icon: string;
};
type DashboardComplaint = {
  id: string;
  subject: string;
  department: string;
  location: string;
  status: string;
  statusTone: "green" | "amber" | "blue";
  filedOn: string;
  updates: DashboardUpdate[];
};
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
type ComplaintLocationMatch = "same" | "different" | "";
type FilingMode = "ai" | "manual" | null;
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

const conversationLanguages = [
  ["en-IN", "English"], ["hi-IN", "हिन्दी"], ["as-IN", "অসমীয়া"],
  ["bn-IN", "বাংলা"], ["brx-IN", "बड़ो"], ["doi-IN", "डोगरी"],
  ["gu-IN", "ગુજરાતી"], ["kn-IN", "ಕನ್ನಡ"], ["ks-IN", "کٲشُر"],
  ["kok-IN", "कोंकणी"], ["mai-IN", "मैथिली"], ["ml-IN", "മലയാളം"],
  ["mni-IN", "মৈতৈলোন্"], ["mr-IN", "मराठी"], ["ne-IN", "नेपाली"],
  ["or-IN", "ଓଡ଼ିଆ"], ["pa-IN", "ਪੰਜਾਬੀ"], ["sa-IN", "संस्कृतम्"],
  ["sat-IN", "ᱥᱟᱱᱛᱟᱲᱤ"], ["sd-IN", "سنڌي"], ["ta-IN", "தமிழ்"],
  ["te-IN", "తెలుగు"], ["ur-IN", "اردو"],
] as const;

const voiceOpening: Record<string, string> = {
  en: "Hello. Please tell me about the problem in your own words. What happened, and how is it affecting you?",
  as: "নমস্কাৰ। অনুগ্ৰহ কৰি আপোনাৰ সমস্যাটো নিজৰ ভাষাত কওক। কি ঘটিছে আৰু ই আপোনাক কেনেদৰে প্ৰভাৱিত কৰিছে?",
  hi: "नमस्ते। कृपया अपनी समस्या अपने शब्दों में बताइए। क्या हुआ है और इससे आपको कैसे परेशानी हो रही है?",
  bn: "নমস্কার। আপনার সমস্যাটি নিজের ভাষায় বলুন। কী ঘটেছে এবং এতে আপনার কী অসুবিধা হচ্ছে?",
  brx: "नमस्कार। अननायै नोंथांनि जेंनाखौ नोंथांनि रावजों बुं।",
  doi: "नमस्कार। किरपा करियै अपनी समस्या अपने शब्दें च दस्सो।",
  gu: "નમસ્તે. કૃપા કરીને તમારી સમસ્યા તમારા પોતાના શબ્દોમાં જણાવો. શું થયું અને તેની તમને કેવી અસર થઈ રહી છે?",
  mr: "नमस्कार। कृपया तुमची समस्या तुमच्या शब्दांत सांगा. काय घडले आणि त्याचा तुम्हाला कसा त्रास होत आहे?",
  te: "నమస్కారం. దయచేసి మీ సమస్యను మీ మాటల్లో చెప్పండి. ఏమి జరిగింది, దాని వల్ల మీకు ఎలాంటి ఇబ్బంది కలుగుతోంది?",
  ta: "வணக்கம். உங்கள் பிரச்சினையை உங்கள் சொந்த வார்த்தைகளில் கூறுங்கள். என்ன நடந்தது, அது உங்களை எவ்வாறு பாதிக்கிறது?",
  kn: "ನಮಸ್ಕಾರ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ನಿಮ್ಮ ಮಾತುಗಳಲ್ಲಿ ತಿಳಿಸಿ. ಏನಾಯಿತು ಮತ್ತು ಅದರಿಂದ ನಿಮಗೆ ಯಾವ ತೊಂದರೆಯಾಗುತ್ತಿದೆ?",
  ks: "آداب۔ مہربانی کر کے پنن مسئلہ پنن لفظن منز ونیو۔",
  kok: "नमस्कार. कृपया तुमची समस्या तुमच्या उतरांनी सांगात.",
  mai: "नमस्कार। कृपया अपन समस्या अपन शब्दमे बताउ।",
  ml: "നമസ്കാരം. ദയവായി നിങ്ങളുടെ പ്രശ്നം സ്വന്തം വാക്കുകളിൽ പറയൂ. എന്താണ് സംഭവിച്ചത്, അത് നിങ്ങളെ എങ്ങനെ ബാധിക്കുന്നു?",
  mni: "ꯈꯨꯔꯨꯝꯖꯔꯤ। ꯅꯍꯥꯛꯀꯤ ꯑꯋꯥꯕ ꯅꯍꯥꯛꯀꯤ ꯋꯥꯍꯩꯗ ꯍꯥꯏꯕꯤꯌꯨ।",
  ne: "नमस्कार। कृपया आफ्नो समस्या आफ्नै शब्दमा भन्नुहोस्। के भयो र यसले तपाईंलाई कसरी असर गरिरहेको छ?",
  or: "ନମସ୍କାର। ଦୟାକରି ଆପଣଙ୍କ ସମସ୍ୟା ନିଜ ଭାଷାରେ କୁହନ୍ତୁ। କ’ଣ ଘଟିଛି ଏବଂ ଏହା ଆପଣଙ୍କୁ କିପରି ପ୍ରଭାବିତ କରୁଛି?",
  pa: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ। ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੀ ਸਮੱਸਿਆ ਆਪਣੇ ਸ਼ਬਦਾਂ ਵਿੱਚ ਦੱਸੋ। ਕੀ ਹੋਇਆ ਅਤੇ ਇਸ ਦਾ ਤੁਹਾਡੇ ਉੱਤੇ ਕੀ ਅਸਰ ਪੈ ਰਿਹਾ ਹੈ?",
  sa: "नमस्कारः। कृपया स्वसमस्यां स्वशब्दैः कथयतु। किं जातम्, तेन भवान् कथं प्रभावितः?",
  sat: "ᱡᱚᱦᱟᱨ। ᱫᱚᱭᱟᱠᱟᱛᱮ ᱟᱢᱟᱜ ᱫᱤᱜᱫᱷᱟ ᱟᱢᱟᱜ ᱟᱹᱲᱟᱹ ᱛᱮ ᱢᱮᱱ ᱢᱮ।",
  sd: "سلام۔ مهرباني ڪري پنهنجو مسئلو پنهنجن لفظن ۾ ٻڌايو۔ ڇا ٿيو ۽ ان جو اوهان تي ڪهڙو اثر پيو؟",
  ur: "السلام علیکم۔ براہِ کرم اپنا مسئلہ اپنے الفاظ میں بتائیں۔ کیا ہوا اور اس سے آپ کو کیا پریشانی ہو رہی ہے؟",
};

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
  // "Registered" means this device has a verified filer identity. The
  // dashboard looks cases up by name, so it is meaningless — and misleading —
  // before one exists.
  const [account, setAccount] = useState("");
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
  const [complaintLocationMatch, setComplaintLocationMatch] =
    useState<ComplaintLocationMatch>("");
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
  const [digiProfile, setDigiProfile] = useState<DigiCitizenProfile | null>(null);
  const [viewingDocs, setViewingDocs] = useState<DigiDocument[] | null>(null);
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
  const [dashboardComplaints, setDashboardComplaints] = useState<DashboardComplaint[]>([]);
  const [selectedDashboardId, setSelectedDashboardId] = useState("");
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
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
    const savedAccount = localStorage.getItem("jansetu-account");
    if (savedAccount) {
      setAccount(savedAccount);
      setName(savedAccount);
    }

    const loadDigiProfile = async () => {
      try {
        const res = await fetch("/api/digilocker/session");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.profile) {
            setDigiVerified(true);
            setDigiProfile(data.profile);
            if (data.profile.name) {
              setName(data.profile.name);
              setAccount(data.profile.name);
            }
            if (data.profile.district || data.profile.locality) {
              setDetails((prev) => ({
                ...prev,
                district: prev.district || data.profile.district || "",
                locality: prev.locality || data.profile.locality || "",
              }));
              if (data.profile.state) setSelectedState((prev) => prev || data.profile.state);
            }
            return;
          }
        }
      } catch {}

      const localProfileStr = localStorage.getItem("jansetu_digilocker_profile");
      if (localProfileStr) {
        try {
          const p = JSON.parse(localProfileStr) as DigiCitizenProfile;
          setDigiVerified(true);
          setDigiProfile(p);
          if (p.name) {
            setName(p.name);
            setAccount(p.name);
          }
          if (p.district || p.locality) {
            setDetails((prev) => ({
              ...prev,
              district: prev.district || p.district || "",
              locality: prev.locality || p.locality || "",
            }));
            if (p.state) setSelectedState((prev) => prev || p.state);
          }
        } catch {}
      }
    };

    setReady(true);
    const params = new URLSearchParams(window.location.search);
    if (
      params.get("digilocker") === "verified" ||
      params.get("digilocker") === "demo-verified"
    ) {
      setDigiVerified(true);
      setShowSecurityGate(true);
      loadDigiProfile();
      window.history.replaceState({}, "", "/");
    } else {
      loadDigiProfile();
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
    if (!complaintLocationMatch) {
      setToast(t.tChooseComplaintLocation);
      return;
    }
    if (complaintLocationMatch === "same" && !gpsLocation) {
      setToast(t.tAddCurrentLocationFirst);
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

  function chooseComplaintLocation(next: Exclude<ComplaintLocationMatch, "">) {
    setComplaintLocationMatch(next);
    if (next === "different") {
      setPermissionPrompt(false);
      setGpsLocation(null);
    } else {
      setPermissionPrompt(true);
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
        complaint?: { issueNumber: string; journey?: DashboardUpdate[]; createdAt?: string };
        error?: string;
      };
      if (!response.ok || !result.complaint) {
        throw new Error(result.error || "Could not file complaint");
      }
      localStorage.removeItem("jansetu-draft");
      localStorage.setItem("jansetu-account", name.trim());
      setAccount(name.trim());
      setGrievanceId(result.complaint.issueNumber);
      const dashboardCase: DashboardComplaint = {
        id: result.complaint.issueNumber,
        subject: analysis.category,
        department: analysis.department,
        location: analysis.location,
        status: "Complaint received",
        statusTone: "green",
        filedOn: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
        updates: result.complaint.journey || [],
      };
      setDashboardComplaints((items) => [dashboardCase, ...items]);
      setSelectedDashboardId(dashboardCase.id);
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

  useEffect(() => {
    if (screen !== "dashboard") return;
    if (name.trim().length < 2) {
      setDashboardComplaints([]);
      setDashboardError("");
      return;
    }
    let cancelled = false;
    setDashboardLoading(true);
    fetch(`/api/complaints?name=${encodeURIComponent(name)}`)
      .then(async (response) => {
        const result = (await response.json()) as { complaints?: Array<{
          issueNumber: string; category: string; department: string; location: string; status: string; createdAt: string; journey: DashboardUpdate[];
        }>; error?: string };
        if (!response.ok) throw new Error(result.error || "Could not load your complaints.");
        if (cancelled) return;
        const rows = result.complaints || [];
        setDashboardComplaints(rows.map((row) => ({
          id: row.issueNumber,
          subject: row.category,
          department: row.department,
          location: row.location,
          status: row.status,
          statusTone: row.status === "Assigned to officer" ? "amber" : "blue",
          filedOn: row.createdAt,
          updates: row.journey || [],
        })));
        setSelectedDashboardId((current) => rows.some((row) => row.issueNumber === current) ? current : rows[0]?.issueNumber || "");
      })
      .catch((error) => { if (!cancelled) setDashboardError(error instanceof Error ? error.message : "Could not load your complaints."); })
      .finally(() => { if (!cancelled) setDashboardLoading(false); });
    return () => { cancelled = true; };
  }, [screen, name]);

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
          openDashboard={() => setScreen("dashboard")}
        account={account}
        />
        <nav className="portalNav" aria-label={t.portalNavLabel}>
          <button onClick={() => setPortalPanel("about")}>{t.portalAbout}</button>
          <Link href="/redress-process">{t.portalProcess}</Link>
          <Link href="/nodal-officers">{t.portalOfficers}</Link>
          <Link href="/faqs">{t.portalHelp}</Link>
          <Link href="/appeal-authority">{t.portalAppeal}</Link>
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
                <IconArrowRight size={16} />
              </button>
              <button
                className="secondary"
                onClick={() => setShowTrackingLookup(true)}
              >
                {t.existing}
              </button>
            </div>
            <div className="trustRow">
              <span><IconMic size={15} />{t.trustVoice}</span>
              <span><IconPin size={15} />{t.trustGps}</span>
              <span><IconLanguages size={15} />{t.trustLanguages}</span>
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
        <ProcessCarousel
          t={t}
          onFile={() => setShowSecurityGate(true)}
        />
        <section className="scopeNote" aria-labelledby="scope-title">
          <div className="scopeHead">
            <IconAlert size={18} />
            <div>
              <h2 id="scope-title">{t.scopeTitle}</h2>
              <p>{t.scopeBody}</p>
            </div>
          </div>
          <ul>
            <li>{t.scope1}</li>
            <li>{t.scope2}</li>
            <li>{t.scope3}</li>
            <li>{t.scope4}</li>
          </ul>
          <p className="scopeFee">{t.scopeNote}</p>
        </section>
        <section className="qualitySignals" aria-label={t.qualitySignalsTitle}>
          <div className="qualitySignalIntro">
            <span className="signalIcon"><IconInfo size={18} /></span>
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
            digiProfile={digiProfile}
            onViewDocs={(docs) => setViewingDocs(docs)}
            captchaToken={captchaToken}
            setCaptchaToken={setCaptchaToken}
            captchaMode={captchaMode}
            setCaptchaMode={setCaptchaMode}
            loading={securityLoading}
            close={() => setShowSecurityGate(false)}
            complete={completeSecurityCheck}
          />
        )}
        {viewingDocs && (
          <DigiDocModal
            documents={viewingDocs}
            close={() => setViewingDocs(null)}
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

  if (screen === "dashboard")
    return (
      <main className="dashboardPage">
        <Header
          language={language}
          openPicker={() => setShowPicker(true)}
          onHome={() => setScreen("home")}
          openDashboard={() => setScreen("dashboard")}
        account={account}
        />
        {showPicker && <LanguagePicker active={language} onChoose={chooseLanguage} close={() => setShowPicker(false)} />}
        <Dashboard
          t={t}
          complaints={dashboardComplaints}
          selectedId={selectedDashboardId}
          selectComplaint={setSelectedDashboardId}
          loading={dashboardLoading}
          error={dashboardError}
          backHome={() => setScreen("home")}
        />
      </main>
    );

  return (
    <main>
      {toast && (
        <div className="toast" role="status">
          <span>✓</span>
          {toast}
          <button onClick={() => setToast("")} aria-label="Dismiss">
            <IconClose size={16} />
          </button>
        </div>
      )}
      <Header
        language={language}
        openPicker={() => setShowPicker(true)}
        onHome={() => setScreen("home")}
        openDashboard={() => setScreen("dashboard")}
        account={account}
      />
      {showPicker && (
        <LanguagePicker
          active={language}
          onChoose={chooseLanguage}
          close={() => setShowPicker(false)}
        />
      )}
      {screen === "describe" && permissionPrompt && complaintLocationMatch === "same" && (
        <div
          className="permissionOverlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="permission-title"
        >
          <div className="permissionDialog">
            <span className="permissionIcon"><IconMic size={20} /></span>
            <div>
              <em>{t.permKicker}</em>
              <h2 id="permission-title">{t.permTitle}</h2>
              <p>{t.permBody}</p>
              <ul>
                <li><IconMic size={15} />{t.permMic}</li>
                <li><IconPin size={15} />{t.permLoc}</li>
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
          language={language}
          languageName={activeLanguage.native}
          speechLanguage={activeLanguage.speech}
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
          complaintLocationMatch={complaintLocationMatch}
          chooseComplaintLocation={chooseComplaintLocation}
        />
      )}
      {screen === "review" && analysis && (
        <Review
          analysis={analysis}
          setAnalysis={setAnalysis}
          back={() => setScreen("describe")}
          submit={submitGrievance}
          name={name}
          setName={setName}
          digiProfile={digiProfile}
          onViewDocs={(docs) => setViewingDocs(docs)}
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
      {viewingDocs && (
        <DigiDocModal
          documents={viewingDocs}
          close={() => setViewingDocs(null)}
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
                <i aria-hidden="true"><IconCheck size={13} /></i>
              </button>
            </li>
          ))}
        </ul>
        <button
          className="primary languageContinue"
          onClick={() => onChoose(highlighted)}
        >
          {t.pickContinue}
          <IconArrowRight size={16} />
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
        <button className="gateClose" onClick={close} aria-label={t.closeWord}><IconClose size={18} /></button>
        <span className="trackingIcon"><IconHash size={20} /></span>
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
          {loading ? t.checking : t.tlButton}<IconArrowRight size={16} />
        </button>
        <small className="trackingPrivacy">{t.tlPrivacy}</small>
      </section>
    </div>
  );
}

function SecurityGate({
  t,
  digiVerified,
  digiProfile,
  onViewDocs,
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
  digiProfile?: DigiCitizenProfile | null;
  onViewDocs?: (docs: DigiDocument[]) => void;
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
          <IconClose size={18} />
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
          <span className="securityNumber">{digiVerified ? <IconCheck size={14} /> : "1"}</span>
          <div>
            <div className="securityStepTitle">
              <b>{t.secStep1Title}</b>
              <em>{digiVerified ? t.secVerified : t.secRequired}</em>
            </div>
            <p>{t.secStep1Body}</p>
            {digiVerified ? (
              digiProfile ? (
                <div className="dlCitizenBox">
                  <div className="dlCitizenTop">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={digiProfile.photoAvatar}
                      alt={digiProfile.name}
                      className="dlCitizenAvatar"
                    />
                    <div className="dlCitizenNameBlock">
                      <b>
                        {digiProfile.name}{" "}
                        <span className="dlKycTag">UIDAI e-KYC VERIFIED</span>
                      </b>
                      <small>
                        {digiProfile.age} Yrs · {digiProfile.gender} · {digiProfile.aadhaarMasked}
                      </small>
                    </div>
                  </div>
                  <div className="dlCitizenGrid">
                    <div>
                      <span>Aadhaar No</span>
                      <b>{digiProfile.aadhaarMasked}</b>
                    </div>
                    <div>
                      <span>Contact No</span>
                      <b>{digiProfile.mobileMasked}</b>
                    </div>
                    <div>
                      <span>District & State</span>
                      <b>
                        {digiProfile.district}, {digiProfile.state}
                      </b>
                    </div>
                    <div>
                      <span>Address</span>
                      <b>{digiProfile.address}</b>
                    </div>
                  </div>
                  {digiProfile.documents && digiProfile.documents.length > 0 && (
                    <div className="dlCitizenDocsRow">
                      {digiProfile.documents.map((d) => (
                        <span key={d.id} className="dlDocBadge">
                          ✓ {d.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="dlCitizenActions">
                    {digiProfile.documents && digiProfile.documents.length > 0 && (
                      <button
                        type="button"
                        className="dlActionBtn"
                        onClick={() => onViewDocs?.(digiProfile.documents)}
                      >
                        📄 View Synced Docs ({digiProfile.documents.length})
                      </button>
                    )}
                    <a className="dlSwitchLink" href="/digilocker?return_to=/">
                      Switch / Re-authenticate ↗
                    </a>
                  </div>
                </div>
              ) : (
                <div className="verifiedIdentity">
                  <b><IconCheck size={14} />{t.secVerifiedOk}</b>
                  <small>
                    {captchaMode === "demo"
                      ? t.secDemoIdentity
                      : t.secLiveIdentity}
                  </small>
                </div>
              )
            ) : (
              <a className="digiButton" href="/api/digilocker/start">
                <span className="digiMark">D</span>
                <span>
                  {t.digiVerify}
                  <small>{t.digiVerifySub}</small>
                </span>
                <IconArrowRight size={16} />
              </a>
            )}
          </div>
        </div>
        <div className={`securityStep ${captchaToken ? "complete" : ""}`}>
          <span className="securityNumber">{captchaToken ? <IconCheck size={14} /> : "2"}</span>
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
          <span><IconLock size={18} /></span>
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
          <IconArrowRight size={16} />
        </button>
      </section>
    </div>
  );
}

function DigiDocModal({
  documents,
  close,
}: {
  documents: DigiDocument[];
  close: () => void;
}) {
  return (
    <div className="dlDocModalOverlay" role="dialog" aria-modal="true">
      <div className="dlDocModalBox">
        <div className="dlDocModalHead">
          <h3>
            <span>📜</span> DigiLocker Verified Documents ({documents.length})
          </h3>
          <button className="gateClose" onClick={close} aria-label="Close">
            <IconClose size={18} />
          </button>
        </div>

        {documents.map((doc) => (
          <div key={doc.id} className="dlDocCard">
            <div className="dlDocCardTop">
              <div>
                <b>{doc.name}</b>
                <div className="dlDocIssuer">{doc.issuer}</div>
              </div>
              <span className="dlKycTag">DIGILOCKER VERIFIED</span>
            </div>

            <div style={{ fontSize: "11px", color: "#475569", marginBottom: "6px" }}>
              <b>Doc / Reg No:</b> {doc.docNumber} · <b>Issued:</b> {doc.issueDate}
            </div>

            {doc.details && Object.keys(doc.details).length > 0 && (
              <dl className="dlDocDetailsGrid">
                {Object.entries(doc.details).map(([key, val]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{val}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        ))}

        <div style={{ marginTop: "16px", textAlign: "right" }}>
          <button type="button" className="primary compact" onClick={close}>
            Done / Close
          </button>
        </div>
      </div>
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
  openDashboard,
  account,
}: {
  language: LangCode;
  openPicker: () => void;
  onHome?: () => void;
  openPanel?: (panel: Exclude<PortalPanel, null>) => void;
  openDashboard?: () => void;
  /** Non-empty once a grievance has been filed on this device. */
  account?: string;
}) {
  const t = getDict(language);
  const meta = getLanguage(language);
  return (
    <header className="siteHeader">
      {/* Tricolour rule: a 3px civic marker, not a decorative gradient. */}
      <div className="tricolour" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <button
        className="brand brandButton"
        onClick={onHome}
        aria-label={t.homeAria}
      >
        <span className="brandMark">
          <AshokaChakra size={30} />
        </span>
        <span className="brandText">
          <b>
            JanSetu <em lang={language}>{meta.brand}</em>
          </b>
          <small>{t.brandSub}</small>
        </span>
      </button>
      {/* Right-hand cluster, in a fixed order: status, language, then the
          account action. Sign in always sits last so it is in the same place
          on every screen. */}
      <div className="headerRight">
        <span className="demoChip">{t.publicBeta}</span>
        <button
          className="languageButton"
          onClick={openPicker}
          aria-label={t.languageCta}
        >
          <IconLanguages size={15} />
          <span lang={language}>{meta.native}</span>
        </button>
        {account ? (
          <button className="accountButton" onClick={openDashboard}>
            <span className="accountAvatar" aria-hidden="true">
              {account
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join("")}
            </span>
            {t.dashboardLabel}
          </button>
        ) : (
          openPanel && (
            <button
              className="signInButton"
              onClick={() => openPanel("signin")}
            >
              <IconUser size={15} />
              {t.portalSignin}
            </button>
          )
        )}
      </div>
    </header>
  );
}

function Dashboard({
  t,
  complaints,
  selectedId,
  selectComplaint,
  loading,
  error,
  backHome,
}: {
  t: Dict;
  complaints: DashboardComplaint[];
  selectedId: string;
  selectComplaint: (id: string) => void;
  loading: boolean;
  error: string;
  backHome: () => void;
}) {
  const selected = complaints.find((item) => item.id === selectedId) || complaints[0];
  return (
    <>
      <section className="dashboardHero">
        <div>
          <button className="dashboardBack" onClick={backHome}><IconArrowLeft size={16} /> {t.returnHome}</button>
          <p className="dashboardKicker">{t.dashboardKicker}</p>
          <h1>{t.dashboardTitle}</h1>
          <p>{t.dashboardBody}</p>
        </div>
        <div className="ministryBadge">
          <img src="https://pgportal.gov.in/Images/iconHome/logo.png" alt="CPGRAMS logo" />
          <div><b>{t.ministryName}</b><span>{t.ministrySub}</span></div>
        </div>
      </section>
      {loading && <section className="dashboardEmpty"><span>◌</span><h2>{t.dashboardLoading}</h2><p>{t.dashboardLoadingBody}</p></section>}
      {!loading && error && <section className="dashboardEmpty dashboardError"><span>!</span><h2>{t.dashboardCouldNotLoad}</h2><p>{error}</p></section>}
      {!loading && !error && !selected && <section className="dashboardEmpty"><span><IconGrid size={22} /></span><h2>{t.dashboardEmptyTitle}</h2><p>{t.dashboardEmptyBody}</p><button className="primary compact" onClick={backHome}>{t.dashboardFileNew}<IconArrowRight size={16} /></button></section>}
      {!loading && !error && selected && (
      <main className="dashboardLayout">
        <aside className="complaintListCard">
          <div className="dashboardCardHeader"><div><span>{t.dashboardCasesKicker}</span><h2>{t.dashboardCasesTitle}</h2></div><b>{complaints.length}</b></div>
          <div className="complaintList">
            {complaints.map((item) => (
              <button key={item.id} className={`complaintListItem ${item.id === selected.id ? "selected" : ""}`} onClick={() => selectComplaint(item.id)}>
                <span className={`statusDot ${item.statusTone}`} />
                <div><b>{item.subject}</b><small>{item.department}</small><em>{item.id} · {item.status}</em></div><i>›</i>
              </button>
            ))}
          </div>
          <button className="primary compact dashboardFileButton" onClick={backHome}>{t.dashboardFileNew}<IconArrowRight size={16} /></button>
        </aside>
        <section className="dashboardDetail">
          <div className="detailTopline"><div><span>{t.dashboardTrackingKicker}</span><h2>{selected.subject}</h2><p>{selected.department} · {selected.location}</p></div><span className={`statusPill ${selected.statusTone}`}>{selected.status}</span></div>
          <div className="detailMeta"><span>{t.dashboardFiledOn}<b>{selected.filedOn}</b></span><span>{t.dashboardCaseId}<b>{selected.id}</b></span></div>
          <div className="amazonTimeline">
            {selected.updates.map((update, i) => (
              <div className={`amazonStep ${update.done ? "done" : "next"}`} key={`${update.title}-${i}`}>
                <div className="amazonRail"><span>{update.icon}</span>{i < selected.updates.length - 1 && <i />}</div>
                <div className="amazonContent"><div><h3>{update.title}</h3><time>{update.date}</time></div><p>{update.detail}</p>{update.done && i > 0 && <em>{t.dashboardVerifiedUpdate}</em>}</div>
              </div>
            ))}
          </div>
          <div className="journeySourceNote"><span><IconSpark size={14} />{t.dashboardJourneyKicker}</span><p>{t.dashboardJourneyBody}</p></div>
        </section>
      </main>
      )}
    </>
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
      icon: <IconInfo size={20} />,
      kicker: t.portalAboutKicker,
      title: t.portalAboutTitle,
      body: t.portalAboutBody,
      items: [t.portalAboutItem1, t.portalAboutItem2, t.portalAboutItem3],
    },
    contact: {
      icon: <IconPhone size={20} />,
      kicker: t.portalContactKicker,
      title: t.portalContactTitle,
      body: t.portalContactBody,
      items: [t.portalContactItem1, t.portalContactItem2, t.portalContactItem3],
    },
    help: {
      icon: <IconInfo size={20} />,
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
      icon: <IconArrowRight size={20} />,
      kicker: t.portalSigninKicker,
      title: t.portalSigninTitle,
      body: t.portalSigninBody,
      items: [t.portalSigninItem1, t.portalSigninItem2, t.portalSigninItem3],
    },
  }[panel];

  return (
    <div className="portalOverlay" role="dialog" aria-modal="true" aria-labelledby="portal-panel-title">
      <section className="portalPanel">
        <button className="gateClose" onClick={close} aria-label={t.closeWord}><IconClose size={18} /></button>
        <span className="portalPanelIcon">{content.icon}</span>
        <p className="portalPanelKicker">{content.kicker}</p>
        <h2 id="portal-panel-title">{content.title}</h2>
        <p className="portalPanelBody">{content.body}</p>
        <ul className="portalPanelList">
          {content.items.map((item) => <li key={item}><span><IconCheck size={13} /></span>{item}</li>)}
        </ul>
        {(panel === "contact" || panel === "about") && (
          <a
            className="portalSource"
            href={
              panel === "contact"
                ? "https://pgportal.gov.in/Home/ContactUs"
                : "https://pgportal.gov.in/Home/AboutUs"
            }
            target="_blank"
            rel="noreferrer"
          >
            {t.portalOfficialSource}
          </a>
        )}
        <button className="primary compact portalPanelButton" onClick={close}>
          {t.closeWord}
        </button>
      </section>
    </div>
  );
}

// Each panel body renders its own <h2 id="portal-panel-title">, which is
// what aria-labelledby resolves against — so no title prop is needed.
function PanelShell({ children, close, t }: { children: ReactNode; close: () => void; t: Dict }) {
  return (
    <div className="portalOverlay" role="dialog" aria-modal="true" aria-labelledby="portal-panel-title">
      <section className="portalPanel richPanel">
        <button className="gateClose" onClick={close} aria-label={t.closeWord}><IconClose size={18} /></button>
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
    <PanelShell close={close} t={t}>
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
    <PanelShell close={close} t={t}>
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
            <div className="officerContact"><a href={`tel:${phone}`}><IconPhone size={14} />{phone}</a><a href={`mailto:${email}`}><IconMail size={14} />{email}</a></div>
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
    <PanelShell close={close} t={t}>
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
    <PanelShell close={close} t={t}>
      <span className="portalPanelIcon">↑</span>
      <p className="portalPanelKicker">{t.portalAppealKicker}</p>
      <h2 id="portal-panel-title">{t.portalAppealTitle}</h2>
      <p className="portalPanelBody">{t.portalAppealBody}</p>
      <div className="appealRule"><b>{t.appealWindowTitle}</b><span>{t.appealWindowValue}</span><p>{t.appealWindowBody}</p></div>
      <div className="appealDirectory">{officers.map(([department, name, phone]) => <div key={department}><span>{department}</span><b>{name}</b><a href={`tel:${phone}`}><IconPhone size={14} />{phone}</a></div>)}</div>
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
          <b>{i < progress ? <IconCheck size={13} /> : i + 1}</b>
          <em>{label}</em>
          {i < 3 && <i />}
        </span>
      ))}
    </nav>
  );
}

function Describe({
  t,
  language,
  languageName,
  speechLanguage,
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
  complaintLocationMatch,
  chooseComplaintLocation,
}: {
  t: Dict;
  language: LangCode;
  languageName: string;
  speechLanguage: string;
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
  complaintLocationMatch: ComplaintLocationMatch;
  chooseComplaintLocation: (v: Exclude<ComplaintLocationMatch, "">) => void;
}) {
  const [filingMode, setFilingMode] = useState<FilingMode>(null);
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiMessages, setAiMessages] = useState<Array<{ role: "assistant" | "user"; text: string }>>([]);
  const [aiComplete, setAiComplete] = useState(false);
  const [aiVoiceStatus, setAiVoiceStatus] = useState<"idle" | "listening" | "thinking" | "speaking" | "error">("idle");
  const [aiSpeechLanguage, setAiSpeechLanguage] = useState(speechLanguage);
  const [aiVoice, setAiVoice] = useState("coral");
  const liveConversationRef = useRef(false);
  const liveRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const liveAudioRef = useRef<HTMLAudioElement | null>(null);
  const liveAudioUrlRef = useRef("");
  const aiMessagesRef = useRef(aiMessages);
  const conversationDataRef = useRef({ description, selectedState, details });
  aiMessagesRef.current = aiMessages;
  conversationDataRef.current = { description, selectedState, details };

  const fallbackQuestions = {
    description: t.aiChatQProblem,
    state: t.aiChatQState,
    district: t.aiChatQDistrict,
    blockTehsil: t.aiChatQBlock,
    gramPanchayat: t.aiChatQPanchayat,
    locality: t.aiChatQLocality,
    startedOn: t.aiChatQStarted,
    frequency: t.aiChatQFrequency,
    affectedPeople: t.aiChatQAffected,
    requestedResolution: t.aiChatQOutcome,
  };

  function selectMode(mode: Exclude<FilingMode, null>) {
    stopLiveConversation();
    setFilingMode(mode);
    setAiComplete(false);
    setAiAnswer("");
    const languageCode = aiSpeechLanguage.split("-")[0];
    setAiMessages(mode === "ai" ? [{ role: "assistant", text: voiceOpening[languageCode] || voiceOpening.en }] : []);
  }

  function stopLiveConversation() {
    liveConversationRef.current = false;
    liveRecognitionRef.current?.stop();
    liveRecognitionRef.current = null;
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    liveAudioRef.current?.pause();
    liveAudioRef.current = null;
    if (liveAudioUrlRef.current) URL.revokeObjectURL(liveAudioUrlRef.current);
    liveAudioUrlRef.current = "";
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setAiVoiceStatus("idle");
  }

  function finishAssistantSpeech(resumeListening: boolean) {
    setAiVoiceStatus("idle");
    if (resumeListening && liveConversationRef.current) void beginLiveListening();
  }

  function browserSpeechFallback(text: string, resumeListening: boolean) {
    if (!("speechSynthesis" in window)) return finishAssistantSpeech(resumeListening);
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = aiSpeechLanguage;
    utterance.rate = 0.94;
    const matchingVoice = window.speechSynthesis
      .getVoices()
      .find((voice) => voice.lang.toLowerCase().startsWith(aiSpeechLanguage.split("-")[0].toLowerCase()));
    if (matchingVoice) utterance.voice = matchingVoice;
    setAiVoiceStatus("speaking");
    utterance.onend = () => finishAssistantSpeech(resumeListening);
    utterance.onerror = () => finishAssistantSpeech(resumeListening);
    window.speechSynthesis.speak(utterance);
  }

  async function speakAssistant(text: string, resumeListening: boolean) {
    if (typeof window === "undefined") return;
    setAiVoiceStatus("speaking");
    try {
      const selectedLanguage = conversationLanguages.find(([code]) => code === aiSpeechLanguage)?.[1] || languageName;
      const response = await fetch("/api/voice/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, languageName: selectedLanguage, voice: aiVoice }),
      });
      if (!response.ok) throw new Error("premium speech unavailable");
      const blob = await response.blob();
      if (liveAudioUrlRef.current) URL.revokeObjectURL(liveAudioUrlRef.current);
      const url = URL.createObjectURL(blob);
      liveAudioUrlRef.current = url;
      const audio = new Audio(url);
      liveAudioRef.current = audio;
      audio.onended = () => finishAssistantSpeech(resumeListening);
      audio.onerror = () => browserSpeechFallback(text, resumeListening);
      await audio.play();
    } catch {
      browserSpeechFallback(text, resumeListening);
    }
  }

  async function transcribeAndSend(blob: Blob, browserTranscript: string) {
    let transcript = browserTranscript.trim();
    try {
      const form = new FormData();
      form.append("audio", blob, `answer.${blob.type.includes("mp4") ? "m4a" : "webm"}`);
      form.append("language", aiSpeechLanguage);
      const response = await fetch("/api/voice/transcribe", { method: "POST", body: form });
      const result = (await response.json()) as { text?: string };
      if (response.ok && result.text?.trim()) transcript = result.text.trim();
    } catch {
      // Browser transcript remains the resilient fallback.
    }
    if (transcript) await sendConversationTurn(transcript);
    else {
      liveConversationRef.current = false;
      setAiVoiceStatus("error");
    }
  }

  async function beginLiveListening() {
    if (!liveConversationRef.current) return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      liveConversationRef.current = false;
      setAiVoiceStatus("error");
      return;
    }
    mediaStreamRef.current = stream;
    const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
      .find((type) => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecorderRef.current = recorder;
    const chunks: Blob[] = [];
    let browserTranscript = "";
    let submitted = false;
    let recognition: SpeechRecognitionLike | null = null;
    let stopTimer = 0;
    const stopCapture = () => {
      if (submitted) return;
      submitted = true;
      window.clearTimeout(stopTimer);
      try { recognition?.stop(); } catch {}
      if (recorder.state === "recording") recorder.stop();
    };
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      if (!liveConversationRef.current) return;
      const audio = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      void transcribeAndSend(audio, browserTranscript);
    };
    recorder.start(250);
    setAiVoiceStatus("listening");

    const speechWindow = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (Recognition) {
      recognition = new Recognition();
      liveRecognitionRef.current = recognition;
      recognition.lang = aiSpeechLanguage;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const words = event.results[i][0].transcript;
          if (event.results[i].isFinal) browserTranscript += `${words} `;
          else interim += words;
        }
        setAiAnswer(`${browserTranscript}${interim}`.trim());
        if (browserTranscript.trim()) stopCapture();
      };
      recognition.onerror = () => { /* The high-accuracy audio transcript still runs. */ };
      recognition.onend = () => { liveRecognitionRef.current = null; };
      try { recognition.start(); } catch {}
    }
    stopTimer = window.setTimeout(stopCapture, 9000);
  }

  async function sendConversationTurn(rawAnswer?: string) {
    const answer = (rawAnswer || aiAnswer).trim();
    if (!answer || aiVoiceStatus === "thinking") return;
    const userMessage = { role: "user" as const, text: answer };
    const history = [...aiMessagesRef.current, userMessage];
    aiMessagesRef.current = history;
    setAiMessages(history);
    setAiAnswer("");
    setAiVoiceStatus("thinking");
    const current = conversationDataRef.current;
    try {
      const response = await fetch("/api/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userText: answer,
          language: aiSpeechLanguage.split("-")[0],
          languageName: conversationLanguages.find(([code]) => code === aiSpeechLanguage)?.[1] || languageName,
          locationMatch: complaintLocationMatch,
          history,
          captured: {
            description: current.description,
            state: current.selectedState,
            ...current.details,
          },
          fallbackQuestions,
        }),
      });
      const result = (await response.json()) as {
        assistantMessage?: string;
        complete?: boolean;
        captured?: {
          description: string; state: string; district: string; blockTehsil: string;
          gramPanchayat: string; locality: string; startedOn: string; frequency: string;
          affectedPeople: string; requestedResolution: string;
        };
        error?: string;
      };
      if (!response.ok || !result.assistantMessage || !result.captured)
        throw new Error(result.error || "Conversation unavailable");
      const captured = result.captured;
      const nextDetails = {
        district: captured.district,
        blockTehsil: captured.blockTehsil,
        gramPanchayat: captured.gramPanchayat,
        locality: captured.locality,
        startedOn: captured.startedOn,
        frequency: captured.frequency || "Ongoing",
        affectedPeople: captured.affectedPeople,
        requestedResolution: captured.requestedResolution,
      };
      setDescription(captured.description || current.description);
      if (captured.state) setSelectedState(captured.state);
      setDetails(nextDetails);
      conversationDataRef.current = {
        description: captured.description || current.description,
        selectedState: captured.state || current.selectedState,
        details: nextDetails,
      };
      const assistantMessage = { role: "assistant" as const, text: result.assistantMessage };
      const nextMessages = [...history, assistantMessage];
      aiMessagesRef.current = nextMessages;
      setAiMessages(nextMessages);
      setAiComplete(Boolean(result.complete));
      if (result.complete) liveConversationRef.current = false;
      void speakAssistant(result.assistantMessage, !result.complete);
    } catch {
      liveConversationRef.current = false;
      setAiVoiceStatus("error");
    }
  }

  function toggleLiveConversation() {
    if (liveConversationRef.current) {
      stopLiveConversation();
      return;
    }
    liveConversationRef.current = true;
    const languageCode = aiSpeechLanguage.split("-")[0];
    const opening = voiceOpening[languageCode] || voiceOpening.en;
    const prompt = aiMessagesRef.current.at(-1)?.role === "assistant"
      ? aiMessagesRef.current.at(-1)?.text || opening
      : opening;
    void speakAssistant(prompt, true);
  }

  return (
    <div className="contentGrid">
      <section className="formCard">
        <div className="stepLabel">{t.stepLabel}</div>
        <h2>{t.what}</h2>
        <p className="muted">{t.natural}</p>
        <div className="filingModeChooser" role="group" aria-label={t.modeTitle}>
          <div className="sectionHeading">
            <div><b>{t.modeTitle}</b><p>{t.modeBody}</p></div>
            <span>{t.modeBadge}</span>
          </div>
          <div className="filingModeCards">
            <button className={filingMode === "ai" ? "selected" : ""} onClick={() => selectMode("ai")}>
              <span><IconSpark size={20} /></span><b>{t.modeAiTitle}</b><p>{t.modeAiBody}</p><em>{t.modeAiCta}</em>
            </button>
            <button className={filingMode === "manual" ? "selected" : ""} onClick={() => selectMode("manual")}>
              <span><IconGrid size={20} /></span><b>{t.modeManualTitle}</b><p>{t.modeManualBody}</p><em>{t.modeManualCta}</em>
            </button>
          </div>
        </div>

        {filingMode && (
          <div className="locationMatchCard">
            <span className="locationPin"><IconPin size={18} /></span>
            <div><b>{t.locationMatchTitle}</b><p>{t.locationMatchBody}</p></div>
            <div className="locationMatchActions">
              <button className={complaintLocationMatch === "same" ? "selected" : ""} onClick={() => chooseComplaintLocation("same")}>{t.locationMatchYes}</button>
              <button className={complaintLocationMatch === "different" ? "selected" : ""} onClick={() => chooseComplaintLocation("different")}>{t.locationMatchNo}</button>
            </div>
          </div>
        )}

        {filingMode && complaintLocationMatch && filingMode === "ai" && (
          <div className="aiConversation" aria-live="polite">
            <div className="aiConversationHeader">
              <span><IconSpark size={17} /></span>
              <div><b>{t.aiChatTitle}</b><small>{t.aiChatBody}</small></div>
              <em className={`liveVoiceState ${aiVoiceStatus}`}>
                {aiVoiceStatus === "listening" ? t.aiVoiceListening
                  : aiVoiceStatus === "thinking" ? t.aiVoiceThinking
                    : aiVoiceStatus === "speaking" ? t.aiVoiceSpeaking
                      : aiVoiceStatus === "error" ? t.aiVoiceError
                        : t.aiVoiceReady}
              </em>
            </div>
            <div className="voiceModelSettings">
              <label>{t.aiLanguageLabel}
                <select
                  value={aiSpeechLanguage}
                  disabled={aiVoiceStatus !== "idle"}
                  onChange={(e) => {
                    stopLiveConversation();
                    const nextLanguage = e.target.value;
                    setAiSpeechLanguage(nextLanguage);
                    const opening = voiceOpening[nextLanguage.split("-")[0]] || voiceOpening.en;
                    setAiMessages([{ role: "assistant", text: opening }]);
                    setAiComplete(false);
                  }}
                >
                  {conversationLanguages.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                </select>
              </label>
              <label>{t.aiVoiceLabel}
                <select value={aiVoice} disabled={aiVoiceStatus !== "idle"} onChange={(e) => setAiVoice(e.target.value)}>
                  <option value="coral">{t.aiVoiceCoral}</option>
                  <option value="nova">{t.aiVoiceNova}</option>
                  <option value="shimmer">{t.aiVoiceShimmer}</option>
                </select>
              </label>
              <span>{t.aiVoiceModelBadge}</span>
            </div>
            <div className="aiChatHistory">
              {aiMessages.map((item, index) => (
                <div className={`aiChatMessage ${item.role}`} key={`${item.role}-${index}`}>
                  <span>{item.role === "assistant" ? <IconSpark size={13} /> : <IconUser size={13} />}</span>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
            {!aiComplete ? (
              <div className="aiChatCurrent">
                <div className="liveVoiceControls">
                  <button
                    className={liveConversationRef.current ? "stopVoice liveConversationButton" : "startVoice liveConversationButton"}
                    onClick={toggleLiveConversation}
                    disabled={aiVoiceStatus === "thinking"}
                  >
                    {liveConversationRef.current
                      ? <><IconStop size={16} />{t.aiVoicePause}</>
                      : <><IconMic size={16} />{t.aiVoiceStart}</>}
                  </button>
                  <div className={`voicePulse ${aiVoiceStatus}`}><i /><i /><i /><i /></div>
                </div>
                <p className="liveVoiceHint">{t.aiVoiceHint}</p>
                <div className="typedChatFallback">
                  <input
                    value={aiAnswer}
                    onChange={(e) => setAiAnswer(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void sendConversationTurn(); }}
                    placeholder={t.aiChatAnswerPlaceholder}
                    disabled={aiVoiceStatus === "thinking"}
                  />
                  <button
                    className="primary compact"
                    disabled={!aiAnswer.trim() || aiVoiceStatus === "thinking"}
                    onClick={() => void sendConversationTurn()}
                    aria-label={t.aiChatNext}
                  ><IconArrowRight size={15} /></button>
                </div>
              </div>
            ) : (
              <div className="aiChatComplete"><IconCheck size={22} /><div><b>{t.aiChatCompleteTitle}</b><p>{t.aiChatCompleteBody}</p><button className="secondary" onClick={() => { setAiComplete(false); setAiMessages((items) => [...items, { role: "assistant", text: t.aiChatAnythingElse }]); }}>{t.aiChatAddMore}</button></div></div>
            )}
          </div>
        )}

        {filingMode && complaintLocationMatch && filingMode === "manual" && <>
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
              {listening ? <><IconStop size={15} />{t.voiceStop}</> : <><IconMic size={15} />{t.voiceStart}</>}
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
            <IconSpark size={13} /> {details.locality
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
        </>}
        {filingMode && complaintLocationMatch && <>
        {complaintLocationMatch === "same" && (
        <div className="locationPanel">
          <span className="locationPin"><IconPin size={18} /></span>
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
        )}
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
          <span><IconPlus size={20} /></span>
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
          {loading ? <IconSpark size={16} /> : <IconArrowRight size={16} />}
        </button>
        <p className="aiNote"><IconSpark size={14} />{t.aiNote}</p>
        <p className="savedNote">✓ {t.saved}</p>
        </>}
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
          <span><IconPin size={16} /></span>
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
        <p className="privacy"><IconLock size={13} />{t.nearbyPrivacy}</p>
      </section>
      <section className="helpCard">
        <span><IconPhone size={18} /></span>
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
  name,
  setName,
  digiProfile,
  onViewDocs,
}: {
  name: string;
  setName: (v: string) => void;
  analysis: Analysis;
  setAnalysis: (a: Analysis) => void;
  back: () => void;
  submit: () => void;
  t: Dict;
  details: ComplaintDetails;
  submitting: boolean;
  digiProfile?: DigiCitizenProfile | null;
  onViewDocs?: (docs: DigiDocument[]) => void;
}) {
  return (
    <section className="singleCard">
      <div className="reviewBanner">
        <span><IconSpark size={18} /></span>
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
          <b><IconAlert size={15} />{t.emergencyTitle}</b>
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

      {digiProfile && (
        <div className="dlCitizenBox" style={{ margin: "16px 0" }}>
          <div className="dlCitizenTop">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={digiProfile.photoAvatar} alt={digiProfile.name} className="dlCitizenAvatar" />
            <div className="dlCitizenNameBlock">
              <b>{digiProfile.name} <span className="dlKycTag">UIDAI e-KYC VERIFIED</span></b>
              <small>Aadhaar: {digiProfile.aadhaarMasked} · {digiProfile.age} Yrs · {digiProfile.gender}</small>
            </div>
            {digiProfile.documents && digiProfile.documents.length > 0 && (
              <button
                type="button"
                className="dlActionBtn"
                onClick={() => onViewDocs?.(digiProfile.documents)}
              >
                📄 View Synced Docs ({digiProfile.documents.length})
              </button>
            )}
          </div>
          <div className="dlCitizenGrid">
            <div><span>Aadhaar Number</span><b>{digiProfile.aadhaarMasked}</b></div>
            <div><span>Verified Contact</span><b>{digiProfile.mobileMasked}</b></div>
            <div><span>District & State</span><b>{digiProfile.district}, {digiProfile.state}</b></div>
            <div><span>Residential Address</span><b>{digiProfile.address}</b></div>
          </div>
        </div>
      )}

      <div className="filerBlock">
        <label htmlFor="filerName">{t.filerName}</label>
        <input
          id="filerName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.filerNamePlaceholder}
          autoComplete="name"
        />
        <small>
          <IconLock size={13} />
          {t.prototypeNote}
        </small>
      </div>
      <div className="issueNumberPromise">
        <b># {t.promiseTitle}</b>
        <p>{t.promiseBody}</p>
      </div>
      <div className="buttonRow">
        <button className="secondary" onClick={back}>
          <IconArrowLeft size={16} /> {t.edit}
        </button>
        <button className="primary compact" onClick={submit} disabled={submitting}>
          {submitting ? t.submitting : t.submit}
          <IconArrowRight size={16} />
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
          <button onClick={() => window.print()}><IconDownload size={15} />{t.saveReceipt}</button>
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
              <span className="timelineDot">{i < shown ? <IconCheck size={13} /> : i + 1}</span>
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
              <IconArrowRight size={16} />
            </button>
          ) : (
            <button className="primary compact" onClick={onConfirm}>
              {t.confirmResolution}
              <IconArrowRight size={16} />
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
          <b><IconClock size={15} />{t.slaTitle}</b>
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
          <IconArrowLeft size={16} /> {t.back}
        </button>
        <button className="primary compact" onClick={submit}>
          {t.appealSubmit}
          <IconArrowRight size={16} />
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
          <IconDownload size={15} />{t.printReceipt}
        </button>
        <button className="primary compact" onClick={home}>
          {t.returnHome}
        </button>
      </div>
    </section>
  );
}
