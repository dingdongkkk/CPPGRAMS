"use client";

import { useState } from "react";
import { IconAlert, IconClose, IconSpark } from "../icons";

type LodgeAppealModalProps = {
  issueNumber: string;
  category: string;
  department: string;
  onClose: () => void;
  onSuccess: (appealNumber: string) => void;
};

const APPEAL_GROUNDS = [
  "Unsatisfactory Resolution / Incomplete Work",
  "Undue Delay / Mandatory SLA Timeline Breached",
  "Improper Closure Without Citizen Verification",
  "Lack of Field Inspection / Evidence Ignored",
  "Incorrect Departmental Routing",
  "Other Substantive Grounds",
];

export function LodgeAppealModal({
  issueNumber,
  category,
  department,
  onClose,
  onSuccess,
}: LodgeAppealModalProps) {
  const [grounds, setGrounds] = useState(APPEAL_GROUNDS[0]);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 10) {
      setError("Please provide at least 10 characters explaining why you are appealing.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueNumber,
          grounds,
          reason: reason.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.appeal) {
        throw new Error(data.error || "Failed to file appeal");
      }
      onSuccess(data.appeal.appealNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not file appeal");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true">
      <div className="modalCard modalWide">
        <header className="modalHeader">
          <div>
            <span className="modalKicker">FIRST APPELLATE AUTHORITY</span>
            <h2>Lodge Grievance Appeal</h2>
          </div>
          <button className="iconButton" onClick={onClose} aria-label="Close modal">
            <IconClose size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="modalBody appealModalBody">
          <div className="appealContextCard">
            <div className="appealContextRow">
              <span>Original Grievance:</span>
              <b>{issueNumber}</b>
            </div>
            <div className="appealContextRow">
              <span>Category / Subject:</span>
              <b>{category}</b>
            </div>
            <div className="appealContextRow">
              <span>Concerned Department:</span>
              <b>{department}</b>
            </div>
          </div>

          <div className="appealNotice">
            <IconAlert size={18} />
            <p>
              Under DARPG guidelines, you may lodge a First Appeal with the Appellate Authority if
              your grievance was closed unsatisfactorily or exceeded the mandatory SLA redressal
              timeline. The Appellate Authority is an independent Joint Secretary / Director level officer.
            </p>
          </div>

          {error && <div className="authError">{error}</div>}

          <label className="formField">
            <span>Grounds for Appeal *</span>
            <select value={grounds} onChange={(e) => setGrounds(e.target.value)}>
              {APPEAL_GROUNDS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>

          <label className="formField wide">
            <span>
              Detailed Reason / Statement of Facts *
              <small>Explain what remains unresolved and the specific relief requested</small>
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Provide specific details about why the officer's resolution is inadequate, missing facts, or remaining defects..."
              required
            />
            <small style={{ textAlign: "right", color: "var(--text-dim)" }}>
              {reason.length} / 2,000 characters
            </small>
          </label>

          <div className="modalActions">
            <button type="button" className="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={submitting}>
              {submitting ? "Submitting Appeal..." : "Submit First Appeal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
