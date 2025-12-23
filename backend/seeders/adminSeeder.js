const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const Agent = require("../models/agent"); // agent_db model

const adminSeeder = async () => {
    try {
        await mongoose.connect(process.env.AGENT_DB_URI);

        const existingAdmin = await Agent.findOne({
            email: "admin@ekluvya.guru",
        });

        if (existingAdmin) {
            console.log("Admin already exists");
            process.exit(0);
        }

        await Agent.create({
            name: "Super Admin",
            email: "admin@ekluvya.guru",
            mobile: "9999999999",
            password: "admin@123",
            role: "admin",
            firstLogin: false,
        });

        console.log("✅ Admin seeded successfully");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

adminSeeder();
