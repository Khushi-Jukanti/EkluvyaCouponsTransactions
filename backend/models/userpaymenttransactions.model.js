// src/models/userpaymenttransactions.model.js
const mongoose = require('mongoose');

const UserPaymentTransactionSchema = new mongoose.Schema({}, {
  strict: false,
  // <-- make sure this matches the actual collection name in MongoDB
  collection: 'userpaymenttransctions',
  timestamps: false
});

// Register model (avoid duplicate model registration errors)
const modelName = 'UserPaymentTransaction';
const UserPaymentTransaction = mongoose.models[modelName] || mongoose.model(modelName, UserPaymentTransactionSchema);

module.exports = UserPaymentTransaction;
