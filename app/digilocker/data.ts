export interface DigiDocument {
  id: string;
  name: string;
  docType: "AADHAAR" | "DL" | "PAN" | "RATION" | "EDUCATION" | "VEHICLE" | "VOTER";
  docNumber: string;
  issuer: string;
  issueDate: string;
  status: "VERIFIED";
  uri: string;
  details?: Record<string, string>;
}

export interface DigiCitizenProfile {
  id: string;
  aadhaarMasked: string;
  name: string;
  gender: "Male" | "Female" | "Other";
  dob: string;
  age: number;
  mobileMasked: string;
  email: string;
  address: string;
  locality: string;
  district: string;
  state: string;
  pincode: string;
  photoAvatar: string;
  documents: DigiDocument[];
  verifiedAt?: string;
}

export const DEMO_PERSONAS: DigiCitizenProfile[] = [
  {
    id: "persona-aarav",
    name: "Aarav Sharma",
    gender: "Male",
    dob: "14-May-1992",
    age: 32,
    aadhaarMasked: "XXXX-XXXX-4819",
    mobileMasked: "+91 98101-XXXX4",
    email: "aarav.sharma@govmail.in",
    address: "Flat 402, Block B, Sector 14, Rohini",
    locality: "Sector 14, Rohini",
    district: "North West Delhi",
    state: "Delhi",
    pincode: "110085",
    photoAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Aarav",
    documents: [
      {
        id: "doc-adhr-1",
        name: "Aadhaar Card (e-KYC)",
        docType: "AADHAAR",
        docNumber: "XXXX-XXXX-4819",
        issuer: "Unique Identification Authority of India (UIDAI)",
        issueDate: "12-Mar-2016",
        status: "VERIFIED",
        uri: "in.gov.uidai:adhr:4819",
        details: {
          "Full Name": "Aarav Sharma",
          "Date of Birth": "14/05/1992",
          "Gender": "Male",
          "Address": "Flat 402, Block B, Sector 14, Rohini, North West Delhi, Delhi - 110085",
          "Authentication": "Biometric / OTP e-KYC Verified"
        }
      },
      {
        id: "doc-dl-1",
        name: "Driving Licence",
        docType: "DL",
        docNumber: "DL-0420180092144",
        issuer: "Ministry of Road Transport and Highways (MoRTH)",
        issueDate: "04-Jun-2018",
        status: "VERIFIED",
        uri: "in.gov.morth:dl:DL0420180092144",
        details: {
          "Licence No": "DL-0420180092144",
          "Vehicle Class": "LMV / MCWG",
          "Validity": "Valid up to 13-May-2037",
          "Issuing Authority": "RTO Janakpuri, Delhi"
        }
      },
      {
        id: "doc-pan-1",
        name: "PAN Verification Record",
        docType: "PAN",
        docNumber: "ABCPS4819K",
        issuer: "Income Tax Department, Govt of India",
        issueDate: "20-Jan-2017",
        status: "VERIFIED",
        uri: "in.gov.incometax:pan:ABCPS4819K",
        details: {
          "PAN": "ABCPS4819K",
          "Name on Card": "AARAV SHARMA",
          "Status": "Active & Linked to Aadhaar"
        }
      },
      {
        id: "doc-rc-1",
        name: "Vehicle Registration Certificate",
        docType: "VEHICLE",
        docNumber: "DL-10-CK-9821",
        issuer: "Transport Department, Govt of NCT of Delhi",
        issueDate: "15-Sep-2021",
        status: "VERIFIED",
        uri: "in.gov.delhi.transport:rc:DL10CK9821",
        details: {
          "Reg No": "DL-10-CK-9821",
          "Maker / Model": "Honda City 1.5 i-VTEC",
          "Fuel Type": "Petrol",
          "Fitness Valid Upto": "14-Sep-2036"
        }
      }
    ]
  },
  {
    id: "persona-priya",
    name: "Priya Patel",
    gender: "Female",
    dob: "22-Aug-1996",
    age: 28,
    aadhaarMasked: "XXXX-XXXX-9102",
    mobileMasked: "+91 94260-XXXX8",
    email: "priya.patel@gujaratnet.in",
    address: "B-204, Shivalik Residency, Satellite Road",
    locality: "Satellite",
    district: "Ahmedabad",
    state: "Gujarat",
    pincode: "380015",
    photoAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Priya",
    documents: [
      {
        id: "doc-adhr-2",
        name: "Aadhaar Card (e-KYC)",
        docType: "AADHAAR",
        docNumber: "XXXX-XXXX-9102",
        issuer: "Unique Identification Authority of India (UIDAI)",
        issueDate: "18-Oct-2015",
        status: "VERIFIED",
        uri: "in.gov.uidai:adhr:9102",
        details: {
          "Full Name": "Priya Patel",
          "Date of Birth": "22/08/1996",
          "Gender": "Female",
          "Address": "B-204, Shivalik Residency, Satellite Road, Ahmedabad, Gujarat - 380015",
          "Authentication": "UIDAI e-KYC Verified"
        }
      },
      {
        id: "doc-pan-2",
        name: "PAN Verification Record",
        docType: "PAN",
        docNumber: "AWQPP9102M",
        issuer: "Income Tax Department",
        issueDate: "05-May-2019",
        status: "VERIFIED",
        uri: "in.gov.incometax:pan:AWQPP9102M",
        details: {
          "PAN": "AWQPP9102M",
          "Name on Card": "PRIYA PATEL",
          "Status": "Active & Aadhaar Seeded"
        }
      },
      {
        id: "doc-edu-2",
        name: "Class X Certificate & Marksheet",
        docType: "EDUCATION",
        docNumber: "CBSE/2012/6641209",
        issuer: "Central Board of Secondary Education (CBSE)",
        issueDate: "28-May-2012",
        status: "VERIFIED",
        uri: "in.gov.cbse:marksheet:20126641209",
        details: {
          "Roll No": "6641209",
          "School": "Kendriya Vidyalaya Ahmedabad",
          "Result": "PASS (9.4 CGPA)"
        }
      }
    ]
  },
  {
    id: "persona-rajesh",
    name: "Rajesh Kumar Verma",
    gender: "Male",
    dob: "08-Nov-1979",
    age: 45,
    aadhaarMasked: "XXXX-XXXX-3341",
    mobileMasked: "+91 99351-XXXX2",
    email: "rajesh.verma@upmail.in",
    address: "House No 54, Vikas Nagar, Sector 4, Gomti Nagar",
    locality: "Gomti Nagar",
    district: "Lucknow",
    state: "Uttar Pradesh",
    pincode: "226010",
    photoAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Rajesh",
    documents: [
      {
        id: "doc-adhr-3",
        name: "Aadhaar Card (e-KYC)",
        docType: "AADHAAR",
        docNumber: "XXXX-XXXX-3341",
        issuer: "Unique Identification Authority of India (UIDAI)",
        issueDate: "14-Feb-2014",
        status: "VERIFIED",
        uri: "in.gov.uidai:adhr:3341",
        details: {
          "Full Name": "Rajesh Kumar Verma",
          "Date of Birth": "08/11/1979",
          "Gender": "Male",
          "Address": "House No 54, Vikas Nagar, Sector 4, Gomti Nagar, Lucknow, UP - 226010",
          "Authentication": "UIDAI Central Repository Verified"
        }
      },
      {
        id: "doc-ration-3",
        name: "Ration Card (NFSA Priority)",
        docType: "RATION",
        docNumber: "UP-092-8819203",
        issuer: "Food & Civil Supplies Department, Uttar Pradesh",
        issueDate: "11-Jan-2019",
        status: "VERIFIED",
        uri: "in.gov.up.fcs:ration:UP0928819203",
        details: {
          "Card Type": "PHH (Priority Household)",
          "Head of Family": "Rajesh Kumar Verma",
          "Fair Price Shop No": "FPS-LKO-441"
        }
      },
      {
        id: "doc-dl-3",
        name: "Driving Licence",
        docType: "DL",
        docNumber: "UP-3220050012984",
        issuer: "Transport Department, Uttar Pradesh",
        issueDate: "19-Apr-2005",
        status: "VERIFIED",
        uri: "in.gov.morth:dl:UP3220050012984",
        details: {
          "Licence No": "UP-3220050012984",
          "Issuing RTO": "RTO Transport Nagar Lucknow",
          "Valid Upto": "07-Nov-2029"
        }
      }
    ]
  },
  {
    id: "persona-ananya",
    name: "Ananya Sengupta",
    gender: "Female",
    dob: "19-Dec-2000",
    age: 24,
    aadhaarMasked: "XXXX-XXXX-7723",
    mobileMasked: "+91 98310-XXXX9",
    email: "ananya.s@calmail.in",
    address: "Block CL-45, Sector II, Salt Lake City",
    locality: "Salt Lake Sector II",
    district: "North 24 Parganas",
    state: "West Bengal",
    pincode: "700091",
    photoAvatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Ananya",
    documents: [
      {
        id: "doc-adhr-4",
        name: "Aadhaar Card (e-KYC)",
        docType: "AADHAAR",
        docNumber: "XXXX-XXXX-7723",
        issuer: "Unique Identification Authority of India (UIDAI)",
        issueDate: "29-Sep-2018",
        status: "VERIFIED",
        uri: "in.gov.uidai:adhr:7723",
        details: {
          "Full Name": "Ananya Sengupta",
          "Date of Birth": "19/12/2000",
          "Gender": "Female",
          "Address": "Block CL-45, Sector II, Salt Lake City, North 24 Parganas, WB - 700091",
          "Authentication": "UIDAI Certified e-KYC"
        }
      },
      {
        id: "doc-voter-4",
        name: "Electoral Photo Identity Card (EPIC / Voter ID)",
        docType: "VOTER",
        docNumber: "WB/21/114/098124",
        issuer: "Election Commission of India",
        issueDate: "10-Nov-2019",
        status: "VERIFIED",
        uri: "in.gov.eci:epic:WB21114098124",
        details: {
          "EPIC No": "WB/21/114/098124",
          "Assembly Constituency": "116 - Bidhannagar",
          "Parliamentary Constituency": "17 - Barasat"
        }
      },
      {
        id: "doc-pan-4",
        name: "PAN Verification Record",
        docType: "PAN",
        docNumber: "BKHPS7723Q",
        issuer: "Income Tax Department",
        issueDate: "03-Mar-2022",
        status: "VERIFIED",
        uri: "in.gov.incometax:pan:BKHPS7723Q",
        details: {
          "PAN": "BKHPS7723Q",
          "Name on Card": "ANANYA SENGUPTA",
          "Status": "Valid & Active"
        }
      }
    ]
  }
];
