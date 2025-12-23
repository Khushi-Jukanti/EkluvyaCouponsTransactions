const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { agentDB } = require('../config/db.config');

const agentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    mobile: { type: String, unique: true, sparse: true },
    email: { type: String, sparse: true },
    password: String,
    couponCode: String,
    role: {
        type: String,
        enum: ['agent', 'admin'],
        default: 'agent'
    },
    firstLogin: { type: Boolean, default: true },
    forcePasswordChange: { type: Boolean, default: false },
    otp: String,
    otpExpiry: Date,
    account_number: { type: String, default: '' },
    ifsc_code: { type: String, default: '' },
    bank_name: { type: String, default: '' },
    account_details_updated: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

/* 🔐 Hash password */
agentSchema.pre('save', async function () {
    if (!this.isModified('password')) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

/* ⏱ Update timestamp */
agentSchema.pre('save', async function () {
    this.updatedAt = Date.now();
});

/* 🔍 Compare password */
agentSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const Agent = agentDB.model('Agent', agentSchema);
module.exports = Agent;
