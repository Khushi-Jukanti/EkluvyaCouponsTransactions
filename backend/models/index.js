// src/models/index.js
const mongoose = require('mongoose');

// Register all collections with empty schema (so aggregation works)
const collections = [
    'users',
    'coupons',
    'payments',
    'userpaymenttransactions',
    'usersubscriptiontransctions',
    'usercoupons',
    'couponusages'
];


// Auto-register all models with empty schema (perfect for aggregation)
collections.forEach(name => {
  if (!mongoose.models[name]) {
    mongoose.model(name, new mongoose.Schema({}, { strict: false, collection: name }));
  }
});

console.log('All MongoDB models registered successfully');
module.exports = mongoose;