import mongoose from "mongoose";
import dotenv from "dotenv";
import { parse } from "csv-parse/sync";
import { Student } from "../models/index.js";

dotenv.config();

const csvData = `"Adm No","Roll No","First Name","Last Name","Class","Section","Email","Mobile","Aadhar Number","PEN Number","Gender","DOB","Caste","Category","Religion","Blood Group","Admission Date","Measurement Date","Weight","Height","House","Route List","Pickup Point","Hostel","Address","Room No","Father Name","Father Phone","Father Email","Father Occupation","Mother Name","Mother Phone","Mother Email","Mother Occupation","Discount Amt","Bank Account No","Bank Account Holder","Bank IFSC","Bank Name","Aadhaar (Doc)","Birth Cert (Doc)","Bank Passbook (Doc)","SSSMID (Doc)","Marksheet (Doc)","Transfer Certificate (TC)","Other Documents","RTE Status","RTE App No"
"823","823","Jianshu","","Balvatika_1","MARS","shilpasi.g@1491gmail.com","9350400820","","","Male","2020-06-09","GEN","","","","2026-01-04","","21.00","115.00","Himalaya","34","15","","Dagroli","","Sanjeev Kumar","","","","Shilpa","","","","6100.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"825","825","Anshu","","Balvatika_1","VENUS","","9991083550","","","Male","2020-03-02","GEN","","","","2026-01-04","","21.00","119.00","Arawali","31","18","","Dhani Khubiram","","Pradeep Kumar","","","","Seema","","","","6100.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"828","828","Prince","","Balvatika_1","MARS","","9728488198","","","Male","2020-07-20","GEN","","","","2026-01-04","","19.00","117.00","Shivalik","","","","Pichopa","","Dhillu Ram","","","","Shalu","","","","7200.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"829","829","Dishaank","","Balvatika_1","MARS","monikamonika14353@gmail.com","9813232345","","","Male","2021-02-10","GEN","","","","2026-01-04","","19.00","114.00","Himalaya","54","42","","Pichopa K.","","Dinesh Kumar","","","","Monika","","","","8850.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"902","902","Dixi","","Balvatika_1","VENUS","nishaphogat3719@gma.com","8930793719","","","Female","2021-11-15","GEN","","Hindu","","2026-04-01","2026-08-14","16.00","104.00","Himalaya","","","","DEVRALA","","Dharmbir","","","","Nisha Kumari","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"903","903","Himanshu","","Balvatika_1","VENUS","sunderbadrai8681@gmail.com","9813121910","","","Male","2021-04-06","GEN","","","","","","17.00","109.00","Arawali","16","8","","Badrai","","SUNDER PAL","","","","REENA KUMARI","","","","4600.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"904","904","Divya Sharma","","Balvatika_1","VENUS","sonukumar11101991@gmail.com","8398005117","","","Female","2021-06-04","GEN","","","","","","17.00","107.00","Shivalik","","","","Mandhi Hariya","","Sonu Kumar","","","","Ankita","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"905","905","Jayansh","","Balvatika_1","VENUS","kavita.sihag13@gmail.com","8295455299","","","Male","2021-11-20","GEN","","","","","","15.00","107.00","Nilgiri","68","57","","Rambass","","Jogender Singh","","","","Kavita","","","","6100.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"906","906","Shaurya","","Balvatika_1","VENUS","","9929806137","","","Male","2021-06-01","GEN","","","","","","21.00","117.00","Himalaya","63","52","","Nimar","","Sunil Kumar","","","","Ritu Rani","","","","9400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"907","907","Yash","","Balvatika_1","VENUS","deepaksheoran5465@gmail.com","9991886787","","","Male","2021-10-10","GEN","","","","","","18.00","104.00","Shivalik","82","72","","Kanhra","","Deepak Kumar","","","","Seema Devi","","","","7100.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"908","908","Jiansh","","Balvatika_1","VENUS","","9306427774","","","Male","2021-05-30","GEN","","","","","","19.00","108.00","Nilgiri","21","17","","Kadma","","Pramjeet","","","","Birshana Kumari","","","","10500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"909","909","Divyanshi","","Balvatika_1","VENUS","","8684984046","","","Female","2021-01-19","GEN","","","","","","15.00","107.00","Shivalik","","","","Berla","","Pardeep Kumar","","","","Sarita","","","","7000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"910","910","Yuvanya","","Balvatika_1","VENUS","manishadalaldm7@gmail.com","8307731182","","","Female","2020-10-22","GEN","","","","","","22.00","113.00","Nilgiri","","","","Kanhra","","Deepak Kumar","","","","Manisha","","","","9250.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"911","911","Devansh","","Balvatika_1","VENUS","ak1144644@gmail.com","8053212534","","","Male","2021-01-19","GEN","","","","2026-01-04","","17.00","107.00","Himalaya","47","34","","Jhojhu kalan","","Anil Kumar","","","","Sangeeta","","","","7500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"912","912","Kartik","","Balvatika_1","VENUS","","9518122762","","","Male","2021-03-27","GEN","","","","","","21.00","119.00","Arawali","82","72","","Kanhra","","Vijender Singh","","","","Sarita Devi","","","","7200.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"913","913","Vashu Dev","","Balvatika_1","VENUS","","8814003062","","","Male","2020-04-04","BC- B","","","","2026-01-04","","22.00","115.00","Himalaya","62","51","","Nihalgarh","","Arun Kumar Yadav","","","","Monika Yadav","","","","6650.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"914","914","Janvi Kalirawana","","Balvatika_1","VENUS","rkkd2222@gmail.com","7834992222","","","Female","2021-03-09","GEN","","","","2026-01-04","","18.00","110.00","Shivalik","34","15","","Dagroli","","Rajesh Kumar","","","","Renu Kumari","","","","6100.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"915","915","Preet","","Balvatika_1","VENUS","divyapuniya025@gamil.com","8708357393","","","Female","2021-03-01","STSC","","","","2026-01-04","","16.00","102.00","Arawali","81","70","","Naurangabass Rajputan","","Ashvini Kumar","","","","Divya Punia","","","","7200.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"916","916","Yash","","Balvatika_1","VENUS","ginusharma1999@gmail.com","9817011430","","","Male","2019-09-06","GEN","","","","2026-01-04","","30.00","124.00","Shivalik","","","","N. Badesra","","Pawan Sharma","","","","Seema","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"917","917","Priyanshu","","Balvatika_1","VENUS","sapnafogat46@gmail.com","8571852649","","","Male","2019-10-27","GEN","","","","2026-01-04","","23.00","121.00","Arawali","17","9","","Berla","","Sandeep Kumar","","","","Sapna","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"918","918","Avi","","Balvatika_1","MARS","monusheela288@gmail.com","9518497608","","","Female","2020-12-07","STSC","","","","2026-09-12","","","","Himalaya","","","","Dagroli","","Monu Kumar","","","","Mukesh","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"919","919","Aayush","","Balvatika_1","MARS","deepakkalirawna@gmail.com","9812997199","","","Male","2021-08-28","GEN","","","","2026-01-04","","17.00","105.00","Arawali","","","","Dagroli","","Deepak","","","","Pooja","","","","7700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"920","920","Himans","","Balvatika_1","MARS","Jsheoran729@gmail.com","9350039352","","","Male","2021-07-12","GEN","","","","","","18.00","112.00","Himalaya","33","11","","Berla","","Jitender","","","","Prerana","","","","6100.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"921","921","Divya","","Balvatika_1","MARS","","7027298070","","","Female","2020-11-24","GEN","","","","2026-01-04","","18.00","112.00","Nilgiri","","","","Badrai","","Sandeep","","","","Suman Kumari","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"922","922","Vamika","","Balvatika_1","MARS","kvn275961@gmail.com","9680149373","","","Female","2021-03-20","GEN","","","","2026-01-04","","17.00","109.00","Arawali","34","15","","Dagroli","","Anil Kumar","","","","Kanchan","","","","6100.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"923","923","LAKSH","","Balvatika_1","MARS","SUBHAMSONI2016@gmail.com","8930095659","","","Male","2021-09-24","BC-A","","","","2026-01-04","","18.00","112.00","Himalaya","49","36","","Kadma","","Subham","","","","Devki","","","","6100.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"924","924","Nivaan Vijarniya","","Balvatika_1","MARS","ksvijarniga@gmail.com","8814906181","","","Male","2021-09-12","GEN","","","","2026-01-04","","16.00","104.00","Nilgiri","33","11","","Dhani Khubiram","","Kashmir","","","","Sudesh","","","","8300.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"925","925","Nishu","","Balvatika_1","MARS","naveenmaliknaveenmalik872@gmail.com","9812874437","","","Female","2020-12-13","GEN","","","","2026-01-04","","15.00","107.00","Shivalik","63","52","","N. Badesra","","Naveen Kumar","","","","Surekha","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"926","926","Yashika Dhindhawal","","Balvatika_1","MARS","","9813979766","","","Female","2020-08-27","","","","","2026-01-04","","21.00","123.00","Nilgiri","","","","Badrai","","Pawan","","","","Manisha","","","","6100.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"927","927","Chirag","","Balvatika_1","MARS","ajitmukesh9@gmail.com","9500940054","","","Male","2020-12-23","GEN","","","","2026-01-04","","22.00","115.00","Arawali","49","36","","Kadma","","Ajit Kumar","","","","Mukesh","","","","8850.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"928","928","Vanshika Sheoran","","Balvatika_1","MARS","jakhar10081991@gmail.com","7027983484","","","Female","2021-08-03","GEN","","","","2026-01-04","","16.00","107.00","Arawali","35","22","","Berla","","Bhupender","","","","Priyanka","","","","6100.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"929","929","Himani","","Balvatika_1","MARS","viren792@gmail.com","7419080840","","","Female","2021-09-03","GEN","","","","2026-01-04","","15.00","107.00","Shivalik","34","15","","Dagroli","","Virender","","","","Shiwani","","","","7200.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"930","930","Deepanshu","","Balvatika_1","MARS","sombersangwan6071@gmail.com","9050751104","","","Male","2020-07-05","GEN","","","","2026-01-04","","20.00","115.00","Shivalik","","","","Pichopa","","Somvir","","","","Purnema","","","","8300.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"931","931","Siya","","Balvatika_1","MARS","","9813907271","","","Female","2020-05-15","GEN","","","","2026-01-04","","22.00","113.00","Himalaya","","","","Jewali","","Vikas Kumar","","","","Poonam","","","","7200.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"932","932","Dimpal","","Balvatika_1","MARS","kusumsoni7373@gmail.com","9817603103","","","Female","2021-02-24","BC-A","","","","2026-01-04","","17.00","108.00","Nilgiri","49","36","","Kadma","","Sashikant","","","","Kusum","","","","7200.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"933","933","Gautam Sheoran","","Balvatika_1","MARS","mintusheoran702@gmail.com","7027509818","","","Male","2021-03-11","GEN","","","","2026-01-04","","17.00","115.00","Nilgiri","33","11","","Berla","","Rajbir","","","","Sunita Kumari","","","","6650.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2636","2636","Nitin Thalor","","Balvatika_1","MARS","sanjeetakalher09@gmail.com","8930445798","","","Male","2020-11-16","GEN","","","","2026-01-04","","18.00","110.00","Nilgiri","49","36","","Kadma","","Dinesh Kumar","","","","Sanjeeta","","","","5200.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2637","2637","DRISHTI","","Balvatika_1","MARS","jogendersangwan1983@gmail.com","8684881878","","","Female","2021-09-05","GEN","","","","","2026-09-01","17.00","105.00","Nilgiri","","","","DHOKI","","Sandeep Kumar","","","","Suman","","","","8200.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2638","2638","Dev Khanna","","Balvatika_1","VENUS","vikramkhanna741@gmail.com","9050380857","","","Male","2020-03-30","STSC","","","","2026-01-04","","21.00","114.00","Himalaya","","","","Rudrol","","Vikarm","","","","Annu Kumari","","","","1500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"2639","2639","Himanshi","","Balvatika_1","VENUS","","9671592299","","","Female","2021-07-12","GEN","","","","","","16.00","102.00","Himalaya","","","","Dagroli","","Sunil Kumar","","","","Sushil Kumari","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""`;

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
  if (!raw || !raw.trim()) return "BALVATIKA 1";
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
  let candidateEmail = (row["Email"] && row["Email"].trim()) 
    || (row["Father Email"] && row["Father Email"].trim()) 
    || (row["Mother Email"] && row["Mother Email"].trim()) || "";
  
  if (candidateEmail) {
    candidateEmail = candidateEmail.trim().toLowerCase()
      .replace(/@ail\.com$/, "@gmail.com")
      .replace(/@gma\.com$/, "@gmail.com")
      .replace(/@gamil\.com$/, "@gmail.com")
      .replace(/@(\d+)gmail\.com$/, "$1@gmail.com");
  }
  
  const email = candidateEmail ? candidateEmail : `${cleanNameForEmail}.${adm}@srpskanhra.com`;
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
