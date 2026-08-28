type RouteResult = {
  department: string;
  category: string;
  issueType: string;
  state: string | null;
};

const stateAliases: Record<string, string[]> = {
  "Andhra Pradesh": [
    "andhra pradesh",
    "vijayawada",
    "visakhapatnam",
    "tirupati",
  ],
  "Arunachal Pradesh": ["arunachal pradesh", "itanagar"],
  Assam: ["assam", "guwahati", "dibrugarh"],
  Bihar: ["bihar", "patna", "gaya", "muzaffarpur", "bhagalpur", "darbhanga"],
  Chhattisgarh: ["chhattisgarh", "chattisgarh", "raipur", "bilaspur"],
  Goa: ["goa", "panaji", "margao"],
  Gujarat: ["gujarat", "ahmedabad", "surat", "vadodara", "rajkot"],
  Haryana: ["haryana", "gurugram", "gurgaon", "faridabad", "panipat"],
  "Himachal Pradesh": ["himachal pradesh", "shimla", "dharamshala"],
  Jharkhand: ["jharkhand", "ranchi", "jamshedpur", "dhanbad"],
  Karnataka: ["karnataka", "bengaluru", "bangalore", "mysuru", "mangalore"],
  Kerala: ["kerala", "thiruvananthapuram", "kochi", "kozhikode"],
  "Madhya Pradesh": [
    "madhya pradesh",
    "bhopal",
    "indore",
    "jabalpur",
    "gwalior",
  ],
  Maharashtra: ["maharashtra", "mumbai", "pune", "nagpur", "nashik"],
  Manipur: ["manipur", "imphal"],
  Meghalaya: ["meghalaya", "shillong"],
  Mizoram: ["mizoram", "aizawl"],
  Nagaland: ["nagaland", "kohima", "dimapur"],
  Odisha: ["odisha", "orissa", "bhubaneswar", "cuttack"],
  Punjab: ["punjab", "ludhiana", "amritsar", "jalandhar"],
  Rajasthan: ["rajasthan", "jaipur", "jodhpur", "udaipur", "kota"],
  Sikkim: ["sikkim", "gangtok"],
  "Tamil Nadu": ["tamil nadu", "chennai", "coimbatore", "madurai"],
  Telangana: ["telangana", "hyderabad", "warangal"],
  Tripura: ["tripura", "agartala"],
  "Uttar Pradesh": [
    "uttar pradesh",
    "lucknow",
    "kanpur",
    "varanasi",
    "agra",
    "noida",
    "prayagraj",
  ],
  Uttarakhand: ["uttarakhand", "dehradun", "haridwar", "haldwani"],
  "West Bengal": ["west bengal", "kolkata", "howrah", "siliguri"],
  Delhi: ["delhi", "new delhi"],
  "Jammu and Kashmir": ["jammu and kashmir", "j&k", "srinagar", "jammu"],
  Ladakh: ["ladakh", "leh", "kargil"],
  Chandigarh: ["chandigarh"],
  Puducherry: ["puducherry", "pondicherry"],
  "Andaman and Nicobar Islands": ["andaman", "nicobar", "port blair"],
  "Dadra and Nagar Haveli and Daman and Diu": [
    "dadra and nagar haveli",
    "daman",
    "diu",
  ],
  Lakshadweep: ["lakshadweep", "kavaratti"],
};

const centralRoutes: Array<{
  pattern: RegExp;
  department: string;
  category: string;
}> = [
  {
    pattern: /railway|train|irctc|station/,
    department: "Ministry of Railways",
    category: "Railways",
  },
  {
    pattern: /post office|postal|speed post|india post/,
    department: "Department of Posts",
    category: "Postal services",
  },
  {
    pattern: /telecom|mobile network|sim card|broadband/,
    department: "Department of Telecommunications",
    category: "Telecommunications",
  },
  {
    pattern: /passport|consular/,
    department: "Ministry of External Affairs",
    category: "Passport and consular services",
  },
  {
    pattern: /income tax|pan card|refund.*tax/,
    department: "Central Board of Direct Taxes (Income Tax)",
    category: "Income tax",
  },
  {
    pattern: /gst|customs|excise/,
    department: "Central Board of Indirect Taxes and Customs",
    category: "Indirect taxes and customs",
  },
  {
    pattern: /epfo|provident fund|uan/,
    department: "Employees' Provident Fund Organisation",
    category: "Provident fund",
  },
  {
    pattern: /bank|upi|atm|insurance/,
    department: "Department of Financial Services",
    category: "Banking and financial services",
  },
  {
    pattern: /lpg|gas cylinder|petrol|fuel/,
    department: "Ministry of Petroleum and Natural Gas",
    category: "Petroleum and LPG",
  },
  {
    pattern: /national highway|nh-?\d+|nhai/,
    department: "Ministry of Road Transport and Highways / NHAI",
    category: "National highways",
  },
  {
    pattern: /airport|airline|aviation/,
    department: "Ministry of Civil Aviation",
    category: "Civil aviation",
  },
];

