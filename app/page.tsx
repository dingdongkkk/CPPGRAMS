"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Screen = "home" | "describe" | "review" | "track" | "confirm" | "appeal" | "appeal-track" | "closed";
type Analysis = { department: string; category: string; location: string; issueType: string; keyDetails: string[]; summary: string; source?: string };
type GpsLocation = { latitude: number; longitude: number; accuracy: number; label: string };
type SpeechResultEvent = { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> };
type SpeechRecognitionLike = {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  start: () => void; stop: () => void;
  onstart: (() => void) | null; onend: (() => void) | null;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
};

const voiceLanguages = [
  ["auto", "Auto — device language"], ["en-IN", "English (India)"], ["hi-IN", "हिन्दी"],
  ["bn-IN", "বাংলা"], ["te-IN", "తెలుగు"], ["mr-IN", "मराठी"], ["ta-IN", "தமிழ்"],
  ["gu-IN", "ગુજરાતી"], ["kn-IN", "ಕನ್ನಡ"], ["ml-IN", "മലയാളം"], ["pa-IN", "ਪੰਜਾਬੀ"],
  ["ur-IN", "اردو"], ["or-IN", "ଓଡ଼ିଆ"], ["as-IN", "অসমীয়া"], ["ne-NP", "नेपाली"],
  ["es-ES", "Español"], ["fr-FR", "Français"], ["de-DE", "Deutsch"], ["ar-SA", "العربية"],
  ["zh-CN", "中文"], ["ja-JP", "日本語"], ["ko-KR", "한국어"], ["pt-BR", "Português"],
] as const;

const stages = [
  { title: "Filed", hi: "दर्ज हुई", detail: "Your complaint was received safely.", sla: "Instant" },
  { title: "Assigned to officer", hi: "अधिकारी को सौंपी", detail: "Priya Sharma is responsible for your case.", sla: "Within 1 working day" },
  { title: "Officer viewing", hi: "अधिकारी देख रहे हैं", detail: "The officer has opened your complaint and evidence.", sla: "Within 2 working days" },
  { title: "Action taken", hi: "कार्रवाई हुई", detail: "A field team has recorded an action on your case.", sla: "Within 5 working days" },
  { title: "Resolved", hi: "समाधान बताया गया", detail: "The department says the issue is fixed. Your confirmation is required.", sla: "Citizen confirmation" },
];

