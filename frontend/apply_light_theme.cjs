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

            // 1. General Dark Backgrounds -> Light Backgrounds
            content = content.replace(/bg-\[#0f172a\]/g, 'bg-slate-50');
            content = content.replace(/bg-\[#1e293b\]\/60\/60/g, 'bg-white/90');
            content = content.replace(/bg-\[#1e293b\]\/60\/90/g, 'bg-white/95');
            content = content.replace(/bg-\[#1e293b\]\/60/g, 'bg-white/80');
            content = content.replace(/bg-\[#1e293b\]\/80/g, 'bg-white/90');
            content = content.replace(/bg-\[#1e293b\]\/90/g, 'bg-white/95');
            content = content.replace(/bg-\[#1e3a8a\]\/40\/60/g, 'bg-blue-50');
            content = content.replace(/bg-\[#1e3a8a\]\/40\/80/g, 'bg-white');
            content = content.replace(/bg-\[#1e3a8a\]\/40/g, 'bg-blue-50');
            content = content.replace(/bg-\[#1e293b\]/g, 'bg-slate-100');
            
            // Pro gradients
            content = content.replace(/pro-gradient-bg/g, '');

            // 2. Text colors
            content = content.replace(/text-\[#ffffff\]/g, 'text-slate-800');
            content = content.replace(/text-white/g, 'text-slate-800');
            content = content.replace(/text-\[#1e40af\]\/60/g, 'text-slate-500');
            content = content.replace(/text-\[#1e40af\]\/70/g, 'text-slate-500');
            content = content.replace(/text-\[#1e3a8a\]\/40/g, 'text-slate-400');
            
            // 3. Borders
            content = content.replace(/border-\[#3b82f6\]\/20/g, 'border-slate-200');
            content = content.replace(/border-\[#3b82f6\]\/30/g, 'border-slate-200');
            content = content.replace(/border-\[#3b82f6\]\/40/g, 'border-slate-300');
            content = content.replace(/border-\[#1e40af\]\/20/g, 'border-slate-200');
            content = content.replace(/border-\[#1e40af\]\/30/g, 'border-slate-200');
            content = content.replace(/border-\[#1e40af\]\/50/g, 'border-slate-300');
            
            // 4. Shadows
            content = content.replace(/shadow-\[0_0_20px_rgba\(135,206,235,0\.05\)\]/g, 'shadow-md');
            content = content.replace(/shadow-\[0_12px_28px_rgba\(135,206,235,0\.18\)\]/g, 'shadow-xl');
            content = content.replace(/shadow-\[0_-12px_28px_rgba\(59,130,246,0\.3\)\]/g, 'shadow-xl');
            content = content.replace(/shadow-\[0_0_15px_rgba\(135,206,235,0\.05\)\]/g, 'shadow-sm');
            content = content.replace(/shadow-\[0_4px_15px_rgba\(135,206,235,0\.12\)\]/g, 'shadow-sm');
            content = content.replace(/shadow-\[0_0_10px_rgba\(30,58,138,0\.2\)\]/g, 'shadow-sm');
            content = content.replace(/shadow-\[0_0_8px_rgba\(30,58,138,0\.3\)\]/g, 'shadow-sm');
            content = content.replace(/shadow-\[0_0_20px_rgba\(135,206,235,0\.15\)\]/g, 'shadow-md');

            fs.writeFileSync(fullPath, content);
            console.log(`Updated ${file}`);
        }
    });
}

directories.forEach(processDirectory);
console.log('Done!');
