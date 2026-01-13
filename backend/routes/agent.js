// routes/agent.js - CORRECTED VERSION
const Agent = require("../models/agent");
const Transaction = require("../models/userpaymenttransactions.model");
const express = require("express");
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

const AGENTS_DB_URL = process.env.AGENT_DB_URI || 'mongodb+srv://nataraju:lwD2YYqzE8LwjNJI@agents_db.uctlmuc.mongodb.net/agents_db';
const AGENTS_DB_NAME = process.env.AGENTS_DB_NAME || 'agents_db';

// MongoDB connection client
let agentsDbClient = null;
let agentsDb = null;

// Function to connect to agents database
async function connectToAgentsDB() {
  try {
    // Check if we already have a connection
    if (agentsDbClient && agentsDb) {
      try {
        // Try a simple operation to check if connection is alive
        await agentsDb.command({ ping: 1 });
        console.log('✅ Using existing agents database connection');
        return agentsDb;
      } catch (error) {
        console.log('⚠️ Existing connection lost, reconnecting...');
        // Connection is dead, need to reconnect
        agentsDbClient = null;
        agentsDb = null;
      }
    }

    console.log('🔌 Connecting to agents database...');

    // Connect to MongoDB
    agentsDbClient = await MongoClient.connect(AGENTS_DB_URL);

    agentsDb = agentsDbClient.db(AGENTS_DB_NAME);

    // Test the connection
    await agentsDb.command({ ping: 1 });
    console.log('✅ Successfully connected to agents database');

    return agentsDb;
  } catch (error) {
    console.error('❌ Failed to connect to agents database:', error.message);
    // Reset connection on error
    agentsDbClient = null;
    agentsDb = null;
    throw error;
  }
}

// GET /agent/profile
router.get("/profile", verifyToken, async (req, res) => {
  try {
    // Since you're using MongoDB for agents, use the Agent model
    const agent = await Agent.findById(req.user.id).select("-password");

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Format the response to match what frontend expects
    res.json({
      name: agent.name || "Agent",
      mobile: agent.mobile || "N/A",
      email: agent.email || "",
      couponCode: agent.couponCode || "",
      Coupon_code_url: agent.Coupon_code_url || "",
      role: agent.role || "agent",
      firstLogin: agent.firstLogin,
      forcePasswordChange: agent.forcePasswordChange,
      account_number: agent.account_number || "",
      ifsc_code: agent.ifsc_code || "",
      bank_name: agent.bank_name || "",
      account_details_updated: agent.account_details_updated || false
    });

  } catch (error) {
    console.error("Error fetching agent profile:", error);
    res.status(500).json({ message: "Error fetching profile data" });
  }
});

