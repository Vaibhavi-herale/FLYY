const fs = require('fs');
const path = require('path');

const directories = [
    'c:/Users/HOME/Documents/FlightAI-master/frontend/src/components',
    'c:/Users/HOME/Documents/FlightAI-master/frontend/src/pages'
];

directories.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        if (file.endsWith('.jsx')) {
            const filePath = path.join(dir, file);
            let content = fs.readFileSync(filePath, 'utf8');

            // Same replacements as App.jsx
            content = content.replace(/#87CEEB/g, '#3b82f6');
            content = content.replace(/#0ea5e9/g, '#3b82f6');
            content = content.replace(/sky-100/g, '#1e293b');
            content = content.replace(/#0284c7/g, '#1e3a8a');

            content = content.replace(/text-\[#000080\]/g, 'text-[#ffffff]');
            content = content.replace(/bg-\[#000080\]/g, 'bg-[#3b82f6]');
            content = content.replace(/border-\[#000080\]/g, 'border-[#3b82f6]');
            content = content.replace(/#000080/g, '#ffffff'); 

            content = content.replace(/bg-white/g, 'bg-[#0f172a]'); // Auth background mostly
            content = content.replace(/bg-\[#E0F7FA\]/g, 'bg-[#1e3a8a]/40');
            content = content.replace(/bg-gray-200/g, 'bg-[#3b82f6]');
            content = content.replace(/text-gray-600/g, 'text-[#ffffff]');

            fs.writeFileSync(filePath, content);
            console.log(`Updated ${file}`);
        }
    });
});
