"use client";

import { useMemo, useState } from "react";
import type { Dict } from "../i18n";
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
  IconLock,
  IconMail,
  IconMic,
  IconPhone,
  IconPin,
  IconPlus,
  IconSearch,
  IconSpark,
  IconUser,
} from "../icons";
import { calculateSla, type OfficerProfile } from "../lib/officerDirectory";
import { LodgeAppealModal } from "./LodgeAppealModal";

export type GrievanceRecord = {
  id: number | string;
  issueNumber: string;
  department: string;
  category: string;
  location: string;
  urgency: string;
  urgencyReason?: string;
  assignedOfficer?: string;
  officerName?: string;
  officerDesignation?: string;
  officerEmail?: string;
  officerPhone?: string;
  officerOffice?: string;
  appellateOfficerName?: string;
  appellateOfficerDesignation?: string;
  appellateOfficerEmail?: string;
  appellateOfficerPhone?: string;
  slaDeadline?: string;
  slaDays?: number;
  publicExplanation?: string;
  status: string;
  stage: number;
  createdAt: string;
  description?: string;
  journey?: Array<{
    title: string;
    detail: string;
    date: string;
    done: boolean;
    icon: string;
  }>;
};

export type AppealRecord = {
  id?: number | string;
  appealNumber: string;
  issueNumber?: string | null;
  category?: string | null;
  department?: string | null;
  grounds?: string;
  reason: string;
  status: string;
  stage?: number;
  officer?: string;
  officerDesignation?: string;
  officerEmail?: string;
  officerPhone?: string;
  officerOffice?: string;
  slaDeadline?: string;
  createdAt: string;
};

export type ActivityRecord = {
  id: number;
  action: string;
  detail: string;
  createdAt: string;
};

export type UserProfile = {
  id: number;
  email: string;
  fullName: string;
  gender?: string;
  address?: string;
  mobile?: string;
  digilockerVerified?: boolean;
};

