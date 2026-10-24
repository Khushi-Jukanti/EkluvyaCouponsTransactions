const { createHash, randomBytes, createCipheriv, createDecipheriv } = require("crypto");

function key() {
  const secret = process.env.DATA_ENTRY_CREDENTIAL_KEY || process.env.JWT_SECRET;
  if (!secret) throw new Error("Credential encryption key is not configured");
  return createHash("sha256").update(`data-entry-credentials:v1:${secret}`).digest();
}
function encryptInitialPassword(password) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(value => value.toString("base64")).join(".");
}
function restoreInitialPassword(user) {
  if (!user.encrypted_initial_password) return user;
  const { encrypted_initial_password, ...fields } = user;
  const [iv, tag, encrypted] = encrypted_initial_password.split(".").map(value => Buffer.from(value, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return { ...fields, password: Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8") };
}
module.exports = { encryptInitialPassword, restoreInitialPassword };
