const path = require("path");
const XLSX = require("../node_modules/xlsx");

const rows = [
  {
    school_name: "Sri Rama School",
    school_type: "SR1",
    school_address: "Hyderabad Main Road",
    branch: "Main Branch",
    receipt_no: "SR1-1001",
    executive_name: "Ramesh",
    executive_phone: "9876543210",
    first_name: "Rahul",
    last_name: "Sharma",
    email: "rahul.sr1@example.com",
    phone: "9000011111",
    dob: "15/08/2012",
    gender: "Male",
    class: "8",
    section: "A",
  },
  {
    school_name: "Sri Rama School",
    school_type: "SR1",
    school_address: "Hyderabad Main Road",
    branch: "Main Branch",
    receipt_no: "SR1-1002",
    executive_name: "Ramesh",
    executive_phone: "9876543210",
    first_name: "Ananya",
    last_name: "Reddy",
    email: "",
    phone: "9000022222",
    dob: "20/04/2013",
    gender: "Female",
    class: "7",
    section: "B",
  },
  {
    school_name: "Sri Rama School",
    school_type: "SR1",
    school_address: "Hyderabad Main Road",
    branch: "Main Branch",
    receipt_no: "SR1-1003",
    executive_name: "Ramesh",
    executive_phone: "9876543210",
    first_name: "Aman",
    last_name: "Kumar",
    email: "aman.sr1@example.com",
    phone: "",
    dob: "01/01/2011",
    gender: "Male",
    class: "9",
    section: "A",
  },
  {
    school_name: "Sri Rama School",
    school_type: "",
    school_address: "Hyderabad Main Road",
    branch: "Secondary Branch",
    receipt_no: "SR1-1004",
    executive_name: "Sushma",
    executive_phone: "9876500001",
    first_name: "Meera",
    last_name: "Iyer",
    email: "meera.sr1@example.com",
    phone: "9000044444",
    dob: "12/12/2012",
    gender: "Female",
    class: "8",
    section: "C",
  },
  {
    school_name: "Sri Rama School",
    school_type: "SR",
    school_address: "Hyderabad Main Road",
    branch: "Primary Branch",
    receipt_no: "SR-1005",
    executive_name: "Sushma",
    executive_phone: "9876500001",
    first_name: "Vikram",
    last_name: "Naidu",
    email: "",
    phone: "9000055555",
    dob: "05/05/2014",
    gender: "Male",
    class: "6",
    section: "A",
  },
];

const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.json_to_sheet(rows);

worksheet["!cols"] = [
  { wch: 24 },
  { wch: 12 },
  { wch: 28 },
  { wch: 18 },
  { wch: 14 },
  { wch: 18 },
  { wch: 18 },
  { wch: 16 },
  { wch: 16 },
  { wch: 26 },
  { wch: 14 },
  { wch: 12 },
  { wch: 12 },
  { wch: 8 },
  { wch: 10 },
];

XLSX.utils.book_append_sheet(workbook, worksheet, "Offline Receipt Users");

const outputPath = path.join(
  __dirname,
  "..",
  "data",
  "offline-receipt-users-sample.xlsx"
);

XLSX.writeFile(workbook, outputPath);
console.log(outputPath);
