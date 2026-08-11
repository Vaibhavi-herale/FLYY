const fs = require('fs');
const path = require('path');

const directories = [
    'c:/Users/HOME/Documents/FlightAI-master/frontend/src',
    'c:/Users/HOME/Documents/FlightAI-master/frontend/src/components',
    'c:/Users/HOME/Documents/FlightAI-master/frontend/src/pages'
];

function processDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) return;
        
        if (file.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');

            // Text colors
            content = content.replace(/text-slate-800/g, 'text-[#000080]');
            content = content.replace(/text-slate-600/g, 'text-[#000080]/80');
            content = content.replace(/text-slate-500/g, 'text-[#000080]/60');
            content = content.replace(/text-slate-400/g, 'text-[#000080]/40');
            
            // Backgrounds
            content = content.replace(/bg-slate-50/g, 'bg-[#f0f8ff]');
            content = content.replace(/bg-slate-100/g, 'bg-[#e0f7fa]');
            content = content.replace(/bg-blue-50/g, 'bg-[#e0f7fa]');
            
            // Accent Colors: Change some #3b82f6 to #87CEEB (Light Blue)
            // But we might want to keep the primary buttons as a gradient or specific color.
            content = content.replace(/bg-\[#3b82f6\]/g, 'bg-[#87CEEB]');
            content = content.replace(/text-\[#3b82f6\]/g, 'text-[#87CEEB]');
            content = content.replace(/border-\[#3b82f6\]/g, 'border-[#87CEEB]');
            content = content.replace(/ring-\[#3b82f6\]/g, 'ring-[#87CEEB]');
            
            // Borders
            content = content.replace(/border-slate-200/g, 'border-[#87CEEB]/30');
            content = content.replace(/border-slate-300/g, 'border-[#87CEEB]/50');

            fs.writeFileSync(fullPath, content);
            console.log(`Updated ${file}`);
        }
    });
}

directories.forEach(processDirectory);
console.log('Done!');
