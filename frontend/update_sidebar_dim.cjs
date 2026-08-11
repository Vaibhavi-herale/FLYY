const fs = require('fs');

const appPath = 'c:/Users/HOME/Documents/FlightAI-master/frontend/src/App.jsx';
let content = fs.readFileSync(appPath, 'utf8');

const startComment = '{/* Sidebar */}';
const endComment = '{/* Main Chat Area */}';
const startIndex = content.indexOf(startComment);
const endIndex = content.indexOf(endComment);

if (startIndex !== -1 && endIndex !== -1) {
    let sidebarContent = content.substring(startIndex, endIndex);

    // Replace stark white with a dim slate-white to match the chat side's undertones
    sidebarContent = sidebarContent.replace(/bg-white/g, 'bg-[#f1f5f9]'); // Slate 100

    // Replace the dark navy blue with a slightly softer blue so it's not too stark
    sidebarContent = sidebarContent.replace(/text-\[#1e3a8a\]/g, 'text-[#1e40af]'); // Blue 800
    sidebarContent = sidebarContent.replace(/bg-\[#1e3a8a\]/g, 'bg-[#1e40af]');
    sidebarContent = sidebarContent.replace(/border-\[#1e3a8a\]/g, 'border-[#1e40af]');

    content = content.substring(0, startIndex) + sidebarContent + content.substring(endIndex);
    fs.writeFileSync(appPath, content);
    console.log('App.jsx sidebar updated to dim white.');
}
