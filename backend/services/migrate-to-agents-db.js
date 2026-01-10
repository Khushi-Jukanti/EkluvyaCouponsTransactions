require('dotenv').config();
const mongoose = require('mongoose');

// Connect to ekluvya DB
const ekluvyaConnection = mongoose.createConnection(process.env.MONGODB_URI);

// Connect to agents DB
const agentsConnection = mongoose.createConnection(process.env.AGENT_DB_URI);

// Load models
const UserPaymentTransaction = ekluvyaConnection.model(
  'UserPaymentTransaction',
  new mongoose.Schema({}, { strict: false, collection: 'userpaymenttransctions' })
);

const AgentPaymentTransactionSchema = require('../models/agent-payment-transactions.model');
const AgentPaymentTransaction = agentsConnection.model(
  'AgentPaymentTransaction',
  AgentPaymentTransactionSchema
);

async function migrateTransactions() {
  try {
    console.log('Starting migration from ekluvya DB to agents DB...');
    
    // Count total transactions
    const totalCount = await UserPaymentTransaction.countDocuments();
    console.log(`Total transactions in ekluvya DB: ${totalCount}`);
    
    let batchSize = 1000;
    let skip = 0;
    let migratedCount = 0;
    let skippedCount = 0;
    
    while (true) {
      console.log(`Processing batch ${skip / batchSize + 1}...`);
      
      const transactions = await UserPaymentTransaction.find()
        .skip(skip)
        .limit(batchSize)
        .lean();
      
      if (transactions.length === 0) {
        break;
      }
      
      const bulkOps = [];
      
      for (const transaction of transactions) {
        // Check if transaction already exists in agents DB
        const exists = await AgentPaymentTransaction.findOne({
          originalTransactionId: transaction._id.toString()
        });
        
        if (exists) {
          skippedCount++;
          continue;
        }
        
        // Prepare the document for agents DB
        const agentTransaction = {
          originalTransactionId: transaction._id.toString(),
          // Map all fields from ekluvya transaction
          ...transaction,
          _id: undefined, // Remove the original _id to avoid conflicts
          
          // Add default payment columns
          agent_payment_mode: null,
          agent_payment_date: null,
          agent_payment_status: null,
          agent_payment_amount: null,
          agent_payment_notes: '',
          agent_payment_updated_by: '',
          agent_payment_updated_at: null,
          
          // Set sync timestamps
          synced_from_ekluvya_at: new Date(),
          last_synced_at: new Date(),
        };
        
        bulkOps.push({
          updateOne: {
            filter: { originalTransactionId: transaction._id.toString() },
            update: { $set: agentTransaction },
            upsert: true
          }
        });
      }
      
      // Execute bulk operations
      if (bulkOps.length > 0) {
        const result = await AgentPaymentTransaction.bulkWrite(bulkOps, { ordered: false });
        migratedCount += result.upsertedCount + result.modifiedCount;
        console.log(`Batch processed: ${bulkOps.length} operations, ${result.upsertedCount} upserted`);
      }
      
      skip += batchSize;
      
      // Add a small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\nMigration completed!');
    console.log(`Total migrated: ${migratedCount}`);
    console.log(`Skipped (already exists): ${skippedCount}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await ekluvyaConnection.close();
    await agentsConnection.close();
    process.exit(0);
  }
}

// Run migration
migrateTransactions();