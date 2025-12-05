// src/config/db.config.js
const mongoose = require('mongoose');
require('dotenv').config();
require('../models/index'); // ← This line fixes everything

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
    });
    console.log('MongoDB Connected Successfully');
    console.log('All collections auto-registered');
  } catch (err) {
    console.error('MongoDB Connection Failed:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;