// POST /agent/update-account-details
router.post('/update-account-details', verifyToken, async (req, res) => {
  try {
    const { account_number, ifsc_code, bank_name } = req.body;
    const agentId = req.user.id;

    // Validate input
    if (!account_number || !ifsc_code) {
      return res.status(400).json({
        message: 'Account number and IFSC code are required'
      });
    }

    // Validate account number (9-18 digits)
    if (account_number.length < 9 || account_number.length > 18) {
      return res.status(400).json({
        message: 'Account number must be between 9 and 18 digits'
      });
    }

    // Validate IFSC code format
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifsc_code.toUpperCase())) {
      return res.status(400).json({
        message: 'Invalid IFSC code format (e.g., SBIN0001234)'
      });
    }

    // Update agent account details in MongoDB
    const updatedAgent = await Agent.findByIdAndUpdate(
      agentId,
      {
        account_number: account_number,
        ifsc_code: ifsc_code.toUpperCase(),
        bank_name: bank_name,
        account_details_updated: true,
        updated_at: new Date()
      },
      { new: true, select: '-password' }
    );

    if (!updatedAgent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    res.json({
      message: 'Account details updated successfully',
      agent: {
        id: updatedAgent._id,
        name: updatedAgent.name,
        account_number: updatedAgent.account_number,
        ifsc_code: updatedAgent.ifsc_code,
        bank_name: updatedAgent.bank_name
      }
    });

  } catch (error) {
    console.error('Error updating account details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /agent/subscriptions
router.get("/subscriptions", verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    // Get filter from query
    const filterStatus = req.query.status || "all";

    // Get agent from main database
    const agent = await Agent.findById(req.user.id).select("name couponCode");

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent not found"
      });
    }

    console.log("=== FETCHING AGENT SUBSCRIPTIONS ===");
    console.log("Agent:", agent.name, "Coupon:", agent.couponCode);
    console.log("Filter Status:", filterStatus);

    // STEP 1: Get all transactions from main database (existing code)
    const allTransactions = await Transaction.aggregate([
      // Match transactions with agent's coupon code
      { $match: { coupon_text: agent.couponCode } },

      // Lookup user information
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "userInfo"
        }
      },
      { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },

      // Lookup payment information
      {
        $lookup: {
          from: "payments",
          localField: "payment_id",
          foreignField: "_id",
          as: "paymentInfo"
        }
      },
      { $unwind: { path: "$paymentInfo", preserveNullAndEmptyArrays: true } },

      // Determine payment status
      {
        $addFields: {
          paymentStatus: { $ifNull: ["$paymentInfo.status", 2] },
          paymentStatusText: {
            $cond: {
              if: { $eq: [{ $ifNull: ["$paymentInfo.status", 2] }, 2] },
              then: "Success",
              else: "Failed"
            }
          }
        }
      },

      // Project all necessary fields
      {
        $project: {
          _id: 1,
          transactionId: {
            $ifNull: ["$gud_transaction_id", { $toString: "$_id" }]
          },
          userName: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ["$userInfo.first_name", ""] },
                  " ",
                  { $ifNull: ["$userInfo.last_name", ""] }
                ]
              }
            }
          },
          mobile: { $ifNull: ["$userInfo.phone", "N/A"] },
          email: { $ifNull: ["$userInfo.email", "N/A"] },
          couponCode: "$coupon_text",
          amount: { $ifNull: ["$price", 0] },
          paymentStatus: 1,
          paymentStatusText: 1,
          createdAt: "$created_at",
          // Create unique key: username + mobile + status
          uniqueKey: {
            $concat: [
              { $ifNull: ["$userInfo.first_name", ""] },
              " ",
              { $ifNull: ["$userInfo.last_name", ""] },
              "|",
              { $ifNull: ["$userInfo.phone", ""] },
              "|",
              {
                $cond: {
                  if: { $eq: [{ $ifNull: ["$paymentInfo.status", 2] }, 2] },
                  then: "Success",
                  else: "Failed"
                }
              }
            ]
          }
        }
      },

      // Sort by date (latest first) so we keep the latest transaction
      { $sort: { createdAt: -1 } }
    ]);

    console.log(`Found ${allTransactions.length} total transactions for coupon: ${agent.couponCode}`);

    const transactionIds = allTransactions.map(t => t._id.toString());
    let paymentMap = {};

    try {
      // Create connection to agents_db
      const agentDbConnection = await mongoose.createConnection(process.env.AGENT_DB_URI).asPromise();

      // Check if collection exists
      const collections = await agentDbConnection.db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      console.log("Collections in agents_db:", collectionNames);

      // Find the payment collection (could be named differently)
      let paymentCollectionName = null;
      const possibleNames = ['agent_payment_transactions', 'payments', 'agent_payments', 'transactions'];

      for (const name of possibleNames) {
        if (collectionNames.includes(name)) {
          paymentCollectionName = name;
          break;
        }
      }

      if (paymentCollectionName) {
        console.log(`Using collection: ${paymentCollectionName}`);

        const paymentDocs = await agentDbConnection.db.collection(paymentCollectionName)
          .find({
            originalTransactionId: { $in: transactionIds }
          })
          .project({
            originalTransactionId: 1,
            agent_payment_status: 1,
            agent_payment_mode: 1,
            agent_payment_date: 1,
            agent_payment_updated_at: 1,
            coupon_text: 1
          })
          .toArray();

        console.log(`Found ${paymentDocs.length} payment documents`);

        // Create payment map
        paymentDocs.forEach(payment => {
          if (payment.originalTransactionId) {
            paymentMap[payment.originalTransactionId.toString()] = {
              agent_payment_status: payment.agent_payment_status,
              agent_payment_mode: payment.agent_payment_mode,
              agent_payment_date: payment.agent_payment_date,
              agent_payment_updated_at: payment.agent_payment_updated_at
            };
          }
        });
      } else {
        console.log("No payment collection found in agents_db");
      }

      // Close connection
      await agentDbConnection.close();

    } catch (paymentError) {
      console.error("Error fetching payment data:", paymentError.message);
    }

    console.log(`Payment map has ${Object.keys(paymentMap).length} entries`);

    // STEP 3: Remove duplicates and merge with payment data
    const uniqueMap = new Map();

    for (const transaction of allTransactions) {
      const key = transaction.uniqueKey;
      if (!uniqueMap.has(key)) {
        // Merge payment data if available
        const transactionId = transaction._id.toString();
        const paymentInfo = paymentMap[transactionId] || {};

        uniqueMap.set(key, {
          ...transaction,
          ...paymentInfo
        });
      }
    }

    const uniqueTransactions = Array.from(uniqueMap.values());

    console.log(`After removing duplicates: ${uniqueTransactions.length} unique transactions`);

    // Log payment data status
    const transactionsWithPayment = uniqueTransactions.filter(t => t.agent_payment_status);
    console.log(`Transactions with payment data: ${transactionsWithPayment.length}/${uniqueTransactions.length}`);

    if (transactionsWithPayment.length > 0) {
      console.log("Sample payment data:", {
        id: transactionsWithPayment[0]._id,
        status: transactionsWithPayment[0].agent_payment_status,
        date: transactionsWithPayment[0].agent_payment_date,
        mode: transactionsWithPayment[0].agent_payment_mode
      });
    } else {
      console.log("NO PAYMENT DATA FOUND for any transaction");
    }

    // Apply status filter if needed
    let filteredTransactions = uniqueTransactions;
    if (filterStatus !== "all") {
      filteredTransactions = uniqueTransactions.filter(tx =>
        tx.paymentStatusText === (filterStatus === "success" ? "Success" : "Failed")
      );
    }

    console.log(`After status filter "${filterStatus}": ${filteredTransactions.length} transactions`);

    // SORT ONLY BY DATE (latest first) - no status grouping
    filteredTransactions.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // Apply pagination
    const totalCount = filteredTransactions.length;
    const paginatedData = filteredTransactions.slice(skip, skip + limit);

    console.log(`Returning ${paginatedData.length} transactions for page ${page}`);

    // Format the data
    const formattedData = paginatedData.map((item, index) => {
      // Parse the date
      let date;
      if (item.createdAt instanceof Date) {
        date = item.createdAt;
      } else if (item.createdAt) {
        date = new Date(item.createdAt);
        if (isNaN(date.getTime())) {
          console.warn(`Invalid date for transaction ${item._id}: ${item.createdAt}`);
          date = new Date();
        }
      } else {
        date = new Date();
      }

      // Format for Indian locale
      const formattedDate = date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata'
      });

      const formattedTime = date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
      });

      // Clean up user name
      const userName = item.userName.trim();
      const userInitial = userName && userName !== "" ? userName.charAt(0).toUpperCase() : "U";

      return {
        serialNo: (page - 1) * limit + index + 1,
        _id: item._id,
        transactionId: item.transactionId,
        userName: userName === "" ? "Customer" : userName,
        userInitial: userInitial,
        mobile: item.mobile,
        email: item.email,
        couponCode: item.couponCode,
        amount: item.amount,
        paymentStatus: item.paymentStatus,
        paymentStatusText: item.paymentStatusText,
        createdAt: item.createdAt,
        formattedDate: formattedDate,
        formattedTime: formattedTime,
        subscriptionType: "One-time",

        // Payment fields from agents_db
        agent_payment_status: item.agent_payment_status,
        agent_payment_date: item.agent_payment_date,
        agent_payment_mode: item.agent_payment_mode,
        agent_payment_updated_at: item.agent_payment_updated_at,
      };
    });

    // Calculate stats from unique transactions
    const stats = {
      totalRevenue: 0,
      successCount: 0,
      failedCount: 0,
      totalUsers: new Set(uniqueTransactions.map(tx =>
        `${tx.userName}|${tx.mobile}`
      )).size
    };

    uniqueTransactions.forEach(item => {
      stats.totalRevenue += item.amount;
      if (item.paymentStatusText === "Success") {
        stats.successCount++;
      } else {
        stats.failedCount++;
      }
    });

    console.log(`Stats: Success=${stats.successCount}, Failed=${stats.failedCount}, Revenue=${stats.totalRevenue}`);

    res.json({
      success: true,
      data: formattedData,
      stats: {
        totalRevenue: stats.totalRevenue,
        successCount: stats.successCount,
        failedCount: stats.failedCount,
        pendingCount: 0,
        totalUsers: stats.totalUsers
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount: totalCount,
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1,
        pageSize: limit
      }
    });

  } catch (error) {
    console.error("Error fetching agent subscriptions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching subscription data",
      error: error.message
    });
  }
});

