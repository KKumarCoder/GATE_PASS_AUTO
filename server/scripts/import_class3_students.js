import mongoose from "mongoose";
import dotenv from "dotenv";
import { parse } from "csv-parse/sync";
import { Student } from "../models/index.js";

dotenv.config();

const csvData = `"Adm No","Roll No","First Name","Last Name","Class","Section","Email","Mobile","Aadhar Number","PEN Number","Gender","DOB","Caste","Category","Religion","Blood Group","Admission Date","Measurement Date","Weight","Height","House","Route List","Pickup Point","Hostel","Address","Room No","Father Name","Father Phone","Father Email","Father Occupation","Mother Name","Mother Phone","Mother Email","Mother Occupation","Discount Amt","Bank Account No","Bank Account Holder","Bank IFSC","Bank Name","Aadhaar (Doc)","Birth Cert (Doc)","Bank Passbook (Doc)","SSSMID (Doc)","Marksheet (Doc)","Transfer Certificate (TC)","Other Documents","RTE Status","RTE App No"
"547","547","HIMANSHI","","3 rd","MARS","","9813080767","","","Female","2018-08-11","BC- B","","","","","","20.00","115.00","Arawali","69","58","","KANHRA","","SANDEEP KUMAR","","","","RITU BALA","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"548","548","LAKSHYA","","3 rd","MARS","","9728506092","","","Male","2018-06-10","GEN","","","","","","31.00","131.00","Himalaya","68","57","","RAMBASS","","VIKRAM","","","","MADHU","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"549","549","DIVYA","","3 rd","MARS","","9728506092","","","Female","2018-09-25","GEN","","","","","","26.00","131.00","Nilgiri","68","57","","RAMBASS","","SANDEEP","","","","MAMTA","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"550","550","YASHMEET","","3 rd","MARS","","8396823960","","","Male","2016-10-08","STSC","","","","","","23.00","124.00","Arawali","69","58","","RUDROL","","VINOD KUMAR","","manjugrewall23@gmail.com","","SUDARSHANA","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"551","551","JIYA","","3 rd","VENUS","monujanghuo@gmail.com","8814990282","","","Female","2018-03-12","GEN","","","","","","20.00","125.00","Arawali","","","","KADMA","","NAVEEN KUMAR","","","","MONIKA","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"552","552","DEVANSH","","3 rd","MARS","","9671110939","","","Male","2018-05-13","GEN","","","","","","21.00","125.00","Nilgiri","82","72","","KANHRA","","VIPIN KUMAR","","vpnsheoran92@gmail.com","","JYOTI","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"553","553","GARVIT","","3 rd","MARS","","9416505430","","","Male","2017-11-25","GEN","","","","","","35.00","138.00","Shivalik","","","","PICHOPA KHURD","","PARVEEN KUMAR","","monusheoran189@gmail.com","","NEELAM","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"554","554","ROBIN","","3 rd","MARS","","8930231188","","","Male","2017-12-14","GEN","","","","","","32.00","128.00","Shivalik","50","37","","NIHALGARH","","DHARMENDER","","331389839@gmail.com","","SARITA","","","","11650.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"555","555","KHUSHPREET SINGH","","3 rd","MARS","","8816900512","","","Male","2018-07-28","GEN","","","","","","26.00","130.00","Nilgiri","84","76","","NIMAR","","NARESH KUMAR","","nkt.cdlu@gmail.com","","NEERU KUMARI","","","","11650.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"556","556","CHAHAL CHOUDHARY","","3 rd","MARS","","8814906181","","","Female","2018-08-31","GEN","","","","","","24.00","128.00","Shivalik","33","11","","DHANI KHUBI","","KASHMIR","","ksvijarniya@gmail.com","","SUDESH","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"557","557","ANGEL","","3 rd","MARS","","8689093592","","","Female","2018-09-02","GEN","","","","","","19.00","130.00","Nilgiri","82","72","","KANHRA","","RAKESH","","sheoranrakesh1991@gmail.com","","KAVITA","","","","1300.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"559","559","KHUSHI","","3 rd","JUPITER","","9050216682","","","Female","2018-11-13","GEN","","","","","","21.00","120.00","Nilgiri","35","22","","BERLA","","NAVDEEP KUMAR","","","","ASHA","","","","11650.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"561","561","MAYANK","","3 rd","MARS","","9091358824","","","Male","2018-02-18","GEN","","","","","","22.00","127.00","Himalaya","","","","DHANASARI","","MANOJ KUMAR","","thalormanoj@gmail.com","","ANITA KUMARI","","","","11650.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"562","562","DISHU","","3 rd","MARS","","9802211597","","","Female","2017-12-25","GEN","","","","","","23.00","125.00","Arawali","63","52","","KUBJA NAGAR","","KRISHAN KUMAR","","","","TARAWATI","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"563","563","VAANI","","3 rd","MARS","","9817145677","","","Female","2018-03-24","GEN","","","","","","23.00","133.00","Arawali","40","27","","HANSAWAS","","ANIL KUMAR","","","","REKHA","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"564","564","BHAVIKA DHILLON","","3 rd","MARS","","9050156118","","","Female","2017-12-20","GEN","","","","","","21.00","129.00","Shivalik","","","","RAMBASS","","NAVEEN KUMAR","","","","ANITA KUMARI","","","","10600.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"565","565","DIVYANSHI","","3 rd","JUPITER","","9671592299","","","Female","2018-11-19","GEN","","","","","","17.00","110.00","Himalaya","","","","DAGROLI","","SUNIL KUMAR","","","","SUSHIL KUMARI","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"566","566","MANVEEK","","3 rd","JUPITER","","9812160770","","","Male","2018-11-30","GEN","","","","","","22.00","125.00","Shivalik","34","15","","DAGROLI","","ARVIND","","","","REKHA RANI","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"567","567","SHUBHAM","","3 rd","JUPITER","","8683032011","","","Male","2018-05-21","STSC","","","","","","26.00","130.00","Arawali","","","","DAGROLI","","JAIVIR","","","","RAJWANTI","","","","11650.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"568","568","NAINA","","3 rd","VENUS","","7988162291","","","Female","2017-05-11","GEN","","","","","","16.00","110.00","Shivalik","45","32","","JEWALI","","AMARJEET","","","","GEETA","","","","14400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"569","569","JIVIKA","","3 rd","VENUS","","9306833090","","","Female","2018-05-31","GEN","","","","","","36.00","131.00","Nilgiri","54","42","","KUBJA NAGAR","","PRAVEEN KUMAR","","","","MAMTA","","","","17000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"570","570","VIDHI","","3 rd","VENUS","gauravsheoran120@gmail.com","9813408125","","","Female","2018-07-12","GEN","","","","","","23.00","125.00","Arawali","","","","BERLA","","RAKESH","","","","URMILA","","","","17000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"571","571","PARTIK","","3 rd","VENUS","Kuldeepsheoran@gmai.com","9812418577","","","Male","2017-06-03","GEN","","","","","","25.00","135.00","Arawali","","","","CHANDWAS","","KULDEEP","","","","SUMAN","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"573","573","PRINCE","","3 rd","VENUS","","8708989023","","","Male","2017-10-29","STSC","","","","","","20.00","128.00","Shivalik","34","15","","DAGROLI","","RAVINDER KUMAR","","","","SURYANTA","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"574","574","CHINTU","","3 rd","VENUS","","9053597453","","","Male","2018-07-07","GEN","","","","","","18.00","115.00","Shivalik","","","","GOPALWAS","","RANBIR","","","","ANJU LATA","","","","15700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"575","575","UTTAM LAMBA","","3 rd","VENUS","","9813145698","","","Male","2018-07-09","GEN","","","","","","25.00","130.00","Arawali","68","57","","RAMBASS","","SUMIT KUMAR","","","","BABLI SANGWAN","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"576","576","DAKSH SANGWAN","","3 rd","VENUS","","9050853642","","","Male","2018-05-21","GEN","","","","","","25.00","130.00","Arawali","34","15","","KUBJA NAGAR","","SOURABH SANGWAN","","","","POOJA KUMARI","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"577","577","VISHU","","3 rd","VENUS","","9812874437","","","Female","0017-12-31","GEN","","","","","","18.00","115.00","Shivalik","63","52","","NIMAR BADESRA","","NAVEEN KUMAR","","","","SUREKHA","","","","10200.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"579","579","NAVYA","","3 rd","VENUS","","7014017309","","","Female","2019-02-26","GEN","","","","","","33.00","135.00","Nilgiri","17","9","","KOLINDA (JHUNJHANU)","","ARVIND KUMAR","","","","SAVITA","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"580","580","PRACHI","","3 rd","VENUS","","9306560958","","","Female","2018-12-28","STSC","","","","","","","","Arawali","","","","BERLA","","PARDEEP","","","","SONAM","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"582","582","DEVANSH SANGWAN","","3 rd","VENUS","","7027059179","","","Male","2018-09-25","GEN","","","","","","25.00","130.00","Arawali","","","","KUBJA NAGAR","","CHITRESH KUMAR","","","","MONU","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"614","614","HETANSH","","3 rd","VENUS","","9813610101","","","Male","2018-10-31","GEN","","","","","","38.00","130.00","Nilgiri","33","11","","BERLA","","SANDEEP KUMAR","","","","SHWETA GOEL","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"615","615","HARTVIK","","3 rd","VENUS","","8607498704","","","Male","2018-10-05","GEN","","","","","","19.00","123.00","Nilgiri","64","53","","NIMAR BAD.","","RAVINDER KUMAR","","","","REKHA RANI","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"617","617","AARVI","","3 rd","VENUS","Sangeetashearan72@gmail.com","9812785188","","","Female","2018-09-29","GEN","","","","","","20.00","130.00","Nilgiri","","","","HUI","","SANDEEP KUMAR","","","","SANGEETA","","","","11650.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"618","618","CHIRAG","","3 rd","VENUS","","8307379604","","","Male","2017-11-30","BC- B","","","","","","30.00","135.00","Himalaya","58","46","","M.HARIYA","","SANDEEP KUMAR","","","","POOJA","","","","11650.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"619","619","PRIYANSHI","","3 rd","VENUS","","9991835162","","","Female","2018-06-20","GEN","","","","","","21.00","123.00","Shivalik","82","72","","KANHRA","","NARENDER","","","","NEELAM","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"620","620","MOHIT","","3 rd","VENUS","","9812583959","","","Male","2018-04-17","GEN","","","","","","26.00","130.00","Nilgiri","82","72","","KANHRA","","SOMBIR","","","","POOJA","","","","11650.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"621","621","DEVANSHI","","3 rd","VENUS","","9050775767","","","Female","2018-08-28","GEN","","","","","","23.00","135.00","Shivalik","34","15","","DAGROLI","","BANTI","","","","PUSHPA","","","","650.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"623","623","NAVNEET","","3 rd","VENUS","","8816998066","","","Male","2018-01-12","GEN","","","","","","20.00","125.00","Nilgiri","54","42","","KUBJA NAGAR","","PARDEEP KUMAR","","","","MONIKA","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"625","625","RITIKA","","3 rd","JUPITER","","9992171896","","","Female","2018-04-29","GEN","","","","","","20.00","128.00","Arawali","63","52","","NIMAR BAD.","","DHARMENDER","","","","TARA RANI","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"627","627","TINKESH","","3 rd","JUPITER","","8607290611","","","Male","2018-12-28","GEN","","","","0024-05-15","","22.00","119.00","Nilgiri","50","37","","KADMA","","RAJESH","","","","SUNITA","","","","15050.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"628","628","KHUSHI","","3 rd","JUPITER","","9306159558","","","Female","2018-03-14","GEN","","","","0024-05-15","","33.00","131.00","Shivalik","82","72","","KANHRA","","PRADEEP KUMAR","","","","PINKI","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"629","629","YUVRAJ","","3 rd","JUPITER","","9919997865","","","Male","2019-02-05","STSC","","","","","","20.00","123.00","Arawali","","","","RASIDPURMAI","","AMIT KUMAR","","","","ARTI SAGAR","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"630","630","HIMANSHU","","3 rd","JUPITER","","9812331171","","","Male","2016-12-16","GEN","","","","","","29.00","134.00","Himalaya","40","27","","HANSAWAS KALAN","","SATISH","","","","MEENA KUMARI","","","","11650.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"648","648","PARIKSHIT","","3 rd","MARS","","8307060131","","","Male","2018-05-26","OBC","","","","","","18.00","121.00","Nilgiri","49","36","","KADMA","","SHASHI","","","","KAVITA","","","","11650.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"650","650","NAVYA","","3 rd","JUPITER","","8053838835","","","Female","2018-01-13","BC-A","","","","","","23.00","125.00","Nilgiri","63","52","","NIMAR","","KRISHAN KUMAR","","","","POONAM","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"651","651","RISHIKA","","3 rd","MARS","","9518231272","","","Female","2019-03-22","GEN","","","","","","","","Arawali","34","15","","DAGROLI","","SOMVIR SINGH","","","","JYOTI","","","","11650.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"652","652","NIKHIL","","3 rd","JUPITER","","9350181498","","","Male","2019-03-25","GEN","","","","","","21.00","118.00","Shivalik","","","","MANDHI H.","","HARISH","","","","ANAMIKA","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"653","653","HIYAAN","","3 rd","MARS","","7419080890","","","Male","2019-03-17","GEN","","","","","","25.00","130.00","Himalaya","34","15","","DAGROLI","","VIRENDER","","","","SHIWANI","","","","12300.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"654","654","PULKIT JAKHAR","","3 rd","JUPITER","","8930793719","","","Male","2019-03-22","GEN","","","","","","22.00","123.00","Nilgiri","82","72","","Devrala","","AMIT KUMAR","","","","ANKIT KUMARI","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"668","668","HARSH","","3 rd","JUPITER","","9050090720","","","Male","2019-04-14","GEN","","","","","","26.00","128.00","Himalaya","","","","RAMBASS","","NAVEEN KUMAR","","","","POONAM","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"669","669","JATIN","","3 rd","JUPITER","","9812206796","","","Male","2016-09-26","STSC","","","","","","26.00","131.00","","58","46","","MANDHI HARIYA","","ANIL KUMAR","","","","RAJKAMAL","","","","11650.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"693","693","PARI","","3 rd","JUPITER","","9812620504","","","Female","2018-09-10","GEN","","","","","","23.00","120.00","Nilgiri","","","","Devrala","","DHARMBIR","","","","NISHA KUMARI","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"700","700","DEEPANSHI","","3 rd","MARS","","9991932215","","","Female","2017-12-25","GEN","","","","","","25.00","132.00","Arawali","","","","NIMAR","","SUNIL","","","","MEENU","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"701","701","PRIYANSHI","","3 rd","MARS","","9991932215","","","Female","2016-09-04","GEN","","","","","","32.00","141.00","Himalaya","","","","NIMAR","","SUNIL","","","","MEENU","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"711","711","AELY","","3 rd","JUPITER","","9588733326","","","Female","2017-08-16","GEN","","","","","","22.00","126.00","Arawali","45","32","","JEWALI","","BALJEET KUMAR","","","","VARSHA","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"724","724","SHIVAM","","3 rd","JUPITER","","9034917274","","","Male","2017-08-10","GEN","","","","","","24.00","131.00","Shivalik","84","76","","BERLA","","SUDESH KUMAR","","","","ANJU KUMARI","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"729","729","DEEPAK","","3 rd","MARS","","9728488198","","","Male","2017-04-06","GEN","","","","","","30.00","140.00","Arawali","","","","PICHOPA","","DHILU RAM","","","","SHALU","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"737","737","BHAUMIK","","3 rd","JUPITER","","9050798115","","","Male","2017-09-29","GEN","","","","","","25.00","130.00","Nilgiri","68","57","","RAMBASS","","RAJ KUMAR","","","","NEELAM DEVI","","","","11650.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"739","739","ARYAN LAMBA","","3 rd","JUPITER","","9588745984","","","Male","2015-12-21","GEN","","","","","","29.00","135.00","Arawali","68","57","","RAMBASS","","MANJEET SINGH","","","","PINKI DEVI","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"763","763","HANSHU","","3 rd","MARS","","9991655709","","","Male","2017-11-09","GEN","","","","","","29.00","128.00","Himalaya","16","8","","BADRAI","","SUNIL KUMAR","","","","MONU KUMARI","","","","11650.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"772","772","YASH","","3 rd","MARS","","8814899575","","","Male","2016-07-25","GEN","","","","","","23.00","127.00","Shivalik","","","","BHANDWA","","DHARMENDER","","","","INDUMAYA","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"783","783","ANSHIKA YADAV","","3 rd","VENUS","arunhrsa3960@gmail.com","8814003062","","","Female","2018-05-02","BC- B","","","","","","25.00","128.00","Arawali","62","51","","NIHALGARH","","ARUN KUMAR YADAV","","","","MONIKA YADAV","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"790","790","DIVYA","","3 rd","JUPITER","","7015023648","","","Female","2018-06-08","GEN","","","","","","18.00","115.00","Arawali","","","","NIMAR","","AMIT KUMAR","","","","SONIA","","","","5400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"791","791","MAYANK","","3 rd","JUPITER","","8398900982","","","Male","2018-03-03","GEN","","","","","","19.00","112.00","Arawali","","","","Nimar","","KRISHAN KUMAR","","","","BEERMATI","","","","15700.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"797","797","NISHU","","3 rd","JUPITER","","8818003780","","","Female","2018-03-08","GEN","","","","","","25.00","129.00","Himalaya","68","57","","RAMBASS","","PARDEEP KUMAR","","","","NEELAM","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"871","871","SAMRIDHI SANGWAN","","3 rd","MARS","","9034033983","","","Female","2018-05-18","GEN","","","","","","22.00","125.00","Arawali","","","","PICHOPA","","VINAY SANGWAN","","","","EKTA","","","","5600.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"872","872","MOHIT","","3 rd","VENUS","","9992968478","","","Male","2017-03-11","GEN","","","","","","21.00","127.00","Himalaya","63","52","","NIMAR BADESRA","","SURESH KUMAR","","","","SUSHILA DEVI","","","","14400.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25301","25301","MANSHI","","3 rd","JUPITER","","8059690209","","","Female","2019-11-27","GEN","","","","","","18.00","111.00","Arawali","","","","JEWALI","","SOMBIR","","","","BHATERI","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"25302","25302","MAYANK","","3 rd","JUPITER","","9812593752","","","Male","2015-12-04","GEN","","","","","","27.00","137.00","Nilgiri","","","","ADHAMPUR","","RAVI","","","","LALITA","","","","12300.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"26301","26301","HARDIK","","3 rd","JUPITER","","9728750138","","","Male","2018-05-19","GEN","","","","","","21.00","120.00","Shivalik","82","72","","KANHRA","","BIRENDER","","","","SALOCHANA","","","","11000.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"26302","26302","ISHIKA","","3 rd","MARS","","7027363230","","","Female","2016-10-16","OBC","","","","","","25.00","124.00","Arawali","","","","Rudrol","","VIKAS","","","","LALI","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""
"26303","26303","NISHU","","3 rd","VENUS","","9992968478","","","Female","2018-07-24","GEN","","","","","","29.00","127.00","Himalaya","","","","M.HARIYA","","SOMBIR","","","","POOJA","","","","0.00","","","","","No","No","No","No","No","No","No","Non-RTE",""`;

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
  const rawClass = row["Class"] ? String(row["Class"]).replace(/\s*(st|nd|rd|th)$/i, "").trim() : "3";
  const section = String(row["Section"] || "").trim().toUpperCase();
  const rawAddress = String(row["Address"] || "").replace(/[\r\n]+/g, " ").trim();
  const village = rawAddress ? rawAddress.toUpperCase() : "Not recorded";
  
  const cleanMobile = String(row["Mobile"] || "").replace(/\D/g, "");
  const primaryMobile = cleanMobile.length === 10 ? `+91${cleanMobile}` : cleanMobile.startsWith("91") && cleanMobile.length === 12 ? `+${cleanMobile}` : `+91${cleanMobile}`;
  
  const cleanNameForEmail = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const candidateEmail = (row["Email"] && row["Email"].trim()) 
    || (row["Father Email"] && row["Father Email"].trim()) 
    || (row["Mother Email"] && row["Mother Email"].trim());
  const email = candidateEmail ? candidateEmail.trim().toLowerCase() : `${cleanNameForEmail}.${adm}@srpskanhra.com`;

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