const copy = {
  en: { describe:"Describe", review:"Review", track:"Track", confirm:"Confirm", start:"File a grievance", existing:"Track an existing grievance", what:"What happened?", natural:"Write naturally, like you’re telling a neighbour.", placeholder:"Example: There has been no water supply in our lane for three days. We are in Shastri Nagar near the community centre.", prepare:"Prepare my complaint", saved:"Draft saved on this device", back:"Back", submit:"Submit grievance", edit:"Edit description", next:"Show next update", fixed:"Yes, it is fixed", notFixed:"No, it is not fixed", appeal:"Submit appeal" },
  hi: { describe:"समस्या बताएँ", review:"जाँचें", track:"स्थिति देखें", confirm:"पुष्टि करें", start:"शिकायत दर्ज करें", existing:"पुरानी शिकायत देखें", what:"क्या हुआ?", natural:"जैसे किसी पड़ोसी को बताते हैं, वैसे लिखें।", placeholder:"उदाहरण: हमारे इलाके में तीन दिनों से पानी नहीं आया। हम शास्त्री नगर सामुदायिक केंद्र के पास रहते हैं।", prepare:"मेरी शिकायत तैयार करें", saved:"ड्राफ्ट इस डिवाइस पर सेव है", back:"वापस", submit:"शिकायत जमा करें", edit:"विवरण बदलें", next:"अगला अपडेट दिखाएँ", fixed:"हाँ, समस्या ठीक हुई", notFixed:"नहीं, समस्या ठीक नहीं हुई", appeal:"अपील जमा करें" },
};

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [name, setName] = useState("Asha Verma");
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
  const [permissionPrompt, setPermissionPrompt] = useState(true);
  const [showSecurityGate, setShowSecurityGate] = useState(false);
  const [digiVerified, setDigiVerified] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaMode, setCaptchaMode] = useState<"demo" | "live">("demo");
  const [securityLoading, setSecurityLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceBaseRef = useRef("");
  const voiceFinalRef = useRef("");
  const t = copy[language];
  const hi = language === "hi";
  const grievanceId = "JS-2026-0828-1047";

  useEffect(() => {
    const draft = localStorage.getItem("jansetu-draft");
    if (draft) setDescription(draft);
    const params = new URLSearchParams(window.location.search);
    if (params.get("digilocker") === "verified" || params.get("digilocker") === "demo-verified") {
      setDigiVerified(true); setShowSecurityGate(true);
      window.history.replaceState({}, "", "/");
    }
  }, []);
  useEffect(() => {
    if (description) localStorage.setItem("jansetu-draft", description);
  }, [description]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3600);
    return () => clearTimeout(timer);
  }, [toast]);

  const progress = useMemo(() => screen === "describe" ? 0 : screen === "review" ? 1 : ["track", "appeal-track"].includes(screen) ? 2 : 3, [screen]);

  async function prepareComplaint() {
    if (description.trim().length < 20) { setToast(hi ? "कृपया थोड़ी और जानकारी दें।" : "Please add a little more detail so we can route it correctly."); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/analyze", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ description }) });
      if (!response.ok) throw new Error("Could not analyse");
      const result = await response.json() as Analysis;
      setAnalysis(gpsLocation ? { ...result, location: gpsLocation.label } : result);
      setScreen("review");
    } catch {
      setToast(hi ? "अभी शिकायत तैयार नहीं हो सकी। फिर कोशिश करें।" : "We couldn’t prepare this just now. Please try again.");
    } finally { setLoading(false); }
  }

  function submitGrievance() {
    localStorage.removeItem("jansetu-draft");
    setStage(0); setScreen("track"); setToast(hi ? "शिकायत सफलतापूर्वक दर्ज हुई।" : "Grievance filed. A receipt is ready for you.");
  }

  function advanceStage() {
    if (stage < 4) {
      const next = stage + 1; setStage(next);
      setToast(`Demo notification · ${stages[next].title}: ${stages[next].detail}`);
      if (next === 4) setTimeout(() => setScreen("confirm"), 800);
    }
  }

  function startVoice() {
    if (listening && recognitionRef.current) { recognitionRef.current.stop(); return; }
    const speechWindow = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setToast("Voice typing is not supported by this browser. Open this public link in Chrome, Edge or Safari and allow microphone access.");
      return;
    }
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = voiceLanguage === "auto" ? (navigator.language || (hi ? "hi-IN" : "en-IN")) : voiceLanguage;
    recognition.continuous = true; recognition.interimResults = true; recognition.maxAlternatives = 1;
    voiceBaseRef.current = description.trim(); voiceFinalRef.current = "";
    recognition.onstart = () => { setListening(true); setToast(`Microphone is on · Speak in ${recognition.lang}`); };
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const words = event.results[i][0].transcript;
        if (event.results[i].isFinal) voiceFinalRef.current += `${words} `; else interim += words;
      }
      setDescription([voiceBaseRef.current, voiceFinalRef.current.trim(), interim.trim()].filter(Boolean).join(" "));
    };
    recognition.onerror = (event) => {
      setListening(false);
      const message = event.error === "not-allowed" || event.error === "service-not-allowed"
        ? "Microphone permission is blocked. Allow microphone access in your browser’s site settings, then try again."
        : event.error === "no-speech" ? "I couldn’t hear speech. Move closer to the microphone and try again."
        : `Voice typing stopped (${event.error}). Please try again.`;
      setToast(message);
    };
    recognition.onend = () => { setListening(false); recognitionRef.current = null; };
    try { recognition.start(); } catch { setListening(false); setToast("The microphone is already starting. Please wait a moment."); }
  }

  function getGpsLocation() {
    if (!navigator.geolocation) { setToast("GPS location is not supported on this device. You can enter the location manually after voice typing."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const location = { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy, label: `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)} (GPS · ±${Math.round(coords.accuracy)} m)` };
        setGpsLocation(location); setLocating(false); setToast("Location added. You can review it before submitting.");
      },
      (error) => {
        setLocating(false);
        setToast(error.code === 1 ? "Location permission is blocked. Allow location access in your browser settings, or describe your area in the complaint." : "We couldn’t get your GPS location. Try again outdoors or enter your area in the complaint.");
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
      setToast("Microphone enabled. Now approve location if your browser asks.");
    } catch {
      setToast("Microphone was not enabled. You can allow it later from the voice button or browser site settings.");
    }
    getGpsLocation();
  }

  async function completeSecurityCheck() {
    if (!digiVerified) { setToast("Verify with DigiLocker before continuing."); return; }
    if (!captchaToken) { setToast("Complete the CAPTCHA before continuing."); return; }
    setSecurityLoading(true);
    try {
      const response = await fetch("/api/captcha/verify", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ token:captchaToken }) });
      if (!response.ok) throw new Error("captcha failed");
      setShowSecurityGate(false); setScreen("describe"); setToast("Identity and human check complete.");
    } catch { setToast("CAPTCHA verification failed or expired. Please try it again."); setCaptchaToken(""); }
    finally { setSecurityLoading(false); }
  }

  if (screen === "home") return (
    <main className="homePage">
      <Header language={language} setLanguage={setLanguage} />
      <section className="homeHero">
        <div className="homeCopy">
          <span className="servicePill"><i /> PUBLIC SERVICE PROTOTYPE · DEMO</span>
          <h1>{hi ? "आपकी आवाज़। सही जगह। साफ़ जवाब।" : "Your voice. The right desk. A clear answer."}</h1>
          <p>{hi ? "अपनी समस्या आसान भाषा में बताएँ। हम सही विभाग चुनने, शिकायत लिखने और हर कदम समझने में मदद करेंगे।" : "Tell us the problem in your own words. We’ll help route it, write it clearly, and show you what happens at every step."}</p>
          <div className="homeActions">
            <button className="primary compact" onClick={() => setShowSecurityGate(true)}>{t.start}<span>→</span></button>
            <button className="secondary" onClick={() => { setAnalysis({ department:"Delhi Jal Board", category:"Water supply", location:"Shastri Nagar", issueType:"Water supply disruption", keyDetails:[], summary:"No water supply for three days in Shastri Nagar.", source:"demo" }); setStage(2); setScreen("track"); }}>{t.existing}</button>
          </div>
          <div className="trustRow"><span>✓ No Aadhaar needed</span><span>✓ Save and return</span><span>✓ Hindi + English</span></div>
        </div>
        <div className="promiseCard">
          <div className="promiseTop"><span>WHAT YOU CAN EXPECT</span><b>DEMO DATA</b></div>
          <ol><li><b>1</b><div><strong>Say it simply</strong><p>No ministry or category guessing.</p></div></li><li><b>2</b><div><strong>Check before sending</strong><p>You stay in control of every word.</p></div></li><li><b>3</b><div><strong>See real progress</strong><p>Named officer, timestamps and deadlines.</p></div></li><li><b>4</b><div><strong>You decide when it’s done</strong><p>“Not fixed” opens a tracked appeal.</p></div></li></ol>
        </div>
      </section>
      <section className="loginStrip"><div><span className="avatar">AV</span><label htmlFor="demoName">Demo citizen</label><input id="demoName" value={name} onChange={(e)=>setName(e.target.value)} /></div><p>🔒 This prototype uses no real personal or government data.</p></section>
      {showSecurityGate && <SecurityGate digiVerified={digiVerified} captchaToken={captchaToken} setCaptchaToken={setCaptchaToken} captchaMode={captchaMode} setCaptchaMode={setCaptchaMode} loading={securityLoading} close={()=>setShowSecurityGate(false)} complete={completeSecurityCheck} />}
    </main>
  );

  return (
    <main>
      {toast && <div className="toast" role="status"><span>✓</span>{toast}<button onClick={()=>setToast("")} aria-label="Dismiss">×</button></div>}
      <Header language={language} setLanguage={setLanguage} onHome={()=>setScreen("home")} />
      {screen === "describe" && permissionPrompt && <div className="permissionOverlay" role="dialog" aria-modal="true" aria-labelledby="permission-title"><div className="permissionDialog"><span className="permissionIcon">◉</span><div><em>OPTIONAL ACCESS</em><h2 id="permission-title">Use voice and your current location?</h2><p>JanSetu can use your microphone to type your complaint and GPS to add accurate location coordinates. Access happens only after you approve the browser prompt.</p><ul><li>🎙 Microphone: only while the listening button is active</li><li>⌖ Location: captured once, then shown for your review</li></ul><small>No audio is saved by this demo. Your exact location is not shown in “nearby complaints.”</small></div><div className="permissionActions"><button className="secondary" onClick={()=>setPermissionPrompt(false)}>Not now</button><button className="primary compact" onClick={requestFeaturePermissions}>Enable microphone & location</button></div></div></div>}
      <section className="pageIntro">
        <div className="eyebrow"><span className="liveDot" /> Citizen grievance service <b>DEMO</b></div>
        <h1>{screen === "describe" ? (hi ? "अपनी समस्या बताइए।" : "Tell us what went wrong.") : screen === "review" ? (hi ? "जमा करने से पहले जाँचें।" : "Check it before you send it.") : screen === "confirm" ? (hi ? "क्या समस्या सच में ठीक हुई?" : "Is this actually fixed?") : screen === "appeal" ? (hi ? "अपील में क्या बताना चाहेंगे?" : "Tell the escalation officer what remains.") : screen === "closed" ? "Thank you for confirming." : (hi ? "हर कदम साफ़ दिखाई देगा।" : "See exactly what’s happening.")}</h1>
        <p>{screen === "describe" ? (hi ? "विभाग ढूँढने की ज़रूरत नहीं। आसान भाषा में लिखें।" : "No department hunting. Describe the issue in your own words.") : screen === "review" ? "We found the likely department and cleaned up your note. You can change anything." : screen === "confirm" ? "The department says the work is complete. Only you can close the case." : screen === "appeal" ? "Your original complaint stays attached. Keep this short and specific." : screen === "closed" ? "Your case is now closed, and your feedback has been recorded." : "No vague “under process” message—just named ownership, timing and the next step."}</p>
      </section>
      <Journey progress={progress} language={language} />

      {screen === "describe" && <Describe t={t} hi={hi} description={description} setDescription={setDescription} loading={loading} prepare={prepareComplaint} startVoice={startVoice} listening={listening} voiceLanguage={voiceLanguage} setVoiceLanguage={setVoiceLanguage} gpsLocation={gpsLocation} locating={locating} getGpsLocation={getGpsLocation} files={files} setFiles={setFiles} fileRef={fileRef} />}
      {screen === "review" && analysis && <Review analysis={analysis} setAnalysis={setAnalysis} back={()=>setScreen("describe")} submit={submitGrievance} t={t} />}
      {(screen === "track" || screen === "appeal-track") && analysis && <Track analysis={analysis} stage={stage} advance={advanceStage} grievanceId={grievanceId} isAppeal={screen === "appeal-track"} onConfirm={()=>setScreen("confirm")} t={t} />}
      {screen === "confirm" && <Confirm grievanceId={grievanceId} yes={()=>setScreen("closed")} no={()=>setScreen("appeal")} t={t} />}
      {screen === "appeal" && <Appeal reason={appealReason} setReason={setAppealReason} submit={()=>{ if(appealReason.length<10){setToast("Please briefly explain what is still wrong.");return;} setScreen("appeal-track");setToast("Appeal AP-JS-1047 filed and assigned to escalation officer Anil Menon."); }} back={()=>setScreen("confirm")} t={t} />}
      {screen === "closed" && <Closed grievanceId={grievanceId} home={()=>setScreen("home")} />}
    </main>
  );
}

