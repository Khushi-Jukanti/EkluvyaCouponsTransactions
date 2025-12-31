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

// NEW: GET /agents/check/:couponCode
app.get('/api/agents/check/:couponCode', (req, res) => {
  try {
    const { couponCode } = req.params;
    console.log(`🔍 Checking coupon: ${couponCode}`);
    
    const agent = AgentCouponService.getAgentByCoupon(couponCode);
    
    if (agent) {
      console.log(`✅ Found agent for coupon ${couponCode}:`, agent.agentName);
      res.json({
        success: true,
        exists: true,
        agent: {
          name: agent.agentName,
          mobile: agent.phone,
          location: agent.location,
          couponCode: couponCode.toUpperCase(),
          handedOver: agent.handedOver,
          generated: agent.generated
        }
      });
    } else {
      console.log(`❌ No agent found for coupon ${couponCode}`);
      res.json({
        success: true,
        exists: false,
        message: `Coupon ${couponCode} not found`
      });
    }
  } catch (error) {
    console.error('Error checking coupon:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking coupon'
    });
  }
});

// NEW: GET /agents/all (if needed for frontend)
app.get('/api/agents/all', (req, res) => {
  try {
    const agents = AgentCouponService.getAllAgents();
    console.log(`📊 Returning ${agents.length} agents to frontend`);
    
    res.json({
      success: true,
      data: agents,
      count: agents.length
    });
  } catch (error) {
    console.error('Error getting all agents:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting agents'
    });
  }
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