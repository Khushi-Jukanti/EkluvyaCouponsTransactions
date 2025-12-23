const bcrypt = require("bcrypt");

const hash = "$2b$10$LlpeinbMo8JWqQ8hyAZzUOwQ.mrRO9jmyNgsohk1X2UW7.RDpMXci";
const password = "Hritesh@1234";

async function run() {
  const isMatch = await bcrypt.compare(password, hash);
  console.log("Password match:", isMatch);
}

run().catch(console.error);