function SecurityGate({digiVerified,captchaToken,setCaptchaToken,captchaMode,setCaptchaMode,loading,close,complete}:{digiVerified:boolean;captchaToken:string;setCaptchaToken:(v:string)=>void;captchaMode:"demo"|"live";setCaptchaMode:(v:"demo"|"live")=>void;loading:boolean;close:()=>void;complete:()=>void}) { return <div className="securityOverlay" role="dialog" aria-modal="true" aria-labelledby="security-title"><section className="securityGate"><button className="gateClose" onClick={close} aria-label="Close">×</button><div className="securityHeading"><span>✓</span><div><em>SECURE FILING</em><h2 id="security-title">Verify before filing</h2><p>Two quick checks protect your identity and stop automated spam.</p></div></div><div className={`securityStep ${digiVerified?"complete":""}`}><span className="securityNumber">{digiVerified?"✓":"1"}</span><div><div className="securityStepTitle"><b>DigiLocker identity verification</b><em>{digiVerified?"VERIFIED": "REQUIRED"}</em></div><p>You will be redirected to DigiLocker. JanSetu never asks for or stores your DigiLocker password.</p>{digiVerified?<div className="verifiedIdentity"><b>✓ Identity verified</b><small>{captchaMode==="demo"?"Hackathon demo identity · no real personal data":"Verified securely through DigiLocker"}</small></div>:<a className="digiButton" href="/api/digilocker/start"><span className="digiMark">D</span><span>Verify with DigiLocker<small>Secure government identity service</small></span><b>→</b></a>}</div></div><div className={`securityStep ${captchaToken?"complete":""}`}><span className="securityNumber">{captchaToken?"✓":"2"}</span><div><div className="securityStepTitle"><b>Human verification</b><em>{captchaToken?"COMPLETE":"REQUIRED"}</em></div><p>Complete the privacy-friendly CAPTCHA. The answer is checked securely on the server.</p><CaptchaWidget onToken={setCaptchaToken} onMode={setCaptchaMode}/><small className="modeNote">{captchaMode==="demo"?"Demo CAPTCHA keys · replace with production Turnstile keys before real rollout":"Live Cloudflare Turnstile protection"}</small></div></div><div className="securityPrivacy"><span>🔒</span><p><b>Privacy first</b><br/>Only verification status is used for this prototype. No Aadhaar number, documents, or DigiLocker credentials are stored.</p></div><button className="primary gateContinue" disabled={!digiVerified||!captchaToken||loading} onClick={complete}>{loading?"Checking…":"Continue to complaint"}<span>→</span></button></section></div> }

