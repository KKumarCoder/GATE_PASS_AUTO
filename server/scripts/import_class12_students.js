import mongoose from "mongoose";
import dotenv from "dotenv";
import { parse } from "csv-parse/sync";
import { Student } from "../models/index.js";

dotenv.config();

const csvData = `"Adm No","Roll No","First Name","Last Name","Class","Section","Email","Mobile","Aadhar Number","PEN Number","Gender","DOB","Caste","Category","Religion","Blood Group","Admission Date","Measurement Date","Weight","Height","House","Route List","Pickup Point","Hostel","Address","Room No","Father Name","Father Phone","Father Email","Father Occupation","Mother Name","Mother Phone","Mother Email","Mother Occupation","Discount Amt","Bank Account No","Bank Account Holder","Bank IFSC","Bank Name","Aadhaar (Doc)","Birth Cert (Doc)","Bank Passbook (Doc)","SSSMID (Doc)","Marksheet (Doc)","Transfer Certificate (TC)","Other Documents","RTE Status","RTE App No"
"206","206","DEEPIKA","","12th","SCIENCE","","9612654872","","","Female","2008-09-13","BC- B","","","","2015-09-18","","55.00","158.00","Himalaya","10","20","","NIHALGARH","","HAWA SINGH","","","","ANITA DEVI","","","","26500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"208","208","SWATI","","12th","SCIENCE","pardeepkadayan2137@gmail.com","8930528400","","","Female","2008-10-30","GEN","","","","2015-08-31","","59.00","162.00","Arawali","","","","DAGROLI","","PARDEEP KUMAR","","","","SUMAN","","","","21500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"210","210","NEETU","","12th","COMMERCE","","9813032820","","","Female","2008-07-24","GEN","","","","2015-08-31","","47.00","157.00","Himalaya","33","11","","BERLA","","RANVIR SINGH","","","","SUSHILA DEVI","","","","17000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"211","211","BHARTI","","12th","COMMERCE","","9992346946","","","Female","2009-02-20","GEN","","","","2015-08-31","","61.00","164.00","Nilgiri","33","11","","BERLA","","JASWANT SINGH","","","","RAJBALA","","","","17000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"221","221","DEEPIKA","","12th","SCIENCE","mk4573136@gmail.com","7027553652","","","Female","2008-08-29","GEN","","","","2021-12-21","","46.00","166.00","Arawali","35","22","","BERLA","","NARESH KUMAR","","","","MUKESH","","","","36500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"224","224","SOMIYA","","12th","SCIENCE","balramsheoran176@gmail.com","8168218175","","","Female","2009-12-05","GEN","","","","2016-05-18","","47.00","155.00","","","","","HUEE","","BALRAM","","","","RAJBALA","","","","30000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"228","228","SAHIL KUMAR","","12th","COMMERCE","pardeepsheoran123456@gmail.com","8053706144","","","Male","2008-11-09","GEN","","","","2014-05-26","","68.00","167.00","Nilgiri","38","25","","GOPALWAS","","PRADEEP","","","","MEENA DEVI","","","","17000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"230","230","SHAGUN","","12th","SCIENCE","sunilkumar8065355@gmail.com","9812331071","","","Female","2009-05-18","GEN","","","","0015-08-31","","48.00","159.00","Himalaya","40","27","","HANSAWAS
KALAN","","SUNIL KUMAR","","","","MANJEET DEVI","","","","21500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"231","231","JIYA","","12th","COMMERCE","bhupsingh0584@gmail.com","9050026427","","","Female","2009-10-10","GEN","","","","2018-08-21","","44.00","150.00","Shivalik","84","76","","BERLA","","BHUP SINGH","","","","MANJEET KUMARI","","","","15000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"232","232","KOMAL","","12th","SCIENCE","","9991125327","","","Female","2010-04-06","GEN","","","","2017-07-12","","49.00","151.00","Arawali","","","","PIC HOPA KHURD","","DALBIR SINGH","","","","MANJU KUMARI","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"234","234","NEHA","","12th","SCIENCE","","7988303712","","","Female","2009-08-27","GEN","","","","2020-05-27","","51.00","150.00","Nilgiri","84","76","","BERLA","","RAMNIWAS","","","","RAJWANTI","","","","21500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"237","237","ROHIT KUMAR","","12th","COMMERCE","","9991036603","","","Male","2009-09-05","GEN","","","","2019-05-26","","54.00","171.00","Arawali","21","17","","DHANASRI","","SANDEEP","","","","RAJNESH DEVI","","","","17000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"391","391","PARVESH SHEORAN","","12th","COMMERCE","","9813549727","","","Male","2009-10-16","GEN","","","","2022-08-05","","59.00","165.00","Shivalik","17","9","","BERLA","","KULVIR","","","","KAVITA","","","","17000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"631","631","DEEPA KUMARI","","12th","SCIENCE","","9813602649","","","Female","2008-08-21","GEN","","","","2024-05-27","","54.00","160.00","Shivalik","","","","BERLA","","RAKESH","","","","JAGWANTI","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"773","773","ROHIT","","12th","SCIENCE","","9991125327","","","Male","2010-05-25","GEN","","","","2025-06-02","","54.00","176.00","Shivalik","","","","SIRSALI","","SANDEEP KUMAR","","","","RITU","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"776","776","ALTAF","","12th","COMMERCE","altaf.404x@gmail.com","8199853825","","","Male","2009-11-22","BC-A","","Muslim","","2025-07-09","","80.00","175.00","Nilgiri","","","","BADHRA","","ABRAHIM","","","","MAMTA","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261201","261201","KIRTI","","12th","SCIENCE","","7015456517","","","Female","2009-04-24","GEN","","","","","","75.00","164.00","Himalaya","","","","DAGROLI","","PARDEEP KUMAR","","","","ASHA","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261202","261202","NISHU","","12th","ARTS","","9991612350","","","Female","2008-07-26","GEN","","","","","","42.00","160.00","Nilgiri","","","","RUDROL","","BRAHM PARKASH","","","","MUNESH URF MUKESHKUMARI","","","","32000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261203","261203","SHARIKA","","12th","ARTS","","9813605288","","","Female","2009-08-01","GEN","","","","","","49.00","161.00","Shivalik","58","46","","M.HARIYA","","MANJEET SINGH","","","","MUNESH DEVI","","","","23000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261204","261204","SWATI","","12th","ARTS","","9992480109","","","Female","2009-02-20","GEN","","","","","","50.00","163.00","Himalaya","","","","BERLA","","DINESH KUMAR","","","","MANISHA RANI","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261205","261205","DIPANSHU","","12th","ARTS","","8683042795","","","Male","2009-10-24","GEN","","","","","","60.00","173.00","Shivalik","72","61","","SHISHWALA","","MAAN SINGH","","","","SONAM","","","","21500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261206","261206","BITTU","","12th","SCIENCE","sheorank56@gmail.com","9812795105","","","Male","2008-08-28","GEN","","","","","","61.00","184.00","Shivalik","","","","GOPALWAS","","MANOJ KUMAR","","","","SUMAN","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261207","261207","BHAVISHY","","12th","SCIENCE","","8053171408","","","Male","2009-09-02","GEN","","","","","","55.00","175.00","Shivalik","","","","BERLA","","VIJENDER SINGH","","","","MANJU","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261208","261208","SWEETI KUMARI","","12th","ARTS","","9812738129","","","Female","2010-04-09","GEN","","","","","","48.00","153.00","Shivalik","58","46","","M.HARIYA","","KULDEEP","","","","NEELAM","","","","23000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261209","261209","PUSHPA","","12th","SCIENCE","","9812418577","","","Female","2008-11-23","GEN","","","","","","54.00","160.00","Shivalik","","","","CHANDWAS","","KULDEEP","","","","SUMAN","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261210","261210","GAURAV","","12th","ARTS","","8816804750","","","Male","2009-02-25","GEN","","","","","","73.00","172.00","Shivalik","","","","BERLA","","RAKESH","","","","URMILA","","","","23000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261211","261211","MOHIT","","12th","SCIENCE","vijaraniyaji@gmail.com","9813835905","","","Male","2010-06-04","GEN","","","","","","57.00","175.00","Arawali","69","58","","RUDROL","","JAI BHAGWAN","","","","SUSHILA DEVI","","","","21500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261212","261212","HARMAN","","12th","SCIENCE","rupeshsharma@gmail.com","9728389341","","","Male","2011-10-15","GEN","","","","","","62.00","179.00","Himalaya","","","","HUI","","RUPESH","","","","PINKI","","","","21500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261213","261213","HIMANI","","12th","ARTS","","9728389341","","","Female","2010-10-04","GEN","","","","","","54.00","163.00","Nilgiri","","","","HUI","","RUPESH KUMAR","","","","PINKI","","","","34250.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261214","261214","TANU","","12th","SCIENCE","","8053843200","","","Female","2009-05-08","GEN","","","","","","46.00","153.00","Nilgiri","56","44","","MAI KALAN","","BIJENDER SINGH","","","","MEENA DEVI","","","","22200.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261215","261215","HITESH","","12th","ARTS","","9812775134","","","Male","2008-10-19","GEN","","","","","","47.00","172.00","Himalaya","34","15","","DAGROLI","","SANDEEP KUMAR","","","","MUKESH RANI","","","","23000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261216","261216","KOMAL","","12th","SCIENCE","manvir112.ms@gmail.com","9991483605","","","Female","2008-12-15","GEN","","","","","","49.00","151.00","Nilgiri","","","","KANHRA","","MANVIR SINGH","","","","SUMAN","","","","23000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261217","261217","HEMANT","","12th","SCIENCE","manvir112.mr@gmail.com","9991483605","","","Male","2008-11-15","GEN","","","","","","48.00","165.00","Nilgiri","","","","KANHRA","","MANVIR SINGH","","","","SUMAN","","","","21500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261218","261218","PARVESH","","12th","SCIENCE","","9991483605","","","Male","2008-09-14","GEN","","","","","","","","Himalaya","","","","DAGROLI","","SANDEEP KUMAR","","","","ANITA DEVI","","","","34250.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261219","261219","RISHIT","","12th","SCIENCE","shivamsingal0@gmail.com","7015295781","","","Male","2009-11-16","GEN","","","","","","45.00","161.00","Himalaya","33","11","","BERLA","","DEEPAK","","","","KAVITA","","","","21500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261220","261220","RAMBHAGAT","","12th","SCIENCE","monusheoran@gmail.com","8708320676","","","Male","2008-11-18","GEN","","","","","","61.00","176.00","Nilgiri","84","76","","BERLA","","VIRENDER","","","","RINKU","","","","21500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261221","261221","HIMANSHU","","12th","SCIENCE","anupsheoran4008@gmail.com","9991504008","","","Male","2007-11-02","GEN","","","","","","57.00","177.00","Arawali","33","11","","BERLA","","ANUP","","","","RINKU","","","","21500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261222","261222","ROHIT","","12th","SCIENCE","rk5514410@gmail.com","9991162035","","","Male","2007-12-05","GEN","","","","","","54.00","176.00","Nilgiri","","","","BERLA","","SANDEEP","","","","KAVITA","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261223","261223","KHUSHI","","12th","ARTS","","7015638834","","","Female","2009-11-14","GEN","","","","","","","","Himalaya","","","","KARI MOD","","DHARMENDER","","","","SUSHIL","","","","25000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"787","","HARSH CHAHAR","","12th","SCIENCE","","","","","Male","2009-09-16","","","","","0025-07-22","","","","","","","","DELHI","","SUKHBIR SINGH","","","","ASHA","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""`;

