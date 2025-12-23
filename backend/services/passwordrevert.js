const bcrypt = require("bcrypt");

const hash = "$2b$10$md0lratikUR4YFSZRSPYCeEj0WgnJndgYT.2cObMf4XupwaBcTDY.";
const password = "Hritesh@963";

async function run() {
  const isMatch = await bcrypt.compare(password, hash);
  console.log("Password match:", isMatch);
}

run().catch(console.error);
