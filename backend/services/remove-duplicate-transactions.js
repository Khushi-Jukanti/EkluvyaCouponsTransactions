require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");

const COLLECTION_NAME = "userpaymenttransctions";

const toText = (value) => String(value ?? "").trim();

const getRawSignature = (doc) => {
  const txId = toText(doc.gud_transaction_id);
  if (txId) return `tx:${txId}`;

  const paymentId = toText(doc.payment_id);
  if (paymentId) return `payment:${paymentId}`;

  const userId = toText(doc.user_id);
  const coupon = toText(doc.coupon_text).toUpperCase();
  const amount = toText(doc.price);
  const status = toText(doc?.payment?.status ?? doc.payment_status ?? doc.status);
  const school = toText(doc.school_code).toLowerCase();

  return `fallback:${userId}|${paymentId}|${school}|${coupon}|${amount}|${status}`;
};

const getScore = (doc) => {
  const fields = [
    doc.gud_transaction_id,
    doc.payment_id,
    doc.user_id,
    doc.coupon_text,
    doc.price,
    doc.created_at,
    doc?.payment?.status,
    doc.school_code,
  ];

  return fields.reduce((score, field) => score + (toText(field) ? 1 : 0), 0);
};

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing");
  }

  const connection = await mongoose.createConnection(process.env.MONGODB_URI).asPromise();
  const collection = connection.collection(COLLECTION_NAME);

  try {
    const docs = await collection.find({}).toArray();
    const bestBySignature = new Map();
    const duplicateIds = [];

    for (const doc of docs) {
      const key = getRawSignature(doc);
      const existing = bestBySignature.get(key);

      if (!existing) {
        bestBySignature.set(key, doc);
        continue;
      }

      const existingScore = getScore(existing);
      const currentScore = getScore(doc);

      if (currentScore > existingScore) {
        duplicateIds.push(existing._id);
        bestBySignature.set(key, doc);
      } else {
        duplicateIds.push(doc._id);
      }
    }

    if (duplicateIds.length === 0) {
      console.log("No duplicate transactions found.");
      return;
    }

    const result = await collection.deleteMany({ _id: { $in: duplicateIds } });
    console.log(`Removed ${result.deletedCount} duplicate transactions.`);
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error("Duplicate cleanup failed:", error);
  process.exitCode = 1;
});
