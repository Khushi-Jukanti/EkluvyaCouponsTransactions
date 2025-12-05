// src/models/userpaymenttransactions.model.js
const mongoose = require('mongoose');

// Register the model with flexible schema (no strict fields)
const UserPaymentTransactionSchema = new mongoose.Schema({}, {
  strict: false,
  collection: 'userpaymenttransctions',
  timestamps: false
});

// Register only if not already registered
const UserPaymentTransaction = mongoose.models.userpaymenttransactions 
  || mongoose.model('userpaymenttransctions', UserPaymentTransactionSchema);

module.exports = UserPaymentTransaction;