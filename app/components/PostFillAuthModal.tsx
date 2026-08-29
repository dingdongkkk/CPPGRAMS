"use client";

import { useState } from "react";
import { AshokaChakra, IconAlert, IconCheck, IconClose, IconLock, IconMail, IconSpark, IconUser } from "../icons";

type PostFillAuthModalProps = {
  filerName: string;
  onClose: () => void;
  onSuccess: (authenticatedName: string) => void;
};

export function PostFillAuthModal({
  filerName,
  onClose,
  onSuccess,
}: PostFillAuthModalProps) {
  const [tab, setTab] = useState<"digilocker" | "login" | "register">("digilocker");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register form state
  const [regName, setRegName] = useState(filerName || "");
  const [regEmail, setRegEmail] = useState("");
  const [regMobile, setRegMobile] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");

  async function handleDigiLockerAuth() {
    setLoading(true);
    setError("");
    try {
      // 1. Ensure human check cookie is present
      await fetch("/api/captcha/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "demo-token" }),
      });

      // 2. Authorize via DigiLocker
      const response = await fetch("/api/digilocker/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: "gov_session_" + Date.now() }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "DigiLocker verification could not complete");
      }
      onSuccess(data.profile?.name || filerName || "Verified Citizen");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Set human cookie if needed
      await fetch("/api/captcha/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "demo-token" }),
      });

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Invalid email or password");
      }
      onSuccess(data.user?.fullName || email.split("@")[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await fetch("/api/captcha/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "demo-token" }),
      });

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail.trim(),
          fullName: regName.trim(),
          mobile: regMobile.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not register account");
      }
      setOtpStep(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtpAndSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const verifyRes = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail.trim(), code: otp.trim() }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.ok) {
        throw new Error(verifyData.error || "Invalid OTP code");
      }

      if (regPassword) {
        await fetch("/api/auth/set-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: regEmail.trim(), password: regPassword }),
        });
      }

      // Automatically sign in
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail.trim(), password: regPassword }),
      });
      const loginData = await loginRes.json();
      onSuccess(loginData.user?.fullName || regName || "Citizen");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true">
      <div className="modalCard">
        <header className="modalHeader">
          <div className="authBrand">
            <AshokaChakra size={22} />
            <div>
              <span className="modalKicker">GOVERNMENT OF INDIA</span>
              <h2>Verify Identity to Submit</h2>
            </div>
          </div>
          <button className="iconButton" onClick={onClose} aria-label="Close">
            <IconClose size={18} />
          </button>
        </header>

        <div className="authTabSwitch" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "digilocker"}
            className={tab === "digilocker" ? "active" : ""}
            onClick={() => {
              setTab("digilocker");
              setError("");
            }}
          >
            <IconSpark size={14} />
            DigiLocker (Fastest)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "login"}
            className={tab === "login" ? "active" : ""}
            onClick={() => {
              setTab("login");
              setError("");
            }}
          >
            <IconLock size={14} />
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "register"}
            className={tab === "register" ? "active" : ""}
            onClick={() => {
              setTab("register");
              setError("");
            }}
          >
            <IconUser size={14} />
            New Account
          </button>
        </div>

        <div className="modalBody">
          <div className="draftPreservedBanner">
            <IconCheck size={16} />
            <span>Your complaint draft is safely saved and ready for immediate filing upon verification.</span>
          </div>

          {error && <div className="authError">{error}</div>}

          {/* TAB 1: DIGILOCKER VERIFICATION */}
          {tab === "digilocker" && (
            <div className="digilockerAuthPanel">
              <div className="digiCard">
                <img
                  src="https://img1.digitallocker.gov.in/assets/img/digilocker_logo.png"
                  alt="DigiLocker Logo"
                  className="digiLogo"
                  onError={(e) => {
                    // Fallback text if external image fails
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <h3>One-Click DigiLocker Verification</h3>
                <p>
                  Verify your citizen identity instantly using DigiLocker. Government guidelines
                  require authentic citizen identity to prevent spam grievances and guarantee official
                  time-bound resolution.
                </p>
                <ul className="digiBenefits">
                  <li>✓ Instant masked Aadhaar e-KYC</li>
                  <li>✓ Official name & address auto-attached</li>
                  <li>✓ Time-bound grievance tracking guaranteed</li>
                </ul>
                <button
                  type="button"
                  className="primary digiCta"
                  onClick={handleDigiLockerAuth}
                  disabled={loading}
                >
                  <IconSpark size={16} />
                  {loading ? "Verifying with DigiLocker..." : "Verify with DigiLocker & Submit"}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PORTAL LOGIN */}
          {tab === "login" && (
            <form onSubmit={handleLogin} className="authForm">
              <label className="formField">
                <span>Registered Email / Mobile ID *</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </label>

              <label className="formField">
                <span>Password *</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </label>

              <div className="modalActions">
                <button type="button" className="secondary" onClick={onClose} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={loading}>
                  {loading ? "Signing In & Submitting..." : "Sign In & Submit Grievance"}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: REGISTER */}
          {tab === "register" && !otpStep && (
            <form onSubmit={handleRegisterRequest} className="authForm">
              <label className="formField">
                <span>Full Name *</span>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Your official name"
                  required
                />
              </label>

              <label className="formField">
                <span>Email Address *</span>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="citizen@example.com"
                  required
                />
              </label>

              <label className="formField">
                <span>Mobile Number (Optional)</span>
                <input
                  type="tel"
                  value={regMobile}
                  onChange={(e) => setRegMobile(e.target.value)}
                  placeholder="10-digit mobile number"
                />
              </label>

              <label className="formField">
                <span>Create Password (Min 8 chars, letter + number) *</span>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Create a secure password"
                  minLength={8}
                  required
                />
              </label>

              <div className="modalActions">
                <button type="button" className="secondary" onClick={onClose} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={loading}>
                  {loading ? "Sending OTP..." : "Get OTP Verification Code"}
                </button>
              </div>
            </form>
          )}

          {tab === "register" && otpStep && (
            <form onSubmit={handleVerifyOtpAndSetPassword} className="authForm">
              <div className="otpNotice">
                <IconMail size={16} />
                <p>
                  A 6-digit OTP has been dispatched to <b>{regEmail}</b>. Enter it below to complete
                  registration and file your grievance.
                </p>
              </div>

              <label className="formField">
                <span>Enter 6-Digit OTP Code *</span>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  required
                  style={{ letterSpacing: "4px", fontSize: "1.2rem", textAlign: "center" }}
                />
              </label>

              <div className="modalActions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setOtpStep(false)}
                  disabled={loading}
                >
                  Back
                </button>
                <button type="submit" className="primary" disabled={loading || otp.length !== 6}>
                  {loading ? "Verifying & Filing..." : "Verify OTP & Submit Grievance"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
