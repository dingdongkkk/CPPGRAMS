"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { DEMO_PERSONAS, DigiCitizenProfile, DigiDocument } from "./data";
import "./digilocker.css";

type AuthStep = "signin" | "otp" | "consent" | "sync";

export default function DigiLockerSimulatorPage() {
  const [step, setStep] = useState<AuthStep>("signin");
  const [tab, setTab] = useState<"demo" | "custom">("demo");
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("persona-aarav");
  const [returnTo, setReturnTo] = useState<string>("/");
  const [isPending, startTransition] = useTransition();

  // Custom Form State
  const [customName, setCustomName] = useState("Vikram Malhotra");
  const [customAadhaar, setCustomAadhaar] = useState("8921-4402-1928");
  const [customGender, setCustomGender] = useState<"Male" | "Female" | "Other">("Male");
  const [customDob, setCustomDob] = useState("1990-08-15");
  const [customAge, setCustomAge] = useState(34);
  const [customMobile, setCustomMobile] = useState("+91 98200-XXXX5");
  const [customEmail, setCustomEmail] = useState("vikram.m@domain.in");
  const [customAddress, setCustomAddress] = useState("Flat 104, Sunrise Heights, MG Road");
  const [customLocality, setCustomLocality] = useState("MG Road Area");
  const [customDistrict, setCustomDistrict] = useState("Bengaluru Urban");
  const [customState, setCustomState] = useState("Karnataka");
  const [customPincode, setCustomPincode] = useState("560001");
  const [customIncludePan, setCustomIncludePan] = useState(true);
  const [customIncludeDl, setCustomIncludeDl] = useState(true);

  // Sign In inputs
  const [identifierInput, setIdentifierInput] = useState("XXXX-XXXX-4819");
  const [pinInput, setPinInput] = useState("123456");
  const [showPin, setShowPin] = useState(false);
  const [signInError, setSignInError] = useState("");

  // OTP State
  const [otp, setOtp] = useState(["8", "4", "9", "2", "0", "1"]);
  const [otpCountdown, setOtpCountdown] = useState(30);
  const [otpError, setOtpError] = useState("");
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Sync Animation State
  const [syncStepIndex, setSyncStepIndex] = useState(0);

  // Read return_to from search params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ret = params.get("return_to") || "/";
      setReturnTo(ret);
    }
  }, []);

  // Sync identifier input when persona selection changes
  useEffect(() => {
    if (tab === "demo") {
      const p = DEMO_PERSONAS.find((x) => x.id === selectedPersonaId);
      if (p) {
        setIdentifierInput(p.aadhaarMasked);
      }
    } else {
      setIdentifierInput(customAadhaar);
    }
  }, [tab, selectedPersonaId, customAadhaar]);

  // OTP Timer countdown
  useEffect(() => {
    if (step !== "otp") return;
    const timer = setInterval(() => {
      setOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  function getActiveProfile(): DigiCitizenProfile {
    if (tab === "demo") {
      const match = DEMO_PERSONAS.find((p) => p.id === selectedPersonaId);
      return match || DEMO_PERSONAS[0];
    }

    const docs: DigiDocument[] = [
      {
        id: "custom-adhr",
        name: "Aadhaar Card (e-KYC)",
        docType: "AADHAAR",
        docNumber: customAadhaar,
        issuer: "Unique Identification Authority of India (UIDAI)",
        issueDate: "01-Jan-2018",
        status: "VERIFIED",
        uri: "in.gov.uidai:adhr:custom",
        details: {
          "Full Name": customName,
          "Date of Birth": customDob,
          "Gender": customGender,
          "Address": `${customAddress}, ${customLocality}, ${customDistrict}, ${customState} - ${customPincode}`,
          "Authentication": "UIDAI Simulated e-KYC Verified",
        },
      },
    ];

    if (customIncludePan) {
      docs.push({
        id: "custom-pan",
        name: "PAN Verification Record",
        docType: "PAN",
        docNumber: "ABCDE" + Math.floor(1000 + Math.random() * 9000) + "Z",
        issuer: "Income Tax Department",
        issueDate: "10-Jul-2019",
        status: "VERIFIED",
        uri: "in.gov.incometax:pan:custom",
        details: {
          PAN: "ABCDE" + Math.floor(1000 + Math.random() * 9000) + "Z",
          "Name on Card": customName.toUpperCase(),
          Status: "Active & Seeded",
        },
      });
    }

    if (customIncludeDl) {
      docs.push({
        id: "custom-dl",
        name: "Driving Licence",
        docType: "DL",
        docNumber: `KA-01201900${Math.floor(1000 + Math.random() * 9000)}`,
        issuer: "Transport Department, Govt of Karnataka",
        issueDate: "14-Feb-2019",
        status: "VERIFIED",
        uri: "in.gov.morth:dl:custom",
        details: {
          "Licence No": `KA-01201900${Math.floor(1000 + Math.random() * 9000)}`,
          "Vehicle Class": "LMV / MCWG",
          "Valid Upto": "14-Aug-2039",
        },
      });
    }

    return {
      id: "custom-profile-" + Date.now(),
      name: customName,
      aadhaarMasked: customAadhaar,
      gender: customGender,
      dob: customDob,
      age: customAge,
      mobileMasked: customMobile,
      email: customEmail,
      address: customAddress,
      locality: customLocality,
      district: customDistrict,
      state: customState,
      pincode: customPincode,
      photoAvatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(customName)}`,
      documents: docs,
    };
  }

  function handleSignInSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifierInput.trim()) {
      setSignInError("Please enter your Aadhaar / Mobile number.");
      return;
    }
    if (pinInput.length !== 6) {
      setSignInError("Please enter your 6-digit Security PIN.");
      return;
    }
    setSignInError("");
    setStep("otp");
    // Generate a fresh random 6-digit OTP
    const genOtp = String(Math.floor(100000 + Math.random() * 900000)).split("");
    setOtp(genOtp);
    setOtpCountdown(30);
  }

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const nextOtp = [...otp];
    nextOtp[index] = value.slice(-1);
    setOtp(nextOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    const entered = otp.join("");
    if (entered.length < 6) {
      setOtpError("Please enter all 6 digits of the OTP.");
      return;
    }
    setOtpError("");
    setStep("consent");
  }

  function handleQuickFillOtp() {
    // Fill the generated OTP
    setOtpError("");
  }

  async function handleGrantConsent() {
    setStep("sync");
    const activeProfile = getActiveProfile();

    // Run animation steps
    setSyncStepIndex(0);
    await new Promise((r) => setTimeout(r, 650));
    setSyncStepIndex(1);
    await new Promise((r) => setTimeout(r, 700));
    setSyncStepIndex(2);
    await new Promise((r) => setTimeout(r, 700));
    setSyncStepIndex(3);
    await new Promise((r) => setTimeout(r, 600));

    // Submit authorization to backend
    try {
      const res = await fetch("/api/digilocker/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: activeProfile }),
      });

      if (!res.ok) throw new Error("Failed to authorize");

      // Save to localStorage as well for instant seamless client hydration
      localStorage.setItem("jansetu_digilocker_profile", JSON.stringify(activeProfile));
      localStorage.setItem("jansetu-account", activeProfile.name);

      // Redirect back to JanSetu with digilocker=verified flag
      startTransition(() => {
        const dest = new URL(returnTo, window.location.origin);
        dest.searchParams.set("digilocker", "verified");
        window.location.href = dest.toString();
      });
    } catch (err) {
      console.error("Authorization failed:", err);
      // Fallback redirect with verification parameter
      localStorage.setItem("jansetu_digilocker_profile", JSON.stringify(activeProfile));
      localStorage.setItem("jansetu-account", activeProfile.name);
      window.location.href = `${returnTo}?digilocker=verified`;
    }
  }

  function handleDenyConsent() {
    window.location.href = returnTo;
  }

  const currentProfile = getActiveProfile();

  return (
    <div className="dlPortal">
      {/* Official Government of India Top Ribbon */}
      <div className="dlGovBanner">
        <div className="dlGovLeft">
          <div className="dlGovFlag">
            <span />
            <span />
            <span />
          </div>
          <span>GOVERNMENT OF INDIA · MINISTRY OF ELECTRONICS & IT (MeitY)</span>
        </div>
        <div className="dlGovRight">
          <span>🔒 256-Bit SSL Encrypted</span>
          <span>Digital India Initiative</span>
        </div>
      </div>

      {/* Main Brand Header */}
      <header className="dlHeader">
        <div className="dlBrand">
          <div className="dlLogoEmblem">D</div>
          <div className="dlBrandText">
            <h1>
              Digi<span>Locker</span>
            </h1>
            <p>Towards Paperless Governance</p>
          </div>
        </div>
        <div className="dlHeaderBadge">
          <div className="meriPehchanBadge">
            <span>🛡️</span>
            <span>MeriPehchan Single Sign-On</span>
          </div>
          <span className="simBadge">SIMULATOR</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="dlMain">
        {/* Stepper Progress */}
        <div className="dlStepper">
          <div className={`dlStepItem ${step === "signin" ? "active" : "completed"}`}>
            <span className="dlStepNum">{step !== "signin" ? "✓" : "1"}</span>
            <span className="dlStepLabel">1. Identification</span>
          </div>
          <div
            className={`dlStepItem ${
              step === "otp" ? "active" : ["consent", "sync"].includes(step) ? "completed" : ""
            }`}
          >
            <span className="dlStepNum">{["consent", "sync"].includes(step) ? "✓" : "2"}</span>
            <span className="dlStepLabel">2. 2FA Security OTP</span>
          </div>
          <div
            className={`dlStepItem ${
              step === "consent" ? "active" : step === "sync" ? "completed" : ""
            }`}
          >
            <span className="dlStepNum">{step === "sync" ? "✓" : "3"}</span>
            <span className="dlStepLabel">3. JanSetu Consent</span>
          </div>
          <div className={`dlStepItem ${step === "sync" ? "active" : ""}`}>
            <span className="dlStepNum">4</span>
            <span className="dlStepLabel">4. e-KYC & Doc Sync</span>
          </div>
        </div>

        {/* STEP 1: SIGN IN */}
        {step === "signin" && (
          <section className="dlCard">
            <div className="dlCardHeader">
              <div>
                <h2>Sign In to your DigiLocker Account</h2>
                <p>Authenticate with Aadhaar e-KYC or choose a citizen persona</p>
              </div>
              <span style={{ fontSize: "24px" }}>🇮🇳</span>
            </div>
            <div className="dlCardBody">
              {/* Tab Selector */}
              <div className="dlTabs">
                <button
                  className={`dlTabBtn ${tab === "demo" ? "active" : ""}`}
                  onClick={() => setTab("demo")}
                  type="button"
                >
                  <span>👤</span> Choose Demo Citizen Persona
                </button>
                <button
                  className={`dlTabBtn ${tab === "custom" ? "active" : ""}`}
                  onClick={() => setTab("custom")}
                  type="button"
                >
                  <span>✍️</span> Enter Custom Details
                </button>
              </div>

              {tab === "demo" ? (
                <div>
                  <label className="dlLabel">Select a Citizen Profile to Simulate:</label>
                  <div className="dlPersonaGrid">
                    {DEMO_PERSONAS.map((persona) => {
                      const isSelected = selectedPersonaId === persona.id;
                      return (
                        <div
                          key={persona.id}
                          className={`dlPersonaCard ${isSelected ? "selected" : ""}`}
                          onClick={() => {
                            setSelectedPersonaId(persona.id);
                            setIdentifierInput(persona.aadhaarMasked);
                          }}
                        >
                          <div className="dlPersonaTop">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={persona.photoAvatar}
                              alt={persona.name}
                              className="dlPersonaAvatar"
                            />
                            <div className="dlPersonaMeta">
                              <b>{persona.name}</b>
                              <small>
                                {persona.age} Yrs · {persona.gender} · {persona.district},{" "}
                                {persona.state}
                              </small>
                            </div>
                          </div>
                          <div className="dlPersonaAadhaar">
                            <span>Aadhaar:</span>
                            <b>{persona.aadhaarMasked}</b>
                          </div>
                          <div className="dlPersonaDocs">
                            {persona.documents.map((d) => (
                              <span key={d.id} className="dlDocPill">
                                ✓ {d.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: "20px" }}>
                  <div className="dlFormRow">
                    <div className="dlFormGroup">
                      <label className="dlLabel">Full Legal Name</label>
                      <input
                        className="dlInput"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="e.g. Ramesh Chandra"
                      />
                    </div>
                    <div className="dlFormGroup">
                      <label className="dlLabel">Aadhaar Number (Masked)</label>
                      <input
                        className="dlInput"
                        value={customAadhaar}
                        onChange={(e) => setCustomAadhaar(e.target.value)}
                        placeholder="XXXX-XXXX-1234"
                      />
                    </div>
                  </div>

                  <div className="dlFormRow">
                    <div className="dlFormGroup">
                      <label className="dlLabel">Gender</label>
                      <select
                        className="dlSelect"
                        value={customGender}
                        onChange={(e) =>
                          setCustomGender(e.target.value as "Male" | "Female" | "Other")
                        }
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="dlFormGroup">
                      <label className="dlLabel">Date of Birth / Age</label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input
                          type="date"
                          className="dlInput"
                          value={customDob}
                          onChange={(e) => setCustomDob(e.target.value)}
                        />
                        <input
                          type="number"
                          className="dlInput"
                          style={{ width: "90px" }}
                          value={customAge}
                          onChange={(e) => setCustomAge(Number(e.target.value))}
                          placeholder="Age"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="dlFormRow">
                    <div className="dlFormGroup">
                      <label className="dlLabel">Residential Address</label>
                      <input
                        className="dlInput"
                        value={customAddress}
                        onChange={(e) => setCustomAddress(e.target.value)}
                        placeholder="House / Flat / Street"
                      />
                    </div>
                    <div className="dlFormGroup">
                      <label className="dlLabel">Locality / Tehsil</label>
                      <input
                        className="dlInput"
                        value={customLocality}
                        onChange={(e) => setCustomLocality(e.target.value)}
                        placeholder="Locality"
                      />
                    </div>
                  </div>

                  <div className="dlFormRow">
                    <div className="dlFormGroup">
                      <label className="dlLabel">District</label>
                      <input
                        className="dlInput"
                        value={customDistrict}
                        onChange={(e) => setCustomDistrict(e.target.value)}
                        placeholder="District"
                      />
                    </div>
                    <div className="dlFormGroup">
                      <label className="dlLabel">State</label>
                      <input
                        className="dlInput"
                        value={customState}
                        onChange={(e) => setCustomState(e.target.value)}
                        placeholder="State"
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: "10px", display: "flex", gap: "16px" }}>
                    <label style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <input
                        type="checkbox"
                        checked={customIncludePan}
                        onChange={(e) => setCustomIncludePan(e.target.checked)}
                      />
                      Include PAN Card Verification
                    </label>
                    <label style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <input
                        type="checkbox"
                        checked={customIncludeDl}
                        onChange={(e) => setCustomIncludeDl(e.target.checked)}
                      />
                      Include Driving Licence
                    </label>
                  </div>
                </div>
              )}

              {/* Login Form Inputs */}
              <form onSubmit={handleSignInSubmit} style={{ marginTop: "10px" }}>
                <div className="dlFormRow">
                  <div className="dlFormGroup">
                    <label className="dlLabel">Aadhaar / Mobile Number</label>
                    <input
                      className="dlInput"
                      value={identifierInput}
                      onChange={(e) => setIdentifierInput(e.target.value)}
                      placeholder="12-digit Aadhaar / 10-digit Mobile"
                    />
                  </div>
                  <div className="dlFormGroup">
                    <label className="dlLabel">6-digit Security PIN</label>
                    <div className="dlPinWrapper">
                      <input
                        type={showPin ? "text" : "password"}
                        maxLength={6}
                        className="dlInput"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        placeholder="••••••"
                      />
                      <button
                        type="button"
                        className="dlPinToggle"
                        onClick={() => setShowPin(!showPin)}
                      >
                        {showPin ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>
                </div>

                {signInError && (
                  <p style={{ color: "#dc2626", fontSize: "12px", margin: "4px 0 14px" }}>
                    ⚠️ {signInError}
                  </p>
                )}

                <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                  <button type="submit" className="dlBtnPrimary">
                    <span>🔐</span> Sign In & Proceed to OTP
                  </button>
                  <button
                    type="button"
                    className="dlBtnSecondary"
                    onClick={() => (window.location.href = returnTo)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* STEP 2: OTP VERIFICATION */}
        {step === "otp" && (
          <section className="dlCard">
            <div className="dlCardHeader">
              <div>
                <h2>Aadhaar 2FA OTP Verification</h2>
                <p>
                  Security code sent to registered mobile linked with Aadhaar ending in{" "}
                  <b>{currentProfile.aadhaarMasked.slice(-4)}</b>
                </p>
              </div>
              <span style={{ fontSize: "24px" }}>📱</span>
            </div>
            <div className="dlCardBody">
              {/* Simulated SMS Notification Banner */}
              <div className="dlSmsToast">
                <div className="dlSmsLeft">
                  <div className="dlSmsIcon">💬</div>
                  <div className="dlSmsText">
                    <b>Simulated SMS from UIDAI-GOV:</b>
                    <p>
                      Your OTP for DigiLocker identity verification is{" "}
                      <mark>{otp.join("")}</mark>. Valid for 10 minutes.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="dlSmsCopyBtn"
                  onClick={handleQuickFillOtp}
                >
                  Auto-Filled ✓
                </button>
              </div>

              <form onSubmit={handleOtpSubmit}>
                <label className="dlLabel" style={{ textAlign: "center", display: "block" }}>
                  Enter the 6-digit OTP:
                </label>

                <div className="dlOtpContainer">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className="dlOtpBox"
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    />
                  ))}
                </div>

                {otpError && (
                  <p style={{ color: "#dc2626", textAlign: "center", fontSize: "12.5px" }}>
                    ⚠️ {otpError}
                  </p>
                )}

                <div style={{ textAlign: "center", margin: "16px 0 24px", fontSize: "12px", color: "#64748b" }}>
                  {otpCountdown > 0 ? (
                    <span>Resend OTP in <b>{otpCountdown}s</b></span>
                  ) : (
                    <button
                      type="button"
                      style={{ background: "none", border: "none", color: "#0066cc", cursor: "pointer", fontWeight: 700 }}
                      onClick={() => {
                        const newOtp = String(Math.floor(100000 + Math.random() * 900000)).split("");
                        setOtp(newOtp);
                        setOtpCountdown(30);
                      }}
                    >
                      Resend OTP Now
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <button type="submit" className="dlBtnPrimary">
                    <span>✓</span> Verify OTP & Continue
                  </button>
                  <button
                    type="button"
                    className="dlBtnSecondary"
                    onClick={() => setStep("signin")}
                  >
                    Back
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* STEP 3: JANSETU CONSENT & PERMISSION */}
        {step === "consent" && (
          <section className="dlCard">
            <div className="dlCardHeader">
              <div>
                <h2>JanSetu (CPPGRAMS) Authorization Request</h2>
                <p>Digital Identity & Grievance Registration Consent</p>
              </div>
              <span style={{ fontSize: "24px" }}>🏛️</span>
            </div>
            <div className="dlCardBody">
              <div className="dlConsentHeader">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentProfile.photoAvatar}
                  alt={currentProfile.name}
                  className="dlConsentAvatar"
                />
                <div className="dlConsentUser">
                  <b>{currentProfile.name}</b>
                  <p>
                    Aadhaar: {currentProfile.aadhaarMasked} · {currentProfile.age} Yrs /{" "}
                    {currentProfile.gender}
                  </p>
                  <p style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    {currentProfile.address}, {currentProfile.district}, {currentProfile.state} -{" "}
                    {currentProfile.pincode}
                  </p>
                </div>
              </div>

              <div className="dlScopeBox">
                <h3>
                  <span>📋</span> Data Requested by JanSetu (CPPGRAMS Portal):
                </h3>
                <ul className="dlScopeList">
                  <li className="dlScopeItem">
                    <span className="dlScopeIcon">✓</span>
                    <div>
                      <b>Basic Profile & e-KYC:</b> Name, Age, Gender, Date of Birth, Masked Aadhaar
                      number.
                    </div>
                  </li>
                  <li className="dlScopeItem">
                    <span className="dlScopeIcon">✓</span>
                    <div>
                      <b>Residential Address:</b> Locality, Block/Tehsil, District ({currentProfile.district}), State ({currentProfile.state}) for localized grievance dispatch.
                    </div>
                  </li>
                  <li className="dlScopeItem">
                    <span className="dlScopeIcon">✓</span>
                    <div>
                      <b>Issued Documents Access ({currentProfile.documents.length} Records):</b>{" "}
                      {currentProfile.documents.map((d) => d.name).join(", ")}.
                    </div>
                  </li>
                </ul>
              </div>

              <p style={{ fontSize: "11.5px", color: "#64748b", lineHeight: 1.5, margin: "16px 0" }}>
                ℹ️ By clicking <b>Allow / Grant Consent</b>, you permit DigiLocker to share your
                cryptographically signed e-KYC profile with JanSetu strictly for filing and tracking
                government grievances under the National Redressal Framework.
              </p>

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  className="dlBtnPrimary"
                  onClick={handleGrantConsent}
                  disabled={isPending}
                >
                  <span>✓</span> Allow / Grant Consent
                </button>
                <button
                  type="button"
                  className="dlBtnSecondary"
                  onClick={handleDenyConsent}
                >
                  Deny / Cancel
                </button>
              </div>
            </div>
          </section>
        )}

        {/* STEP 4: e-KYC & DOC SYNC ANIMATION */}
        {step === "sync" && (
          <section className="dlCard">
            <div className="dlCardBody">
              <div className="dlSyncShell">
                <div className="dlSyncSpinner" />
                <h3>Synchronizing DigiLocker Identity...</h3>
                <p>Please wait while your verified records are securely retrieved</p>

                <div className="dlSyncSteps">
                  <div className={`dlSyncStep ${syncStepIndex >= 0 ? (syncStepIndex > 0 ? "done" : "active") : ""}`}>
                    <span className="dlSyncStepIcon">{syncStepIndex > 0 ? "✓" : "1"}</span>
                    <span>1. Authenticating with UIDAI Central Identity Repository</span>
                  </div>

                  <div className={`dlSyncStep ${syncStepIndex >= 1 ? (syncStepIndex > 1 ? "done" : "active") : ""}`}>
                    <span className="dlSyncStepIcon">{syncStepIndex > 1 ? "✓" : "2"}</span>
                    <span>2. Decrypting Aadhaar e-KYC and residential address payload</span>
                  </div>

                  <div className={`dlSyncStep ${syncStepIndex >= 2 ? (syncStepIndex > 2 ? "done" : "active") : ""}`}>
                    <span className="dlSyncStepIcon">{syncStepIndex > 2 ? "✓" : "3"}</span>
                    <span>3. Pulling issued documents from Ministry databases ({currentProfile.documents.length} verified records)</span>
                  </div>

                  <div className={`dlSyncStep ${syncStepIndex >= 3 ? "done" : ""}`}>
                    <span className="dlSyncStepIcon">{syncStepIndex >= 3 ? "✓" : "4"}</span>
                    <span>4. Signing cryptographic verification token & returning to JanSetu</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Government Standard Footer */}
      <footer className="dlFooter">
        <div className="dlFooterLinks">
          <Link href="/">JanSetu Home</Link>
          <a href="#help" onClick={(e) => e.preventDefault()}>About DigiLocker</a>
          <a href="#faq" onClick={(e) => e.preventDefault()}>FAQ</a>
          <a href="#terms" onClick={(e) => e.preventDefault()}>Terms of Service</a>
          <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
        </div>
        <p>© 2026 National e-Governance Division (NeGD) · Ministry of Electronics & IT, Government of India</p>
      </footer>
    </div>
  );
}
