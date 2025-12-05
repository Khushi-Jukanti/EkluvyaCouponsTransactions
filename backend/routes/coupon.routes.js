const express = require('express');
const { searchCoupon, getCouponTransactions } = require('../controllers/coupon.controller');
const router = express.Router();

router.get('/search', searchCoupon);
router.get('/:code/transactions', getCouponTransactions);

module.exports = router;