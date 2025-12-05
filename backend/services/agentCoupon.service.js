// src/services/agentCoupon.service.js

class AgentCouponService {
  // Get agent details by coupon code
  static getAgentByCoupon(code) {
    if (!code) return null;
    const normalizedCode = code.toString().trim().toUpperCase();
    return global.AGENT_COUPON_MAP[normalizedCode] || null;
  }

  // Check if coupon is active (handed over + generated in system)
  static isCouponActive(code) {
    const agent = this.getAgentByCoupon(code);
    if (!agent) return false;
    return agent.handedOver && agent.generated;
  }

  // Get total number of coupons loaded
  static getTotalCoupons() {
    return Object.keys(global.AGENT_COUPON_MAP).length;
  }

  // Search coupons by agent name or phone (for future use)
  static searchByAgentName(query) {
    const q = query.toLowerCase();
    return Object.entries(global.AGENT_COUPON_MAP)
      .filter(([code, data]) =>
        data.agentName.toLowerCase().includes(q) ||
        (data.phone && data.phone.toString().includes(q))
      )
      .map(([code, data]) => ({ code, ...data }));
  }

  // Get top 10 agents by location (example utility)
  static getTopLocations() {
    const locationCount = {};
    Object.values(global.AGENT_COUPON_MAP).forEach(agent => {
      const loc = agent.location || 'Unknown';
      locationCount[loc] = (locationCount[loc] || 0) + 1;
    });
    return Object.entries(locationCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }
}

module.exports = AgentCouponService;