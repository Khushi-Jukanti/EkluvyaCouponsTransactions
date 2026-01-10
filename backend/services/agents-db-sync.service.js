
const mongoose = require('mongoose');

class AgentsDbSyncService {
    constructor() {
        this.agentsConnection = null;
        this.AgentPaymentTransaction = null;
    }

    async initialize() {
        if (!this.agentsConnection) {
            console.log('🔗 Connecting to agents_db...');

            // Remove deprecated options for Mongoose 7+
            this.agentsConnection = mongoose.createConnection(process.env.AGENT_DB_URI);

            // Wait for connection
            await this.agentsConnection.asPromise();
            console.log('✅ Connected to agents_db');

            // Load schema
            const AgentPaymentTransactionSchema = require('../models/agent-payment-transactions.model');

            // Get or create model
            if (this.agentsConnection.models.AgentPaymentTransaction) {
                this.AgentPaymentTransaction = this.agentsConnection.models.AgentPaymentTransaction;
            } else {
                this.AgentPaymentTransaction = this.agentsConnection.model(
                    'AgentPaymentTransaction',
                    AgentPaymentTransactionSchema,
                    'agent_payment_transactions'
                );
            }
        }
    }

    normalizePaymentData(paymentData) {
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
                normalized.agent_payment_status = 'completed';
            }
        }

        // Ensure date is proper Date object
        if (normalized.agent_payment_date && typeof normalized.agent_payment_date === 'string') {
            normalized.agent_payment_date = new Date(normalized.agent_payment_date);
        }

        return normalized;
    }

    async updatePaymentOnly(transactionId, paymentData, updatedBy = 'admin') {
        console.log('🔄 updatePaymentOnly called with:', {
            transactionId,
            paymentData,
            updatedBy
        });

        await this.initialize();

        try {
            // Normalize payment data BEFORE sending to DB
            const normalizedData = this.normalizePaymentData(paymentData);

            console.log('📦 Normalized data:', normalizedData);

            const updatePayload = {
                agent_payment_mode: normalizedData.agent_payment_mode,
                agent_payment_date: normalizedData.agent_payment_date,
                agent_payment_status: normalizedData.agent_payment_status || 'completed',
                agent_payment_amount: normalizedData.agent_payment_amount,
                agent_payment_notes: normalizedData.agent_payment_notes || '',
                agent_payment_updated_by: updatedBy,
                agent_payment_updated_at: new Date()
            };

            console.log('📤 Update payload:', updatePayload);

            // Direct update without middleware issues
            const result = await this.AgentPaymentTransaction.updateOne(
                { originalTransactionId: transactionId },
                { $set: updatePayload }
            );

            console.log('📊 Update result:', result);

            if (result.matchedCount === 0) {
                return {
                    success: false,
                    error: 'Transaction not found in agents_db'
                };
            }

            // Get the updated document
            const updated = await this.AgentPaymentTransaction.findOne({
                originalTransactionId: transactionId
            });

            console.log('✅ Update successful, updated document:', updated._id);

            return {
                success: true,
                data: updated,
                message: 'Payment data updated in agents_db'
            };
        } catch (error) {
            console.error('❌ Error in updatePaymentOnly:', error);
            console.error('Error stack:', error.stack);
            return { success: false, error: error.message };
        }
    }

    // In agents-db-sync.service.js
    async updatePaymentOnlyDirect(transactionId, paymentData) {
        const { MongoClient } = require('mongodb');

        const client = new MongoClient(process.env.AGENT_DB_URI);

        try {
            await client.connect();
            const db = client.db();
            const collection = db.collection('agent_payment_transactions');

            // Normalize data
            const normalizedMode = paymentData.agent_payment_mode
                .toLowerCase()
                .replace(/\s+/g, '_');

            const normalizedStatus = paymentData.agent_payment_status === 'paid'
                ? 'completed'
                : paymentData.agent_payment_status;

            const updateResult = await collection.findOneAndUpdate(
                { originalTransactionId: transactionId },
                {
                    $set: {
                        agent_payment_mode: normalizedMode,
                        agent_payment_date: new Date(paymentData.agent_payment_date),
                        agent_payment_status: normalizedStatus,
                        agent_payment_updated_at: new Date(),
                        agent_payment_updated_by: 'admin'
                    }
                },
                { returnDocument: 'after' }
            );

            if (!updateResult.value) {
                return { success: false, error: 'Transaction not found' };
            }

            return { success: true, data: updateResult.value };
        } catch (error) {
            console.error('Direct update error:', error);
            return { success: false, error: error.message };
        } finally {
            await client.close();
        }
    }

    normalizePaymentData(paymentData) {
        // Helper to normalize payment mode
        const normalizeMode = (mode) => {
            if (!mode) return null;

            const modeLower = mode.toLowerCase().trim();
            const modeMap = {
                'cash': 'cash',
                'bank transfer': 'bank_transfer',
                'bank_transfer': 'bank_transfer',
                'upi': 'upi',
                'cheque': 'cheque',
                'credit card': 'credit_card',
                'credit_card': 'credit_card',
                'not paid': 'not_paid',
                'not_paid': 'not_paid'
            };

            return modeMap[modeLower] || modeLower.replace(' ', '_');
        };

        // Helper to normalize payment status
        const normalizeStatus = (status) => {
            if (!status) return 'completed';

            const statusLower = status.toLowerCase().trim();
            const statusMap = {
                'pending': 'pending',
                'completed': 'completed',
                'paid': 'completed',
                'failed': 'failed',
                'rejected': 'rejected'
            };

            return statusMap[statusLower] || 'completed';
        };

        return {
            ...paymentData,
            agent_payment_mode: normalizeMode(paymentData.agent_payment_mode),
            agent_payment_status: normalizeStatus(paymentData.agent_payment_status)
        };
    }

    async getTransaction(transactionId) {
        await this.initialize();

        try {
            const transaction = await this.AgentPaymentTransaction.findOne({
                originalTransactionId: transactionId
            });

            return { success: true, data: transaction };
        } catch (error) {
            console.error('Error getting transaction from agents_db:', error);
            return { success: false, error: error.message };
        }
    }

    async getBatchPaymentData(transactionIds) {
        await this.initialize();

        try {
            const transactions = await this.AgentPaymentTransaction.find({
                originalTransactionId: { $in: transactionIds }
            }).select('originalTransactionId agent_payment_mode agent_payment_date agent_payment_status agent_payment_amount agent_payment_notes agent_payment_updated_at');

            return { success: true, data: transactions };
        } catch (error) {
            console.error('Error getting batch payment data:', error);
            return { success: false, error: error.message };
        }
    }

    async getAgentTransactions(agentName, filters = {}) {
        await this.initialize();

        try {
            const query = { agentName };

            if (filters.startDate || filters.endDate) {
                query.date_ist = {};
                if (filters.startDate) query.date_ist.$gte = new Date(filters.startDate);
                if (filters.endDate) query.date_ist.$lte = new Date(filters.endDate);
            }

            if (filters.paymentStatus) {
                query.paymentStatus = filters.paymentStatus;
            }

            if (filters.agent_payment_status) {
                query.agent_payment_status = filters.agent_payment_status;
            }

            const transactions = await this.AgentPaymentTransaction.find(query)
                .sort({ date_ist: -1 })
                .limit(filters.limit || 100);

            return { success: true, data: transactions, count: transactions.length };
        } catch (error) {
            console.error('Error fetching agent transactions:', error);
            return { success: false, error: error.message };
        }
    }

    async getPaymentStats() {
        await this.initialize();

        try {
            const stats = await this.AgentPaymentTransaction.aggregate([
                {
                    $group: {
                        _id: "$agent_payment_status",
                        count: { $sum: 1 },
                        totalAmount: { $sum: "$amount" }
                    }
                },
                {
                    $project: {
                        status: "$_id",
                        count: 1,
                        totalAmount: 1,
                        _id: 0
                    }
                }
            ]);

            return { success: true, data: stats };
        } catch (error) {
            console.error('Error getting payment stats:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new AgentsDbSyncService();