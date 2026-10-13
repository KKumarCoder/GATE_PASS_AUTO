import mongoose from "mongoose";
import dotenv from "dotenv";
import { parse } from "csv-parse/sync";
import { Student } from "../models/index.js";

dotenv.config();

const csvData = `"Adm No","Roll No","First Name","Last Name","Class","Section","Email","Mobile","Aadhar Number","PEN Number","Gender","DOB","Caste","Category","Religion","Blood Group","Admission Date","Measurement Date","Weight","Height","House","Route List","Pickup Point","Hostel","Address","Room No","Father Name","Father Phone","Father Email","Father Occupation","Mother Name","Mother Phone","Mother Email","Mother Occupation","Discount Amt","Bank Account No","Bank Account Holder","Bank IFSC","Bank Name","Aadhaar (Doc)","Birth Cert (Doc)","Bank Passbook (Doc)","SSSMID (Doc)","Marksheet (Doc)","Transfer Certificate (TC)","Other Documents","RTE Status","RTE App No"
"34","34","ASHISH KALA","","7 th","MARS","","6350398142","","","Male","2014-07-21","STSC","","","","","","39.00","147.00","Himalaya","34","15","","DAGROLI","","DILBAG","","","","USHA","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"35","35","SAKSHI","","7 th","VENUS","","9812842134","","","Female","2014-07-15","GEN","","","","","","41.00","150.00","Arawali","","","","BERLA","","YOGESH","","","","MEENU","","","","6500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"36","36","BARKHA","","7 th","VENUS","","9813245753","","","Female","2014-09-16","GEN","","","","","","40.00","153.00","Nilgiri","63","52","","NIMAR","","SUMIT KUMAR","","","","MONIKA","","","","18300.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"38","38","KAMNA","","7 th","VENUS","","9812318266","","","Female","2014-08-09","GEN","","","","","","39.00","150.00","Arawali","58","46","","M.HARIYA","","RINKU","","","","KAVITA","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"40","40","GAURAV","","7 th","MARS","","9050026427","","","Male","2013-05-31","GEN","","","","","","29.00","136.97","Arawali","84","76","","BERLA","","BHUP SINGH","","","","MANJEET KUMARI","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"41","41","PRATEEK","","7 th","VENUS","","9813153153","","","Male","2014-09-24","GEN","","","","","","32.00","145.00","Nilgiri","16","8","","BERLA","","RANVEER","","","","MANJIT KOUR","","","","13000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"42","42","YASHIKA","","7 th","VENUS","","9812627479","","","Female","2013-08-18","GEN","","","","","","34.00","140.00","Nilgiri","35","22","","BERLA","","PRADEEP","","","","CHANCHAL","","","","13000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"44","44","HIMANSHU","","7 th","VENUS","","8221931736","","","Male","2014-09-19","GEN","","","","","","47.00","151.00","Nilgiri","","","","DAGROLI","","VIJENDER","","","","SUMAN KUMARI","","","","13000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"45","45","DEVESH","","7 th","MARS","","9991023743","","","Male","2014-05-25","BC- B","","","","","","29.00","138.00","Shivalik","10","20","","NIHALGARH","","MAHENDER KUMAR","","","","SHEELA","","","","14350.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"46","46","VINIT","","7 th","MARS","","9992173091","","","Male","2014-12-05","GEN","","","","","","26.00","133.00","Arawali","4","21","","DHANASRI","","RAVINDER","","","","KAVITA","","","","14350.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"47","47","SNEHA","","7 th","VENUS","","9813405991","","","Female","2014-02-21","GEN","","","","","","38.00","153.00","Himalaya","16","8","","BADRAI","","RAMBIR","","","","SONU","","","","13000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"49","49","MANSI KALIRAWANA","","7 th","VENUS","","9518231272","","","Female","2014-08-04","GEN","","","","","","28.00","145.00","Arawali","34","15","","DAGROLI","","SOMVIR SINGH","","","","JYOTI","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"50","50","MANEET","","7 th","VENUS","","9050431146","","","Male","2015-04-28","GEN","","","","","","31.00","145.00","Arawali","","","","KADMA","","DINESH KUMAR","","","","SONU KUMARI","","","","20000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"52","52","AMIT","","7 th","MARS","","8053607790","","","Male","2012-06-18","GEN","","","","","","32.00","143.00","Nilgiri","72","61","","SHISWALA","","RAJESH","","","","SUMAN","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"53","53","SHIYA","","7 th","MARS","","8397863481","","","Female","2014-08-06","GEN","","","","","","32.00","138.00","Arawali","33","11","","BERLA","","SUKHBIR","","","","KAVITA","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"55","55","RONAK","","7 th","MARS","","8059939172","","","Male","2014-09-27","STSC","","","","","","26.00","140.00","Arawali","","","","NANDHA","","VIKRAM SINGH","","","","REKHA DEVI","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"56","56","HAPPY","","7 th","VENUS","","9050216682","","","Male","2012-12-29","GEN","","","","","","40.00","151.00","Shivalik","35","22","","BERLA","","NAVDEEP","","","","ASHA","","","","13000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"58","58","MANSI","","7 th","MARS","","8930581595","","","Female","2014-08-26","GEN","","","","","","46.00","150.00","Shivalik","72","61","","SHISWALA","","ANTRAM","","","","POOJA","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"59","59","ABHIMANYU","","7 th","VENUS","","8571024539","","","Male","2014-04-29","GEN","","","","","","44.00","151.00","Arawali","","","","BERLA","","RAHUL KUMAR","","","","MANISHA","","","","12300.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"61","61","KRISHA","","7 th","MARS","","8839329557","","","Female","2015-05-22","GEN","","","","","","32.00","141.00","Himalaya","","","","BERLA","","ASHOK KUMAR","","","","RITU KUMARI","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"64","64","NITIN","","7 th","MARS","","9812738129","","","Male","2014-10-27","GEN","","","","","","28.00","144.99","Arawali","58","46","","M.HARIYA","","KULDEEP","","","","NEELAM","","","","14350.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"65","65","YOGITA","","7 th","MARS","","8930528400","","","Female","2013-12-31","GEN","","","","","","30.00","140.00","Himalaya","","","","DAGROLI","","PAREEP KUMAR","","","","SUMAN","","","","12700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"66","66","SAMEER","","7 th","VENUS","","8930137238","","","Male","2014-09-05","GEN","","","","","","36.00","147.00","Nilgiri","84","76","","BERLA","","DHARMESH","","","","SAVITA","","","","13000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"71","71","NILAKSHI","","7 th","VENUS","","9991683244","","","Female","2014-09-29","GEN","","","","","","29.00","143.00","Nilgiri","16","8","","BERLA","","SURENDER SINGH","","","","JYOTI","","","","19500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"72","72","RATIN","","7 th","MARS","","9812206796","","","Male","2014-02-08","STSC","","","","","","30.00","141.00","Nilgiri","58","46","","M.HARIYA","","ANIL","","","","RAJ KAMAL","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"298","298","ISHU","","7 th","MARS","","9991853008","","","Female","2014-10-11","BC- B","","","","","","54.00","157.00","Nilgiri","","","","DADRI","","SUNIL KUMAR YADAV","","","","POONAM","","","","13100.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"301","301","NEHA","","7 th","VENUS","","8816805851","","","Female","2013-08-08","GEN","","","","","","45.00","153.00","Shivalik","47","34","","BADHRA","","VIKASH","","","","PRAVEEN LATA","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"370","370","ANSH","","7 th","VENUS","","9813154413","","","Male","2014-01-02","GEN","","","","","","31.00","145.00","Nilgiri","65","54","","PICHOPA KHURD","","VIJAY","","","","MUNESH","","","","13850.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"372","372","PRINSH","","7 th","VENUS","","9812136431","","","Male","2013-07-06","GEN","","","","","","49.00","154.00","Himalaya","65","54","","PICHOPA KHURD","","CHARAN SINGH","","","","ANJU","","","","13000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"393","393","ISHU","","7 th","MARS","","9991886642","","","Female","2014-07-21","GEN","","","","","","38.00","145.00","Arawali","69","58","","RUDROL","","SUNIL","","","","KAVITA","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"403","403","RISHABH KALA","","7 th","MARS","","9350622570","","","Male","2014-11-22","STSC","","","","","","27.00","137.00","Shivalik","34","15","","DAGROLI","","RINKU KUMAR","","","","MONIKA","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"415","415","HIMANSHU","","7 th","MARS","","9671753609","","","Male","2014-07-01","GEN","","","","","","43.00","146.00","Himalaya","33","11","","BERLA","","SANJAY","","","","POOJA","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"441","441","KRISH","","7 th","MARS","","9817175923","","","Male","2015-02-25","GEN","","","","","","34.00","143.98","Nilgiri","15","7","","BALALI","","RAJESH KUMAR","","","","ANITA","","","","14350.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"447","447","KARISH","","7 th","VENUS","","9306003280","","","Male","2014-02-12","GEN","","","","","","56.00","154.00","Nilgiri","49","36","","KADMA","","SANDEEP KUMAR","","","","ANNU","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"598","598","VINIT KUMAR","","7 th","MARS","","9813506343","","","Male","2014-08-19","GEN","","","","","","33.00","147.00","Shivalik","49","36","","KADMA","","DEVENDER SINGH","","","","DARSHANA","","","","15200.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"604","604","KIRTI","","7 th","VENUS","","7027474151","","","Female","2013-07-08","BC- B","","","","","","33.00","150.00","Nilgiri","49","36","","KADMA","","VIKASH","","","","SHARMILA DEVI","","","","13000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"727","727","YASH BHAMBHU","","7 th","MARS","","8059088893","","","Male","2014-10-27","GEN","","","","","","38.00","146.00","Nilgiri","63","52","","BADESHRA","","PARVESH KUMAR","","","","SOMVATI","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"730","730","NAITIK DHINDHWAL","","7 th","VENUS","","9813140989","","","Male","2014-07-09","GEN","","","","","","35.00","144.00","Nilgiri","16","8","","BARAI","","VIJAY KUMAR","","","","MANISHA","","","","13000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"733","733","VICKY POONIA","","7 th","VENUS","","9813245869","","","Male","2014-03-08","GEN","","","","","","33.00","147.00","Shivalik","84","76","","BERLA","","RAVINDER KUMAR","","","","MEHARVINE","","","","14350.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"735","735","MAHI","","7 th","MARS","","9350670934","","","Female","2014-05-07","GEN","","","","","","41.00","151.00","Arawali","51","38","","KALALI","","NARENDER","","","","MUNESH","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"744","744","MAISHA","","7 th","VENUS","","8930078902","","","Female","2014-06-04","GEN","","","","","","34.00","134.00","Himalaya","45","32","","JEWALI","","SANJAY","","","","KAVITA","","","","14350.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"759","759","ISHANT","","7 th","MARS","","8930683536","","","Male","2014-03-07","GEN","","","","","","43.00","146.00","Himalaya","","","","DAGROLI","","PARDEEP","","","","SUMMA","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"834","834","NAMAN","","7 th","MARS","","9991772177","","","Male","2014-03-22","GEN","","","","","","44.00","147.00","Shivalik","16","8","","BADRAI","","HANSRAJ","","","","SUSHILA","","","","15200.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25701","25701","Komal","","7 th","VENUS","","8199991076","","","Female","2014-03-11","GEN","","Hindu","","","","35.00","157.00","Arawali","","","","Tikan Kalan","","SUKHENDER","","","","PRIYANKA","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"26701","26701","ANSHU","","7 th","MARS","","8053364004","","","Female","2014-08-17","GEN","","","","","","64.00","151.00","Himalaya","82","72","","KANHRA","","AMIT","","","","MUNNI","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"26702","26702","AKSHIT","","7 th","MARS","","9416891378","","","Male","2014-02-04","GEN","","","","","","34.00","148.00","Shivalik","19","13","","CHANDWAS","","SATISH KUMAR","","","","SAROJ KUMARI","","","","14350.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"26703","26703","HARSHIT","","7 th","MARS","","9991724344","","","Male","2015-03-02","GEN","","","","","","34.00","152.00","Himalaya","16","8","","BERLA","","SANJU","","","","POONAM","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""`;

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
  const rawClass = row["Class"] ? String(row["Class"]).replace(/\s*(st|nd|rd|th)$/i, "").trim() : "7";
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
    candidateEmail = candidateEmail.trim().toLowerCase();
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
  let skipped = 0;

  for (const raw of rows) {
    const s = formatStudent(raw);
    const existing = await Student.findOne({ admissionNumber: s.admissionNumber });
    if (existing) {
      console.log(`Student ${s.admissionNumber} (${s.name}) already exists. Skipping.`);
      skipped++;
    } else {
      await Student.create(s);
      console.log(`Added student ${s.admissionNumber}: ${s.name} (Class ${s.className}-${s.section}, Mobile: ${s.primaryMobile}, Email: ${s.email})`);
      added++;
    }
  }

  console.log(`\nImport complete! Added: ${added}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Error importing students:", err);
  process.exit(1);
});
