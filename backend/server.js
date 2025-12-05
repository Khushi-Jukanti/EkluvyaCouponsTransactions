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


// server.js
require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db.config');
const { loadAgentCoupons } = require('./utils/excelLoader.util');

const PORT = process.env.PORT || 7000;

// Connect to MongoDB
connectDB();

// Load Agent ↔ Coupon Map from Excel (runs once at startup)
loadAgentCoupons();

app.listen(PORT, () => {
  console.log(`Ekluvya Admin Backend Running on http://localhost:${PORT}`);
});