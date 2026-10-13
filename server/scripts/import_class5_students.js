import mongoose from "mongoose";
import dotenv from "dotenv";
import { parse } from "csv-parse/sync";
import { Student } from "../models/index.js";

dotenv.config();

const csvData = `"Adm No","Roll No","First Name","Last Name","Class","Section","Email","Mobile","Aadhar Number","PEN Number","Gender","DOB","Caste","Category","Religion","Blood Group","Admission Date","Measurement Date","Weight","Height","House","Route List","Pickup Point","Hostel","Address","Room No","Father Name","Father Phone","Father Email","Father Occupation","Mother Name","Mother Phone","Mother Email","Mother Occupation","Discount Amt","Bank Account No","Bank Account Holder","Bank IFSC","Bank Name","Aadhaar (Doc)","Birth Cert (Doc)","Bank Passbook (Doc)","SSSMID (Doc)","Marksheet (Doc)","Transfer Certificate (TC)","Other Documents","RTE Status","RTE App No"
"5","5","KARTIK","POONIA","5 th","VENUS","","9671843537","","","Male","2015-11-29","GEN","","","","2026-08-26","2026-08-26","24.00","127.00","Shivalik","84","76","","BERLA","","Pradeep","","pooniakartik007@gmail.com","","Seema","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"16","16","MAYANK","","5 th","VENUS","","9813641632","","","Male","2016-07-08","GEN","","Hindu","","2021-10-09","2026-08-14","27.00","127.00","Himalaya","","","","Berla","","MUKESH KUMAR","","mukeshsheoran9815@gmail.com","","PREETI","","","","14400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"266","266","MOKSHITA","","5 th","VENUS","","8307636876","","","Female","2016-07-08","OBC","","","","2026-04-01","","26.00","132.00","Shivalik","","","","DAGROLI","","VIKAS KUMAR","","khushi09022013@gmail.com","","ANITA","","","","15150.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"278","278","RIDAM","","5 th","VENUS","","9466908670","","","Female","2016-09-06","GEN","","","","2026-04-01","","25.00","129.00","Arawali","","","","BERLA","","PARDEEP KUMAR","","pardeepkumar3518@gmail.com","","SARITA","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"280","280","RAKSHIT SANGWAN","","5 th","MARS","monuchitresh49@gmail.com","7027059179","","","Male","2016-10-04","GEN","","","","","","25.00","135.00","Shivalik","","","","KUBJA NAGAR","","CHITRESH KUMAR","","","","MONU","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"281","281","SIDDHARTH","","5 th","MARS","sonisheoran5466@gmail.com","9813315880","","","Male","2015-06-07","GEN","","","","","","31.00","140.00","Nilgiri","57","45","","M.HARIYA","","SUKHVENDER","","","","MONIKA","","","","12500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"282","282","ARPIT SANGWAN","","5 th","VENUS","","9050853642","","","Male","2016-02-08","GEN","","","","","","39.00","153.00","Himalaya","54","42","","K.NAGAR","","SATPAL SINGH","","nirmala9050853642@gmail.com","","NIRMALA","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"283","283","SMAYRA RANA","","5 th","VENUS","","8059555966","","","Female","2015-12-28","GEN","","","","","","46.00","140.00","Shivalik","21","17","","DADRI","","SATYADEEP RANA","","monikadadri01250@gmail.com","","MONIKA","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"284","284","HUNNY KADYAN","","5 th","VENUS","","9643582644","","","Male","2016-08-01","GEN","","","","","","21.00","130.00","Nilgiri","34","15","","DAGROLI","","SURENDER","","kavitapoonia078@gmail.com","","KAVITA","","","","13650.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"285","285","VINSHU","","5 th","VENUS","","9812922450","","","Female","2016-08-26","GEN","","","","","","28.00","145.00","Shivalik","50","37","","KADMA","","NARENDER KUMAR","","narenderthalor32@gmail.com","","LAKSHMI DEVI","","","","11750.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"286","286","DIVYANSH","","5 th","VENUS","","9728837438","","","Male","2015-08-05","GEN","","","","","","58.00","145.00","Arawali","64","53","","N.BADESRA","","YOGESH KUMAR","","yogeshbhambhu14@gmail.com","","POONAM","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"287","287","DIKSHA","","5 th","VENUS","","9671003133","","","Female","2016-12-08","GEN","","","","","","24.00","135.00","Arawali","","","","SAMASPUR","","MANOJ KUMAR","","sheoranankit974@gmail.com","","REKHA","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"290","290","ANUJ","","5 th","VENUS","","9812433700","","","Male","2016-09-19","GEN","","","","","","34.00","137.00","Arawali","","","","BERLA","","SATYAWAN","","sheoransatywan3@gmail.com","","BABITA","","","","11750.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"292","292","RUPESH","","5 th","VENUS","","9671480545","","","Male","2016-11-28","GEN","","","","","","","","Shivalik","21","17","","DHANASRI","","RAMKISHAN","","","","BIMLA","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"293","293","NIRVI","","5 th","VENUS","","8818070938","","","Female","2017-05-13","GEN","","","","","","28.00","125.00","Arawali","","","","DHANI KHUBI","","PAWAN KUMAR","","neerajjakhar38@gmail.com","","NEERAJ KUMARI","","","","15900.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"295","295","HIMANSHU","","5 th","MARS","jabsangwanberla@gmail.com","9050099640","","","Male","2016-03-19","GEN","","","","","","24.00","125.00","Arawali","33","11","","BERLA","","SUKHBIR","","","","KAVITA","","","","12600.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"300","300","DAKSH","","5 th","MARS","Sataywan101091@gmail.com","9728187128","","","Male","2016-10-15","BC- B","","","","0026-04-01","","44.00","148.00","Himalaya","58","46","","M.HARIYA","","SATAYAWAN","","","","SANJU","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"360","360","DAKSH","","5 th","MARS","","9813313006","","","Male","2016-10-24","GEN","","","","","","27.00","134.00","Himalaya","31","18","","DHANI KHUBI","","PAWAN","","","","NIDHI","","","","14000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"364","364","SUMIT","","5 th","MARS","sandeepdhindhwal0@gmail.com","7027298070","","","Male","2017-01-03","GEN","","","","0026-04-01","","47.00","141.00","Arawali","","","","BADRAI","","SANDEEP","","","","SUMAN KUMARI","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"378","378","HAPPY","","5 th","MARS","ypritam667@gmail.com","9671266204","","","Male","2016-06-09","BC- B","","","","","","28.00","136.00","Arawali","10","20","","NIHALGARH","","PRITAM","","","","REENA","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"394","394","ANSH KUMAR","","5 th","VENUS","","9728301323","","","Male","2016-05-18","GEN","","","","","","28.00","136.00","Nilgiri","16","8","","BADRAI","","NAVEEN KUMAR","","anshk2467@gmail.com","","ROSHANI DEVI","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"426","426","SONU","","5 th","MARS","sonujaat03813@gmail.com","9306169134","","","Male","2017-01-07","GEN","","","","","","33.00","133.00","Nilgiri","","","","KANHRA","","SANJAY","","","","MUNA DEVI","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"434","434","TANISHQ","","5 th","MARS","skasw9996@gmail.com","9991663028","","","Male","2017-02-18","GEN","","","","","","31.00","140.00","Himalaya","58","46","","M.HARIYA","","SANDEEP KUMAR","","","","RAKESH KUMARI","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"504","504","SURYAKANT","","5 th","MARS","rakeshsangwan31385@gmail.com","9813431385","","","Male","2013-11-13","GEN","","","","2026-04-01","","32.00","152.00","","","","","PICHOPA KHURD","","RAKESH KR.","","","","BIMLA","","","","14400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"532","532","RIHAN","","5 th","MARS","bijeshkumar98123@gmail.com","9812305006","","","Male","2014-08-30","GEN","","","","","","153.00","44.00","Shivalik","","","","BERLA","","DINESH","","","","SONU KUMARI","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"602","602","VARSHA","","5 th","VENUS","","8059476349","","","Female","2017-09-09","STSC","","","","","","19.00","120.00","Himalaya","","","","DAGROLI","","SUNIL KUMAR","","sunilkumar784082@gmail.com","","POONAM","","","","14400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"666","666","ABHI","","5 th","MARS","abhiitkan123@gmail.com","9812384260","","","Male","2017-08-28","STSC","","","","","","23.00","122.00","Himalaya","","","","DAGROLI","","DEEPAK KUMAR","","","","PRIYANKA KUMARI","","","","14400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"725","725","BHAVISHYA","","5 th","VENUS","","9306017074","","","Female","2015-07-30","GEN","","","","","","39.00","142.00","Himalaya","54","42","","KUBJA NAGAR","","SUNIL KUMAR","","asmitapanghal@gmail.com","","ASMITA","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"752","752","RITIKA","","5 th","VENUS","","8816805851","","","Female","2015-07-24","GEN","","","","","","40.00","144.00","Shivalik","47","34","","BADHRA","","VIKASH","","sonusheoran70812@gmail.com","","PARVEEN LATA","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"766","766","SNAYA CHOUDHARY","","5 th","VENUS","","8814906181","","","Female","2016-09-15","GEN","","","","","","30.00","138.00","Shivalik","33","11","","DHANI KHUBI","","KASHMIR","","","","SUDESH","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"796","796","HIMANSHU","","5 th","MARS","sandeepk87703@gmail.com","8198988897","","","Male","2014-11-12","GEN","","","","","","24.00","125.00","Himalaya","49","36","","KADMA","","SANDEEP","","","","SARITA","","","","15150.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"854","854","MUSHKAN","","5 th","VENUS","","8607207237","","","Female","2016-04-20","GEN","","","","","","25.00","123.00","Arawali","17","9","","BERLA","","DINESH","","dk2153869@gmail.com","","PARVEEN KUMARI","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"856","856","HARSHIT","","5 th","MARS","gyanilakhwan49@gmail.com","8421976275","","","Male","2016-08-02","BC-A","","","","","","37.00","139.00","Nilgiri","","","","MAI KHURD","","SANDEEP","","","","RAJNI SAIN","","","","14400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"858","858","DEVANSH","","5 th","MARS","kuldeepkumar32580@gmail.com","9812321266","","","Male","2017-01-14","GEN","","","","","","41.00","138.00","Nilgiri","16","8","","BADRAI","","KULDEEP KUMAR","","","","ARCHANA","","","","12500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"859","859","VANSH","","5 th","MARS","ekpremi123@gmail.com","9728331125","","","Male","2016-02-16","STSC","","","","","","33.00","134.00","Himalaya","34","15","","DAGROLI","","DEVENDER KUMAR","","","","RENU","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"860","860","YASH","","5 th","MARS","bhartimachingcenter@gmail.com","8059690209","","","Male","2015-06-03","GEN","","","","","","23.00","127.00","Himalaya","","","","JEWALI","","SOMVIR","","","","BHATERI DEVI","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"861","861","GAURAV","","5 th","MARS","","8059690209","","","Male","2016-10-12","GEN","","","","","","26.00","134.00","Himalaya","","","","JEWALI","","SOMVIR","","","","BHATERI DEVI","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"26501","26501","SANCHIT","","5 th","MARS","poonamsheoran749@gmail.com","9991724344","","","Male","2016-04-05","GEN","","","","","","32.00","139.00","Himalaya","16","8","","BERLA","","SANJU","","","","POONAM","","","","11750.00","","","","","No","No","No","No","No","No","No","Non-RTE",""`;

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
  const rawClass = row["Class"] ? String(row["Class"]).replace(/\s*(st|nd|rd|th)$/i, "").trim() : "5";
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
