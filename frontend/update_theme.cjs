const fs = require('fs');
const path = 'c:/Users/HOME/Documents/FlightAI-master/frontend/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// Replace sky blue accent with admin blue accent
content = content.replace(/#87CEEB/g, '#3b82f6');
content = content.replace(/#0ea5e9/g, '#3b82f6');
content = content.replace(/sky-100/g, '#1e293b');
content = content.replace(/#0284c7/g, '#1e3a8a');

// Colors replacement mapping
// text-[#000080] -> text-[#ffffff]
content = content.replace(/text-\[#000080\]/g, 'text-[#ffffff]');
// bg-[#000080] -> bg-[#3b82f6]
content = content.replace(/bg-\[#000080\]/g, 'bg-[#3b82f6]');
// border-[#000080] -> border-[#3b82f6]
content = content.replace(/border-\[#000080\]/g, 'border-[#3b82f6]');
// shadow-[...#000080] -> shadow-[...#3b82f6]
content = content.replace(/#000080/g, '#ffffff'); // Catch remaining like fill, stroke, etc.

// Replace light backgrounds with admin dark backgrounds
content = content.replace(/bg-white/g, 'bg-[#1e293b]/60');
content = content.replace(/bg-\[#E0F7FA\]/g, 'bg-[#1e3a8a]/40');
content = content.replace(/bg-white\/90/g, 'bg-[#1e293b]/90');
content = content.replace(/bg-white\/80/g, 'bg-[#1e293b]/80');
content = content.replace(/bg-white\/60/g, 'bg-[#1e293b]/60');
content = content.replace(/bg-gray-200/g, 'bg-[#3b82f6]');
content = content.replace(/text-gray-600/g, 'text-[#ffffff]');

// Fix main app container background (was bg-white, became bg-[#1e293b]/60, needs to be bg-[#0f172a] pro-gradient-bg)
content = content.replace('bg-[#1e293b]/60 font-sans', 'bg-[#0f172a] font-sans pro-gradient-bg');
content = content.replace('bg-[#1e293b]/60 relative transition-all min-w-0', 'bg-transparent relative transition-all min-w-0');
content = content.replace('bg-[#1e293b]/60 border-r border-[#3b82f6]/20', 'bg-[#1e293b]/60 backdrop-blur-xl border-r border-[#3b82f6]/20');

// Fix text-white to text-[#ffffff] for consistency if needed, though Tailwind handles white
content = content.replace(/text-white/g, 'text-[#ffffff]');

fs.writeFileSync(path, content);
console.log('App.jsx updated successfully.');
