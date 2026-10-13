import mongoose from "mongoose";
import dotenv from "dotenv";
import { Student } from "../models/index.js";

dotenv.config();

const rawData = [
  {"admNo":"712","rollNo":"712","firstName":"JAI","lastName":"","class":"1","section":"VENUS","email":"dharmender250484@gmail.com","mobile":"9991171896","gender":"Male","dob":"2019-06-20","address":"NIMAR","father":"DHARMENDER","mother":"TARA RANI","route":""},
  {"admNo":"713","rollNo":"713","firstName":"HIMANI","lastName":"","class":"1","section":"VENUS","email":"","mobile":"9813121910","gender":"Female","dob":"2019-11-19","address":"BADRAI","father":"SUNDER PAL","mother":"REENA KUMARI","route":"16"},
  {"admNo":"714","rollNo":"714","firstName":"JATIN","lastName":"","class":"1","section":"MARS","email":"","mobile":"9671252835","gender":"Male","dob":"2019-06-19","address":"BERLA","father":"ANUJ","mother":"POOJA KUMARI","route":"16"},
  {"admNo":"717","rollNo":"717","firstName":"DAKSH","lastName":"","class":"1","section":"MARS","email":"Dineshkadyan88000@gmail.com","mobile":"9468288000","gender":"Male","dob":"2019-09-14","address":"DAGROLI","father":"DINESH KUMAR","mother":"RITU","route":""},
  {"admNo":"719","rollNo":"719","firstName":"OJAS","lastName":"","class":"1","section":"VENUS","email":"surenderpoonia46@gmail.com","mobile":"9829143284","gender":"Male","dob":"2019-08-22","address":"BANGOTHARI KHURD","father":"RAJESH KUMAR","mother":"REENA","route":"82"},
  {"admNo":"722","rollNo":"722","firstName":"AISHA","lastName":"","class":"1","section":"MARS","email":"sidlamba3517@gmail.com","mobile":"8397083974","gender":"Female","dob":"2019-12-09","address":"RAMBASS","father":"SIDHARTH KUMAR","mother":"KAMLESH","route":"68"},
  {"admNo":"792","rollNo":"792","firstName":"SARA","lastName":"","class":"1","section":"MARS","email":"Baljeetvarshamithi19@gmail.com","mobile":"9588733326","gender":"Female","dob":"2020-06-01","address":"JEWALI","father":"BALJEET KUMAR","mother":"VARSHA","route":"45"},
  {"admNo":"800","rollNo":"800","firstName":"KAVYA","lastName":"","class":"1","section":"MARS","email":"","mobile":"8571024539","gender":"Female","dob":"2020-03-04","address":"BERLA","father":"YOGESH","mother":"MEENU","route":""},
  {"admNo":"801","rollNo":"801","firstName":"NITIN","lastName":"","class":"1","section":"MARS","email":"Satusheoran4@gmail.com","mobile":"9622102959","gender":"Male","dob":"2020-03-14","address":"BERLA","father":"SATYENDER","mother":"PREYASI","route":"17"},
  {"admNo":"802","rollNo":"802","firstName":"SHIVANSHI","lastName":"","class":"1","section":"MARS","email":"","mobile":"9728388975","gender":"Female","dob":"2020-03-22","address":"CHANDWAS","father":"PRADEEP","mother":"PREETI","route":"19"},
  {"admNo":"803","rollNo":"803","firstName":"JIYA","lastName":"","class":"1","section":"MARS","email":"","mobile":"9050589690","gender":"Female","dob":"2020-04-15","address":"BERLA","father":"MUKESH KUMAR URF MUKESH","mother":"MANJU","route":"33"},
  {"admNo":"804","rollNo":"804","firstName":"MAHI","lastName":"","class":"1","section":"MARS","email":"Cscsatnali00@gmail.com","mobile":"9728331125","gender":"Female","dob":"2020-11-10","address":"DAGROLI","father":"DEVENDER KUMAR","mother":"RENU","route":"34"},
  {"admNo":"805","rollNo":"805","firstName":"VIHAN YADAV","lastName":"","class":"1","section":"MARS","email":"Manjeetyadav14310@gmail.com","mobile":"8053774703","gender":"Male","dob":"2020-05-24","address":"NIHALGARH","father":"MANJEET KUMAR","mother":"KANTA","route":"62"},
  {"admNo":"807","rollNo":"807","firstName":"DIVYANSH","lastName":"","class":"1","section":"MARS","email":"","mobile":"8398900982","gender":"Male","dob":"2020-05-18","address":"NIMAR","father":"AMIT KUMAR","mother":"SONIA","route":""},
  {"admNo":"808","rollNo":"808","firstName":"VRITIKA","lastName":"","class":"1","section":"MARS","email":"pvritika2020@gmail.com","mobile":"9518430561","gender":"Female","dob":"2020-06-20","address":"BERLA","father":"SUMIT","mother":"REENA","route":"17"},
  {"admNo":"809","rollNo":"809","firstName":"PARI","lastName":"","class":"1","section":"MARS","email":"Jalodiyaritu@gmail.com","mobile":"9813080767","gender":"Female","dob":"2020-09-18","address":"RUDROL","father":"SANDEEP KUMAR","mother":"RITU BALA","route":"69"},
  {"admNo":"810","rollNo":"810","firstName":"OVI","lastName":"","class":"1","section":"VENUS","email":"jkchahal.001@gmail.com","mobile":"9812504413","gender":"Female","dob":"2020-04-27","address":"NIMAR","father":"JAIVINDER","mother":"SWETA","route":"63"},
  {"admNo":"811","rollNo":"811","firstName":"REYAN","lastName":"","class":"1","section":"VENUS","email":"komaljakhar207@gmail.com","mobile":"9352325780","gender":"Male","dob":"2020-06-03","address":"NIMAR","father":"DEVENDER SINGH","mother":"KOMAL","route":""},
  {"admNo":"812","rollNo":"812","firstName":"RIYAN","lastName":"","class":"1","section":"VENUS","email":"anitasheoran1038@gmail.com","mobile":"8816089486","gender":"Male","dob":"2020-08-25","address":"KANHRA","father":"MANISH KUMAR","mother":"ANITA","route":"82"},
  {"admNo":"813","rollNo":"813","firstName":"PIYANSH SHEORAN","lastName":"","class":"1","section":"VENUS","email":"","mobile":"9728484647","gender":"Male","dob":"2020-08-22","address":"BERLA","father":"AJAY","mother":"SUPRIYA","route":"33"},
  {"admNo":"814","rollNo":"814","firstName":"LOKESH","lastName":"","class":"1","section":"VENUS","email":"","mobile":"9992424340","gender":"Male","dob":"2020-10-05","address":"DHANASRI","father":"SUKHENDER","mother":"SONIA","route":"4"},
  {"admNo":"815","rollNo":"815","firstName":"JIYANSH","lastName":"","class":"1","section":"VENUS","email":"bagribeats@gmail.com","mobile":"9050210836","gender":"Male","dob":"2020-04-15","address":"DAGROLI","father":"KULDEEP KUMAR","mother":"PRITI","route":"34"},
  {"admNo":"816","rollNo":"816","firstName":"RIVAANSHI","lastName":"","class":"1","section":"VENUS","email":"virenyadav5004@gmail.com","mobile":"8198433009","gender":"Female","dob":"2020-03-14","address":"M.HARIYA","father":"VIRENDER","mother":"MANJU","route":"58"},
  {"admNo":"817","rollNo":"817","firstName":"SAVI","lastName":"","class":"1","section":"VENUS","email":"","mobile":"9306927266","gender":"Female","dob":"2020-07-10","address":"BADRAI","father":"SURESH KUMAR","mother":"MEENA DEVI","route":""},
  {"admNo":"818","rollNo":"818","firstName":"PIYUSH","lastName":"","class":"1","section":"VENUS","email":"","mobile":"9812645152","gender":"Male","dob":"2020-02-12","address":"JEWALI","father":"RAJESH KUMAR","mother":"MONIKA","route":""},
  {"admNo":"819","rollNo":"819","firstName":"RIYANSH","lastName":"","class":"1","section":"VENUS","email":"AshishSwami810@gmail.com","mobile":"9817698772","gender":"Male","dob":"2020-07-27","address":"CHANDWAS","father":"ASHISH","mother":"KOMAL","route":"19"},
  {"admNo":"820","rollNo":"820","firstName":"PARTIK KUMAR","lastName":"","class":"1","section":"VENUS","email":"","mobile":"7015711645","gender":"Male","dob":"2020-10-15","address":"KANHRA","father":"SUNIL KUMAR","mother":"SANGEETA","route":""},
  {"admNo":"821","rollNo":"821","firstName":"KHUSHI","lastName":"","class":"1","section":"VENUS","email":"","mobile":"9813323881","gender":"Female","dob":"2020-07-02","address":"DAGROLI","father":"RAVINDER KUMAR","mother":"SURYANTA","route":"34"},
  {"admNo":"824","rollNo":"824","firstName":"ISHANT","lastName":"","class":"1","section":"VENUS","email":"","mobile":"9992581674","gender":"Male","dob":"2020-03-01","address":"PICHOPA KHURD","father":"NEERAJ KUMAR","mother":"BALA DEVI","route":""},
  {"admNo":"826","rollNo":"826","firstName":"MITANSH","lastName":"","class":"1","section":"VENUS","email":"","mobile":"9350036385","gender":"Male","dob":"2020-04-05","address":"AUN","father":"SONU","mother":"MONIKA","route":"19"},
  {"admNo":"867","rollNo":"867","firstName":"Mitansh","lastName":"","class":"1","section":"MARS","email":"Mitanahmonu@gmail.com","mobile":"9419199895","gender":"Male","dob":"2020-02-11","address":"Hansawas K.","father":"Anil","mother":"Monu Kumari","route":""},
  {"admNo":"26101","rollNo":"26101","firstName":"MAYANK","lastName":"","class":"1","section":"MARS","email":"Jaswantsheoran46946@gmail.com","mobile":"9992346946","gender":"Male","dob":"2014-07-30","address":"BERLA","father":"JASWANT SINGH","mother":"RAJBALA","route":"33"},
  {"admNo":"26102","rollNo":"26102","firstName":"ANIKA SHARMA","lastName":"","class":"1","section":"MARS","email":"Ajaysastri4761@gmail.com","mobile":"8882163033","gender":"Female","dob":"2019-12-09","address":"KADMA","father":"BABALU SHARMA","mother":"CHANCHAL","route":"49"},
  {"admNo":"26103","rollNo":"26103","firstName":"AYANSH LAMBA","lastName":"","class":"1","section":"MARS","email":"poonam21794@gmail.com","mobile":"9891399845","gender":"Male","dob":"2021-08-28","address":"RAMBASS","father":"SUDEEP SINGH","mother":"POONAM","route":"68"},
  {"admNo":"26104","rollNo":"26104","firstName":"KESHAV","lastName":"","class":"1","section":"VENUS","email":"","mobile":"7027363230","gender":"Male","dob":"2019-09-22","address":"RUDROL","father":"VIKASH","mother":"LALI","route":""},
  {"admNo":"26105","rollNo":"26105","firstName":"RACHIT","lastName":"","class":"1","section":"VENUS","email":"bsb9728979996@gmail.com","mobile":"9728750138","gender":"Male","dob":"2019-10-28","address":"KANHRA","father":"BRINDER SINGH","mother":"SULOCHNA","route":"82"},
  {"admNo":"26106","rollNo":"26106","firstName":"PARKASH","lastName":"","class":"1","section":"VENUS","email":"","mobile":"7814589615","gender":"Male","dob":"2018-03-13","address":"DAGROLI","father":"BRIJGOPAL","mother":"MAMTA","route":""}
];