function CaptchaWidget({onToken,onMode}:{onToken:(token:string)=>void;onMode:(mode:"demo"|"live")=>void}) { const container=useRef<HTMLDivElement>(null); const rendered=useRef(false); useEffect(()=>{let cancelled=false;let timer:number;async function load(){try{const config=await fetch("/api/captcha/config").then(r=>r.json()) as {siteKey:string;mode:"demo"|"live"};if(cancelled)return;onMode(config.mode);const attempt=()=>{const w=window as typeof window&{turnstile?:{render:(el:HTMLElement,options:Record<string,unknown>)=>string}};if(w.turnstile&&container.current&&!rendered.current){rendered.current=true;w.turnstile.render(container.current,{sitekey:config.siteKey,theme:"light",size:"flexible",action:"file_grievance",callback:(token:string)=>onToken(token),"expired-callback":()=>onToken(""),"error-callback":()=>onToken("")});}else if(!cancelled&&!rendered.current)timer=window.setTimeout(attempt,250)};attempt()}catch{onToken("")}}load();return()=>{cancelled=true;if(timer)window.clearTimeout(timer)}},[onToken,onMode]);return <div className="captchaShell"><div ref={container}/></div> }

function Header({language,setLanguage,onHome}:{language:"en"|"hi";setLanguage:(l:"en"|"hi")=>void;onHome?:()=>void}) { const hi=language==="hi"; return <header className="siteHeader"><button className="brand brandButton" onClick={onHome} aria-label="JanSetu home"><span className="brandMark">ज</span><span>JanSetu <small>जनसेतु</small></span></button><div className="headerRight"><span className="demoChip">DEMO SERVICE</span><button className="languageButton" onClick={()=>setLanguage(hi?"en":"hi")}>अ / A&nbsp;&nbsp; {hi?"English":"हिन्दी"}</button></div></header> }
function Journey({progress,language}:{progress:number;language:"en"|"hi"}) { const labels=language==="hi"?["समस्या बताएँ","जाँचें","स्थिति देखें","पुष्टि करें"]:["Describe","Review","Track","Confirm"]; return <nav className="journey" aria-label="Grievance journey">{labels.map((label,i)=><span key={label} className={i<=progress?"active":""}><b>{i<progress?"✓":i+1}</b><em>{label}</em>{i<3&&<i />}</span>)}</nav> }

