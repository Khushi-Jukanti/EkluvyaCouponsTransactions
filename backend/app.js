const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const transactionRoutes = require('./routes/transaction.routes');
const couponRoutes = require('./routes/coupon.routes');
const errorHandler = require('./middleware/errorHandler');
// const AgentRoutes = require('./routes/agents')

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/transactions', transactionRoutes);
app.use('/api/coupons', couponRoutes);


const AgentCouponService = require('./services/agentCoupon.service');

app.get('/api/total-agents', (req, res) => {
  const total = AgentCouponService.getTotalCoupons();
  res.json({ success: true, totalAgents: total });
});


app.get('/', (req, res) => {
  res.json({
    message: 'Ekluvya Admin Backend API',
    status: 'running',
    endpoints: {
      transactions: '/api/transactions?start=YYYY-MM-DD&end=YYYY-MM-DD&coupon=CODE',
      search_coupon: '/api/coupons/search?q=ARAM8893',
      coupon_details: '/api/coupons/ARAM8893/transactions'
    }
  });
});

app.use(errorHandler);

module.exports = app;