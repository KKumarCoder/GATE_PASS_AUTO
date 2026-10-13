import mongoose from "mongoose";
import dotenv from "dotenv";
import { parse } from "csv-parse/sync";
import { Student } from "../models/index.js";

dotenv.config();

const csvData = `"Adm No","Roll No","First Name","Last Name","Class","Section","Email","Mobile","Aadhar Number","PEN Number","Gender","DOB","Caste","Category","Religion","Blood Group","Admission Date","Measurement Date","Weight","Height","House","Route List","Pickup Point","Hostel","Address","Room No","Father Name","Father Phone","Father Email","Father Occupation","Mother Name","Mother Phone","Mother Email","Mother Occupation","Discount Amt","Bank Account No","Bank Account Holder","Bank IFSC","Bank Name","Aadhaar (Doc)","Birth Cert (Doc)","Bank Passbook (Doc)","SSSMID (Doc)","Marksheet (Doc)","Transfer Certificate (TC)","Other Documents","RTE Status","RTE App No"
"115","115","AYASHA","","9 th","VENUS","kuldeepkumar3280@gmail.com","9812321266","","","Female","2012-11-01","GEN","","","","2018-04-01","","51.00","165.00","Nilgiri","16","8","","BADRAI","","KULDEEP KUMAR","","","","ARCHANA","","","","16000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"116","116","ANJALI","","9 th","MARS","","9711884630","","","Female","2010-08-10","GEN","","","","2019-05-13","","37.00","150.00","Shivalik","69","58","","RUDROL","","MANOJ KUMAR","","","","ASHA DEVI","","","","25700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"117","117","YASHU","","9 th","MARS","","7015456517","","","Male","2011-07-14","GEN","","","","2018-05-10","","53.00","151.00","Nilgiri","34","15","","DAGROLI","","PARDEEP KUMAR","","","","ASHA","","","","17750.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"118","118","LALITA","","9 th","MARS","","9813409636","","","Female","2012-09-06","GEN","","","","2018-04-01","","45.00","165.00","Shivalik","34","15","","DAGROLI","","SURESH","","","","PARMILA","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"121","121","PRIYA","","9 th","VENUS","harenderluhach8@gmail.com","8396027303","","","Female","2011-08-24","GEN","","","","2018-04-01","","45.00","153.00","","60","49","","NANDHA","","HARENDER","","","","SUNITA","","","","18800.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"126","126","LOKESH","","9 th","MARS","mahender1585@gmail.com","9991023743","","","Male","2011-11-23","","","","","2018-04-01","","38.00","156.00","Shivalik","10","20","","NIHALGARH","","MAHENDER KUMAR","","","","SHEELA DEVI","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"127","127","KHUSHI","","9 th","VENUS","ronakkumar80594@gmail.com","8059439172","","","Female","2011-06-01","STSC","","","","2018-04-01","","38.00","153.00","Arawali","","","","NANDHA","","VIKRAM","","","","REKHA","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"128","128","USHA","","9 th","MARS","","9992346946","","","Female","2012-06-17","GEN","","Hindu","","2018-04-01","","41.00","153.00","Arawali","33","11","","BERLA","","JASWANT SINGH","","","","RAJBALA","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"129","129","HIMANSHU","","9 th","VENUS","jagvirsingh13rr@gmail.com","9813774813","","","Male","2012-04-01","","","","","2018-04-01","","43.00","166.00","Himalaya","34","","","DAGROLI","","JAGVIR SINGH","","","","MAMTA","","","","16000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"135","135","KHUSHI","","9 th","VENUS","anu30091988@gmail.com","9910420670","","","Female","2013-02-09","BC-A","","","","2021-09-25","","51.00","151.00","Shivalik","","","","BADHRA","","VIKASH","","","","ANITA","","","","20800.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"137","137","MANSU","","9 th","MARS","","9812312009","","","Female","2012-06-26","GEN","","","","2018-04-01","","36.00","152.00","Shivalik","","","","KANHRA","","MUKESH KUMAR","","","","VIJETA","","","","25700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"138","138","TANNU","","9 th","VENUS","surender2644@gmail.com","9643582644","","","Female","2011-12-22","GEN","","","","2019-05-13","","46.00","156.00","Nilgiri","34","15","","DAGROLI","","SURENDER","","","","KAVITA","","","","20800.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"140","140","KANIKA","","9 th","VENUS","jitendersheoran@gmail.com","9813582206","","","Female","2012-12-01","GEN","","","","2018-04-01","","51.00","150.00","Nilgiri","45","32","","JEWALI","","JITENDER","","","","KIRAN","","","","16000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"142","142","SUBHAM","","9 th","MARS","","9812331071","","","Male","2011-11-23","GEN","","","","2018-04-01","","40.00","157.00","Himalaya","40","27","","HANSAWAS KALAN","","SUNIL","","","","MANJEETA","","","","17750.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"143","143","BHUMIKA","","9 th","VENUS","","7027553652","","","Female","2012-08-26","GEN","","","","2021-12-21","","55.00","161.00","Shivalik","35","22","","BERLA","","NARESH KUMAR","","","","MUKESH","","","","25700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"144","144","PULKIT","","9 th","MARS","","7027727003","","","Male","2012-09-17","GEN","","","","2018-04-01","","55.00","174.00","Arawali","84","76","","BERLA","","KULDEEP","","","","MUKESH","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"145","145","ROHIT ASSIWAL","","9 th","MARS","","9992334175","","","Male","2012-06-02","GEN","","","","2018-04-01","","68.00","166.00","Shivalik","33","11","","BERLA","","HEMANT","","","","SUMITRA","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"146","146","NAVYA","","9 th","MARS","","9813912845","","","Female","2012-02-17","BC- B","","","","2018-04-01","","68.00","165.00","Arawali","58","46","","M.HARIYA","","DHARMENDER","","","","SARITA","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"148","148","SONI","","9 th","MARS","","8053815466","","","Female","2012-05-24","GEN","","","","2018-08-21","","41.00","157.00","Nilgiri","57","45","","M.HARIYA","","SUKHVENDER","","","","MONIKA","","","","21500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"149","149","PAYAL","","9 th","VENUS","","9817075476","","","Female","2011-05-01","STSC","","","","2018-08-21","","46.00","157.00","Nilgiri","60","49","","NANDHA","","CHIMANLAL","","","","MANJU","","","","16000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"173","173","SONASKHI","","9 th","MARS","","8397863481","","","Female","2011-01-21","GEN","","","","2011-09-28","","45.00","158.00","Shivalik","33","11","","BERLA","","SUKHBIR","","","","KAVITA","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"357","357","SAKINA","","9 th","MARS","","9992479117","","","Female","2011-11-10","GEN","","","","2022-07-02","","54.00","159.00","Shivalik","68","57","","RAMBASS","","CHANDERVESH","","","","MONIKA","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"409","409","PRIYANSHU KUMAR","","9 th","MARS","","8708385013","","","Male","2012-11-10","GEN","","","","2022-09-23","","42.00","156.00","Arawali","84","76","","BERLA","","DEVENDER SINGH","","","","ANITA","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"503","503","GARIMA","","9 th","MARS","","9306017074","","","Female","2013-04-06","GEN","","","","2023-07-04","","45.00","157.00","Himalaya","54","42","","KUBJA NAGAR","","SUNIL KUMAR","","","","ASMITA","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"528","528","DIPANSHU","","9 th","VENUS","","8814845200","","","Male","2012-11-23","GEN","","","","2023-07-31","","37.00","156.00","Himalaya","","","","SARANGPUR","","SOMBIR SINGH","","","","PRIYANKA","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"590","590","PRIYANSHU","","9 th","VENUS","pnkjkr071@gmail.com","9797214811","","","Male","2011-11-23","STSC","","","","2024-04-01","","46.00","170.00","Arawali","34","15","","DAGROLI","","PANKAJ KUMAR","","","","POONAM","","","","16000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"642","642","MADHU","","9 th","MARS","","8130523852","","","Female","2012-09-21","GEN","","","","2024-08-03","","36.00","155.00","Arawali","82","72","","KANHRA","","DALBIR SINGH","","","","ANJU DEVI","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"643","643","BHUMI","","9 th","VENUS","bhumii280812@gmail.com","9416891378","","","Female","2012-08-28","","","","","2026-08-01","","51.00","160.91","Arawali","19","","","CHANDWAS","","SATISH KUMAR","","","","SAROJ KUMARI","","","","16000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"732","732","DAVIN","","9 th","MARS","","9728296800","","","Male","2012-08-17","GEN","","","","2025-04-24","","54.00","170.00","Nilgiri","49","36","","BADRAI","","ANIL KUMAR","","","","MANJU","","","","17750.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"734","734","RIYA","","9 th","MARS","","9813245869","","","Female","2011-05-15","GEN","","","","2025-04-30","","32.00","150.00","Shivalik","84","76","","BERLA","","RAVINDER KUMAR","","","","MEHAR DEVI","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"741","741","KARTIK","","9 th","VENUS","","9350670934","","","Male","2011-10-18","GEN","","","","2025-05-09","","59.00","170.00","Himalaya","51","38","","KALALI","","SOMBIR","","","","SONIYA","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"742","742","KAPIL","","9 th","VENUS","vk7186825@gmail.com","9350670934","","","Male","2011-10-18","GEN","","","","2025-05-09","","42.00","150.60","Himalaya","51","38","","KALALI","","SOMBIR","","","","SONIYA","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"748","748","HARSH","","9 th","MARS","","9717084076","","","Male","2012-08-15","GEN","","","","2025-05-20","","48.00","162.00","Himalaya","82","72","","KANHRA","","VIKASH KUMAR","","","","SUREKHA DEVI","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"749","749","MINAKSHI","","9 th","MARS","","9306855824","","","Female","2012-02-08","GEN","","","","2025-05-20","","41.00","163.00","Himalaya","82","72","","KANHRA","","ARVIND","","","","REKHA KUMARI","","","","13700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"760","760","DIPESH","","9 th","MARS","","8816806136","","","Male","2011-01-21","GEN","","","","2025-05-22","","37.00","152.00","Nilgiri","","","","DAGROLI","","ANIL","","","","BABITA","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"770","770","HARDIK","","9 th","MARS","","7404633989","","","Male","2011-12-14","GEN","","","","2025-06-02","","68.00","167.00","Arawali","","","","ADAMPUR","","ANIL","","","","MONI RANI","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"786","786","TAMANNA","","9 th","MARS","","8053843200","","","Female","2011-07-11","GEN","","","","2025-07-22","","50.00","163.00","Himalaya","56","44","","MAI KALAN","","VIJENDER KUMAR","","","","MEENA DEVI","","","","20200.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"836","836","KRISH","","9 th","VENUS","Krish4701@gmail.com","8689078382","","","Male","2012-09-09","GEN","","","","0026-04-01","","48.00","165.00","Arawali","49","36","","KADMA","","MANJEET KUMAR","","","","MEENAKSHI","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"839","839","NIKHIL","","9 th","MARS","","9728272651","","","Male","2013-01-17","GEN","","","","2026-04-07","","35.00","159.00","Arawali","19","13","","CHANDWAS","","FATE SINGH","","","","POOJA","","","","23000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"851","851","AJAY KUMAR","","9 th","MARS","Sonikasagwan007@gmail.com","9050553759","","","Male","2012-02-01","GEN","","","","0026-04-22","","52.00","164.00","Arawali","65","54","","PICHOPA KHURD","","VIJAY KUMAR","","","","KRISHNA","","","","9600.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"855","855","VIVEK","","9 th","MARS","","9813571775","","","Male","2012-03-29","BC-A","","","","0026-05-01","","50.00","157.00","Arawali","33","11","","BERLA","","JAYPAL","","","","GEETA DEVI","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"878","878","NEERAJ KUMAR","","9 th","MARS","","9812061981","","","Male","2013-01-24","GEN","","","","0026-06-01","","36.00","154.00","Arawali","33","11","","BERLA","","RAJESH KUMAR","","","","SUSHILA DEVI","","","","700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"26901","26901","SAMIKSHA","","9 th","VENUS","nkdhindhwal2000@gmail.com","9053912522","","","Female","2011-11-05","GEN","","","","","","43.00","151.00","Nilgiri","16","8","","BADRAI","","SUDESH KUMAR","","","","SUMAN KUMARI","","","","20350.00","","","","","No","No","No","No","No","No","No","Non-RTE",""`;

