// src/models/coupons.model.js
const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({}, { 
  strict: false, 
  collection: 'coupons' 
});

module.exports = mongoose.models.coupons || mongoose.model('coupons', CouponSchema);