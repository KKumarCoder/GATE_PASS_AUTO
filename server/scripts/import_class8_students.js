import mongoose from "mongoose";
import dotenv from "dotenv";
import { parse } from "csv-parse/sync";
import { Student } from "../models/index.js";

dotenv.config();

const csvData = `"Adm No","Roll No","First Name","Last Name","Class","Section","Email","Mobile","Aadhar Number","PEN Number","Gender","DOB","Caste","Category","Religion","Blood Group","Admission Date","Measurement Date","Weight","Height","House","Route List","Pickup Point","Hostel","Address","Room No","Father Name","Father Phone","Father Email","Father Occupation","Mother Name","Mother Phone","Mother Email","Mother Occupation","Discount Amt","Bank Account No","Bank Account Holder","Bank IFSC","Bank Name","Aadhaar (Doc)","Birth Cert (Doc)","Bank Passbook (Doc)","SSSMID (Doc)","Marksheet (Doc)","Transfer Certificate (TC)","Other Documents","RTE Status","RTE App No"
"37","37","HARSH","","8 th","VENUS","","9813289433","","","Male","2013-06-17","GEN","","HINDU","","2022-04-18","","47.00","144.00","Himalaya","40","27","","HANSAWAS KHURD","","RAVINDER","","","","SUDESH","","","","13900.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"76","76","ANKIT","","8 th","VENUS","pp0810665@gmail.com","9812159343","","","Male","2013-06-17","GEN","","HINDU","","2022-04-18","","39.00","151.00","Shivalik","","","","HANSAWAS KHURD","","PARDEEP KUMAR","","","","RINKU","","","","15300.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"77","77","NAVYA KUMARI","","8 th","VENUS","nkt.cdlu@gmail.com","9992500512","","","Female","2013-09-09","GEN","","HINDU","","2019-04-01","","52.00","159.00","Himalaya","84","76","","BERLA","","NARESH KUMAR","","","","NEERU KUMARI","","","","13000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"78","78","TARUN","","8 th","MARS","rajeshkaswa424@gmail.com","9017191499","","","Male","2011-06-13","GEN","","","","2019-04-01","","63.00","171.00","Shivalik","58","46","","M.HARIYA","","RAJESH","","","","PREETI","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"79","79","RAMAN","","8 th","MARS","spmbirkumar431@gmail.com","8930021670","","","Male","2013-12-28","","","","","2019-04-01","","38.00","156.00","Shivalik","31","18","","DAGROLI","","RINKU","","","","REKHA","","","","17100.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"80","80","VANSHIKA","","8 th","MARS","sheoranshagun47@gmail.com","9812331171","","","Female","2013-01-25","GEN","","","","2019-04-10","","47.00","152.00","Himalaya","40","27","","HANSAWAS KALAN","","SATISH","","","","MEENU DEVI","","","","13000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"81","81","HITESH","","8 th","MARS","","9991238198","","","Male","2013-02-20","GEN","","","","2019-04-01","","45.00","143.00","Nilgiri","72","61","","SHISWALA","","SURESH","","","","SONIKA","","","","11900.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"82","82","KOMAL","","8 th","MARS","dakshvijarniya@gmail.com","9467002404","","","Female","2012-07-16","GEN","","","","2018-10-21","","43.00","158.00","Arawali","31","18","","DHANI KHUBI","","PAWAN","","","","NIDHI","","","","13000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"83","83","VIDHI","","8 th","MARS","sonisheora5466@gmail.com","8053815466","","","Female","2013-07-14","GEN","","","","2019-04-01","","38.00","140.00","Himalaya","57","45","","MANDHI HARIYA","","SUKHVENDER","","","","MONIKA","","","","18300.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"84","84","SIDDHARTH","","8 th","MARS","sajjansinghkadma1982@gmail.com","8708075409","","","Male","2012-11-05","GEN","","","","2019-04-01","","49.00","164.00","Himalaya","49","36","","KADMA","","SAJJAN SINGH","","","","POONAM","","","","14400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"87","87","SADVIK","","8 th","MARS","nareshnareshkalirawana@gmail.com","9812826309","","","Male","2013-02-03","GEN","","","","2019-04-01","","40.00","146.00","Arawali","34","15","","DAGROLI","","NARESH","","","","MUKESH","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"89","89","NANCY","","8 th","VENUS","nancylakshay74@gmail.com","9518122762","","","Female","2013-09-14","GEN","","HINDU","","2019-04-01","","41.00","161.00","Himalaya","82","72","","KANHRA","","VIJENDER SINGH","","","","SARITA DEVI","","","","13000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"90","90","MEERA BAI KATEHA","","8 th","MARS","Dayasankarji0@ail.com","7898895218","","","Female","2013-04-08","GEN","","","","2019-04-01","","38.00","147.00","Arawali","","","","BILHA (MP)","","DYASANKAR KATEHA","","","","RANI KATEHA","","","","17000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"91","91","CHANCHAL","","8 th","MARS","gouravsheoran120@gmail.com","8816804750","","","Female","2013-04-11","GEN","","","","2019-04-01","","59.00","154.00","Nilgiri","","","","BERLA","","RAKESH","","","","URMILA","","","","14500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"92","92","MADHAV POONIA","","8 th","VENUS","pooniakartik007@gmail.com","9671843537","","","Male","2013-09-04","GEN","","HINDU","","2019-04-01","","38.00","154.00","Nilgiri","84","76","","BERLA","","PRADEEP","","","","SEEMA","","","","13000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"95","95","KAFI","","8 th","VENUS","","9467002404","","","Female","2012-07-16","GEN","","HINDU","","2018-10-21","","49.00","162.00","Shivalik","31","18","","DHANI KHUBI","","PAWAN","","","","NIDHI","","","","14400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"96","96","HITESH","","8 th","MARS","rakeshsheoran99054@gmail.com","9813899054","","","Male","2013-08-04","GEN","","","","2019-04-01","","37.00","147.00","Arawali","84","76","","BERLA","","RAKESH KUMAR","","","","POONAM","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"97","97","PARV","","8 th","MARS","","9416564501","","","Male","2013-07-16","","","","","2019-04-01","","45.00","163.00","Arawali","58","46","","M.HARIYA","","DHARMENDER","","","","SARITA","","","","14400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"98","98","PRINCE","","8 th","MARS","","8708075409","","","Male","2013-10-06","GEN","","","","2019-04-01","","45.00","166.00","Himalaya","49","36","","KADMA","","SAJJAN SINGH","","","","POONAM","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"99","99","POOJA","","8 th","MARS","","8059553252","","","Female","2013-03-28","GEN","","","","2019-04-01","","42.00","160.00","Nilgiri","16","8","","BADRAI","","RANVIR","","","","MONIKA","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"100","100","DEEPIKA","","8 th","MARS","dalbirsheorano@gmail.com","8130523852","","","Female","2014-03-02","GEN","","","","2019-04-01","","36.00","151.00","Arawali","","","","KANHRA","","DALBIR SINGH","","","","ANJU","","","","177600.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"102","102","NAX","","8 th","MARS","","9991612350","","","Male","2013-11-20","GEN","","","","2021-10-05","","29.00","145.00","Himalaya","","","","RUDROL","","BRHAM PARKASH","","","","MUKESH KUMARI","","","","14400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"103","103","RITUL","","8 th","VENUS","Sachingandash@gmail.com","7015489533","","","Female","2013-08-17","GEN","","HINDU","","2019-04-01","","42.00","162.00","Nilgiri","49","36","","KADMA","","SACHIN","","","","MUKESH","","","","13000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"105","105","SARIKA","","8 th","VENUS","davireena70@gmail.com","9813175018","","","Female","2013-03-09","GEN","","HINDU","","0026-04-01","","60.00","155.00","Himalaya","33","11","","BERLA","","PAWAN KUMAR","","","","REENA","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"106","106","ANSH","","8 th","VENUS","neerajjakhar38@gmail.com","9050959882","","","Male","2014-02-08","GEN","","HINDU","","2019-04-01","","63.00","159.00","Arawali","33","11","","DHANI KHUBI","","PAWAN","","","","NEERAJ","","","","15300.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"108","108","MANISH KUMAR","","8 th","MARS","sandeepthalor687@gmail.com","9350157604","","","Male","2013-02-25","GEN","","","","2019-04-01","","46.00","161.00","Himalaya","21","17","","DHANASRI","","SANDEEP","","","","RAJNESH","","","","14400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"110","110","KRITI","","8 th","VENUS","","8930078902","","","Female","0012-07-16","GEN","","HINDU","","2018-10-21","","66.00","167.00","Nilgiri","31","18","","DHANI KHUBI","","PAWAN","","","","NIDHI","","","","13000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"111","111","HITESH","","8 th","VENUS","shahnshasheoran999@gmail.com","9991666580","","","Male","2013-12-21","GEN","","HINDU","","2019-04-01","","30.00","140.00","Himalaya","17","9","","BERLA","","SHAHNSHA","","","","BABY","","","","18300.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"328","328","PALAK","","8 th","MARS","","9812202847","","","Female","2014-11-19","STSC","","","","2022-05-28","","38.00","151.00","Shivalik","","","","JAGRAMBASS","","RAMESH KUMAR","","","","MONU","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"356","366","KHUSHANT","","8 th","MARS","sehrawatjyoti338@gmail.com","9992479117","","","Male","2014-04-22","GEN","","","","2022-07-02","","39.00","147.00","Nilgiri","68","57","","RAMBASS","","CHANDERVESH","","","","MONIKA","","","","14400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"367","367","TANVI","","8 th","MARS","Sudesh11195@gmail.com","8053838806","","","Female","2013-09-10","GEN","","","","","","51.00","166.00","Shivalik","82","72","","KANHRA","","VIJENDER SINGH","","","","SUDESH","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"0375","375A","KESHAV SHEORAN","","8 th","MARS","","9991011475","","","Male","2012-08-11","GEN","","","","2022-07-26","","54.00","170.00","Shivalik","42","29","","HUI","","SANJEET KUMAR","","","","RINKU","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"382","382","TARUN","","8 th","MARS","","8683983287","","","Male","2014-02-10","BC-A","","","","2022-08-02","","51.00","151.00","Nilgiri","","","","KADMA","","ROSHAN","","","","SUSHMA","","","","18300.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"387","387","LOKITA","","8 th","VENUS","Gyanbirsingh5@gmail.com","7988454538","","","Female","0012-10-30","GEN","","HINDU","","2022-08-05","","54.00","159.00","Himalaya","","","","KISKANDHA","","GYANVIR","","","","RAKESH","","","","12500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"442","442","AKSHRA","","8 th","VENUS","","9050215813","","","Female","2012-06-17","GEN","","HINDU","","2023-05-08","","43.00","154.99","Himalaya","15","7","","BERLA","","NARESH","","","","SUNITA","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"443","443","SARIKA","","8 th","VENUS","","9817175923","","","Female","2013-09-14","GEN","","HINDU","","2023-05-08","","47.00","160.00","Nilgiri","15","7","","BALALI","","RAJESH KUMAR","","","","ANITA","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"543","543","NIKHIL","","8 th","MARS","","8930516248","","","Male","2013-09-16","GEN","","","","2023-10-27","","32.00","146.00","Arawali","69","58","","RUDROL","","SANDEEP","","","","KAVITA","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"592","592","PARIDHI","","8 th","VENUS","nehasingla06494@gmail.com","9050216682","","","Female","2012-03-19","GEN","","HINDU","","2024-04-18","","56.00","152.00","Nilgiri","33","11","","BERLA","","PARDEEP","","","","NEHA SINGLA","","","","18300.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"600","600","LAKSHIT","","8 th","VENUS","rampalsingh15061985@gmail.com","9991616857","","","Male","2014-04-02","GEN","","HINDU","","2024-05-03","","29.00","139.00","Nilgiri","65","54","","PICHOPA KHURD","","RAMPAL","","","","SUNITA DEVI","","","","18300.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"667","667","KHUSHI KUMARI","","8 th","MARS","","8816998066","","","Female","2013-11-10","GEN","","","","2024-10-19","","33.00","144.00","Shivalik","54","42","","KUBJA NAGAR","","PARDEEP","","","","MONIKA","","","","11900.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"751","751","VANSHIKA","","8 th","VENUS","v89286099@gmail.com","7027046329","","","Female","2012-10-03","GEN","","HINDU","","2025-05-21","","49.00","158.00","Arawali","63","52","","NIMAR","","DHARMDUTT","","","","BALA DEVI","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"780","780","VISHESH","","8 th","MARS","","8708477539","","","Male","2014-03-08","OBC","","","","2025-07-14","","44.00","143.00","Shivalik","33","11","","BERLA","","KRISHAN KUMAR","","","","DEVIKA SONI","","","","17100.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"781","781","RAJ NANDINI","","8 th","MARS","","8708477539","","","Female","2013-09-10","OBC","","","","2025-07-14","","34.00","141.00","Shivalik","33","11","","BERLA","","KRISHAN KUMAR","","","","VERSHA VERMA","","","","17100.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"793","793","RAAVI","","8 th","VENUS","","9813154413","","","Female","2013-06-19","GEN","","HINDU","","2025-08-04","","35.00","151.00","Himalaya","45","32","","JEWALI","","BALJEET KUMAR","","","","VARSHA","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"833","833","KHUSHI","","8 th","MARS","","9991772201","","","Female","2012-04-15","GEN","","","","2026-04-03","","39.00","159.00","Nilgiri","16","8","","BADRAI","","HANSRAJ","","","","SUSHEELA","","","","15300.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"835","835","LUCKY","","8 th","MARS","","8000789184","","","Male","2013-12-14","GEN","","","","2026-04-04","","30.00","144.00","Himalaya","83","71","","DALAWAS","","AJAY KUMAR","","","","MONIKA","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"842","842","SNEHA","","8 th","MARS","","9812270393","","","Female","2013-08-26","GEN","","","","2026-04-18","","36.00","147.00","Arawali","14","6","","BANDWA","","SURENDER SINGH","","","","SONIKA","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"843","843","LAKSHAY","","8 th","MARS","","9910483992","","","Male","2014-04-01","GEN","","","","2026-04-18","","31.00","146.00","Himalaya","14","6","","BANDWA","","RAJ SINGH","","","","MONIKA KUMARI","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"857","857","JIVIKA","","8 th","VENUS","p20168924@gmail.com","8307379604","","","Female","2014-01-03","GEN","","HINDU","","2020-04-18","","53.00","150.00","Himalaya","58","46","","M.HARIYA","","SANDEEP","","","","POOJA","","","","13500.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25801","25801","ISHITA","","8 th","MARS","","9992179527","","","Female","2012-11-24","","","","","","","49.00","168.00","Arawali","49","36","","KADMA","","SANDEEP","","","","SARITA","","","","18300.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25802","25802","Amit","","8 th","MARS","","8053843200","","","Male","2014-09-14","GEN","","Hindu","","","2026-08-14","30.00","140.00","Himalaya","","","","MAI KALAN","","VIJENDER","","","","MEENA","","","","69600.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25803","25803","DEEPIKA","","8 th","MARS","","7056927484","","","Female","2013-01-18","GEN","","","","","","37.00","150.00","Nilgiri","","","","RAMBASS","","DHARMBIR","","","","MONIKA","","","","19400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25804","25804","KANAK","","8 th","MARS","","8813003016","","","Female","2013-08-07","GEN","","","","","","32.00","136.99","Himalaya","","","","KALALI","","RAJPAL","","","","PARMILA","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"26801","26801","HEENAL","","8 th","VENUS","sandeepec@gmail.com","8930742441","","","Female","2013-10-26","GEN","","HINDU","","2026-04-01","","51.00","160.00","Arawali","","","","NAURANGABASS RAJPUTAN","","SANDEEP KUMAR","","","","SARITA SUHAG","","","","20100.00","","","","","No","No","No","No","No","No","No","Non-RTE",""`;

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
  const rawClass = row["Class"] ? String(row["Class"]).replace(/\s*(st|nd|rd|th)$/i, "").trim() : "8";
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
