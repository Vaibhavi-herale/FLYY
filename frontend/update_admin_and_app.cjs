const fs = require('fs');

// 1. Fix Admin.jsx
const adminPath = 'c:/Users/HOME/Documents/FlightAI-master/frontend/src/Admin.jsx';
let adminContent = fs.readFileSync(adminPath, 'utf8');

// Replace container classes for Bookings, Refunds, Users to match Flights
adminContent = adminContent.replace(/className="bg-white\/80 backdrop-blur-xl rounded-2xl shadow-\[0_0_20px_rgba\(14,165,233,0\.05\)\] border border-\[#87CEEB\]\/30 overflow-hidden"/g, 'className="pro-card overflow-hidden"');
adminContent = adminContent.replace(/className="px-6 py-5 border-b border-\[#87CEEB\]\/20 bg-\[white\]\/50 flex justify-between items-center"/g, 'className="px-6 py-5 border-b border-[#3b82f6]/20 pro-gradient-header flex justify-between items-center"');

// Common replacements
adminContent = adminContent.replace(/#87CEEB/g, '#3b82f6');
adminContent = adminContent.replace(/text-\[#000080\]/g, 'text-[#ffffff]');
adminContent = adminContent.replace(/text-\[#1e3a8a\]/g, 'text-[#60a5fa]'); // Lighter blue for dark mode
adminContent = adminContent.replace(/text-[#000080]/g, 'text-[#ffffff]');
adminContent = adminContent.replace(/bg-\[white\]\/50/g, 'bg-[#1e293b]/50');
adminContent = adminContent.replace(/bg-\[white\]\/30/g, 'bg-[#1e293b]/30');
adminContent = adminContent.replace(/bg-\[white\]/g, 'bg-[#1e293b]');
adminContent = adminContent.replace(/bg-white\/70/g, 'bg-[#1e293b]/70');
adminContent = adminContent.replace(/divide-sky-200/g, 'divide-[#3b82f6]/20');
adminContent = adminContent.replace(/divide-sky-100/g, 'divide-[#3b82f6]/10');
adminContent = adminContent.replace(/text-[#334155]/g, 'text-[#94a3b8]');
adminContent = adminContent.replace(/text-gray-600/g, 'text-[#cbd5e1]');
adminContent = adminContent.replace(/text-yellow-700/g, 'text-yellow-400');
adminContent = adminContent.replace(/text-green-700/g, 'text-green-400');

fs.writeFileSync(adminPath, adminContent);
console.log('Admin.jsx updated.');

// 2. Fix App.jsx user menu hover visibility
const appPath = 'c:/Users/HOME/Documents/FlightAI-master/frontend/src/App.jsx';
let appContent = fs.readFileSync(appPath, 'utf8');

// Change the menu background from slightly transparent to a darker, solid look with blur,
// and make the hover background more pronounced.
appContent = appContent.replace(
    'className="absolute bottom-14 left-3 right-3 bg-[#1e293b]/60 border border-[#3b82f6]/30 rounded-lg shadow-[0_-12px_28px_rgba(135,206,235,0.18)] z-[90] overflow-hidden text-sm"',
    'className="absolute bottom-14 left-3 right-3 bg-[#0f172a]/95 backdrop-blur-xl border border-[#3b82f6]/40 rounded-lg shadow-[0_-12px_28px_rgba(59,130,246,0.3)] z-[90] overflow-hidden text-sm"'
);

// Update "My Bookings" button
appContent = appContent.replace(
    'className="flex items-center gap-2 w-full text-left px-4 py-3 text-[#ffffff] hover:bg-[#3b82f6]/10 hover:text-[#ffffff] transition cursor-pointer"',
    'className="flex items-center gap-2 w-full text-left px-4 py-3 text-[#ffffff] hover:bg-[#3b82f6]/40 hover:text-[#ffffff] transition cursor-pointer font-medium"'
);

// Update "Logout" button
appContent = appContent.replace(
    'className="flex items-center gap-2 w-full text-left px-4 py-3 text-red-600 hover:bg-red-500/10 hover:text-red-700 border-t border-[#3b82f6]/10 transition cursor-pointer"',
    'className="flex items-center gap-2 w-full text-left px-4 py-3 text-red-400 hover:bg-red-500/20 hover:text-red-300 border-t border-[#3b82f6]/20 transition cursor-pointer font-medium"'
);

fs.writeFileSync(appPath, appContent);
console.log('App.jsx updated.');
