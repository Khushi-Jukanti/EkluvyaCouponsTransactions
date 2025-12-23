require("dotenv").config();
const xlsx = require("xlsx");
const bcrypt = require("bcryptjs");
const { agentDB } = require("../config/db.config");
const Agent = require("../models/agent");
const path = require("path");

const importAgents = async () => {
    try {
        const filePath = path.join(__dirname, "../data/agents.xlsx");
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const agents = xlsx.utils.sheet_to_json(sheet);

        for (const data of agents) {
            const exists = await Agent.findOne({
                $or: [{ mobile: data.mobile }, { couponCode: data.couponCode }],
            });

            if (exists) {
                console.log(`⚠️ Skipping existing agent: ${data.mobile}`);
                continue;
            }

            const hashedPassword = await bcrypt.hash(data.couponCode, 10);

            await Agent.create({
                name: data.name,
                mobile: data.mobile,
                couponCode: data.couponCode,
                email: data.email,
                location: data.location,
                password: hashedPassword,
                firstLogin: true,
                forcePasswordChange: true,
            });

            console.log(`✅ Imported: ${data.name}`);
        }

        console.log("🎉 All agents imported successfully");
        process.exit();
    } catch (err) {
        console.error("❌ Import failed:", err.message);
        process.exit(1);
    }
};

importAgents();
