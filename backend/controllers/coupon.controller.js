// src/controllers/coupon.controller.js
const mongoose = require('mongoose');
const UserPaymentTransaction = require('../models/userpaymenttransactions.model');
const Coupon = mongoose.models.coupons || mongoose.model('coupons', new mongoose.Schema({}, { strict: false, collection: 'coupons' }));

const searchCoupon = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ success: false, message: 'q parameter required' });

    const code = q.trim().toUpperCase();

    // 1. Check in DATABASE → this decides if coupon is active
    const dbCoupon = await Coupon.findOne({ coupon_text: code });

    // 2. Get agent details from Excel (backup)
    const agent = global.AGENT_COUPON_MAP[code];

    res.json({
      success: true,
      coupon: code,
      active: dbCoupon ? !!dbCoupon.is_active : false,   // MAIN LOGIC: from DB
      inDatabase: !!dbCoupon,
      agent: agent ? {
        name: agent.agentName || 'Unknown Agent',
        phone: agent.phone || 'N/A',
        email: agent.email || 'N/A',
        location: agent.location || 'N/A',
        type: agent.agentType || 'Agent'
      } : null,
      discount: agent?.discount || 0,
      usageLimit: agent?.usageLimit || 1000,
      plan: agent?.plan || 'Unknown Plan'
    });

  } catch (err) {
    console.error('Coupon Search Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const getCouponTransactions = async (req, res) => {
  try {
    const { code } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 50;

    const pipeline = [
      { $match: { coupon_text: code.toUpperCase(), is_subscription: true } },
      { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          userName: { $trim: { input: { $concat: ['$user.first_name', ' ', { $ifNull: ['$user.last_name', ''] }] } } },
          phone: '$user.phone',
          email: '$user.email',
          amount: '$price',
          date_ist: { $dateToString: { format: '%d-%m-%Y %H:%M:%S', date: '$created_at', timezone: 'Asia/Kolkata' } }
        }
      },
      { $sort: { created_at: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ];

    const [transactions, total] = await Promise.all([
      UserPaymentTransaction.aggregate(pipeline),
      UserPaymentTransaction.countDocuments({ coupon_text: code.toUpperCase() })
    ]);

    const agent = global.AGENT_COUPON_MAP[code.toUpperCase()] || {};

    res.json({
      success: true,
      coupon: code.toUpperCase(),
      active: !!await Coupon.findOne({ coupon_text: code.toUpperCase(), is_active: true }),
      agentName: agent.agentName || 'Unknown Agent',
      totalUsed: total,
      data: transactions,
      pagination: { page, total, pages: Math.ceil(total / limit) }
    });

  } catch (err) {
    console.error('Get Coupon Transactions Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { searchCoupon, getCouponTransactions };