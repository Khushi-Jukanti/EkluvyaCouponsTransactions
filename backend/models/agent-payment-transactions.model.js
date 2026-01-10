const mongoose = require('mongoose');

const AgentPaymentTransactionSchema = new mongoose.Schema({
  // Original transaction ID from ekluvya DB
  originalTransactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Payment management columns (for agents_db only - with defaults)
  agent_payment_mode: {
    type: String,
    default: null
  },
  agent_payment_date: {
    type: Date,
    default: null
  },
  agent_payment_status: {
    type: String,
    default: null
  },
  agent_payment_amount: {
    type: Number,
    default: null
  },
  agent_payment_notes: {
    type: String,
    default: ''
  },
  agent_payment_updated_by: {
    type: String,
    default: ''
  },
  agent_payment_updated_at: {
    type: Date,
    default: null
  },

  // Metadata
  synced_from_ekluvya_at: {
    type: Date,
    default: Date.now
  },
  last_synced_at: Date

}, {
  timestamps: true,
  strict: false,
  collection: 'agent_payment_transactions'
});

// Indexes for performance
AgentPaymentTransactionSchema.index({ agentName: 1, date_ist: -1 });
AgentPaymentTransactionSchema.index({ coupon_code: 1 });
AgentPaymentTransactionSchema.index({ paymentStatus: 1 });
AgentPaymentTransactionSchema.index({ agent_payment_status: 1 });
AgentPaymentTransactionSchema.index({ agent_payment_mode: 1 });

// Remove problematic middleware and add custom methods instead
AgentPaymentTransactionSchema.statics.normalizePaymentData = function (paymentData) {
  const normalized = { ...paymentData };

  // Normalize payment mode
  if (normalized.agent_payment_mode && typeof normalized.agent_payment_mode === 'string') {
    normalized.agent_payment_mode = normalized.agent_payment_mode
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/banktransfer/gi, 'bank_transfer')
      .replace(/creditcard/gi, 'credit_card')
      .replace(/notpaid/gi, 'not_paid');
  }

  // Normalize payment status
  if (normalized.agent_payment_status && typeof normalized.agent_payment_status === 'string') {
    const status = normalized.agent_payment_status.toLowerCase().trim();
    if (status === 'paid') {
      normalized.agent_payment_status = 'paid';
    }
  }

  return normalized;
};

module.exports = AgentPaymentTransactionSchema;