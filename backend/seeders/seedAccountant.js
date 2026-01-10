const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection - Use your actual MongoDB URI
const MONGODB_URI = process.env.AGENT_DB_URI || 'mongodb+srv://nataraju:lwD2YYqzE8LwjNJI@agents_db.uctlmuc.mongodb.net/agents_db';

// Database name
const DB_NAME = 'agents_db';

console.log('MongoDB URI:', MONGODB_URI ? 'Loaded from env' : 'Using default');
console.log('Database name:', DB_NAME);

// Agent schema (should match your existing schema)
const agentSchema = new mongoose.Schema({
    name: String,
    mobile: String,
    email: String,
    password: String,
    role: {
        type: String,
        enum: ['admin', 'accountant', 'agent'],
        default: 'agent'
    },
    firstLogin: Boolean,
    forcePasswordChange: Boolean,
    account_number: String,
    ifsc_code: String,
    bank_name: String,
    account_details_updated: Boolean,
    couponCode: String,
    location: String,
    createdAt: Date,
    updatedAt: Date
});

const Agent = mongoose.model('Agent', agentSchema, 'agents');

async function seedAccountant() {
    try {
        if (!MONGODB_URI) {
            throw new Error('MongoDB URI is not defined. Please set AGENT_DB_URI environment variable or update the script.');
        }

        console.log('Connecting to MongoDB...');

        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI, {
            dbName: DB_NAME // Specify database name
        });

        console.log('✅ Connected to MongoDB successfully');

        // Check if accountant already exists
        const existingAccountant = await Agent.findOne({
            $or: [
                { role: 'accountant' },
                { email: 'accountant@ekluvya.guru' }
            ]
        });

        if (existingAccountant) {
            console.log('ℹ️ Accountant role already exists');
            console.log('Accountant details:', {
                name: existingAccountant.name,
                email: existingAccountant.email,
                role: existingAccountant.role,
                mobile: existingAccountant.mobile
            });
            await mongoose.disconnect();
            return;
        }

        // Create accountant
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Accountant@123', salt);

        const accountant = new Agent({
            name: 'Accountant',
            mobile: '8888888888',
            email: 'accountant@ekluvya.guru',
            password: hashedPassword,
            role: 'accountant',
            firstLogin: false,
            forcePasswordChange: false,
            account_number: '',
            ifsc_code: '',
            bank_name: '',
            account_details_updated: false,
            couponCode: '', // Leave empty or assign if needed
            location: 'Head Office',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        await accountant.save();
        console.log('✅ Accountant created successfully:');
        console.log({
            name: accountant.name,
            email: accountant.email,
            mobile: accountant.mobile,
            role: accountant.role,
            password: 'Accountant@123 (Please change on first login)'
        });

        // Also update the existing admin if needed (optional)
        const admin = await Agent.findOne({ email: 'admin@ekluvya.guru' });
        if (admin && admin.role !== 'admin') {
            admin.role = 'admin';
            await admin.save();
            console.log('✅ Updated existing user to admin role');
        }

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
        console.log('\n📋 Accountant Login Credentials:');
        console.log('─────────────────────────────');
        console.log('Email: accountant@ekluvya.guru');
        console.log('Password: Accountant@123');
        console.log('Mobile: 8888888888');
        console.log('Role: accountant');
        console.log('─────────────────────────────');
        console.log('\n⚠️  Important: Change password on first login!');

    } catch (error) {
        console.error('❌ Error seeding accountant:', error.message);

        if (error.name === 'MongoServerError') {
            console.error('MongoDB Error Code:', error.code);
        }

        if (error.message.includes('Authentication failed')) {
            console.error('Authentication failed. Check username/password in MongoDB URI.');
        }

        if (error.message.includes('ENOTFOUND')) {
            console.error('Cannot connect to MongoDB. Check if MongoDB is running.');
        }

        process.exit(1);
    }
}

// Run seeder
seedAccountant();