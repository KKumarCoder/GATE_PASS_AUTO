import mongoose from "mongoose";
import dotenv from "dotenv";
import { parse } from "csv-parse/sync";
import { Student } from "../models/index.js";

dotenv.config();

const csvData = `"Adm No","Roll No","First Name","Last Name","Class","Section","Email","Mobile","Aadhar Number","PEN Number","Gender","DOB","Caste","Category","Religion","Blood Group","Admission Date","Measurement Date","Weight","Height","House","Route List","Pickup Point","Hostel","Address","Room No","Father Name","Father Phone","Father Email","Father Occupation","Mother Name","Mother Phone","Mother Email","Mother Occupation","Discount Amt","Bank Account No","Bank Account Holder","Bank IFSC","Bank Name","Aadhaar (Doc)","Birth Cert (Doc)","Bank Passbook (Doc)","SSSMID (Doc)","Marksheet (Doc)","Transfer Certificate (TC)","Other Documents","RTE Status","RTE App No"
"150","150","TEJASWI AARYA","","10 th","VENUS","","9671904148","","","Male","2010-09-13","BC-A","","","","","","64.00","181.00","Arawali","69","58","","RUDROL","","LALIT PARKASH","","","","","","","","16000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"152","152","NIKITA","","10 th","VENUS","","9050045941","","","Female","2011-10-28","","","","","","","42.00","156.00","Shivalik","33","11","","BERLA","","DARSHAN KUMAR","","","","MAMTA","","","","16000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"157","157","PRAAKSHI","","10 th","MARS","","8816861339","","","Female","2010-05-24","GEN","","","","2017-04-01","","43.00","151.00","Arawali","84","76","","BERLA","","DINESH","","","","ANITA","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"160","160","MOHIT","","10 th","VENUS","","9813667603","","","Male","2012-02-09","","","","","","","67.00","162.00","Arawali","33","11","","BERLA","","MANOJ KUMAR","","","","MANJEET KAUR","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"164","164","RAKHI","","10 th","VENUS","","9671578896","","","Female","2011-03-14","BC- B","","","","","","56.00","164.00","Arawali","10","20","","NIHALGARH","","JAIPAL","","","","SUMAN","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"165","165","MONU","","10 th","VENUS","","9728271819","","","Male","2010-07-27","GEN","","","","","","52.00","168.00","Arawali","35","22","","BERLA","","KRISHAN","","","","SUSHILA","","","","16000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"167","167","MANVI","","10 th","MARS","","9919997865","","","Female","2010-06-09","STSC","","","","2017-04-01","","40.00","152.00","Shivalik","","","","FARIDAPUR","","AMIT KUMAR","","","","ARTI SAGAR","","","","15900.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"169","169","SONAKSHI","","10 th","VENUS","","9991683244","","","Female","2011-01-08","GEN","","","","","","52.00","165.00","Nilgiri","16","8","","BERLA","","SURENDER SINGH","","","","JYOTI","","","","23400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"172","172","DIYA","","10 th","VENUS","","8950321557","","","Female","2010-11-19","GEN","","","","","","55.00","165.00","Arawali","16","8","","BERLA","","JAIPAL","","","","BALA","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"175","175","RITIKA","","10 th","VENUS","","9091358824","","","Female","2011-07-24","GEN","","","","","","50.00","159.00","Arawali","","","","DHANASRI","","MANOJ KUMAR","","","","ANITA","","","","16900.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"325","325","SACHIN","","10 th","MARS","","9728115812","","","Male","2011-07-17","GEN","","","","2022-05-21","","58.00","171.00","Nilgiri","19","13","","CHANDWASS","","VIKASH","","","","USHA","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"375","375","POOJA","","10 th","VENUS","","9813154413","","","Female","2010-06-17","GEN","","","","2022-07-26","","37.00","151.00","Shivalik","65","54","","PICHOPA KHURD","","VIJAY","","","","MUNESH","","","","16000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"389","389","RITU","","10 th","MARS","","9992173091","","","Female","2011-04-09","GEN","","","","2022-08-05","","39.00","150.00","Himalaya","","","","DHANASRI","","RAVINDER","","","","KAVITA","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"404","404","HARSH KUMAR KATEHA","","10 th","VENUS","","7898895218","","","Male","2011-09-10","GEN","","","","2022-09-23","","50.00","160.00","Himalaya","40","27","","BILHA MP","","DYASANKAR KATEHA","","","","RANI KATEHA","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"448","448","MAHAK","","10 th","VENUS","","9813398626","","","Female","2012-04-05","GEN","","","","2023-05-13","","54.00","159.00","Nilgiri","49","36","","KADMA","","SANDEEP KUMAR","","","","ANNU","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"489","489","NISHA","","10 th","VENUS","","9813755385","","","Female","2011-05-11","GEN","","","","","","60.00","160.00","Nilgiri","34","15","","DAGROLI","","AMIT KUMAR","","","","NEETU","","","","17825.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"599","599","GEETU","","10 th","VENUS","","9813506343","","","Female","2011-07-18","GEN","","","","","","52.00","155.00","Shivalik","49","36","","KADMA","","DEVENDER","","","","DARSHANA","","","","18250.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"743","743","ANJALI","","10 th","MARS","","9671852002","","","Female","2010-07-08","GEN","","","","2025-05-14","","50.00","158.00","Himalaya","","","","PACHGAON","","SOMVIR","","","","MONIKA","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"863","863","BHARTI","","10 th","VENUS","","8685806831","","","Female","2011-11-27","GEN","","","","","","51.00","160.00","Shivalik","20","16","","DALAWASS","","SANDEEP KUMAR","","","","KRIPA DEVI","","","","15200.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"864","864","KHUSHI CHAHAL","","10 th","VENUS","","9350241959","","","Female","2011-03-29","GEN","","","","","","50.00","153.00","Shivalik","","","","NIMAR","","KULDEEP KUMAR","","","","REETU KUMARI","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261001","261001","MUKUL","","10 th","MARS","","8930533281","","","Male","2011-03-18","GEN","","","","","","58.00","157.00","Shivalik","72","61","","SHISHWALA","","ANTRAM","","","","POOJA","","","","17825.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261002","261002","DEEPIT","","10 th","MARS","","9813899524","","","Male","2011-06-22","GEN","","","","","","55.00","164.00","Arawali","84","76","","BERLA","","SURESH KUMAR","","","","ANITA","","","","22400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261003","261003","ANNU","","10 th","MARS","","8053293700","","","Female","2010-11-25","GEN","","","","","","39.00","154.00","Nilgiri","","","","BERLA","","SATYAWAN","","","","BABITA","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261004","261004","LAKSHYA","","10 th","MARS","","9812418577","","","Female","2010-11-19","GEN","","","","","","40.00","157.00","Arawali","","","","CHANDWAS","","KULDEEP","","","","SUMAN","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261005","261005","PRINCE","","10 th","MARS","","9812922450","","","Male","2011-06-10","GEN","","","","","","72.00","175.00","Himalaya","50","37","","KADMA","","NARENDER","","","","LAKSHMI","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261006","261006","BHUPESH","","10 th","MARS","","8930042050","","","Male","2011-09-07","GEN","","","","","","67.00","176.00","Himalaya","31","18","","DAGROLI","","SOMBIR","","","","MINAKSHI","","","","18950.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261007","261007","HIMANSHU","","10 th","MARS","","8683957795","","","Male","2011-10-28","GEN","","","","","","55.00","160.00","Shivalik","72","61","","SHISHWALA","","MAAN SINGH","","","","SONAM","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261008","261008","HARSHIT","","10 th","MARS","","8527046577","","","Male","2010-06-12","GEN","","","","","","47.00","165.00","Arawali","38","25","","GOPALWAS","","PRADEEP","","","","MEENA","","","","25650.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261010","261010","SAKSHI","","10 th","MARS","","9306903936","","","Female","2011-01-30","GEN","","","","","","60.00","158.00","Arawali","49","36","","BADRAI","","ANIL","","","","MANJU","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261011","261011","DEEPANSHU","","10 th","MARS","","7056927484","","","Male","2011-02-07","GEN","","","","","","50.00","165.00","Nilgiri","","","","RAMBASS","","DHARMBIR","","","","MONIKA","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261012","261012","AMAN","","10 th","MARS","","9991044145","","","Male","2011-08-18","GEN","","","","","","62.00","173.00","Himalaya","17","9","","BERLA","","SATISH","","","","GEETA","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261013","261013","RAJNISH","","10 th","MARS","","9813875947","","","Male","2010-09-12","STSC","","","","","","51.00","165.00","Nilgiri","33","11","","BERLA","","KRISHAN KUMAR","","","","KAMLESH","","","","13450.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261014","261014","JESHIKA","","10 th","MARS","dharmenderturner@gmail.com","9812793322","","","Female","2011-10-29","GEN","","","","","","37.00","159.00","Arawali","","","","BALALI","","DHARMENDER KUMAR","","","","SHARMILA","","","","17400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261015","261015","CHIRAG","","10 th","MARS","","9813178902","","","Male","2011-08-17","GEN","","","","","","71.00","155.00","Himalaya","45","32","","JEWALI","","SANJAY","","","","KAVITA","","","","16700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261016","261016","SAKSHI","","10 th","MARS","","8930516428","","","Female","2012-06-26","GEN","","","","","","58.00","159.00","Himalaya","69","58","","RUDROL","","SANDEEP","","","","KAVITA","","","","15900.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"261017","261017","ANSHUL","","10 th","MARS","drsberla5@gmail.com","9728154504","","","Male","2012-03-29","STSC","","","","","","46.00","169.00","Himalaya","","","","BERLA","","SOMBIR","","","","MANISHA","","","","23400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"271009","271009","SANDHYA KUMARI","","10 th","MARS","parveen9822881008@gmail.com","9812881008","","","Female","2012-08-16","GEN","","","","","","47.00","163.00","Himalaya","","","","RAMBASS","","PARVEEN KUMAR","","","","SAROJ BALA","","","","23400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""`;

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
  const rawClass = row["Class"] ? String(row["Class"]).replace(/\s*(st|nd|rd|th)$/i, "").trim() : "10";
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
