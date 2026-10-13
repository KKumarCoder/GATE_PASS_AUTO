import mongoose from "mongoose";
import dotenv from "dotenv";
import { parse } from "csv-parse/sync";
import { Student } from "../models/index.js";

dotenv.config();

const csvData = `"Adm No","Roll No","First Name","Last Name","Class","Section","Email","Mobile","Aadhar Number","PEN Number","Gender","DOB","Caste","Category","Religion","Blood Group","Admission Date","Measurement Date","Weight","Height","House","Route List","Pickup Point","Hostel","Address","Room No","Father Name","Father Phone","Father Email","Father Occupation","Mother Name","Mother Phone","Mother Email","Mother Occupation","Discount Amt","Bank Account No","Bank Account Holder","Bank IFSC","Bank Name","Aadhaar (Doc)","Birth Cert (Doc)","Bank Passbook (Doc)","SSSMID (Doc)","Marksheet (Doc)","Transfer Certificate (TC)","Other Documents","RTE Status","RTE App No"
"25001","25001","Manasvi","","Balvatika_2","VENUS","","8930793719","","","Female","2022-04-13","GEN","","","","2026-01-04","","17.00","100.00","Himalaya","82","72","","Kanhra","","Vikash","","","","Mrs. Sonia","","","","4500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25002","25002","Bhavya","","Balvatika_2","VENUS","","9001926154","","","Female","2022-04-22","GEN","","","","2026-01-04","","14.00","103.00","Himalaya","82","72","","Kanhra","","Jagjeet","","","","Shikha","","","","1100.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25005","25005","Sakshi Dhindwal","","Balvatika_2","VENUS","","9813979766","","","Female","2022-01-07","GEN","","","","2026-01-04","","18.00","102.00","Arawali","","","","Badrai","","Pawan","","","","Manisha","","","","8300.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25006","25006","Vansh","","Balvatika_2","VENUS","","9797664838","","","Male","2021-08-27","GEN","","","","2026-01-04","","17.00","108.00","Nilgiri","34","15","","Dagroli","","Vinod Kumar","","","","Pratibha","","","","5800.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25007","25007","Khushi","","Balvatika_2","VENUS","","7988162291","","","Female","2021-04-06","GEN","","","","2026-01-04","","12.00","95.00","Arawali","45","32","","Jewali","","Amarjeet","","","","Geeta","","","","9400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25011","25011","Payal","","Balvatika_2","VENUS","","9050737386","","","Female","2022-02-13","GEN","","","","2026-01-04","","14.00","102.00","Shivalik","","","","Kubja Nagar","","Sunil","","","","Mamta Rani","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25013","25013","Aarav","","Balvatika_2","VENUS","","8708782708","","","Male","2021-01-02","STSC","","","","2026-01-04","","17.00","105.00","Nilgiri","","","","Dagroli","","Amit","","","","Seema","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25014","25014","olivia","","Balvatika_2","VENUS","","9053310831","","","Female","2022-03-24","GEN","","","","2026-01-04","","17.00","105.00","Nilgiri","34","15","","Dagroli","","Pardeep","","","","Pooja","","","","4900.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25015","25015","Diksha","","Balvatika_2","VENUS","","9468288000","","","Female","2022-06-22","GEN","","","","2026-01-04","","14.00","98.00","Shivalik","","","","Dagroli","","Dinesh Kumar","","","","Ritu","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25016","25016","Trisha Kumari","","Balvatika_2","VENUS","bhartikhanna1608@mail.com","8685078046","","","Female","2022-01-09","STSC","","","","2026-01-04","","16.00","108.00","Nilgiri","","","","Berla","","Parmod Kumar","","","","Bharti","","","","8300.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25017","25017","Mahi","","Balvatika_2","VENUS","","9050856991","","","Female","2022-06-06","GEN","","","","2026-01-04","","13.00","90.99","Himalaya","","","","Dagroli","","Amit","","","","Mamta","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25018","25018","Keshav","","Balvatika_2","VENUS","","9817603103","","","Male","2022-03-12","BC-A","","","","2026-01-04","","18.00","107.00","Arawali","49","36","","Kadma","","Shashikant","","","","Kusum","","","","7200.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25020","25020","Prince","","Balvatika_2","VENUS","","9991835162","","","Male","2022-03-17","GEN","","","","2026-01-04","","14.00","100.00","Shivalik","82","72","","Kanhra","","Narender","","","","Neelam","","","","6650.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25021","25021","Manvi Kadyan","","Balvatika_2","VENUS","","8059656195","","","Female","2021-10-14","GEN","","","","2026-01-04","","16.00","107.00","Himalaya","34","15","","Dagroli","","Sukhveer Singh","","","","Neetu Kumari","","","","7200.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25024","25024","Daksh","","Balvatika_2","VENUS","","9050475767","","","Male","2021-08-10","STSC","","","","2026-01-04","","17.00","108.00","Shivalik","34","15","","Dagroli","","Banti","","","","Pushpa","","","","550.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25025","25025","Bhavika","","Balvatika_2","VENUS","","9050329937","","","Female","2022-03-25","OBC","","","","2026-01-04","","17.00","105.00","Nilgiri","","","","Dagroli","","Manish","","","","Neelam","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25027","25027","Jiyaan","","Balvatika_2","VENUS","","9050633536","","","Male","2021-12-07","BC- B","","","","2026-01-04","","18.00","108.00","Himalaya","10","20","","Nihalgarh","","Deepak","","","","Priti","","","","9400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25028","25028","Divya","","Balvatika_2","VENUS","","9996970773","","","Female","2021-11-19","STSC","","","","2026-01-04","","17.00","105.00","Himalaya","","","","Rudrol","","Vikram","","","","Annu Kumari","","","","6650.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25029","25029","PORASH","","Balvatika_2","VENUS","","9812490116","","","Male","2020-09-19","BC-A","","","","2026-01-04","","17.00","110.00","Nilgiri","17","9","","Berla","","Vijender","","","","Minakshi","","","","6100.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"26001L","26001L","Aarush","","Balvatika_2","VENUS","","9812174428","","","Male","2021-05-10","GEN","","","","2026-01-04","","16.00","101.98","Arawali","","","","Kishkandha","","Devender Kumar","","","","Kavita Devi","","","","8300.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"26002L","26002L","Tanish","","Balvatika_2","VENUS","tanishkumar78631@gmail.com","9671419090","","","Male","2021-10-04","GEN","","","","2026-01-04","","14.00","100.00","Shivalik","","","","Aun","","Pardeep","","","","Renu Kumari","","","","8300.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"26003","26003","Tanmay","","Balvatika_2","VENUS","archanaduhan98@gmai.com","8814823350","","","Male","2021-09-11","GEN","","","","2026-01-04","","16.00","107.00","Shivalik","","","","Kubja Nagar","","Yogesh","","","","Archana","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"26004","26004","Rudraksh","","Balvatika_2","VENUS","Sachinsheoran0002@gmail.com","9896709878","","","Male","2021-12-01","GEN","","","","2026-01-04","","16.00","107.00","Arawali","","","","Hanswas Khurd","","Sachin","","","","Monika","","","","4500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"252112L","252112L","Ditya","","Balvatika_2","VENUS","","9319041847","","","Female","2021-05-09","GEN","","","","2026-01-04","","18.00","112.00","Arawali","82","72","","Kanhra","","Anil Kumar","","","","Manisha","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""`;

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

