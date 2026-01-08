// addCouponUrlToAgents.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Agent = require('../models/agent'); // Adjust path to your Agent model

dotenv.config();

const AGENT_DB_URI = process.env.AGENT_DB_URI;

if (!AGENT_DB_URI) {
  console.error('❌ AGENT_DB_URI not found in .env file');
  process.exit(1);
}

const BASE_URL = 'https://ott.ekluvya.guru/subscription?coupon_code=';

const connectDB = async () => {
  try {
    await mongoose.connect(AGENT_DB_URI);
    console.log('✅ Connected to Agent MongoDB');
  } catch (err) {
    console.error('❌ DB Connection Failed:', err.message);
    process.exit(1);
  }
};

const updateAgentsWithCouponUrl = async () => {
  try {
    console.log('🔄 Starting migration: Adding Coupon_code_url to all agents...');

    // Find all agents that have couponCode but missing Coupon_code_url
    const agents = await Agent.find({
      couponCode: { $exists: true, $ne: null },
      $or: [
        { Coupon_code_url: { $exists: false } },
        { Coupon_code_url: null },
        { Coupon_code_url: '' }
      ]
    });

    if (agents.length === 0) {
      console.log('✅ No agents need update. All already have Coupon_code_url');
      return;
    }

    console.log(`📊 Found ${agents.length} agents to update`);

    let updatedCount = 0;

    for (const agent of agents) {
      const couponUrl = `${BASE_URL}${agent.couponCode}`;

      await Agent.updateOne(
        { _id: agent._id },
        {
          $set: {
            Coupon_code_url: couponUrl,
            updatedAt: new Date()
          }
        }
      );

      updatedCount++;
      if (updatedCount % 10 === 0) {
        console.log(`   Updated ${updatedCount}/${agents.length} agents...`);
      }
    }

    console.log(`🎉 Migration complete! Updated ${updatedCount} agents with Coupon_code_url`);
  } catch (err) {
    console.error('❌ Error during migration:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
    process.exit(0);
  }
};

// Run the script
(async () => {
  await connectDB();
  await updateAgentsWithCouponUrl();
})();


// node utils/addCouponUrlToAgents.js