function parseDOB(raw) {
  if (!raw || !raw.trim()) return undefined;
  let clean = raw.trim();
  if (/^00(\d{2})-(.*)$/.test(clean)) {
    clean = clean.replace(/^00(\d{2})-(.*)$/, "20$1-$2");
  }
  const d = new Date(`${clean}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? undefined : d;
}

function cleanParentName(raw) {
  if (!raw || !raw.trim()) return "";
  return raw.trim()
    .replace(/^(MR\.|MRS\.|MR |MRS )\s*/i, "")
    .trim()
    .toUpperCase();
}

function formatStudent(row) {
  const adm = String(row["Adm No"]).trim();
  const roll = String(row["Roll No"] || adm).trim();
  const name = [row["First Name"], row["Last Name"]].filter(Boolean).join(" ").trim().toUpperCase();
  const rawClass = row["Class"] ? String(row["Class"]).replace(/\s*(st|nd|rd|th)$/i, "").trim() : "12";
  const section = String(row["Section"] || "").trim().toUpperCase();
  const rawAddress = String(row["Address"] || "").replace(/[\r\n]+/g, " ").trim();
  const village = rawAddress ? rawAddress.toUpperCase() : "Not recorded";
  
  const rawMobile = row["Mobile"] || row["Father Phone"] || row["Mother Phone"] || "";
  const cleanMobile = String(rawMobile).replace(/\D/g, "");
  let primaryMobile = "+910000000000";
  if (cleanMobile.length === 10) {
    primaryMobile = `+91${cleanMobile}`;
  } else if (cleanMobile.startsWith("91") && cleanMobile.length === 12) {
    primaryMobile = `+${cleanMobile}`;
  } else if (cleanMobile.length > 0) {
    primaryMobile = `+91${cleanMobile}`;
  }
  
  const cleanNameForEmail = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  let candidateEmail = (row["Email"] && row["Email"].trim()) 
    || (row["Father Email"] && row["Father Email"].trim()) 
    || (row["Mother Email"] && row["Mother Email"].trim()) || "";
  
  if (candidateEmail) {
    candidateEmail = candidateEmail.trim().toLowerCase()
      .replace(/@ail\.com$/, "@gmail.com");
  }
  
  const email = candidateEmail ? candidateEmail : `${cleanNameForEmail}.${adm}@srpskanhra.com`;
  const route = row["Route List"] ? String(row["Route List"]).trim() : "";

  return {
    admissionNumber: adm,
    rollNumber: roll,
    name,
    className: rawClass,
    section,
    villageName: village || "Not recorded",
    gender: row["Gender"] || "",
    dateOfBirth: parseDOB(row["DOB"]),
    photo: "",
    fatherName: cleanParentName(row["Father Name"]),
    motherName: cleanParentName(row["Mother Name"]),
    guardianName: "",
    primaryMobile,
    email,
    alternativeMobile: "",
    address: village !== "Not recorded" ? village : "",
    transportType: route ? "BUS" : "",
    busRoute: route,
    status: "ACTIVE"
  };
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const rows = parse(csvData, { columns: true, skip_empty_lines: true, bom: true, trim: true });
  console.log(`Parsed ${rows.length} rows from CSV`);

  let added = 0;
  let updated = 0;

  for (const raw of rows) {
    const s = formatStudent(raw);
    const existing = await Student.findOne({ admissionNumber: s.admissionNumber });
    if (existing) {
      existing.set({ ...s, status: "ACTIVE" });
      await existing.save();
      console.log(`Updated existing student ${s.admissionNumber}: ${s.name} (Class ${s.className}-${s.section})`);
      updated++;
    } else {
      await Student.create(s);
      console.log(`Added student ${s.admissionNumber}: ${s.name} (Class ${s.className}-${s.section}, Mobile: ${s.primaryMobile}, Email: ${s.email})`);
      added++;
    }
  }

  console.log(`\nImport complete! Added: ${added}, Updated: ${updated}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Error importing students:", err);
  process.exit(1);
});