function normalizeClassName(raw) {
  if (!raw || !raw.trim()) return "BALVATIKA 2";
  let c = raw.trim();
  if (/^balvatika[_\s-]*(\d+)$/i.test(c)) {
    return c.replace(/^balvatika[_\s-]*(\d+)$/i, "BALVATIKA $1");
  }
  return c.replace(/\s*(st|nd|rd|th)$/i, "").trim();
}

function formatStudent(row) {
  const adm = String(row["Adm No"]).trim();
  const roll = String(row["Roll No"] || adm).trim();
  const name = [row["First Name"], row["Last Name"]].filter(Boolean).join(" ").trim().toUpperCase();
  const className = normalizeClassName(row["Class"]);
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
  const cleanAdmForEmail = adm.toLowerCase().replace(/[^a-z0-9]/g, "");
  let candidateEmail = (row["Email"] && row["Email"].trim()) 
    || (row["Father Email"] && row["Father Email"].trim()) 
    || (row["Mother Email"] && row["Mother Email"].trim()) || "";
  
  if (candidateEmail) {
    candidateEmail = candidateEmail.trim().toLowerCase()
      .replace(/@ail\.com$/, "@gmail.com")
      .replace(/@gma\.com$/, "@gmail.com")
      .replace(/@gmai\.com$/, "@gmail.com")
      .replace(/@gamil\.com$/, "@gmail.com")
      .replace(/@(\d+)gmail\.com$/, "$1@gmail.com");
  }
  
  const email = candidateEmail ? candidateEmail : `${cleanNameForEmail}.${cleanAdmForEmail}@srpskanhra.com`;
  const route = row["Route List"] ? String(row["Route List"]).trim() : "";

  return {
    admissionNumber: adm,
    rollNumber: roll,
    name,
    className,
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