function formatStudent(row) {
  const name = [row.firstName, row.lastName].filter(Boolean).join(" ").trim().toUpperCase();
  const cleanMobile = row.mobile.replace(/\D/g, "");
  const primaryMobile = cleanMobile.length === 10 ? `+91${cleanMobile}` : `+${cleanMobile}`;
  const cleanNameForEmail = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const email = (row.email && row.email.trim()) 
    ? row.email.trim().toLowerCase() 
    : `${cleanNameForEmail}.${row.admNo}@srpskanhra.com`;

  return {
    admissionNumber: String(row.admNo).trim(),
    rollNumber: String(row.rollNo || row.admNo).trim(),
    name: name,
    className: String(row.class).trim(),
    section: String(row.section).trim(),
    villageName: (row.address && row.address.trim()) ? row.address.trim() : "Not recorded",
    gender: row.gender || "",
    dateOfBirth: row.dob ? new Date(`${row.dob}T00:00:00.000Z`) : undefined,
    photo: "",
    fatherName: (row.father && row.father.trim()) ? row.father.trim().toUpperCase() : "",
    motherName: (row.mother && row.mother.trim()) ? row.mother.trim().toUpperCase() : "",
    guardianName: "",
    primaryMobile: primaryMobile,
    email: email,
    alternativeMobile: "",
    address: (row.address && row.address.trim()) ? row.address.trim().toUpperCase() : "",
    transportType: row.route ? "BUS" : "",
    busRoute: row.route ? String(row.route).trim() : "",
    status: "ACTIVE"
  };
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const students = rawData.map(formatStudent);
  console.log(`Prepared ${students.length} students`);

  let added = 0;
  let skipped = 0;
  for (const s of students) {
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