function parseDOB(raw) {
  if (!raw || !raw.trim()) return undefined;
  let clean = raw.trim();
  if (/^00(\d{2})-(.*)$/.test(clean)) {
    clean = clean.replace(/^00(\d{2})-(.*)$/, "20$1-$2");
  }
  const d = new Date(`${clean}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? undefined : d;
}

function formatStudent(row) {
  const adm = String(row["Adm No"]).trim();
  const roll = String(row["Roll No"] || adm).trim();
  const name = [row["First Name"], row["Last Name"]].filter(Boolean).join(" ").trim().toUpperCase();
  const rawClass = row["Class"] ? String(row["Class"]).replace(/\s*(st|nd|rd|th)$/i, "").trim() : "9";
  const section = String(row["Section"] || "").trim().toUpperCase();
  const rawAddress = String(row["Address"] || "").replace(/[\r\n]+/g, " ").trim();
  const village = rawAddress ? rawAddress.toUpperCase() : "Not recorded";
  
  const cleanMobile = String(row["Mobile"] || "").replace(/\D/g, "");
  const primaryMobile = cleanMobile.length === 10 ? `+91${cleanMobile}` : cleanMobile.startsWith("91") && cleanMobile.length === 12 ? `+${cleanMobile}` : `+91${cleanMobile}`;
  
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
    fatherName: (row["Father Name"] && row["Father Name"].trim()) ? row["Father Name"].trim().toUpperCase() : "",
    motherName: (row["Mother Name"] && row["Mother Name"].trim()) ? row["Mother Name"].trim().toUpperCase() : "",
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