router.post('/batch-account-numbers', async (req, res) => {
  console.log('📦 Received batch account numbers request');

  try {
    const { agentNames } = req.body;

    console.log('Agent names received:', agentNames);
    console.log('Number of agent names:', agentNames.length);

    if (!agentNames || !Array.isArray(agentNames)) {
      return res.status(400).json({
        success: false,
        message: 'Agent names array is required'
      });
    }

    // Filter valid agent names
    const validAgentNames = agentNames
      .filter(name => name && typeof name === 'string' && name.trim() !== '')
      .map(name => name.trim());

    console.log(`Valid agent names: ${validAgentNames.length}`);

    if (validAgentNames.length === 0) {
      return res.json({
        success: true,
        data: {}
      });
    }

    try {
      // Connect to agents database
      const db = await connectToAgentsDB();
      const agentsCollection = db.collection('agents');

      console.log('Connected to agents_db, querying agents collection...');

      // IMPORTANT: Create regex patterns for case-insensitive search
      // Some agent names might have different casing
      const regexPatterns = validAgentNames.map(name =>
        new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
      );

      console.log('Regex patterns created for search');

      // Query agents by name (case-insensitive)
      const agents = await agentsCollection.find(
        {
          name: { $in: regexPatterns }
        },
        {
          projection: {
            name: 1,
            account_number: 1,    // Note: field name is account_number
            bank_name: 1,         // Note: field name is bank_name
            ifsc_code: 1,         // Note: field name is ifsc_code
            mobile: 1,
            email: 1,
            couponCode: 1
            // Note: No branchName field in your data
          }
        }
      ).toArray();

      console.log(`Found ${agents.length} agents in agents_db`);

      // Log what we found
      agents.forEach(agent => {
        console.log(`Found agent: "${agent.name}"`);
        console.log(`  Account: ${agent.account_number || 'N/A'}`);
        console.log(`  Bank: ${agent.bank_name || 'N/A'}`);
        console.log(`  IFSC: ${agent.ifsc_code || 'N/A'}`);
      });

      // Create a map of agent names to account details
      const agentMap = {};

      // First, try to match exact names
      agents.forEach(agent => {
        if (agent.name) {
          // Find the exact matching name from our list
          const matchingName = validAgentNames.find(name =>
            name.toLowerCase() === agent.name.toLowerCase()
          );

          if (matchingName) {
            agentMap[matchingName] = {
              // Map the actual field names from agents_db to expected frontend names
              accountNo: agent.account_number || '',      // Map account_number to accountNo
              bankName: agent.bank_name || '',           // Map bank_name to bankName
              ifscCode: agent.ifsc_code || '',           // Map ifsc_code to ifscCode
              branchName: '',                            // Your data doesn't have branchName
              phone: agent.mobile || '',
              email: agent.email || '',
              couponCode: agent.couponCode || '',
              source: 'agents_db'
            };
            console.log(`✅ Mapped agent "${matchingName}"`);
          }
        }
      });

      // Also check for missing agents and provide empty entries
      validAgentNames.forEach(name => {
        if (!agentMap[name]) {
          // Try a direct query for this specific name
          console.log(`⚠️ Agent "${name}" not found in initial query, trying direct search...`);

          // Don't do another query here, just mark as not found
          agentMap[name] = {
            accountNo: '',
            bankName: '',
            ifscCode: '',
            branchName: '',
            phone: '',
            email: '',
            couponCode: '',
            source: 'not_found'
          };
        }
      });

      console.log(`Returning data for ${Object.keys(agentMap).length} agents`);

      // Log final results
      console.log('=== FINAL RESULTS ===');
      Object.entries(agentMap).forEach(([name, data]) => {
        console.log(`${name}: ${data.accountNo ? '✓ Has data' : '✗ No data'} (${data.source})`);
      });

      res.json({
        success: true,
        data: agentMap,
        stats: {
          requested: validAgentNames.length,
          found: agents.length,
          returned: Object.keys(agentMap).length,
          withAccountData: Object.values(agentMap).filter(a => a.accountNo).length
        }
      });

    } catch (dbError) {
      console.error('Database error:', dbError.message);
      console.error('Stack:', dbError.stack);

      // If database connection fails, return empty data
      const agentMap = {};
      validAgentNames.forEach(name => {
        agentMap[name] = {
          accountNo: '',
          bankName: '',
          ifscCode: '',
          branchName: '',
          phone: '',
          email: '',
          couponCode: '',
          source: 'error'
        };
      });

      res.json({
        success: true,
        data: agentMap,
        warning: 'Database connection issue, returning empty data',
        stats: {
          requested: validAgentNames.length,
          found: 0,
          returned: validAgentNames.length
        }
      });
    }

  } catch (error) {
    console.error('❌ Error in batch account numbers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agent account numbers',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Single agent account number endpoint
router.get('/account-number/:agentName', async (req, res) => {
  try {
    const { agentName } = req.params;

    if (!agentName || typeof agentName !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Agent name is required'
      });
    }

    try {
      const db = await connectToAgentsDB();
      const agentsCollection = db.collection('agents');

      // Query agent by name (case-insensitive)
      const agent = await agentsCollection.findOne(
        { name: new RegExp(`^${agentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        {
          projection: {
            accountNo: 1,
            bankName: 1,
            ifscCode: 1,
            branchName: 1,
            phone: 1,
            mobile: 1
          }
        }
      );

      if (!agent) {
        return res.json({
          success: true,
          accountNo: '',
          bankName: '',
          ifscCode: '',
          branchName: '',
          phone: ''
        });
      }

      res.json({
        success: true,
        accountNo: agent.accountNo || '',
        bankName: agent.bankName || '',
        ifscCode: agent.ifscCode || '',
        branchName: agent.branchName || '',
        phone: agent.phone || agent.mobile || ''
      });

    } catch (dbError) {
      console.error('Database error:', dbError.message);

      // Return empty data if database fails
      res.json({
        success: true,
        accountNo: '',
        bankName: '',
        ifscCode: '',
        branchName: '',
        phone: '',
        warning: 'Database connection issue'
      });
    }

  } catch (error) {
    console.error('Error fetching agent account number:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch agent account number',
      error: error.message
    });
  }
});

// Test endpoint to check database structure
router.get('/test-db-structure', async (req, res) => {
  try {
    const db = await connectToAgentsDB();

    // List all collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    // Get sample documents from each collection
    const sampleData = {};

    for (const collectionName of collectionNames) {
      const collection = db.collection(collectionName);
      const sampleDoc = await collection.findOne({});

      sampleData[collectionName] = {
        count: await collection.countDocuments(),
        sample: sampleDoc
      };
    }

    res.json({
      success: true,
      database: AGENTS_DB_NAME,
      collections: collectionNames,
      data: sampleData
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check database structure',
      error: error.message
    });
  }
});

module.exports = router;