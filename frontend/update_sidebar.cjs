const fs = require('fs');

const appPath = 'c:/Users/HOME/Documents/FlightAI-master/frontend/src/App.jsx';
let content = fs.readFileSync(appPath, 'utf8');

// Find the sidebar section
const startComment = '{/* Sidebar */}';
const endComment = '{/* Main Chat Area */}';
const startIndex = content.indexOf(startComment);
const endIndex = content.indexOf(endComment);

if (startIndex !== -1 && endIndex !== -1) {
    let sidebarContent = content.substring(startIndex, endIndex);

    // Sidebar Container
    sidebarContent = sidebarContent.replace('bg-[#1e293b]/60 backdrop-blur-xl border-r border-[#3b82f6]/20 text-[#ffffff]', 'bg-white border-r border-[#1e3a8a]/20 text-[#1e3a8a]');
    
    // New Chat Button
    sidebarContent = sidebarContent.replace('bg-[#3b82f6]/10 hover:bg-[#3b82f6]/20 text-[#ffffff] font-medium py-2 px-3 rounded-lg transition border border-[#3b82f6]/50 shadow-[0_0_10px_rgba(135,206,235,0.2)]', 'bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white font-medium py-2 px-3 rounded-lg transition border border-[#1e3a8a]/50 shadow-[0_0_10px_rgba(30,58,138,0.2)]');

    // Search bar icon
    sidebarContent = sidebarContent.replace('text-[#3b82f6]/60', 'text-[#1e3a8a]/60');
    // Search bar input
    sidebarContent = sidebarContent.replace('bg-[#1e293b]/60 border border-[#3b82f6]/20 text-sm text-[#ffffff]', 'bg-white border border-[#1e3a8a]/20 text-sm text-[#1e3a8a]');
    sidebarContent = sidebarContent.replace('focus:border-[#3b82f6]/60 focus:shadow-[0_0_8px_rgba(135,206,235,0.3)] placeholder-[#3b82f6]/40', 'focus:border-[#1e3a8a]/60 focus:shadow-[0_0_8px_rgba(30,58,138,0.3)] placeholder-[#1e3a8a]/40');

    // Headings
    sidebarContent = sidebarContent.replace('text-[#ffffff] mb-1', 'text-[#1e3a8a] mb-1');
    sidebarContent = sidebarContent.replace('text-[#ffffff] mb-1 px-2', 'text-[#1e3a8a] mb-1 px-2');

    // Chat Items
    // Active
    sidebarContent = sidebarContent.replace('bg-[#3b82f6]/10 text-[#ffffff] border border-[#3b82f6]/20', 'bg-[#1e3a8a]/10 text-[#1e3a8a] border border-[#1e3a8a]/20');
    // Inactive
    sidebarContent = sidebarContent.replace('hover:bg-[#3b82f6]/5 text-[#ffffff] hover:text-[#ffffff] border border-transparent', 'hover:bg-[#1e3a8a]/5 text-[#1e3a8a] hover:text-[#1e3a8a] border border-transparent');
    
    // Chat Item Date text
    sidebarContent = sidebarContent.replace('text-[#ffffff] mt-0.5', 'text-[#1e3a8a]/70 mt-0.5');

    // Three dots option button
    sidebarContent = sidebarContent.replace('text-[#3b82f6]/70 hover:text-[#ffffff] rounded-md transition hover:bg-[#3b82f6]/10', 'text-[#1e3a8a]/70 hover:text-[#1e3a8a] rounded-md transition hover:bg-[#1e3a8a]/10');

    // Menu dropdown
    sidebarContent = sidebarContent.replace('bg-[#1e293b]/60 border border-[#3b82f6]/30', 'bg-white border border-[#1e3a8a]/30 shadow-lg');
    sidebarContent = sidebarContent.replace('text-[#ffffff] hover:bg-[#3b82f6]/10 hover:text-[#ffffff]', 'text-[#1e3a8a] hover:bg-[#1e3a8a]/10 hover:text-[#1e3a8a]');
    
    // User profile footer
    sidebarContent = sidebarContent.replace('border-t border-[#3b82f6]/20 bg-[#1e293b]/60', 'border-t border-[#1e3a8a]/20 bg-white');
    sidebarContent = sidebarContent.replace('hover:bg-[#3b82f6]/10 text-left transition', 'hover:bg-[#1e3a8a]/5 text-left transition');
    
    // User avatar
    sidebarContent = sidebarContent.replace('bg-[#3b82f6]/20 flex items-center justify-center border border-[#3b82f6]/40 text-[#ffffff]', 'bg-[#1e3a8a]/10 flex items-center justify-center border border-[#1e3a8a]/30 text-[#1e3a8a]');
    
    // User name
    sidebarContent = sidebarContent.replace('text-[#ffffff] hover:text-[#ffffff]', 'text-[#1e3a8a] hover:text-[#1e3a8a]');

    // User Profile popup
    sidebarContent = sidebarContent.replace('bg-[#0f172a]/95 backdrop-blur-xl border border-[#3b82f6]/40', 'bg-white border border-[#1e3a8a]/30 shadow-lg');
    sidebarContent = sidebarContent.replace('text-[#ffffff] hover:bg-[#3b82f6]/40 hover:text-[#ffffff]', 'text-[#1e3a8a] hover:bg-[#1e3a8a]/10 hover:text-[#1e3a8a]');
    // Note: Logout text is red so it doesn't match 'text-[#ffffff]', but it has 'border-[#3b82f6]/20'
    sidebarContent = sidebarContent.replace('border-[#3b82f6]/20 transition', 'border-[#1e3a8a]/20 transition');

    // empty states
    sidebarContent = sidebarContent.replace('text-center text-sm text-[#ffffff] mt-10', 'text-center text-sm text-[#1e3a8a] mt-10');
    sidebarContent = sidebarContent.replace('<span className="text-[#ffffff]">', '<span className="text-[#1e3a8a]">');


    content = content.substring(0, startIndex) + sidebarContent + content.substring(endIndex);
    fs.writeFileSync(appPath, content);
    console.log('App.jsx sidebar updated.');
} else {
    console.log('Could not find sidebar section.');
}