type DashboardViewProps = {
  t: Dict;
  user: UserProfile | null;
  complaints: GrievanceRecord[];
  appeals: AppealRecord[];
  activityLogs: ActivityRecord[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onLodgeGrievance: () => void;
  onLodgePensionGrievance: () => void;
  onSignOut: () => void;
  onBackHome: () => void;
  onOpenSpeakAssistant?: () => void;
};

export function DashboardView({
  t,
  user,
  complaints,
  appeals,
  activityLogs,
  loading,
  error,
  onRefresh,
  onLodgeGrievance,
  onLodgePensionGrievance,
  onSignOut,
  onBackHome,
  onOpenSpeakAssistant,
}: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<
    "grievances" | "appeals" | "activity" | "profile"
  >("grievances");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Selected item for the details modal drawer
  const [selectedGrievance, setSelectedGrievance] = useState<GrievanceRecord | null>(null);
  const [selectedAppeal, setSelectedAppeal] = useState<AppealRecord | null>(null);

  // Appeal Modal State
  const [appealTarget, setAppealTarget] = useState<GrievanceRecord | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  // Statistics
  const totalGrievances = complaints.length;
  const pendingGrievances = complaints.filter(
    (c) => !["Resolved", "Closed", "Disposed"].includes(c.status),
  ).length;
  const closedGrievances = totalGrievances - pendingGrievances;

  const totalAppeals = appeals.length;
  const pendingAppeals = appeals.filter(
    (a) => !["Disposed", "Decision Issued", "Closed"].includes(a.status),
  ).length;
  const closedAppeals = totalAppeals - pendingAppeals;

  // Filtered Grievances
  const filteredGrievances = useMemo(() => {
    return complaints.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.issueNumber.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "pending" && !["Resolved", "Closed", "Disposed"].includes(c.status)) ||
        (statusFilter === "closed" && ["Resolved", "Closed", "Disposed"].includes(c.status));

      return matchesSearch && matchesStatus;
    });
  }, [complaints, searchQuery, statusFilter]);

  // Filtered Appeals
  const filteredAppeals = useMemo(() => {
    return appeals.filter((a) => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        a.appealNumber.toLowerCase().includes(q) ||
        (a.issueNumber || "").toLowerCase().includes(q) ||
        (a.department || "").toLowerCase().includes(q) ||
        (a.reason || "").toLowerCase().includes(q)
      );
    });
  }, [appeals, searchQuery]);

  function formatDate(iso: string) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  }

  function handlePrintDossier() {
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  return (
    <div className="deskContainer">
      {toastMessage && (
        <div className="toast" role="status">
          <span>✓</span>
          {toastMessage}
          <button onClick={() => setToastMessage("")} aria-label="Dismiss">
            <IconClose size={16} />
          </button>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="deskTopBar">
        <div className="deskBrand">
          <button onClick={onBackHome} className="deskBrandButton" title="Return to Portal Home">
            <AshokaChakra size={28} />
            <div>
              <b>CPGRAMS · JanSetu</b>
              <span>Centralized Public Grievance Redress And Monitoring System</span>
            </div>
          </button>
        </div>

        <div className="deskTopActions">
          {user && (
            <div className="userBadge">
              <IconUser size={16} />
              <span>
                Welcome, <b>{user.fullName || user.email}</b>
              </span>
              {user.digilockerVerified && (
                <span className="digiVerifiedTag" title="DigiLocker Verified Citizen">
                  <IconCheck size={12} /> DigiLocker Verified
                </span>
              )}
            </div>
          )}
          <button className="secondary compact" onClick={onBackHome}>
            <IconArrowLeft size={14} /> Portal Home
          </button>
          <button className="secondary compact" onClick={onSignOut}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <div className="deskMainLayout">
        {/* Left Navigation Sidebar */}
        <aside className="deskSidebar">
          <nav className="deskNav" role="tablist">
            <button
              className={`deskNavItem ${activeTab === "grievances" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("grievances");
                setSearchQuery("");
              }}
              role="tab"
              aria-selected={activeTab === "grievances"}
            >
              <IconGrid size={18} />
              <span>Grievance Dashboard</span>
              <span className="deskNavBadge">{totalGrievances}</span>
            </button>

            <button
              className={`deskNavItem ${activeTab === "appeals" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("appeals");
                setSearchQuery("");
              }}
              role="tab"
              aria-selected={activeTab === "appeals"}
            >
              <IconAlert size={18} />
              <span>Appeal Dashboard</span>
              <span className="deskNavBadge">{totalAppeals}</span>
            </button>

            <div className="deskNavDivider" />

            <button className="deskActionItem primaryAction" onClick={onLodgeGrievance}>
              <IconPlus size={16} />
              <span>Lodge Public Grievance</span>
            </button>

            <button className="deskActionItem secondaryAction" onClick={onLodgePensionGrievance}>
              <IconSpark size={16} />
              <span>Lodge Pension Grievance</span>
            </button>

            <div className="deskNavDivider" />

            <button
              className={`deskNavItem ${activeTab === "activity" ? "active" : ""}`}
              onClick={() => setActiveTab("activity")}
              role="tab"
              aria-selected={activeTab === "activity"}
            >
              <IconClock size={18} />
              <span>Account Activity</span>
            </button>

            <button
              className={`deskNavItem ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => setActiveTab("profile")}
              role="tab"
              aria-selected={activeTab === "profile"}
            >
              <IconUser size={18} />
              <span>Citizen Profile</span>
            </button>
          </nav>

          {/* Samadhan Didi Voice Banner in Sidebar */}
          <div className="deskVoiceBanner">
            <img
              src="https://pgportal.gov.in/Images/iconHome/logo.png"
              alt="CPGRAMS mascot"
              className="didiImg"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
            <div>
              <b>बोल कर शिकायत दर्ज करें</b>
              <p>Speak Your Grievance in 7 Indian Languages</p>
            </div>
            <button
              type="button"
              className="voiceBannerBtn"
              onClick={onOpenSpeakAssistant || onLodgeGrievance}
            >
              <IconMic size={14} /> Start Voice Intake
            </button>
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="deskContent">
          {/* TAB 1: GRIEVANCE DASHBOARD */}
          {activeTab === "grievances" && (
            <div className="deskTabContent">
              <div className="deskStatCardsGrid">
                <div className="deskStatCard orange">
                  <div className="statCardIcon">
                    <IconGrid size={24} />
                  </div>
                  <div className="statCardInfo">
                    <span className="statNumber">{totalGrievances}</span>
                    <span className="statLabel">Total Grievances Registered</span>
                  </div>
                </div>

                <div className="deskStatCard green">
                  <div className="statCardIcon">
                    <IconClock size={24} />
                  </div>
                  <div className="statCardInfo">
                    <span className="statNumber">{pendingGrievances}</span>
                    <span className="statLabel">Number of Grievances Pending</span>
                  </div>
                </div>

                <div className="deskStatCard red">
                  <div className="statCardIcon">
                    <IconCheck size={24} />
                  </div>
                  <div className="statCardInfo">
                    <span className="statNumber">{closedGrievances}</span>
                    <span className="statLabel">Number of Grievances Closed</span>
                  </div>
                </div>
              </div>

              {/* Grievance Table Card */}
              <div className="deskTableCard">
                <div className="deskTableHeader">
                  <div>
                    <h2>List of Registered Grievances</h2>
                    <p>Track progress, SLA deadlines, assigned officers, and lodge first appeals</p>
                  </div>
                  <button className="primary compact" onClick={onLodgeGrievance}>
                    <IconPlus size={14} /> Lodge New Grievance
                  </button>
                </div>

                {/* Search & Filter Bar */}
                <div className="deskTableToolbar">
                  <div className="toolbarSearch">
                    <IconSearch size={16} />
                    <input
                      type="text"
                      placeholder="Search by Registration No, Department, Subject..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")} className="clearSearch">
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="toolbarFilters">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="filterSelect"
                    >
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending Redressal</option>
                      <option value="closed">Closed / Resolved</option>
                    </select>
                  </div>
                </div>

                {/* Table */}
                {loading ? (
                  <div className="tableLoading">
                    <span>◌</span>
                    <p>Loading your grievances from CPGRAMS central repository...</p>
                  </div>
                ) : error ? (
                  <div className="tableError">
                    <span>!</span>
                    <p>{error}</p>
                    <button className="secondary compact" onClick={onRefresh}>
                      Retry
                    </button>
                  </div>
                ) : filteredGrievances.length === 0 ? (
                  <div className="tableEmpty">
                    <IconGrid size={32} />
                    <h3>No Grievances Found</h3>
                    <p>
                      {searchQuery
                        ? "No grievances match your search criteria."
                        : "You have not lodged any public grievances yet."}
                    </p>
                    <button className="primary compact" onClick={onLodgeGrievance}>
                      Lodge Your First Grievance
                    </button>
                  </div>
                ) : (
                  <div className="tableWrapper">
                    <table className="deskDataTable">
                      <thead>
                        <tr>
                          <th>Sn.</th>
                          <th>Registration Number</th>
                          <th>Received Date</th>
                          <th>Subject / Category</th>
                          <th>Department & Officer</th>
                          <th>SLA / Time Left</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredGrievances.slice(0, pageSize).map((g, index) => {
                          const sla = calculateSla(g.createdAt, g.urgency, g.slaDeadline);
                          const isClosed = ["Resolved", "Closed", "Disposed"].includes(g.status);
                          return (
                            <tr key={g.issueNumber} className="tableRow">
                              <td>{index + 1}</td>
                              <td>
                                <b className="issueLink" onClick={() => setSelectedGrievance(g)}>
                                  {g.issueNumber}
                                </b>
                                <span className={`urgencyTag ${g.urgency.toLowerCase()}`}>
                                  {g.urgency} Priority
                                </span>
                              </td>
                              <td>{formatDate(g.createdAt)}</td>
                              <td>
                                <b>{g.category}</b>
                                <small className="textDim ellipsis">
                                  {g.description || g.location}
                                </small>
                              </td>
                              <td>
                                <b>{g.department}</b>
                                <small className="officerSub">
                                  {g.officerName || g.assignedOfficer || "Grievance Officer"}
                                </small>
                              </td>
                              <td>
                                {isClosed ? (
                                  <span className="slaResolvedTag">Resolved within SLA</span>
                                ) : (
                                  <div className="slaCell">
                                    <span
                                      className={`slaBadge ${sla.isBreached ? "breached" : "active"}`}
                                      title={sla.publicAccountabilityNotice}
                                    >
                                      <IconClock size={12} />
                                      {sla.timeRemainingText}
                                    </span>
                                    <small>Due: {sla.slaFormattedDeadline}</small>
                                  </div>
                                )}
                              </td>
                              <td>
                                <span
                                  className={`statusPill ${
                                    isClosed
                                      ? "green"
                                      : sla.isBreached
                                        ? "amber"
                                        : "blue"
                                  }`}
                                >
                                  {g.status}
                                </span>
                              </td>
                              <td>
                                <div className="rowActions">
                                  <button
                                    className="secondary compact"
                                    onClick={() => setSelectedGrievance(g)}
                                    title="View Case Dossier"
                                  >
                                    View
                                  </button>
                                  <button
                                    className="actionAppealBtn compact"
                                    onClick={() => setAppealTarget(g)}
                                    title="Lodge First Appeal"
                                  >
                                    Appeal
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: APPEAL DASHBOARD */}
          {activeTab === "appeals" && (
            <div className="deskTabContent">
              <div className="deskStatCardsGrid">
                <div className="deskStatCard orange">
                  <div className="statCardIcon">
                    <IconAlert size={24} />
                  </div>
                  <div className="statCardInfo">
                    <span className="statNumber">{totalAppeals}</span>
                    <span className="statLabel">Total Appeals Lodged</span>
                  </div>
                </div>

                <div className="deskStatCard green">
                  <div className="statCardIcon">
                    <IconClock size={24} />
                  </div>
                  <div className="statCardInfo">
                    <span className="statNumber">{pendingAppeals}</span>
                    <span className="statLabel">Appeals Under Review</span>
                  </div>
                </div>

                <div className="deskStatCard red">
                  <div className="statCardIcon">
                    <IconCheck size={24} />
                  </div>
                  <div className="statCardInfo">
                    <span className="statNumber">{closedAppeals}</span>
                    <span className="statLabel">Appeals Disposed</span>
                  </div>
                </div>
              </div>

              <div className="deskTableCard">
                <div className="deskTableHeader">
                  <div>
                    <h2>List of Lodged Appeals</h2>
                    <p>First appeals reviewed by Appellate Authorities (Joint Secretary / Director level)</p>
                  </div>
                </div>

                {filteredAppeals.length === 0 ? (
                  <div className="tableEmpty">
                    <IconAlert size={32} />
                    <h3>No Appeals Registered</h3>
                    <p>
                      If any of your grievances were closed unsatisfactorily or exceeded the SLA
                      timeline, you can lodge an appeal from the Grievance Dashboard.
                    </p>
                    <button
                      className="secondary compact"
                      onClick={() => setActiveTab("grievances")}
                    >
                      Go to Grievances
                    </button>
                  </div>
                ) : (
                  <div className="tableWrapper">
                    <table className="deskDataTable">
                      <thead>
                        <tr>
                          <th>Sn.</th>
                          <th>Appeal Number</th>
                          <th>Original Grievance</th>
                          <th>Filing Date</th>
                          <th>Appellate Officer</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAppeals.map((a, index) => (
                          <tr key={a.appealNumber} className="tableRow">
                            <td>{index + 1}</td>
                            <td>
                              <b className="issueLink" onClick={() => setSelectedAppeal(a)}>
                                {a.appealNumber}
                              </b>
                            </td>
                            <td>
                              <b>{a.issueNumber || "—"}</b>
                              <small className="textDim">{a.department || a.category}</small>
                            </td>
                            <td>{formatDate(a.createdAt)}</td>
                            <td>
                              <b>{a.officer || "Appellate Authority"}</b>
                              <small className="officerSub">
                                {a.officerDesignation || "First Appellate Authority"}
                              </small>
                            </td>
                            <td>
                              <span className="statusPill amber">{a.status}</span>
                            </td>
                            <td>
                              <button
                                className="secondary compact"
                                onClick={() => setSelectedAppeal(a)}
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ACCOUNT ACTIVITY */}
          {activeTab === "activity" && (
            <div className="deskTabContent">
              <div className="deskTableCard">
                <div className="deskTableHeader">
                  <div>
                    <h2>Account Activity Audit Log</h2>
                    <p>Official record of all logins, submissions, and status modifications</p>
                  </div>
                </div>

                {activityLogs.length === 0 ? (
                  <div className="tableEmpty">
                    <IconClock size={32} />
                    <h3>No Activity Recorded Yet</h3>
                  </div>
                ) : (
                  <div className="tableWrapper">
                    <table className="deskDataTable">
                      <thead>
                        <tr>
                          <th>Date & Time</th>
                          <th>Action Performed</th>
                          <th>Activity Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activityLogs.map((log) => (
                          <tr key={log.id}>
                            <td>{formatDate(log.createdAt)}</td>
                            <td>
                              <span className="activityBadge">{log.action}</span>
                            </td>
                            <td>{log.detail || "System audit event logged"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CITIZEN PROFILE */}
          {activeTab === "profile" && user && (
            <div className="deskTabContent">
              <div className="deskTableCard">
                <div className="deskTableHeader">
                  <div>
                    <h2>Citizen Profile & Verified Credentials</h2>
                    <p>Manage your contact details and verified government identity</p>
                  </div>
                </div>

                <div className="profileDossier">
                  <div className="profileHeader">
                    <div className="profileAvatar">
                      <IconUser size={36} />
                    </div>
                    <div>
                      <h3>{user.fullName || "Citizen"}</h3>
                      <p>{user.email}</p>
                      {user.digilockerVerified ? (
                        <span className="digiVerifiedBadge">
                          <IconCheck size={14} /> DigiLocker Verified Citizen
                        </span>
                      ) : (
                        <span className="digiUnverifiedBadge">Unverified Profile</span>
                      )}
                    </div>
                  </div>

                  <div className="profileDetailsGrid">
                    <div className="profileField">
                      <label>Full Name</label>
                      <b>{user.fullName || "—"}</b>
                    </div>
                    <div className="profileField">
                      <label>Registered Email</label>
                      <b>{user.email || "—"}</b>
                    </div>
                    <div className="profileField">
                      <label>Mobile Number</label>
                      <b>{user.mobile || "—"}</b>
                    </div>
                    <div className="profileField">
                      <label>Gender</label>
                      <b>{user.gender || "—"}</b>
                    </div>
                    <div className="profileField wide">
                      <label>Residential Address</label>
                      <b>{user.address || "—"}</b>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: GRIEVANCE DETAIL DOSSIER */}
      {selectedGrievance && (
        <div className="modalBackdrop" role="dialog" aria-modal="true">
          <div className="modalCard modalExtraWide">
            <header className="modalHeader">
              <div>
                <span className="modalKicker">GRIEVANCE REDRESSAL DOSSIER</span>
                <h2>{selectedGrievance.issueNumber}</h2>
              </div>
              <button
                className="iconButton"
                onClick={() => setSelectedGrievance(null)}
                aria-label="Close"
              >
                <IconClose size={18} />
              </button>
            </header>

            <div className="modalBody dossierBody">
              {/* Top Details & Urgency Banner */}
              <div className="dossierTopGrid">
                <div className="dossierMeta">
                  <span className="metaLabel">Department / Ministry</span>
                  <b className="metaValue">{selectedGrievance.department}</b>
                </div>
                <div className="dossierMeta">
                  <span className="metaLabel">Subject / Category</span>
                  <b className="metaValue">{selectedGrievance.category}</b>
                </div>
                <div className="dossierMeta">
                  <span className="metaLabel">Grievance Location</span>
                  <b className="metaValue">{selectedGrievance.location}</b>
                </div>
                <div className="dossierMeta">
                  <span className="metaLabel">Registration Date</span>
                  <b className="metaValue">{formatDate(selectedGrievance.createdAt)}</b>
                </div>
              </div>

              {/* SLA & PUBLIC ACCOUNTABILITY BOX */}
              {(() => {
                const sla = calculateSla(
                  selectedGrievance.createdAt,
                  selectedGrievance.urgency,
                  selectedGrievance.slaDeadline,
                );
                return (
                  <div className={`slaDossierBanner ${sla.isBreached ? "breached" : "normal"}`}>
                    <div className="slaTop">
                      <div className="slaTitle">
                        <IconClock size={18} />
                        <b>
                          {sla.isBreached
                            ? "SLA REDRESSAL DEADLINE BREACHED"
                            : `Citizen Charter SLA Target: ${sla.slaDays} Days`}
                        </b>
                      </div>
                      <span className={`slaBadge ${sla.isBreached ? "breached" : "active"}`}>
                        {sla.timeRemainingText}
                      </span>
                    </div>

                    <div className="slaProgressTrack">
                      <div
                        className={`slaProgressBar ${sla.isBreached ? "breached" : ""}`}
                        style={{ width: `${sla.percentElapsed}%` }}
                      />
                    </div>

                    <p className="slaNoticeText">{sla.publicAccountabilityNotice}</p>

                    {sla.isBreached && (
                      <div className="breachActionNotice">
                        <IconAlert size={16} />
                        <div>
                          <b>Mandatory Departmental Accountability:</b>
                          <span>
                            Because the target date of <b>{sla.slaFormattedDeadline}</b> has
                            elapsed, the assigned officer must submit an official explanation to the
                            Higher Appellate Authority and issue a public statement on the redressal
                            delay. You may also lodge an immediate First Appeal.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* OVERLOOKING OFFICER CONTACT DOSSIER */}
              <div className="officerCardSection">
                <h3>
                  <IconUser size={18} /> Overlooking Officer & Department Oversight
                </h3>
                <div className="officerGrid">
                  <div className="officerCard primaryOfficer">
                    <span className="officerRoleBadge">Assigned Grievance Redress Officer</span>
                    <h4>{selectedGrievance.officerName || "Shri R. K. Sharma, IAS"}</h4>
                    <p className="officerDesig">
                      {selectedGrievance.officerDesignation ||
                        selectedGrievance.assignedOfficer ||
                        "Director & Nodal Grievance Officer"}
                    </p>
                    <div className="officerContactList">
                      <a
                        href={`mailto:${selectedGrievance.officerEmail || "nodal.grievance@gov.in"}`}
                        className="officerContactLink"
                      >
                        <IconMail size={14} />
                        {selectedGrievance.officerEmail || "nodal.grievance@gov.in"}
                      </a>
                      <a
                        href={`tel:${selectedGrievance.officerPhone || "+91-11-2338-4000"}`}
                        className="officerContactLink"
                      >
                        <IconPhone size={14} />
                        {selectedGrievance.officerPhone || "+91-11-2338-4000"}
                      </a>
                      <div className="officerOfficeLocation">
                        <IconPin size={14} />
                        <span>
                          {selectedGrievance.officerOffice ||
                            "Room 304, Shram Shakti Bhawan, Rafi Marg, New Delhi"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="officerCard appellateOfficer">
                    <span className="officerRoleBadge secondaryBadge">First Appellate Authority</span>
                    <h4>{selectedGrievance.appellateOfficerName || "Smt. Sunita Verma, IAS"}</h4>
                    <p className="officerDesig">
                      {selectedGrievance.appellateOfficerDesignation ||
                        "Joint Secretary & First Appellate Authority"}
                    </p>
                    <div className="officerContactList">
                      <a
                        href={`mailto:${selectedGrievance.appellateOfficerEmail || "appellate.authority@darpg.gov.in"}`}
                        className="officerContactLink"
                      >
                        <IconMail size={14} />
                        {selectedGrievance.appellateOfficerEmail ||
                          "appellate.authority@darpg.gov.in"}
                      </a>
                      <a
                        href={`tel:${selectedGrievance.appellateOfficerPhone || "+91-11-2338-9900"}`}
                        className="officerContactLink"
                      >
                        <IconPhone size={14} />
                        {selectedGrievance.appellateOfficerPhone || "+91-11-2338-9900"}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* TIMELINE OF REDRESSAL */}
              {selectedGrievance.journey && selectedGrievance.journey.length > 0 && (
                <div className="dossierTimelineSection">
                  <h3>
                    <IconClock size={18} /> Redressal Lifecycle Timeline
                  </h3>
                  <div className="amazonTimeline">
                    {selectedGrievance.journey.map((step, i) => (
                      <div
                        className={`amazonStep ${step.done ? "done" : "next"}`}
                        key={`${step.title}-${i}`}
                      >
                        <div className="amazonRail">
                          <span>{step.icon}</span>
                          {i < selectedGrievance.journey!.length - 1 && <i />}
                        </div>
                        <div className="amazonContent">
                          <div>
                            <h4>{step.title}</h4>
                            <time>{step.date}</time>
                          </div>
                          <p>{step.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ACTION FOOTER */}
              <div className="modalActions dossierFooter">
                <button type="button" className="secondary" onClick={handlePrintDossier}>
                  <IconDownload size={14} /> Print / Save Dossier
                </button>
                <button
                  type="button"
                  className="primary actionAppealBtn"
                  onClick={() => {
                    const target = selectedGrievance;
                    setSelectedGrievance(null);
                    setAppealTarget(target);
                  }}
                >
                  <IconAlert size={14} /> Lodge First Appeal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: APPEAL DETAIL MODAL */}
      {selectedAppeal && (
        <div className="modalBackdrop" role="dialog" aria-modal="true">
          <div className="modalCard">
            <header className="modalHeader">
              <div>
                <span className="modalKicker">FIRST APPEAL DOSSIER</span>
                <h2>{selectedAppeal.appealNumber}</h2>
              </div>
              <button
                className="iconButton"
                onClick={() => setSelectedAppeal(null)}
                aria-label="Close"
              >
                <IconClose size={18} />
              </button>
            </header>

            <div className="modalBody dossierBody">
              <div className="dossierTopGrid">
                <div className="dossierMeta">
                  <span className="metaLabel">Original Grievance</span>
                  <b className="metaValue">{selectedAppeal.issueNumber || "—"}</b>
                </div>
                <div className="dossierMeta">
                  <span className="metaLabel">Appellate Authority</span>
                  <b className="metaValue">{selectedAppeal.officer || "Appellate Authority"}</b>
                </div>
                <div className="dossierMeta">
                  <span className="metaLabel">Appeal Grounds</span>
                  <b className="metaValue">{selectedAppeal.grounds || "Unsatisfactory resolution"}</b>
                </div>
                <div className="dossierMeta">
                  <span className="metaLabel">Filing Date</span>
                  <b className="metaValue">{formatDate(selectedAppeal.createdAt)}</b>
                </div>
              </div>

              <div className="appealReasonBox">
                <label>Citizen's Grounds of Appeal & Statement:</label>
                <p>{selectedAppeal.reason}</p>
              </div>

              <div className="officerCard primaryOfficer" style={{ marginTop: "1rem" }}>
                <span className="officerRoleBadge">Appellate Officer Contact</span>
                <h4>{selectedAppeal.officer || "Smt. Sunita Verma, IAS"}</h4>
                <p className="officerDesig">
                  {selectedAppeal.officerDesignation || "Joint Secretary & First Appellate Authority"}
                </p>
                <div className="officerContactList">
                  <a
                    href={`mailto:${selectedAppeal.officerEmail || "appellate.authority@gov.in"}`}
                    className="officerContactLink"
                  >
                    <IconMail size={14} />
                    {selectedAppeal.officerEmail || "appellate.authority@gov.in"}
                  </a>
                  <a
                    href={`tel:${selectedAppeal.officerPhone || "+91-11-2338-9900"}`}
                    className="officerContactLink"
                  >
                    <IconPhone size={14} />
                    {selectedAppeal.officerPhone || "+91-11-2338-9900"}
                  </a>
                </div>
              </div>

              <div className="modalActions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setSelectedAppeal(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: LODGE APPEAL */}
      {appealTarget && (
        <LodgeAppealModal
          issueNumber={appealTarget.issueNumber}
          category={appealTarget.category}
          department={appealTarget.department}
          onClose={() => setAppealTarget(null)}
          onSuccess={(appealNumber) => {
            setAppealTarget(null);
            setToastMessage(`Appeal ${appealNumber} lodged successfully with the Appellate Authority!`);
            onRefresh();
            setActiveTab("appeals");
          }}
        />
      )}
    </div>
  );
}
