const express = require('express');
const router = express.Router();
const agentsDbSyncService = require('../services/agents-db-sync.service');

// Import ekluvya model for reference only (read-only)
const mongoose = require('mongoose');
const ekluvyaConnection = mongoose.createConnection(process.env.MONGODB_URI);
const UserPaymentTransaction = ekluvyaConnection.model(
    'UserPaymentTransaction',
    new mongoose.Schema({}, { strict: false, collection: 'userpaymenttransctions' })
);

// 1. Sync a transaction from ekluvya to agents_db
router.post('/sync-from-ekluvya', async (req, res) => {
    try {
        const { transactionId } = req.body;

        if (!transactionId) {
            return res.status(400).json({
                success: false,
                message: 'Transaction ID is required'
            });
        }

        // Get transaction from ekluvya DB (read only)
        const transaction = await UserPaymentTransaction.findById(transactionId);

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found in ekluvya DB'
            });
        }

        // Sync to agents_db
        const syncResult = await agentsDbSyncService.syncTransactionFromEkluvya(
            transaction.toObject()
        );

        if (!syncResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to sync to agents_db',
                error: syncResult.error
            });
        }

        res.json({
            success: true,
            message: syncResult.message,
            data: syncResult.data,
            action: syncResult.action
        });
    } catch (error) {
        console.error('Error syncing transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Update payment data in agents_db only
router.post('/update-payment', async (req, res) => {
    try {
        console.log('📝 Update payment request received');

        const { transactionId, paymentData } = req.body;

        if (!transactionId || !paymentData) {
            console.log('❌ Missing required fields');
            return res.status(400).json({
                success: false,
                message: 'Transaction ID and payment data are required'
            });
        }

        if (!paymentData.agent_payment_mode || !paymentData.agent_payment_date) {
            console.log('❌ Missing payment mode or date');
            return res.status(400).json({
                success: false,
                message: 'Payment mode and date are required'
            });
        }

        console.log('🔄 Calling updatePaymentOnly service...');

        // Update in agents_db only
        const updateResult = await agentsDbSyncService.updatePaymentOnly(
            transactionId,
            paymentData,
            'admin' // Hardcode for now
        );

        console.log('✅ Update result:', updateResult.success ? 'Success' : 'Failed');

        if (!updateResult.success) {
            return res.status(404).json(updateResult);
        }

        res.json({
            success: true,
            message: updateResult.message,
            data: updateResult.data
        });
    } catch (error) {
        console.error('❌ Error in update-payment route:', error);
        console.error('Full error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Get batch payment data
router.post('/batch-payment-data', async (req, res) => {
    try {
        const { transactionIds } = req.body;

        if (!transactionIds || !Array.isArray(transactionIds)) {
            return res.status(400).json({
                success: false,
                message: 'Transaction IDs array is required'
            });
        }

        console.log('📦 Fetching payment data for', transactionIds.length, 'transactions');

        // Get payment data from agents_db
        const agentsConnection = mongoose.createConnection(process.env.AGENT_DB_URI);
        await agentsConnection.asPromise();

        // Use a simple schema
        const schema = new mongoose.Schema({}, { strict: false });
        const AgentPaymentTransaction = agentsConnection.model(
            'AgentPaymentTransaction',
            schema,
            'agent_payment_transactions'
        );

        const transactions = await AgentPaymentTransaction.find({
            originalTransactionId: { $in: transactionIds }
        }).select('originalTransactionId agent_payment_mode agent_payment_date agent_payment_status agent_payment_amount agent_payment_notes agent_payment_updated_at -_id');

        await agentsConnection.close();

        // Convert to map
        const paymentDataMap = {};
        transactions.forEach(t => {
            if (t.originalTransactionId) {
                paymentDataMap[t.originalTransactionId] = {
                    agent_payment_mode: t.agent_payment_mode,
                    agent_payment_date: t.agent_payment_date,
                    agent_payment_status: t.agent_payment_status,
                    agent_payment_amount: t.agent_payment_amount,
                    agent_payment_notes: t.agent_payment_notes,
                    agent_payment_updated_at: t.agent_payment_updated_at
                };
            }
        });

        console.log('✅ Found payment data for', Object.keys(paymentDataMap).length, 'transactions');

        res.json({
            success: true,
            data: paymentDataMap
        });
    } catch (error) {
        console.error('❌ Error getting batch payment data:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// 3. Get transaction with payment data from agents_db
router.get('/transaction/:transactionId', async (req, res) => {
    try {
        const { transactionId } = req.params;

        const result = await agentsDbSyncService.getTransaction(transactionId);

        if (!result.success) {
            return res.status(404).json(result);
        }

        res.json({
            success: true,
            data: result.data
        });
    } catch (error) {
        console.error('Error getting transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// 4. Get agent's transactions with payment data
router.get('/agent/:agentName', async (req, res) => {
    try {
        const { agentName } = req.params;
        const filters = req.query;

        const result = await agentsDbSyncService.getAgentTransactions(agentName, filters);

        if (!result.success) {
            return res.status(500).json(result);
        }

        res.json({
            success: true,
            data: result.data,
            count: result.count
        });
    } catch (error) {
        console.error('Error getting agent transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// 5. Get payment statistics
router.get('/payment-stats', async (req, res) => {
    try {
        const result = await agentsDbSyncService.getPaymentStats();

        if (!result.success) {
            return res.status(500).json(result);
        }

        res.json({
            success: true,
            data: result.data
        });
    } catch (error) {
        console.error('Error getting payment stats:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// 6. Bulk sync recent transactions
router.post('/bulk-sync-recent', async (req, res) => {
    try {
        const { hours = 24, limit = 1000 } = req.body;

        const cutoffDate = new Date(Date.now() - (hours * 60 * 60 * 1000));

        // Get recent transactions from ekluvya
        const transactions = await UserPaymentTransaction.find({
            $or: [
                { createdAt: { $gte: cutoffDate } },
                { updatedAt: { $gte: cutoffDate } }
            ]
        })
            .limit(limit)
            .lean();

        console.log(`Found ${transactions.length} recent transactions to sync`);

        let synced = 0;
        let failed = 0;
        const results = [];

        // Sync each transaction
        for (const transaction of transactions) {
            const result = await agentsDbSyncService.syncTransactionFromEkluvya(transaction);
            results.push(result);

            if (result.success) {
                synced++;
            } else {
                failed++;
            }
        }

        res.json({
            success: true,
            message: `Bulk sync completed: ${synced} synced, ${failed} failed`,
            synced,
            failed,
            results
        });
    } catch (error) {
        console.error('Error in bulk sync:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

module.exports = router;