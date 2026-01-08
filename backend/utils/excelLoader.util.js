const XLSX = require('xlsx');
const path = require('path');

// Global in-memory map: coupon_text → agent details
global.AGENT_COUPON_MAP = {};

const loadAgentCoupons = () => {
  try {
    const filePath = path.join(__dirname, '../data/Coupon Codes - Agent Details.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets['Agent Coupons'];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    rows.forEach((row, index) => {
      const code = row['Coupon Code (Auto Gen)']?.toString().trim();
      if (!code) return;

      global.AGENT_COUPON_MAP[code] = {
        serial: row['S No'] || index + 1,
        agentType: row['Agent Type'] || 'Agent',
        agentName: (row.Name || 'Unknown').trim(),
        phone: row['Phone Number'] || '',
        email: row.Email || '',
        location: row.Location || '',
        discount: row['Discount (%)'] || 0,
        plan: row.Plan || 'Pre-Launch Offer',
        usageLimit: row['Usage Limit'] || 1000,
        startDate: row['Start Date'],
        endDate: row['End Date'],
        handedOver: row['Handed over'] === 'Yes',
        generated: row['Generated in System'] === 'Yes',
        couponUrl: row['Coupon Code URL']?.trim() || '',
      };
    });

    console.log(`Loaded ${Object.keys(global.AGENT_COUPON_MAP).length} coupons from Excel`);
  } catch (error) {
    console.error('Failed to load Excel file:', error.message);
  }
};

module.exports = { loadAgentCoupons };