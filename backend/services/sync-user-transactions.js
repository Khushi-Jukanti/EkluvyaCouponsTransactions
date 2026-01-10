require('dotenv').config();
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

const POLL_INTERVAL = 15000; // 15 seconds

async function startSync() {
    console.log('🚀 Starting incremental sync service');

    const ekluvyaConn = await mongoose.createConnection(process.env.MONGODB_URI);
    const agentsConn = await mongoose.createConnection(process.env.AGENT_DB_URI);

    console.log('✅ Connected to both databases');

    const UserPaymentTransaction = ekluvyaConn.model(
        'UserPaymentTransaction',
        new mongoose.Schema({}, { strict: false, collection: 'userpaymenttransctions' })
    );

    const AgentPaymentTransactionSchema = require('../models/agent-payment-transactions.model');
    const AgentPaymentTransaction = agentsConn.model(
        'AgentPaymentTransaction',
        AgentPaymentTransactionSchema
    );

    const SyncState = agentsConn.collection('sync_state');

    let syncState = await SyncState.findOne({ _id: 'userpaymenttransactions' });

    let lastSyncedObjectId = syncState?.lastSyncedObjectId
        ? new ObjectId(syncState.lastSyncedObjectId)
        : new ObjectId('000000000000000000000000');

    console.log('📌 Starting from ObjectId:', lastSyncedObjectId.toHexString());

    setInterval(async () => {
        try {
            const newTransactions = await UserPaymentTransaction.find({
                _id: { $gt: lastSyncedObjectId }
            })
                .sort({ _id: 1 })
                .limit(500)
                .lean();

            if (newTransactions.length === 0) {
                return;
            }


            const bulkOps = [];
            let maxObjectId = lastSyncedObjectId;

            for (const tx of newTransactions) {
                bulkOps.push({
                    updateOne: {
                        filter: { originalTransactionId: tx._id.toString() },
                        update: {
                            $setOnInsert: {
                                originalTransactionId: tx._id.toString(),
                                ...tx,
                                _id: undefined,

                                agent_payment_mode: null,
                                agent_payment_date: null,
                                agent_payment_status: 'pending',
                                agent_payment_amount: null,
                                agent_payment_notes: '',
                                agent_payment_updated_by: '',
                                agent_payment_updated_at: null,

                                synced_from_ekluvya_at: new Date(),
                                last_synced_at: new Date()
                            }
                        },
                        upsert: true
                    }
                });

                if (tx._id > maxObjectId) {
                    maxObjectId = tx._id;
                }
            }

            await AgentPaymentTransaction.bulkWrite(bulkOps, { ordered: false });

            await SyncState.updateOne(
                { _id: 'userpaymenttransactions' },
                { $set: { lastSyncedObjectId: maxObjectId } },
                { upsert: true }
            );

            lastSyncedObjectId = maxObjectId;

            console.log(`✅ Synced ${newTransactions.length} transactions`);
        } catch (err) {
            console.error('❌ Sync error:', err);
        }
    }, POLL_INTERVAL);
    process.on('SIGINT', async () => {
        console.log('🛑 Shutting down sync service...');
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('🛑 Shutting down sync service...');
        process.exit(0);
    });
}

startSync();