function Describe({t,hi,description,setDescription,loading,prepare,startVoice,listening,voiceLanguage,setVoiceLanguage,gpsLocation,locating,getGpsLocation,files,setFiles,fileRef}:{t:typeof copy.en;hi:boolean;description:string;setDescription:(v:string)=>void;loading:boolean;prepare:()=>void;startVoice:()=>void;listening:boolean;voiceLanguage:string;setVoiceLanguage:(v:string)=>void;gpsLocation:GpsLocation|null;locating:boolean;getGpsLocation:()=>void;files:string[];setFiles:(v:string[])=>void;fileRef:React.RefObject<HTMLInputElement|null>}) { return <div className="contentGrid"><section className="formCard"><div className="stepLabel">STEP 1 OF 4</div><h2>{t.what}</h2><p className="muted">{t.natural}</p><div className="voicePanel"><div className="voicePanelTop"><div><span className={`micOrb ${listening?"active":""}`}>●</span><div><b>{listening?(hi?"सुन रहा है—अब बोलिए":"Listening—speak now"):(hi?"अपनी भाषा में बोलें":"Speak in your language")}</b><small>{listening?"Tap stop when you finish":"Your speech appears in the box below"}</small></div></div><button className={listening?"stopVoice":"startVoice"} onClick={startVoice}>{listening?"■ Stop":"🎙 Start voice"}</button></div><label htmlFor="voice-language">Voice language</label><select id="voice-language" value={voiceLanguage} onChange={e=>setVoiceLanguage(e.target.value)} disabled={listening}>{voiceLanguages.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><p>Choose any listed language, or “Auto” to use your device language.</p></div><label htmlFor="issue">{hi?"अपनी समस्या बताएँ":"Describe your problem"}</label><textarea id="issue" value={description} onChange={e=>setDescription(e.target.value)} maxLength={2000} placeholder={t.placeholder}/><div className="textareaMeta"><span className={listening?"recordingStatus":""}>● {listening?"Live transcription active":"Voice ready"}</span><span>{description.length} / 2,000</span></div><div className="locationPanel"><span className="locationPin">⌖</span><div><b>{gpsLocation?"Current location added":"Add your current location"}</b><p>{gpsLocation?gpsLocation.label:"Uses GPS once. You review it before submitting."}</p></div><button className="secondary smallButton" onClick={getGpsLocation} disabled={locating}>{locating?"Locating…":gpsLocation?"Refresh GPS":"Use my GPS"}</button></div><div className="uploadZone" onClick={()=>fileRef.current?.click()}><input ref={fileRef} type="file" multiple accept="image/*,.pdf" onChange={e=>setFiles(Array.from(e.target.files??[]).map(f=>f.name))}/><span>＋</span><div><b>{hi?"फोटो या दस्तावेज़ जोड़ें (वैकल्पिक)":"Add photos or documents (optional)"}</b><p>{files.length?files.join(", "):"Photos, PDF · shown in this demo only"}</p></div></div><div className="tip"><span>i</span><p><b>{hi?"बेहतर शिकायत के लिए":"For a stronger complaint"}</b><br/>{hi?"जगह, तारीख और समस्या कब शुरू हुई, यह बताएँ।":"Include your location, when it started, and how it affects you."}</p></div><button className="primary" disabled={loading} onClick={prepare}>{loading?(hi?"तैयार हो रही है...":"Organising your words..."):t.prepare}<span>{loading?"✦":"→"}</span></button><p className="aiNote">✦ AI organises your words. You review and edit everything before sending.</p><p className="savedNote">✓ {t.saved}</p></section><Nearby hi={hi}/></div> }
function Nearby({hi}:{hi:boolean}) { return <aside><section className="nearbyCard"><div className="cardTop"><span>⌖</span><div><h3>{hi?"आपके आस-पास":"Happening near you"}</h3><p>{hi?"आप अकेले नहीं हैं":"You’re not the only one"}</p></div><b>DEMO DATA</b></div><div className="mapDots"><span/><span/><span/><span/></div><ul><li><span className="category water">Water</span><strong>No water supply for 3 days</strong><small>Shastri Nagar · 0.8 km · 12 similar</small></li><li><span className="category road">Roads</span><strong>Dangerous pothole near school</strong><small>Rajendra Place · 1.2 km · 8 similar</small></li><li><span className="category waste">Waste</span><strong>Garbage not collected this week</strong><small>Karol Bagh · 1.7 km · 6 similar</small></li></ul><p className="privacy">◉ Your exact location is never shown publicly.</p></section><section className="helpCard"><span>☎</span><div><b>{hi?"लिखने में मदद चाहिए?":"Need help filing?"}</b><p>Demo support line: 1800-000-000</p></div></section></aside> }
function Review({analysis,setAnalysis,back,submit,t}:{analysis:Analysis;setAnalysis:(a:Analysis)=>void;back:()=>void;submit:()=>void;t:typeof copy.en}) { return <section className="singleCard"><div className="reviewBanner"><span>✦</span><div><b>We found the right route</b><p>{analysis.source==="openai"?"Classified by OpenAI · Please confirm":"Demo AI result · Add an API key to use live OpenAI classification"}</p></div><em>AI ASSISTED</em></div><div className="reviewFields"><div><label>Department</label><p>{analysis.department}</p></div><div><label>Category</label><p>{analysis.category}</p></div><div><label>Location</label><input value={analysis.location} onChange={e=>setAnalysis({...analysis,location:e.target.value})}/></div><div><label>Issue type</label><p>{analysis.issueType}</p></div></div><label htmlFor="summary">Your grievance summary</label><textarea id="summary" className="summaryBox" value={analysis.summary} onChange={e=>setAnalysis({...analysis,summary:e.target.value})}/><div className="humanCheck">✓ Nothing is sent until you press “Submit grievance.” Check names, dates and location carefully.</div><div className="buttonRow"><button className="secondary" onClick={back}>← {t.edit}</button><button className="primary compact" onClick={submit}>{t.submit}<span>→</span></button></div></section> }
function Track({analysis,stage,advance,grievanceId,isAppeal,onConfirm,t}:{analysis:Analysis;stage:number;advance:()=>void;grievanceId:string;isAppeal:boolean;onConfirm:()=>void;t:typeof copy.en}) { const shown=isAppeal?2:stage; return <div className="trackGrid"><section className="timelineCard"><div className="caseHeader"><div><span>{isAppeal?"APPEAL":"GRIEVANCE"} ID</span><h2>{isAppeal?"AP-JS-2026-1047":grievanceId}</h2></div><button onClick={()=>window.print()}>⇩ Save receipt</button></div>{isAppeal&&<div className="escalationBanner"><b>Appeal accepted</b><p>Escalation officer Anil Menon must review this separately from the original decision.</p></div>}<div className="timeline">{stages.map((s,i)=><div className={`timelineItem ${i<shown?"done":i===shown?"current":"future"}`} key={s.title}><span className="timelineDot">{i<shown?"✓":i+1}</span><div><div className="stageLine"><h3>{s.title}</h3>{i<=shown&&<time>{i===0?"28 Aug, 10:47 AM":i===1?"28 Aug, 11:12 AM":i===2?"29 Aug, 9:25 AM":i===3?"30 Aug, 3:40 PM":"31 Aug, 4:15 PM"}</time>}</div><p>{i<=shown?s.detail:"This update has not happened yet."}</p><em>Expected: {s.sla}</em></div></div>)}</div><div className="demoControl"><span>DEMO CONTROL</span><p>Judges can advance the mock case to show the full lifecycle.</p>{shown<4?<button className="primary compact" onClick={advance}>{t.next}<span>→</span></button>:<button className="primary compact" onClick={onConfirm}>Confirm resolution<span>→</span></button>}</div></section><aside className="caseAside"><section className="officerCard"><span>ASSIGNED OFFICER · DEMO DATA</span><div className="officer"><b>PS</b><div><h3>{isAppeal?"Anil Menon":"Priya Sharma"}</h3><p>{isAppeal?"Escalation Officer":"Assistant Engineer"}</p></div></div><p className="contactRule">For privacy, contact stays inside JanSetu.</p></section><section className="caseSummary"><span>YOUR COMPLAINT</span><h3>{analysis.category}</h3><p>{analysis.summary}</p><dl><div><dt>Department</dt><dd>{analysis.department}</dd></div><div><dt>Location</dt><dd>{analysis.location}</dd></div></dl></section><section className="slaCard"><b>◷ SLA promise</b><p>If the deadline is missed, you’ll see an escalation button here automatically.</p></section></aside></div> }
function Confirm({grievanceId,yes,no,t}:{grievanceId:string;yes:()=>void;no:()=>void;t:typeof copy.en}) { return <section className="confirmCard"><span className="bigCheck">✓</span><p className="caseRef">CASE {grievanceId} · DEMO DATA</p><h2>The department marked this resolved</h2><div className="resolutionNote"><span>ACTION REPORTED</span><p>“Field team inspected the supply line and cleared a blockage near the community centre. Water supply was restored at 3:40 PM.”</p><small>Reported by officer Priya Sharma · 31 Aug, 4:15 PM</small></div><h3>Is your issue actually fixed?</h3><p>Your answer matters. We won’t close the case unless you say yes.</p><div className="choiceRow"><button className="yesButton" onClick={yes}><b>✓</b><span>{t.fixed}<small>Close this grievance</small></span></button><button className="noButton" onClick={no}><b>×</b><span>{t.notFixed}<small>Start a tracked appeal</small></span></button></div></section> }
function Appeal({reason,setReason,submit,back,t}:{reason:string;setReason:(v:string)=>void;submit:()=>void;back:()=>void;t:typeof copy.en}) { return <section className="singleCard appealCard"><div className="escalationPerson"><b>AM</b><div><span>NAMED ESCALATION OFFICER · DEMO DATA</span><h3>Anil Menon</h3><p>Deputy Director · Independent appeal review</p></div></div><label htmlFor="appeal">What is still wrong?</label><textarea id="appeal" value={reason} onChange={e=>setReason(e.target.value)} placeholder="Example: Water returned for one hour but stopped again the same evening..."/><div className="appealFacts"><b>Your appeal automatically includes:</b><span>✓ Original grievance and evidence</span><span>✓ Full status history</span><span>✓ Department’s resolution note</span></div><div className="buttonRow"><button className="secondary" onClick={back}>← {t.back}</button><button className="primary compact" onClick={submit}>{t.appeal}<span>→</span></button></div></section> }
function Closed({grievanceId,home}:{grievanceId:string;home:()=>void}) { return <section className="confirmCard closedCard"><span className="bigCheck">✓</span><p className="caseRef">CASE {grievanceId}</p><h2>Case closed with your confirmation</h2><p>Your feedback helps measure whether reported actions solve real problems—not just whether a file was moved.</p><div className="rating"><span>How easy was this process?</span><div><button>1</button><button>2</button><button>3</button><button>4</button><button>5</button></div><small>Very hard　　　　　　　　　Very easy</small></div><div className="buttonRow center"><button className="secondary" onClick={()=>window.print()}>⇩ Print receipt</button><button className="primary compact" onClick={home}>Return home</button></div></section> }
