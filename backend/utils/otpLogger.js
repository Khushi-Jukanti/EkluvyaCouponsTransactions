// utils/otpLogger.js
const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../logs');
const logFile = path.join(logDir, 'otp-logs.json');

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const otpLogger = {
  log: (data) => {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        ...data
      };

      // Read existing logs
      let logs = [];
      if (fs.existsSync(logFile)) {
        const fileContent = fs.readFileSync(logFile, 'utf8');
        if (fileContent.trim()) {
          logs = JSON.parse(fileContent);
        }
      }

      // Add new log entry
      logs.push(logEntry);

      // Keep only last 1000 entries
      if (logs.length > 1000) {
        logs = logs.slice(-1000);
      }

      // Write to file
      fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
      
      console.log('📝 OTP logged:', logEntry);
    } catch (error) {
      console.error('Failed to log OTP:', error);
    }
  },

  getLogs: () => {
    try {
      if (!fs.existsSync(logFile)) {
        return [];
      }
      
      const fileContent = fs.readFileSync(logFile, 'utf8');
      return fileContent.trim() ? JSON.parse(fileContent) : [];
    } catch (error) {
      console.error('Failed to read OTP logs:', error);
      return [];
    }
  }
};

module.exports = otpLogger;