const sectorRoutes: Array<{
  pattern: RegExp;
  category: string;
  department: (state: string) => string;
}> = [
  {
    pattern: /water|paani|पानी|pipeline|hand ?pump|drinking water/,
    category: "Water supply",
    department: (state) =>
      state === "Bihar"
        ? "Public Health Engineering Department, Government of Bihar"
        : state === "Delhi"
          ? "Delhi Jal Board, Government of NCT of Delhi"
          : `${state} Drinking Water / Public Health Engineering Department`,
  },
  {
    pattern: /sewer|drainage|sanitation|toilet/,
    category: "Sanitation and sewerage",
    department: (state) =>
      `${state} Urban Development / Local Government Department`,
  },
  {
    pattern: /garbage|waste|कचरा|rubbish|collection/,
    category: "Solid waste management",
    department: (state) => `${state} Urban Development / Municipal Local Body`,
  },
  {
    pattern: /electricity|power cut|transformer|meter|बिजली/,
    category: "Electricity supply",
    department: (state) => `${state} Energy / Power Department`,
  },
  {
    pattern: /road|pothole|street|सड़क|bridge/,
    category: "Roads and bridges",
    department: (state) => `${state} Public Works Department`,
  },
  {
    pattern: /police|fir|law and order|crime/,
    category: "Police and public safety",
    department: (state) => `${state} Home Department / State Police`,
  },
  {
    pattern: /hospital|health|doctor|medicine|ambulance/,
    category: "Public health services",
    department: (state) => `${state} Health and Family Welfare Department`,
  },
  {
    pattern: /school|teacher|education|scholarship|college/,
    category: "Education",
    department: (state) => `${state} Education Department`,
  },
  {
    pattern: /ration|pds|food grain|fair price/,
    category: "Public distribution system",
    department: (state) => `${state} Food and Civil Supplies Department`,
  },
  {
    pattern: /farmer|agriculture|crop|fertilizer|seed|mandi/,
    category: "Agriculture and farmer welfare",
    department: (state) => `${state} Agriculture Department`,
  },
  {
    pattern: /land record|mutation|registry|revenue|property/,
    category: "Land and revenue",
    department: (state) => `${state} Revenue and Land Reforms Department`,
  },
  {
    pattern: /bus|rto|driving licence|vehicle|transport/,
    category: "Transport services",
    department: (state) => `${state} Transport Department`,
  },
  {
    pattern: /pension|old age|disability|widow/,
    category: "Social security and pensions",
    department: (state) => `${state} Social Welfare Department`,
  },
  {
    pattern: /labour|wage|worker|employment/,
    category: "Labour and employment",
    department: (state) => `${state} Labour / Employment Department`,
  },
  {
    pattern: /panchayat|mnrega|rural development|village scheme/,
    category: "Rural development",
    department: (state) =>
      `${state} Rural Development / Panchayati Raj Department`,
  },
  {
    pattern: /housing|municipal|नगर निगम|नगर पालिका/,
    category: "Urban local services",
    department: (state) => `${state} Urban Development / Municipal Local Body`,
  },
];

export function routeGrievance(
  text: string,
  selectedState?: string,
): RouteResult {
  const lower = text.toLowerCase();
  const central = centralRoutes.find((route) => route.pattern.test(lower));
  if (central)
    return {
      department: central.department,
      category: central.category,
      issueType: central.category,
      state: null,
    };
  const detectedState =
    selectedState ||
    Object.entries(stateAliases).find(([, aliases]) =>
      aliases.some((alias) => lower.includes(alias)),
    )?.[0] ||
    null;
  if (!detectedState)
    return {
      department:
        "State/UT Public Grievance Nodal Authority — location confirmation required",
      category: "Civic services",
      issueType: "Public service delivery",
      state: null,
    };
  const sector = sectorRoutes.find((route) => route.pattern.test(lower));
  if (sector)
    return {
      department: sector.department(detectedState),
      category: sector.category,
      issueType: sector.category,
      state: detectedState,
    };
  return {
    department:
      detectedState === "Bihar"
        ? "General Administration Department (Public Grievances), Government of Bihar"
        : `${detectedState} State Public Grievance Nodal Authority`,
    category: "State public services",
    issueType: "Public service delivery",
    state: detectedState,
  };
}
