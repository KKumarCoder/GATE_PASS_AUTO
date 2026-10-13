import mongoose from "mongoose";
import dotenv from "dotenv";
import { parse } from "csv-parse/sync";
import { Student } from "../models/index.js";

dotenv.config();

const csvData = `"Adm No","Roll No","First Name","Last Name","Class","Section","Email","Mobile","Aadhar Number","PEN Number","Gender","DOB","Caste","Category","Religion","Blood Group","Admission Date","Measurement Date","Weight","Height","House","Route List","Pickup Point","Hostel","Address","Room No","Father Name","Father Phone","Father Email","Father Occupation","Mother Name","Mother Phone","Mother Email","Mother Occupation","Discount Amt","Bank Account No","Bank Account Holder","Bank IFSC","Bank Name","Aadhaar (Doc)","Birth Cert (Doc)","Bank Passbook (Doc)","SSSMID (Doc)","Marksheet (Doc)","Transfer Certificate (TC)","Other Documents","RTE Status","RTE App No"
"178","178","ANSHIKA","","11 th","SCIENCE","rakesh.sheoran99054@gmail.com","9813899054","","","Female","2010-03-18","GEN","","","","2016-07-13","","42.00","155.00","Nilgiri","84","76","","BERLA","","Mr.RAKESH KUMAR","","","","Mrs.POONAM","","","","26500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"181","181","RITIKA","","11 th","SCIENCE","kk19994315@gmail.com","9416583233","","","Female","2010-02-10","GEN","","","","2017-04-05","","42.00","160.00","Nilgiri","57","45","","M.HARIYA","","Mr.KULBIR SINGH","","","","Mrs.MANJU","","","","26500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"183","183","NITIKA","","11 th","SCIENCE","","9812159343","","","Female","2010-03-30","GEN","","","","2018-04-23","","41.00","153.00","Arawali","40","27","","HANSAWAS
KHURD","","Mr.PARDEEP KUMAR","","","","Mrs.RINKU","","","","26500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"185","185","PURVANSHEE","","11 th","SCIENCE","","8930042050","","","Female","2010-07-17","GEN","","","","2016-07-18","","47.00","163.00","Arawali","31","18","","DAGROLI","","Mr.SOMBIR","","","","Mrs.MINAKSHI","","","","29500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"191","191","DIKSHA","","11 th","SCIENCE","","9813175018","","","Female","2011-01-12","GEN","","","","2016-05-25","","50.00","157.00","Nilgiri","33","11","","BERLA","","Mr.PAWAN KUMAR","","","","Mrs.REENA DEVI","","","","26500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"192","192","TANUJ","","11 th","COMMERCE","kuldeepsarpanch55@gmail.com","9992075385","","","Male","2009-09-22","GEN","","","","2016-08-02","","44.00","163.00","Nilgiri","53","41","","KISKANDHA","","KULDEEP","","","","BABINA","","","","26500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"194","194","CHIRAG","","11 th","SCIENCE","","","","","Male","2010-10-22","GEN","","Hindu","","2019-08-28","","","","Himalaya","","","","DAGROLI","","Mr.OMPRAKASH","","","","Mrs.ANITA","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"196","196","HAPPY","","11 th","COMMERCE","ranvirsheoran9@gmail.com","9813032820","","","Male","2010-05-18","GEN","","","","2016-07-15","","","","Himalaya","33","11","","BERLA","","RANVIR SINGH","","","","SUSHILA DEVI","","","","28000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"197","197","PRINCE","","11 th","SCIENCE","","8683013303","","","Male","2010-08-13","GEN","","","","2016-07-25","","50.00","166.00","Himalaya","","","","NANDHA","","HARENDER","","","","SUNITA","","","","26500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"200","200","PUNEET KUMAR","","11 th","COMMERCE","","9050042350","","","Male","2010-02-05","GEN","","","","2019-05-09","","54.00","173.00","Shivalik","16","8","","BADRAI","","PARVEEN KUMAR","","","","NEELAM","","","","80000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"202","202","KHUSHI","","11 th","SCIENCE","","9050741715","","","Female","2010-09-02","GEN","","","","2016-08-02","","52.00","159.00","Nilgiri","17","9","","BERLA","","ANIL KUMAR","","","","KAVITA DEVI","","","","26500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"203","203","SUHANI","","11 th","SCIENCE","","8930528400","","","Female","2010-02-13","GEN","","","","2016-04-04","","40.00","153.00","Himalaya","","","","DAGROLI","","PARDEEP KUMAR","","","","SUMAN","","","","26500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"311","311","BHAVESH","","11 th","SCIENCE","bhaveshsangwan047@gmail.com","9728841748","","","Male","2010-09-18","GEN","","","","2022-05-12","","48.00","178.00","Himalaya","54","42","","KUBJA NAGAR","","ANIL KUMAR","","","","MAMTA","","","","26500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"317","317","RADHIKA","","11 th","ARTS","","9728115812","","","Female","2009-08-26","GEN","","","","2022-05-18","","46.00","166.00","Shivalik","19","13","","","","VIKASH","","","","USHA","","","","23500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"390","390","DIKSHIKA","","11 th","SCIENCE","sachindhillon468@gmail.com","8053054977","","","Female","2011-04-30","GEN","","","","2022-08-05","","53.00","152.00","Arawali","68","57","","RAMBASS","","SANJAY","","","","PINA","","","","26500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"410","410","HIMANSHU KUMARI","","11 th","SCIENCE","","8708385013","","","Male","2011-03-16","GEN","","","","2022-09-23","","44.00","158.00","Nilgiri","84","76","","BERLA","","DEVENDER SINGH","","","","ANITA","","","","23500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"413","413","ANURAG","","11 th","SCIENCE","","","","","Male","2009-10-25","GEN","","","","2022-09-28","","","","Shivalik","","","","KISKANDHA","","SATENDER","","","","SUSHILA","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"490","490","POOJA","","11 th","SCIENCE","","9813755385","","","Female","2010-02-14","GEN","","","","2023-05-29","","59.00","155.00","Shivalik","34","15","","DAGROLI","","Mr.AMIT KUMAR","","","","Mrs.NEETU","","","","26500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"664","664","ANUJ","","11 th","SCIENCE","","9813990015","","","Male","2009-11-04","GEN","","","","2024-09-30","","80.00","172.00","Nilgiri","35","22","","BERLA","","PRAVEEN KUMAR","","","","BINDU","","","","25500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"866","866","IRWIN KUMAR","","11 th","SCIENCE","","","","","Male","2011-07-28","GEN","","","","2026-05-15","","","","Shivalik","","","","NIMAR BADESRA","","VIJAY KUMAR","","","","SHARMILA","","","","19500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"868","868","AADITYA SHARMA","","11 th","COMMERCE","kumarvipin35126@gmail.com","9671583197","","","Male","2009-10-09","GEN","","","","2026-05-20","","55.00","164.00","Shivalik","","","","BERLA","","VIPIN KUMAR","","","","KAVITA SHARMA","","","","30000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"869","869","PIYUSH SHARMA","","11 th","COMMERCE","","9991166976","","","Male","2010-07-08","GEN","","","","2026-05-26","2026-08-14","23.00","127.00","Shivalik","","","","BERLA","","AMIT KUMAR","","","","POOJA DEVI","","","","27500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"870","870","KUNAL TANWAR","","11 th","SCIENCE","st8053708796@gmail.com","8053708796","","","Male","2010-02-24","STSC","","","","2026-05-26","","51.00","169.00","","","","","BALALI","","Mr.SUNDER","","","","Mrs.HEMLATA","","","","24500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"879","879","SUDHANSHU","","11 th","COMMERCE","Sudhanshu.maan22@gmail.com","8708544919","","","Male","2009-09-04","GEN","","","","2026-07-01","","","","Nilgiri","63","52","","NANGAL","","PAWAN","","","","SUSHILA","","","","26500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"882","882","ANMOLPREET SINGH","","11 th","SCIENCE","","","","","Male","2010-04-15","STSC","","","","2026-07-15","","","","Shivalik","","","","PUNJAB","","MAKHAN SINGH","","","","HARPREET KAUR","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"883","883","AMAN KUMAR","","11 th","COMMERCE","Arecarcarriers@gmail.com","9999906855","","","Male","2009-12-09","GEN","","","","2026-07-15","","","","Nilgiri","53","41","","KISKANDHA","","ANIL KUMAR","","","","PRIYANKA DEVI","","","","20350.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"885","885","YOGESH","","11 th","ARTS","","9813142868","","","Male","2010-08-19","GEN","","Hindu","","2026-08-14","2026-08-14","","","Himalaya","68","57","","RAMBASS","","SURESH","","","","MUNESH","","","","20800.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261101","261101","SAKSHI","","11 th","SCIENCE","Mukeshsawan06@gmail.com","9728727694","","","Female","2010-07-01","STSC","","","","","","47.00","158.00","Himalaya","","","","DAGROLI","","MUKESH KUMAR","","","","POONAM","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261102","261102","SAWAN SINGH","","11 th","ARTS","","9728081989","","","Male","2007-12-08","GEN","","","","","","47.00","161.00","Nilgiri","40","27","","","","RAVINDER","","","","SUDESH","","","","28500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261103","261103","DEEPAK","","11 th","ARTS","","8816806136","","","Male","2009-09-30","GEN","","","","","","81.00","178.00","Himalaya","","","","","","LALIT","","","","POONAM","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261105","261105","NAVEEN KUMAR","","11 th","ARTS","","8168037937","","","Male","2010-06-24","GEN","","","","","","","","Himalaya","82","72","","","","RAJESH","","","","SHEELA DEVI","","","","35200.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261106","261106","ROHIT","","11 th","ARTS","","8397804033","","","Male","2011-01-26","GEN","","","","","","","","Arawali","","","","","","RAVINDER","","","","MEENA","","","","15500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261107","261107","LOKESH","","11 th","ARTS","","7027097738","","","Male","2009-08-09","GEN","","Hindu","","2026-04-01","2026-08-14","62.00","170.22","Himalaya","","","","DAGROLI","","ANIL","","","","BABITA","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""`;

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
  const rawClass = row["Class"] ? String(row["Class"]).replace(/\s*(st|nd|rd|th)$/i, "").trim() : "11";
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
