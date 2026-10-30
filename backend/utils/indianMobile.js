// Accept a national mobile number or an explicit Indian country prefix.
function normalizeIndianMobile(value) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  const compact = String(value).trim().replace(/\.0+$/, "").replace(/[\s()-]/g, "");
  if (/^[6-9]\d{9}$/.test(compact)) return compact;
  if (/^(?:\+91|91)[6-9]\d{9}$/.test(compact)) return compact.slice(-10);
  return "";
}
module.exports = { normalizeIndianMobile };
