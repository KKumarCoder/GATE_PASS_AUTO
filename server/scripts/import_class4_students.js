import mongoose from "mongoose";
import dotenv from "dotenv";
import { parse } from "csv-parse/sync";
import { Student } from "../models/index.js";

dotenv.config();

const csvData = `"Adm No","Roll No","First Name","Last Name","Class","Section","Email","Mobile","Aadhar Number","PEN Number","Gender","DOB","Caste","Category","Religion","Blood Group","Admission Date","Measurement Date","Weight","Height","House","Route List","Pickup Point","Hostel","Address","Room No","Father Name","Father Phone","Father Email","Father Occupation","Mother Name","Mother Phone","Mother Email","Mother Occupation","Discount Amt","Bank Account No","Bank Account Holder","Bank IFSC","Bank Name","Aadhaar (Doc)","Birth Cert (Doc)","Bank Passbook (Doc)","SSSMID (Doc)","Marksheet (Doc)","Transfer Certificate (TC)","Other Documents","RTE Status","RTE App No"
"427","427","VAISHNAVI","","4 th","MARS","","9991449789","","","Female","2017-10-27","STSC","","","","","","23.00","135.00","Himalaya","34","15","","DAGROLI","","VIKASH","","","","RENU","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"428","428","RISHIKA","","4 th","MARS","","9350622570","","","Female","2017-03-14","STSC","","","","","","31.00","130.00","Shivalik","34","15","","DAGROLI","","RINKU KUMAR KALA","","monikakala771@gmail.com","","MONIKA","","","","11700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"430","430","NISHU","","4 th","MARS","","8130523852","","","Female","2017-09-25","GEN","","","","","","25.00","135.00","Arawali","82","72","","KANHRA","","DALBIR SINGH","","","","ANJU DEVI","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"431","431","GARVEET","","4 th","MARS","","9812318266","","","Male","2017-06-14","GEN","","","","","","26.00","126.00","Arawali","58","46","","M.HARIYA","","RINKU","","Rinkududi1989@gmail.com","","KAVITA","","","","12400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"495","495","PRINCE","","4 th","MARS","","9306833090","","","Male","2016-11-24","GEN","","","","","","38.00","135.00","Shivalik","54","42","","KUBJANAGAR","","PARVEEN KUMAR","","","","MAMTA","","","","17200.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"496","496","NANCY","","4 th","MARS","","9812273888","","","Female","2017-11-20","GEN","","","","","","23.00","122.00","Arawali","","","","JEWALI","","RAJESH KUMAR","","","","MONIKA","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"514","514","VIRAT","","4 th","MARS","","8930581595","","","Male","2016-11-15","GEN","","","","","","24.00","127.98","Shivalik","72","61","","SISWALA","","ANTRAM","","mukuldalal506@gmail.com","","POOJA","","","","11500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"515","515","AARUSHI","","4 th","MARS","","9728542308","","","Female","2017-11-15","GEN","","","","","","30.00","139.00","Arawali","69","58","","RUDROL","","SURENDER SINGH","","Vijarniya@gmail.com","","MANJEET KAUR","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"517","517","GURMEET","","4 th","MARS","","9817804760","","","Male","2017-03-24","GEN","","","","","","34.00","138.00","Nilgiri","82","72","","KANHRA","","MANJEEET SINGH","","","","MANJU KUMARI","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"518","518","LAKSHITA","","4 th","VENUS","dirsana805@gmail.com","9306427774","","","Female","2017-12-02","GEN","","","","","","26.00","128.00","Arawali","21","17","","KADMA","","PRAMJEET","","","","BIRSHANA KUMARI","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"519","519","DHEERAJ ASSIWAL","","4 th","MARS","","9991517299","","","Male","2018-01-16","STSC","","","","","","25.00","138.00","Nilgiri","33","11","","BERLA","","SANDEEP KUMAR","","","","SANGITA","","","","11700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"522","522","YASHIKA","","4 th","MARS","","8814845200","","","Female","2017-10-24","GEN","","","","","","25.00","128.00","Arawali","","","","KANHRA","","VIRENDER","","","","MONIKA","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"524","524","PARGYA","","4 th","MARS","","9992424340","","","Female","2018-01-07","GEN","","","","","","24.00","128.00","Himalaya","4","21","","DHANSHRI","","SUKHENDER","","","","SONIA","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"525","525","DIKSHA","","4 th","VENUS","yogeshsheoran999@gmail.com","9813842143","","","Female","2016-09-17","GEN","","","","","","29.00","138.00","Arawali","","","","BERLA","","YOGESH","","","","MEENA","","","","6600.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"526","526","RIDHI","","4 th","VENUS","sundeepkmr19@gmail.com","9050461993","","","Female","2017-07-29","BC-A","","","","","","26.00","128.00","Arawali","34","15","","DAGROLI","","SUNDEEP KUMAR","","","","POONAM","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"530","530","YUG BIJARANIYA","","4 th","VENUS","induphogat49@gmail.com","9813557399","","","Male","2017-10-27","GEN","","","","","","23.00","123.00","Shivalik","69","58","","RUDROL","","AMIT KUMAR","","","","INDU","","","","11700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"531","531","CHARU","","4 th","VENUS","ravinderkadian57@gmail.com","9728055701","","","Female","2017-04-25","GEN","","","","","","29.00","132.00","Arawali","34","15","","DAGROLI","","RAVINDER KUMAR","","","","SAROJ","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"533","533","SIDDARTH","","4 th","MARS","","8199991076","","","Male","2017-09-05","GEN","","","","","","30.00","140.00","Himalaya","","","","TIKAN KALA","","SUKHENDER","","phogatsidhu7@gmail.com","","PRIYANKA","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"534","534","RIYA ASSIWAL","","4 th","VENUS","sonamkhana04@gmail.com","9306560958","","","Female","2017-04-12","STSC","","","","","","","","Shivalik","","","","BERLA","","PARDEEP KUMAR","","","","SONAM","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"535","535","ANMOL","","4 th","VENUS","monikadhindwal4@gmail.com","9581425328","","","Male","2016-10-06","GEN","","","","","","30.00","134.00","Nilgiri","16","8","","BADRAI","","ANIL KUMAR","","","","MONIKA","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"544","544","INDU","","4 th","VENUS","vipinkumar37461@gmail.com","9991927733","","","Female","2016-10-11","GEN","","","","","","27.00","135.00","Arawali","84","76","","BERLA","","SURESH","","","","KAMLESH","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"581","581","HIMANSHU","","4 th","MARS","","8059058229","","","Male","2016-12-08","BC-A","","","","","","22.00","125.00","Shivalik","","","","KADMA","","RAJNESH","","","","PUSHPA","","","","15800.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"605","605","NAIRA","","4 th","VENUS","rinkulala089@gmail.com","8053340909","","","Female","2018-01-13","GEN","","","","","","24.00","122.00","Nilgiri","33","11","","BERLA","","RINKU KUMAR","","","","SONU","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"606","606","YUGAM","","4 th","VENUS","kulvirsheoran4@gmail.com","9813549727","","","Male","2016-11-04","GEN","","","","","","25.00","132.00","Nilgiri","17","9","","BERLA","","KULVIR","","","","KAVITA","","","","11700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"611","611","BHARTI","","4 th","VENUS","sachingandash0@gmail.com","8708075409","","","Female","2016-09-12","GEN","","","","","","32.00","138.00","Nilgiri","49","36","","KADMA","","SACHIN","","","","MUKESH","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"632","632","NEERAJ KUMAR","","4 th","VENUS","","9053597453","","","Male","2017-07-05","GEN","","","","","","22.00","123.00","Shivalik","","","","GOPALWAS","","RANBIR","","","","ANJU LATA","","","","15800.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"655","655","MAANVI DHILLON","","4 th","VENUS","seemadhillon064@gmail.com","9817121717","","","Female","2018-03-01","GEN","","","","","","25.00","128.00","Shivalik","68","57","","RAMBASS","","AMIT KUMAR DHILLON","","","","SEEMA RANI","","","","12400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"694","694","MANPREET SHEORAN","","4 th","VENUS","anitashearan1038@gmail.com","8816089486","","","Male","2018-03-03","GEN","","","","","","26.00","130.01","Shivalik","82","72","","KANHRA","","MANISH KUMAR","","","","ANITA","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"765","765","PRIYANSHU","","4 th","MARS","","8059553252","","","Male","2016-08-06","GEN","","","","","","33.00","138.00","Himalaya","16","8","","BADRAI","","RANBIR SINGH","","ranbirsinghbadrai@gmail.com","","MONIKA","","","","11700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"771","771","VIDHI","","4 th","MARS","","7988841153","","","Female","2016-02-15","GEN","","","","","","38.00","143.00","Shivalik","","","","ADAMPUR","","ANIL","","","","MONI RANI","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"775","775","DEEPANSHI","","4 th","MARS","","9813230345","","","Female","2018-03-19","GEN","","","","","","24.00","122.00","Arawali","54","42","","PICHOPA KHURD","","DINESH KUMAR","","monikamonika14353@gmail.com","","MONIKA","","","","14400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"841","841","JATIN","","4 th","MARS","","9812618378","","","Male","2017-09-08","GEN","","","","","","23.00","125.00","Shivalik","14","6","","BHANDWA","","RAJ SINGH","","rajsinghraju533@gmail.com","","MONIKA KUMARI","","","","11700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"852","852","DIMPAL","","4 th","VENUS","reyansheoran82@gmail.com","9728300682","","","Female","2017-10-14","GEN","","","","","","28.00","131.00","Shivalik","19","13","","CHANDWAS","","VIKASH KUMAR","","","","MANJU DEVI","","","","1400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"875","875","GUNJAN KUMARI","","4 th","MARS","","9829183284","","","Female","2016-12-12","GEN","","","","","","31.00","131.00","Shivalik","82","72","","KANHRA","","RAJESH KUMAR","","surenderpoonia46@gmail.com","","REENA","","","","300.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"876","876","YASH KUMAR","","4 th","VENUS","msheoran236@gmail.com","9812619400","","","Male","2017-09-01","GEN","","","","","","33.00","132.00","Nilgiri","82","72","","KANHRA","","SUNIL KUMAR","","","","MONIKA","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"877","877","NITUL","","4 th","VENUS","kumarpardeep25621@gmail.com","9812619400","","","Male","2018-02-09","GEN","","","","","","27.00","126.99","Nilgiri","82","72","","KANHRA","","PARDEEP KUMAR","","","","ANITA","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"23401","23401","SEJAL","","4 th","VENUS","parveen9813990015@gmail.com","9813990015","","","Female","2017-09-16","GEN","","","","","","28.00","127.00","Arawali","35","22","","BERLA","","PRAVEEN","","","","BINDU","","","","11700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"26402","26402","MIKUL","","4 th","VENUS","karmvir1982jangra@gmail.com","9996825480","","","Male","2016-09-01","OBC","","","","","","28.00","132.99","Arawali","69","58","","RUDROL","","KARMVIR","","","","MANISHA","","","","12400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"26403","26403","ANKUSH","","4 th","MARS","","8059439172","","","Male","2017-06-01","STSC","","","","","","22.00","130.00","Nilgiri","","","","NANDHA","","VIKRAM","","ronakkumar80594@gmail.com","","REKHA","","","","8000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"26404","26404","Rajat","","4 th","VENUS","","8930495682","","","Male","2017-04-25","GEN","","","","2026-09-16","2026-09-16","","","Nilgiri","","","","BERLA","","YADVENDER","","","","NITU","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""`;

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
  const rawClass = row["Class"] ? String(row["Class"]).replace(/\s*(st|nd|rd|th)$/i, "").trim() : "4";
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
      .replace(/@gmaip\.com$/, "@gmail.com")
      .replace(/@gma8l\.com$/, "@gmail.com");
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
