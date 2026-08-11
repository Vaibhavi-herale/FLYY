const fs = require('fs');

const adminPath = 'c:/Users/HOME/Documents/FlightAI-master/frontend/src/Admin.jsx';
let adminContent = fs.readFileSync(adminPath, 'utf8');

// Replace all blue text with white text in Admin.jsx
adminContent = adminContent.replace(/text-\[#3b82f6\]/g, 'text-[#ffffff]');
adminContent = adminContent.replace(/text-\[#60a5fa\]/g, 'text-[#ffffff]');

fs.writeFileSync(adminPath, adminContent);
console.log('Admin.jsx text colors updated to white.');
