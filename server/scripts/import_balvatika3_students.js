import mongoose from "mongoose";
import dotenv from "dotenv";
import { parse } from "csv-parse/sync";
import { Student } from "../models/index.js";

dotenv.config();

const csvData = `"Adm No","Roll No","First Name","Last Name","Class","Section","Email","Mobile","Aadhar Number","PEN Number","Gender","DOB","Caste","Category","Religion","Blood Group","Admission Date","Measurement Date","Weight","Height","House","Route List","Pickup Point","Hostel","Address","Room No","Father Name","Father Phone","Father Email","Father Occupation","Mother Name","Mother Phone","Mother Email","Mother Occupation","Discount Amt","Bank Account No","Bank Account Holder","Bank IFSC","Bank Name","Aadhaar (Doc)","Birth Cert (Doc)","Bank Passbook (Doc)","SSSMID (Doc)","Marksheet (Doc)","Transfer Certificate (TC)","Other Documents","RTE Status","RTE App No"
"830","830","Satvik","","Balvatika-3","MARS","","8307300502","","","Male","2021-12-10","GEN","","","","2026-01-04","","16.01","105.00","Nilgiri","","","","KUBJA NAGAR","","Arvind","","","","Priyanka","","","","7200.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2601","2601","ROOHI","","Balvatika-3","MARS","sheoranrakesh1991@gmail.com","9817676822","","","Female","2022-09-01","GEN","","","","2026-01-04","","17.00","104.00","Shivalik","","","","Kanhra","","Rakesh","","","","Kavita","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2602","2602","Ovin","Bhambhu","Balvatika-3","MARS","nisha1999punia@gmail.com","9306700598","","","Male","2023-06-16","GEN","","Hindu","","2026-08-01","2026-08-14","17.00","101.00","Arawali","","","","Nimar Badesra","","Shakti","","","","Nisha","","","","8200.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2603","2603","Kiyansh","Chahal","Balvatika-3","MARS","kunalchahal002@gmail.com","9350241959","","","Male","2021-09-29","GEN","","Hindu","","2026-08-01","2026-08-14","17.00","108.00","Nilgiri","","","","Nimar Badesra","","KULDEEP KUMAR","","","","RITU KUMARI","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2604","2604","Yansh Yadav","","Balvatika-3","MARS","sksunil15400@gmail.com","9728858041","","","Male","2022-11-27","BC- B","","","","2026-01-04","","14.00","95.00","Shivalik","","","","Nihalgarh","","Sunil Yadav","","","","Nitika","","","","8200.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2605","2605","Devaansh","","Balvatika-3","MARS","ytanwar760@gmail.com","9306657152","","","Male","2021-10-18","GEN","","","","2026-01-04","","18.00","110.00","Shivalik","","","","Kheri","","Yogesh Kumar","9306657152","","Teacher","Preety Kumari","","","Teacher","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2606","2606","Puneet","","Balvatika-3","MARS","","9518430561","","","Male","2022-11-20","GEN","","","","2026-01-04","","13.00","99.98","Nilgiri","","","","Berla","","Sumit","","","","Reena","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2607","2607","Ishu","","Balvatika-3","VENUS","Surekhapilania98@gmail.com","9812874437","","","Female","2023-05-13","GEN","","","","2026-01-04","","13.00","88.00","Arawali","","","","Nimar Badesra","","Naveen Kumar","","","","Surekha","","","","8200.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2608","2608","Nayra","","Balvatika-3","MARS","","9467002404","","","Female","2023-03-14","GEN","","","","2026-01-04","","13.00","97.00","Himalaya","","","","Khubi Dhani","","Kanwar Lal","","","","Darshna","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2609","2609","Himanshu Kumar","","Balvatika-3","MARS","meersingh.ms70@gmail.com","9466135139","","","Male","2022-09-21","GEN","","","","2026-01-04","","13.00","93.00","Himalaya","","","","Berla","","Meer Singh","","","","Madhu Kumari","","","","1000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2610","2610","Devank","","Balvatika-3","MARS","bhambhumanju18@gmail.com","7056059927","","","Male","2022-09-13","GEN","","","","2026-01-04","","18.00","105.00","Shivalik","","","","Nimar Badessa","","Krishan Kumar","","","","Usha Kumari","","","","7000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2611","2611","Naksh","","Balvatika-3","MARS","","9467002404","","","Male","2023-03-14","GEN","","","","2026-01-04","","12.00","94.00","Himalaya","","","","Khubi Dhani","","Kanwar Lal","","","","Darshna","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2612","2612","Ditya Singh","","Balvatika-3","VENUS","","9050865854","","","Female","2023-09-01","GEN","","","","2026-01-04","","13.00","85.00","Himalaya","","","","Berla","","Satyander Kumar","","","","Anju Kumari","","","","1500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2613","2613","Saanvi","","Balvatika-3","VENUS","sumitdagroli@gmail.com","8708084482","","","Female","2022-06-08","STSC","","","","2026-01-04","","16.00","102.00","Arawali","","","","Dagroli","","Sumit Kumar","","","","Ballu","","","","1000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2614","2614","MANVIKA","","Balvatika-3","MARS","","8930649800","","","Female","2023-03-22","GEN","","","","2026-01-04","","15.00","98.00","Shivalik","","","","DAGROLI","","Amit","","","","JYOTI","","","","6000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2615","2615","Anshika","","Balvatika-3","MARS","pradeepdara1291@gmail.com","8930074398","","","Female","2023-05-18","GEN","","","","2026-09-05","2026-09-05","17.00","90.00","","","","","","","Pardeep Kumar","","","","Seema","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2616","2616","Rishu","","Balvatika-3","MARS","ankushkadyan88@gmail.com","","","","Female","2022-01-25","GEN","","","","2026-09-05","2026-09-05","18.00","102.00","","","","","","","Ankush","","","","Monika","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2617","2617","AKSHITA","","Balvatika-3","VENUS","anoop.sheoran92@gmail.com","9728608458","","","Female","2023-05-23","GEN","","","","2026-01-04","","16.00","108.00","Nilgiri","","","","HANSAWAS KHURD.","","ANOOP SINGH","","","","PINKI","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2618","2618","NANCY","","Balvatika-3","VENUS","SunilKumar784082@gmail.com","8059476349","","","Female","2021-01-29","STSC","","","","2026-01-04","","15.00","107.00","Himalaya","","","","DAGROLI","","SUNIL KUMAR","","","","POONAM","","","","2700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2619","2619","DEVANSHI KALIRAWANA","","Balvatika-3","VENUS","priyankakaliravana64@gmail.com","9588315311","","","Female","2022-12-02","GEN","","","","2026-01-04","","12.00","93.00","Arawali","","","","DAGROLI","","Deepak Kaliravana","","","","Priyanka Kumari","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2620","2620","BHAVY","","Balvatika-3","VENUS","sangwankiran82@gmail.com","9728671445","","","Male","2022-03-25","GEN","","","","2026-01-04","","17.00","106.00","Shivalik","","","","CHANDWAS","","SONU","","","","KIRAN","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2621","2621","YUVI","","Balvatika-3","VENUS","Slamba339@gmail.com","8930377824","","","Female","2022-07-11","GEN","","","","2026-01-04","","16.00","100.00","Arawali","","","","RAMBASS","","SANDEEP","","","","MAMTA","","","","10200.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2622","2622","VANSH","","Balvatika-3","VENUS","sunilbhardwaj14596@gmail.com","9991932215","","","Male","2022-09-14","GEN","","","","2026-01-04","","12.00","93.00","Himalaya","","","","H. KHURD","","SUNIL","","","","MEENU","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2623","2623","PRACHI","","Balvatika-3","VENUS","Soniasheoran5466@gmail.com","9671749551","","","Female","2022-12-01","GEN","","","","2026-01-04","","13.00","92.00","Shivalik","","","","MANDHI HARIYA","","NAVEEN","","","","MANJEET KUMARI","","","","10200.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2624","2624","KUNAL SAWAN","","Balvatika-3","VENUS","amitsawan604@gmail.com","7412030293","","","Male","2022-10-15","STSC","","","","2026-01-04","","14.00","98.00","Shivalik","","","","DAGROLI","","AMIT KUMAR","","","","PARMILA","","","","6000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2625","2625","ANSHIKA THOLIA","","Balvatika-3","VENUS","vipinkumar37461@gmail.com","7419210733","","","Female","2022-12-23","GEN","","","","2026-01-04","","13.00","94.00","Himalaya","84","76","","BERLA","","SURESH","","","","KAMLESH","","","","7000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2626","2626","ISHA","","Balvatika-3","VENUS","Sanjayk6400@gmail.com","8607004376","","","Female","2023-07-27","GEN","","","","2026-01-04","","11.00","90.00","Himalaya","","","","BADESRA","","SANJAY KUMAR","","","","SONAM","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2627","2627","Gaurav","","Balvatika-3","VENUS","vijenderkumar9812490116@gmail.com","9812490116","","","Male","2022-10-07","BC-A","","","","2026-01-04","","14.00","100.00","Arawali","","","","BERLA","","VIJENDER SINGH","","","","MINAKESHI","","","","6500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2628","2628","NIDHI","","Balvatika-3","VENUS","ritubhambhu611@gmail.com","9518463196","","","Female","2023-10-11","GEN","","","","2026-01-04","","11.00","89.99","Nilgiri","","","","NIMAR BADESRA","","SANDEEP KUMAR","","","","SANTOSHI","","","","6000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""`;

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
  if (!raw || !raw.trim()) return "BALVATIKA 3";
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
