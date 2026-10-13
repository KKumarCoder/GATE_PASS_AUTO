import mongoose from "mongoose";
import dotenv from "dotenv";
import { parse } from "csv-parse/sync";
import { Student } from "../models/index.js";

dotenv.config();

const csvData = `"Adm No","Roll No","First Name","Last Name","Class","Section","Email","Mobile","Aadhar Number","PEN Number","Gender","DOB","Caste","Category","Religion","Blood Group","Admission Date","Measurement Date","Weight","Height","House","Route List","Pickup Point","Hostel","Address","Room No","Father Name","Father Phone","Father Email","Father Occupation","Mother Name","Mother Phone","Mother Email","Mother Occupation","Discount Amt","Bank Account No","Bank Account Holder","Bank IFSC","Bank Name","Aadhaar (Doc)","Birth Cert (Doc)","Bank Passbook (Doc)","SSSMID (Doc)","Marksheet (Doc)","Transfer Certificate (TC)","Other Documents","RTE Status","RTE App No"
"3","3","SAANVI","","6 th","VENUS","","8839329557","","","Female","2016-12-07","GEN","","","","2026-08-26","2026-08-26","30.00","140.00","Shivalik","","","","BERLA","","Ashok Kumar","","","","Ritu Kumari","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"4","4","YUVIKA","CHAHAL","6 th","VENUS","","9817537001","","","Female","2015-08-07","GEN","","","","2026-04-01","2026-08-26","40.00","145.00","Arawali","","","","NIMAR BADESRA","","Parvesh","","","","Rajni","","","","12200.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"8","8","YASH KUMAR","","6 th","MARS","","9050589690","","","Male","2015-06-04","GEN","","","","2021-05-01","","24.00","124.00","Nilgiri","33","11","","BERLA","","MUKESH KUMAR","","","","MANJU","","","","20000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"10","10","JANAVI","","6 th","MARS","aartisagar9621@gmail.com","9919997865","","","Female","2015-01-01","STSC","","","","2021-05-01","","31.00","144.99","Himalaya","","","","KANHRA","","AMIT KUMAR","","","","ARTI SAGAR","","","","13600.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"11","11","SAEENA","","6 th","MARS","","9671015225","","","Female","2016-04-05","STSC","","","","2021-05-01","","35.00","137.00","Nilgiri","33","11","","BERLA","","SANDEEP KUMAR","","","","SANGEETA","","","","13600.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"12","12","RITIK","","6 th","VENUS","","8684851067","","","Male","2015-07-08","GEN","","","","0021-05-01","","39.00","143.00","Nilgiri","16","8","","BADRAI","","RAMBIR SINGH","","","","SONU","","","","13900.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"13","13","PAREET DHILLON","","6 th","VENUS","","9812881008","","","Male","2015-11-08","GEN","","","","0021-05-01","","40.00","150.00","Shivalik","","","","RAMBASS","","PARVEEN KUMAR","","","","SAROJ BALA","","","","19200.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"14","14","KRISH","","6 th","VENUS","","9050655699","","","Male","2015-11-28","OBC","","","","2021-09-25","","25.00","135.00","Arawali","33","11","","BERLA","","RAKESH KUMAR","","","","SWETA","","","","13600.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"15","15","ISHIKA","","6 th","MARS","sunil784082@gmail.com","8059476349","","","Female","2014-10-18","STSC","","","","2021-05-01","","26.00","145.00","Himalaya","","","","DAGROLI","","SUNIL","","","","POONAM","","","","18400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"17","17","PRATEEK","","6 th","MARS","","8168218175","","","Male","2016-01-28","GEN","","","","2021-05-01","","27.00","133.00","Arawali","","","","HUI","","BALRAM","","","","RAJBALA","","","","21600.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"19","19","JATIN","","6 th","VENUS","","9812629479","","","Male","2015-03-16","GEN","","","","2021-05-01","","32.00","142.00","Nilgiri","35","22","","BERLA","","PARDEEP KUMAR","","","","CHANCHAL","","","","13900.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"21","21","MIKIN","","6 th","MARS","","9813175018","","","Male","2016-01-27","GEN","","","","2021-05-01","","36.00","142.00","Himalaya","33","11","","BERLA","","PAWAN","","","","REENA","","","","15200.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"23","23","LOKESH KUMAR","","6 th","VENUS","","8168156686","","","Male","2014-09-13","STSC","","","","","","50.00","150.00","Himalaya","33","11","","BERLA","","HEMANT KUMAR","","","","SUMITRA","","","","800.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"24","24","KRISH SHEORAN","","6 th","MARS","satyanderk558@gmail.com","9050865854","","","Male","2014-12-25","GEN","","","","2021-05-01","","30.00","140.00","Arawali","35","22","","BERLA","","SATYANDER KUMAR","","","","ANJU","","","","13600.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25","25","YASH","","6 th","MARS","singladarshan545@gmail.com","9813645253","","","Male","2015-06-01","GEN","","","","2021-05-01","","24.00","124.00","Shivalik","33","11","","BERLA","","DARSHAN KUMAR","","","","MAMTA","","","","14400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"26","26","SHIVAM","","6 th","MARS","shivamsawan15@gmail.com","8683032011","","","Male","2014-12-26","STSC","","","","2021-05-01","","27.00","138.00","Shivalik","34","15","","DAGROLI","","JAIVIR SINGH","","","","RAJWANTI","","","","13600.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"27","27","SONALI","","6 th","VENUS","","9812583959","","","Female","2015-10-18","GEN","","","","","","38.00","145.00","Nilgiri","82","72","","KANHRA","","SOMBIR","","","","POOJA","","","","13100.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"29","29","LAKSHAY","","6 th","VENUS","","9518122762","","","Female","2015-12-21","GEN","","","","","","33.00","150.00","Himalaya","82","72","","KANHRA","","VIJENDER SINGH","","","","SARITA DEVI","","","","13100.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"316","316","MINAL","","6 th","VENUS","","9996393598","","","Female","2015-12-02","GEN","","","","","","58.00","151.02","Arawali","50","37","","KADMA","","DHARMENDER","","","","SARITA","","","","13600.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"323","323","MAYANK","","6 th","MARS","","7419072918","","","Male","2014-09-21","GEN","","","","2022-05-21","","31.00","139.00","Shivalik","63","52","","N.BADESRA","","VINOD KUMAR","","","","RINA","","","","18400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"368","368","KRISH","","6 th","VENUS","","9812136431","","","Male","2015-04-25","GEN","","","","","","33.00","143.00","Arawali","65","54","","PICHOPA KHURD","","CHARAN SINGH","","","","ANJU","","","","13900.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"380","380","LAKSHITA","","6 th","MARS","","8059058229","","","Female","2015-10-28","BC-A","","","","2022-08-02","","27.00","134.00","Shivalik","","","","KADMA","","RAJNESH","","","","PUSHPA","","","","18400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"381","381","VIKASH","","6 th","MARS","","8683983287","","","Male","2015-10-03","BC-A","","","","2022-08-02","","25.00","134.00","Shivalik","","","","KADMA","","ROSHAN","","","","SUSHMA","","","","20000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"395","395","ADITYA","","6 th","VENUS","","9728117800","","","Male","2014-11-08","BC- B","","","","2022-08-11","","35.00","147.00","Himalaya","10","20","","NIHALGARH","","HAWA SINGH","","","","ANITA DEVI","","","","16400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"396","396","SHAKET SINGH VIJRANIYA","","6 th","MARS","sunilrudrol@gmail.com","9991886642","","","Male","2016-03-08","GEN","","","","2022-08-20","","24.00","130.00","Arawali","69","58","","RUDROL","","SUNIL","","","","KAVITA","","","","14400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"397","397","DAKSH","","6 th","MARS","","9500940054","","","Male","2015-11-22","GEN","","","","2022-08-20","","34.00","138.00","Shivalik","49","36","","KADMA","","AJIT SINGH","","","","MUKESH","","","","18400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"398","398","SWATI","","6 th","VENUS","","9813557399","","","Female","2015-10-24","GEN","","","","2022-08-20","","25.00","140.00","Arawali","69","58","","RUDROL","","AMIT KUMAR","","","","INDU","","","","13600.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"414","414","ANSH","","6 th","VENUS","","9812247494","","","Male","2015-01-19","OBC","","","","2022-10-07","","24.00","133.00","Arawali","63","52","","N.BADESRA","","SANJAY KUMAR","","","","SUMAN DEVI","","","","13600.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"433","433","TANUJ KADYAN","","6 th","MARS","","8059656195","","","Male","2015-09-23","GEN","","","","2023-04-01","","30.00","138.00","Shivalik","34","15","","DAGROLI","","SUKHVEER SINGH","","","","NEETU KUMARI","","","","18400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"435","435","PRIYANSHI","","6 th","MARS","sushilasheoran@gmail.com","9682123428","","","Female","2016-01-03","GEN","","","","2023-04-11","","31.00","141.00","Shivalik","16","8","","BADRAI","","PRADEEP","","","","PRIYANKA","","","","13600.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"440","440","SUNNY SANGWAN","","6 th","MARS","","9050215813","","","Male","2015-10-23","GEN","","","","2023-05-08","","32.00","138.00","Himalaya","15","7","","BERLA","","NARESH KUMAR","","","","SUNITA","","","","14400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"445","445","PALAK","","6 th","VENUS","","9017702625","","","Female","2015-10-11","GEN","","","","2023-05-09","","31.00","143.00","Shivalik","63","52","","N.BADESRA","","SURENDER SINGH","","","","SUNITA","","","","13100.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"508","508","BHUPESH POOJARI","","6 th","MARS","","8059521197","","","Male","2013-11-07","OBC","","","","2023-07-31","","34.00","140.00","Himalaya","34","15","","DAGROLI","","JITENDER","","","","MEENA KUMARI","","","","13600.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"542","542","MAHAK","","6 th","MARS","","7056363896","","","Female","2015-09-06","GEN","","","","2023-09-20","","24.00","130.00","Himalaya","53","41","","KISKANDHA","","KULDEEP","","","","BABINA","","","","16000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"645","645","PARNEET","","6 th","VENUS","","9812785188","","","Male","2016-03-25","GEN","","","","2024-08-06","","50.00","143.00","Shivalik","","","","HUI","","SANDEEP KUMAR","","","","SANGEETA","","","","13600.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"738","738","YOGITA","","6 th","MARS","","9050798115","","","Female","2013-12-03","GEN","","","","2025-05-08","","42.00","151.00","Shivalik","68","57","","RAMBASS","","RAJKUMAR","","","","NEELAM DEVI","","","","15500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"764","764","RITIKA","","6 th","MARS","","9991655709","","","Female","2014-09-12","GEN","","","","2025-05-29","","43.00","150.00","Nilgiri","16","8","","BADRAI","","SUNIL KUMAR","","","","MONU KUMAR","","","","13600.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"779","779","PRAGYA","","6 th","MARS","krishanshadev@gmail.com","8708477539","","","Female","2016-04-21","BC-A","","","","2025-07-19","","28.00","134.00","Nilgiri","33","11","","BERLA","","KRISHAN KUMAR","","","","VARSHA VERMA","","","","16800.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"788","788","RIHAN","","6 th","MARS","salmajatu482@gmail.com","9813682809","","","Male","2016-01-06","STSC","","","","2025-07-30","","25.00","138.00","Arawali","49","36","","KADMA","","AMEEN","","","","SALMA","","","","13100.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"838","838","CHANCHAL","","6 th","VENUS","","7404244518","","","Female","2015-09-02","BC-A","","","","2026-04-16","","58.00","153.00","Arawali","82","72","","KANHRA","","NASEEB","","","","MONIKA","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"844","844","MOHIT","","6 th","MARS","surendersheoran0393@gmail.com","9812270393","","","Male","2015-07-19","GEN","","","","2026-04-18","","27.00","138.00","Himalaya","14","6","","BHANDWA","","SURENDER SINGH","","","","SONIKA","","","","14400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"853","853","REYAN SHEORAN","","6 th","VENUS","","9728300682","","","Male","2015-08-21","GEN","","","","2026-05-02","","39.00","147.00","Himalaya","19","13","","CHANDWAS","","VIKASH KUMAR","","","","MANJU DEVI","","","","1600.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"862","862","ROHAN","","6 th","VENUS","","9812995317","","","Male","2016-03-25","GEN","","","","2026-05-11","","32.00","151.00","Arawali","53","41","","KISKANDHA","","PRADEEP KUMAR","","","","MONIKA","","","","10800.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"874","874","ISHANT KUMAR","","6 th","MARS","","7382481759","","","Male","2015-10-01","GEN","","","","2026-06-01","","39.00","153.00","Himalaya","","","","BERLA","","KRISHAN KUMAR","","","","PINKESH","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25601","25601","LAKKI","","6 th","MARS","","9050457102","","","Female","2016-03-13","GEN","","","","","","25.00","140.00","Arawali","54","42","","KUBJA NAGAR","","PARDEEP KUMAR","","","","MONIKA","","","","13600.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25602","25602","KAVYA","","6 th","MARS","","9813705430","","","Female","2014-07-25","GEN","","","","","","40.00","150.00","Shivalik","","","","JEWALI","","PARVEEN KUMAR","","","","NEELAM","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25603","25603","DEV","","6 th","VENUS","","8059358517","","","Male","2017-02-28","GEN","","","","","","35.00","140.01","Arawali","","","","NIMAR BADESRA","","MAHESH","","","","REENU","","","","18400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""`;

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
  const rawClass = row["Class"] ? String(row["Class"]).replace(/\s*(st|nd|rd|th)$/i, "").trim() : "6";
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
