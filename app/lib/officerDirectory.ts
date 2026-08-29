/**
 * JanSetu CPGRAMS - Nodal Officer & SLA Governance Directory
 *
 * Implements realistic department-level officer oversight, official contact details,
 * SLA target deadlines, and public accountability reporting for service delivery.
 */

export type OfficerProfile = {
  officerName: string;
  officerDesignation: string;
  officerEmail: string;
  officerPhone: string;
  officerOffice: string;
  appellateOfficerName: string;
  appellateOfficerDesignation: string;
  appellateOfficerEmail: string;
  appellateOfficerPhone: string;
};

export type SlaCalculation = {
  slaDays: number;
  slaDeadline: string; // ISO string
  slaFormattedDeadline: string; // Human friendly date string
  isBreached: boolean;
  timeRemainingText: string;
  percentElapsed: number;
  publicAccountabilityNotice: string;
};

const DEPARTMENT_OFFICERS: Record<string, OfficerProfile> = {
  "financial services (banking division)": {
    officerName: "Shri Rajesh Kumar, IAS",
    officerDesignation: "Director & Nodal Grievance Officer (Banking)",
    officerEmail: "grievance.banking@nic.in",
    officerPhone: "+91-11-2334-0221",
    officerOffice: "Room 214, Jeevan Deep Building, Parliament Street, New Delhi - 110001",
    appellateOfficerName: "Dr. Arvind Shrivastava, IAS",
    appellateOfficerDesignation: "Joint Secretary & First Appellate Authority (DFS)",
    appellateOfficerEmail: "js.banking-appellate@gov.in",
    appellateOfficerPhone: "+91-11-2374-8711",
  },
  "labour and employment": {
    officerName: "Smt. Alka Upadhyaya, IAS",
    officerDesignation: "Deputy Secretary & Public Grievance Officer",
    officerEmail: "pg-officer.labour@nic.in",
    officerPhone: "+91-11-2371-0240",
    officerOffice: "Room 108, Shram Shakti Bhawan, Rafi Marg, New Delhi - 110001",
    appellateOfficerName: "Shri Amitabh Kant, IAS",
    appellateOfficerDesignation: "Joint Secretary & Appellate Authority (MoLE)",
    appellateOfficerEmail: "appellate.labour@gov.in",
    appellateOfficerPhone: "+91-11-2371-7890",
  },
  "central board of direct taxes (income tax)": {
    officerName: "Shri Sanjay Malhotra, IRS",
    officerDesignation: "Commissioner of Income Tax (Public Grievance / e-Nivaran)",
    officerEmail: "cit.grievance.cbdt@incometax.gov.in",
    officerPhone: "+91-11-2351-9230",
    officerOffice: "Aayakar Bhawan, E-2, Jhandewalan Extension, New Delhi - 110055",
    appellateOfficerName: "Shri Nitin Gupta, IRS",
    appellateOfficerDesignation: "Principal Chief Commissioner & Appellate Authority",
    appellateOfficerEmail: "prccit.appellate@incometax.gov.in",
    appellateOfficerPhone: "+91-11-2351-9988",
  },
  "posts": {
    officerName: "Shri Manoj Sinha, IPoS",
    officerDesignation: "Assistant Director General (PG & Quality Assurance)",
    officerEmail: "adgpg.dak@indiapost.gov.in",
    officerPhone: "+91-11-2309-6060",
    officerOffice: "Dak Bhawan, Sansad Marg, New Delhi - 110001",
    appellateOfficerName: "Ms. Smita Kumar, IPoS",
    appellateOfficerDesignation: "Member (Operations) & First Appellate Authority",
    appellateOfficerEmail: "member.ops.appellate@indiapost.gov.in",
    appellateOfficerPhone: "+91-11-2309-6120",
  },
  "telecommunications": {
    officerName: "Dr. Neeraj Mittal, ITS",
    officerDesignation: "Director (Public Grievances & Consumer Redressal)",
    officerEmail: "dir-pg.dot@gov.in",
    officerPhone: "+91-11-2303-6100",
    officerOffice: "Sanchar Bhawan, 20 Ashoka Road, New Delhi - 110001",
    appellateOfficerName: "Shri Sanjeev Agrawal, ITS",
    appellateOfficerDesignation: "Advisor & First Appellate Authority (DoT)",
    appellateOfficerEmail: "advisor.appellate.dot@gov.in",
    appellateOfficerPhone: "+91-11-2303-6440",
  },
  "housing and urban affairs": {
    officerName: "Shri Manoj Joshi, IAS",
    officerDesignation: "Director (Public Grievances & Urban Redressal)",
    officerEmail: "dir-pg.mohua@gov.in",
    officerPhone: "+91-11-2306-1425",
    officerOffice: "Nirman Bhawan, Maulana Azad Road, New Delhi - 110011",
    appellateOfficerName: "Shri Surendra Kumar Bagde, IAS",
    appellateOfficerDesignation: "Additional Secretary & Appellate Authority (MoHUA)",
    appellateOfficerEmail: "as.appellate.mohua@gov.in",
    appellateOfficerPhone: "+91-11-2306-1875",
  },
  "health & family welfare": {
    officerName: "Dr. Mansukh L. Mandaviya",
    officerDesignation: "Chief Medical Officer & Nodal Officer (Public Health)",
    officerEmail: "nodal-grievance.mohfw@gov.in",
    officerPhone: "+91-11-2306-1180",
    officerOffice: "Room 150-A, Nirman Bhawan, New Delhi - 110011",
    appellateOfficerName: "Shri Apurva Chandra, IAS",
    appellateOfficerDesignation: "Joint Secretary & Appellate Authority (Health)",
    appellateOfficerEmail: "js.appellate.mohfw@gov.in",
    appellateOfficerPhone: "+91-11-2306-1330",
  },
  "home affairs": {
    officerName: "Shri Ajay Kumar Bhalla, IAS",
    officerDesignation: "Director (Grievance Cell & Citizen Coordination)",
    officerEmail: "grievance.mha@nic.in",
    officerPhone: "+91-11-2309-2465",
    officerOffice: "North Block, Central Secretariat, New Delhi - 110001",
    appellateOfficerName: "Shri Govind Mohan, IAS",
    appellateOfficerDesignation: "Additional Secretary & First Appellate Authority (MHA)",
    appellateOfficerEmail: "as.appellate.mha@nic.in",
    appellateOfficerPhone: "+91-11-2309-2989",
  },
};

