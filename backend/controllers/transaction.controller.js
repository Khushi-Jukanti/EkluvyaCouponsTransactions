// src/controllers/transaction.controller.js
const moment = require('moment-timezone');
const UserPaymentTransaction = require('../models/userpaymenttransactions.model');

const getAllTransactions = async (req, res) => {
  try {
    const { start, end, coupon, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    let match = { };

    // Date filter in IST
    if (start || end) {
      const startDate = moment.tz(start || '2020-01-01', 'Asia/Kolkata').startOf('day').toDate();
      const endDate = moment.tz(end || new Date(), 'Asia/Kolkata').endOf('day').toDate();
      match.created_at = { $gte: startDate, $lte: endDate };
    }

    if (coupon) {
      match.coupon_text = coupon.trim().toUpperCase();
    }

    // Simple aggregation without agent lookup
    const pipeline = [
      { $match: match },
      { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'payments', localField: 'payment_id', foreignField: '_id', as: 'payment' } },
      { $unwind: { path: '$payment', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          transactionId: { $ifNull: ['$gud_transaction_id', '$payment.gudsho_receipt'] },
          userName: { $trim: { input: { $concat: ['$user.first_name', ' ', { $ifNull: ['$user.last_name', ''] }] } } },
          phone: '$user.phone',
          email: '$user.email',
          couponText: '$coupon_text',
          amount: '$price',
          paymentStatus: '$payment.status',
          date_ist: { $dateToString: { format: '%d-%m-%Y %H:%M:%S', date: '$created_at', timezone: 'Asia/Kolkata' } },
        }
      },
      { $sort: { created_at: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ];

    const [data, total] = await Promise.all([
      UserPaymentTransaction.aggregate(pipeline),
      UserPaymentTransaction.countDocuments(match)
    ]);

    // ADD AGENT INFO IN NODE.JS (THIS IS 100% RELIABLE)
    const enrichedData = data.map(item => {
      const couponCode = item.couponText;
      const agent = couponCode ? global.AGENT_COUPON_MAP[couponCode] : null;

      return {
        ...item,
        agentName: agent?.agentName || 'No Agent',
        agentPhone: agent?.phone || 'N/A',
        agentLocation: agent?.location || 'N/A',
        agentType: agent?.agentType || 'N/A'
      };
    });

    res.json({
      success: true,
      count: enrichedData.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: enrichedData
    });

  } catch (err) {
    console.error('Transaction Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAllTransactions };