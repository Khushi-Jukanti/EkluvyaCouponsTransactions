// require('dotenv').config();
// // const app = require('./src/app');
// // const { loadAgentCouponMap } = require('./src/utils/excelLoader');

// const PORT = process.env.PORT || 7000;

// // Load Excel → Agent Map on Startup
// // loadAgentCouponMap();

// app.get('/', function (req, res) {
//     res.send('Hello Author')
// })

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// //   console.log(`http://localhost:${PORT}`);
// });

require("dotenv").config();

const app = require("./app");
const { connectDB } = require("./config/db.config");
const { loadAgentCoupons } = require("./utils/excelLoader.util");
const agentAuthRoutes = require("./routes/agent.auth.routes");
const adminAuthRoutes = require("./routes/admin.auth.routes"); 
const agentRoutes = require("./routes/agent");
const logoutRoutes = require("./routes/logout.routes");
const passwordRoutes = require("./routes/password"); // Added password routes
const PORT = process.env.PORT || 7000;

connectDB();
loadAgentCoupons();

app.use("/api/auth/agent", agentAuthRoutes);   
app.use("/api/auth/admin", adminAuthRoutes);
app.use("/api/password", passwordRoutes); // Register password routes
app.use("/api/logout", logoutRoutes);
app.use("/api/agent", agentRoutes);             

app.listen(PORT, () => {
  console.log(`🚀 Ekluvya Backend running at http://localhost:${PORT}`);
});