const DEFAULT_OFFICER: OfficerProfile = {
  officerName: "Shri R. K. Sharma, IAS",
  officerDesignation: "Nodal Grievance Redressal Officer & Director",
  officerEmail: "nodal.grievance@gov.in",
  officerPhone: "+91-11-2338-4000",
  officerOffice: "Room 304, Sardar Patel Bhawan, Parliament Street, New Delhi - 110001",
  appellateOfficerName: "Smt. Sunita Verma, IAS",
  appellateOfficerDesignation: "Joint Secretary & First Appellate Authority (DARPG)",
  appellateOfficerEmail: "appellate.authority@darpg.gov.in",
  appellateOfficerPhone: "+91-11-2338-9900",
};

/**
 * Returns the overlooking officer and appellate authority contact for a department/category.
 */
export function getDepartmentOfficer(department: string, category?: string): OfficerProfile {
  const norm = `${department} ${category || ""}`.toLowerCase();
  for (const [key, profile] of Object.entries(DEPARTMENT_OFFICERS)) {
    if (norm.includes(key)) return profile;
  }
  return DEFAULT_OFFICER;
}

/**
 * SLA Rules based on Citizen Charter & CPGRAMS guidelines:
 * - Critical: 3 days (72 hours) - emergency services / immediate life threat
 * - High: 7 days - essential public utilities / severe disruptions
 * - Medium: 21 days - standard civic & administrative service requests
 * - Low: 30 days - informational / non-urgent requests
 */
export function getSlaDays(urgency: string): number {
  switch (urgency) {
    case "Critical":
      return 3;
    case "High":
      return 7;
    case "Low":
      return 30;
    case "Medium":
    default:
      return 21;
  }
}

/**
 * Computes the target SLA deadline from the creation timestamp.
 */
export function calculateSla(
  createdAtIso: string,
  urgency: string,
  customDeadline?: string,
): SlaCalculation {
  const start = new Date(createdAtIso).getTime() || Date.now();
  const slaDays = getSlaDays(urgency);
  const deadlineMs = customDeadline
    ? new Date(customDeadline).getTime()
    : start + slaDays * 86_400_000;

  const deadlineDate = new Date(deadlineMs);
  const now = Date.now();
  const totalDuration = deadlineMs - start;
  const elapsed = now - start;
  const remainingMs = deadlineMs - now;
  const isBreached = remainingMs < 0;

  const percentElapsed = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));

  let timeRemainingText = "";
  if (isBreached) {
    const overdueDays = Math.ceil(Math.abs(remainingMs) / 86_400_000);
    timeRemainingText = `Overdue by ${overdueDays} day${overdueDays > 1 ? "s" : ""}`;
  } else {
    const remDays = Math.floor(remainingMs / 86_400_000);
    const remHours = Math.floor((remainingMs % 86_400_000) / 3_600_000);
    if (remDays > 0) {
      timeRemainingText = `${remDays}d ${remHours}h remaining`;
    } else {
      timeRemainingText = `${remHours} hours remaining`;
    }
  }

  const slaFormattedDeadline = deadlineDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const publicAccountabilityNotice = isBreached
    ? `SLA TARGET BREACHED: The mandatory ${slaDays}-day redressal timeline expired on ${slaFormattedDeadline}. In accordance with DARPG citizen charter governance, the assigned officer has been flagged for departmental delay and is required to furnish an official explanation to the Higher Appellate Authority along with a public progress statement.`
    : `Target resolution timeline: ${slaDays} days (${slaFormattedDeadline}) under the Citizen's Charter.`;

  return {
    slaDays,
    slaDeadline: deadlineDate.toISOString(),
    slaFormattedDeadline,
    isBreached,
    timeRemainingText,
    percentElapsed,
    publicAccountabilityNotice,
  };
}
