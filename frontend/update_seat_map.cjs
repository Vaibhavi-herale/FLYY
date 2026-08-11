const fs = require('fs');

const appPath = 'c:/Users/HOME/Documents/FlightAI-master/frontend/src/App.jsx';
let content = fs.readFileSync(appPath, 'utf8');

// 1. Fix "Selected Seats:" text color from #334155 to #ffffff
content = content.replace(
    '<span className="text-xs text-[#334155] font-medium">Selected Seats:</span>',
    '<span className="text-xs text-[#ffffff] font-medium">Selected Seats:</span>'
);

// 2. Fix disabled "Confirm Seats" button text color from #334155 to #ffffff/50
content = content.replace(
    ": 'bg-#1e293b text-[#334155] cursor-not-allowed'",
    ": 'bg-[#1e293b] text-[#ffffff]/50 cursor-not-allowed'"
);

// 3. Fix "ROW" labels text color from #3b82f6/40 to #ffffff/60
content = content.replace(
    'className="col-span-6 text-center text-[10px] font-mono text-[#3b82f6]/40 mb-1"',
    'className="col-span-6 text-center text-[10px] font-mono text-[#ffffff]/60 mb-1"'
);

// 4. Add proper className to the seat buttons if missing
// The button is defined as:
// <button
//   key={seatId}
//   type="button"
//   disabled={isOccupied}
//   onClick={() => {

const buttonMatch = `<button
                              key={seatId}
                              type="button"
                              disabled={isOccupied}`;

const buttonReplacement = `<button
                              key={seatId}
                              type="button"
                              disabled={isOccupied}
                              className={\`
                                flex items-center justify-center 
                                h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl 
                                font-bold text-xs sm:text-sm transition-all duration-300
                                \${isSelected
                                  ? 'bg-[#3b82f6] text-[#ffffff] shadow-[0_0_15px_rgba(59,130,246,0.6)] scale-110 z-10'
                                  : isOccupied
                                    ? 'bg-[#1b222c] text-[#ffffff]/30 border border-[#1e293b] cursor-not-allowed'
                                    : 'bg-[#1e293b]/40 text-[#ffffff] border border-[#3b82f6]/40 hover:border-[#3b82f6] hover:bg-[#3b82f6]/20'
                                }
                              \`}`;

if (content.includes(buttonMatch) && !content.includes('flex items-center justify-center \n                                h-8 w-8')) {
    content = content.replace(buttonMatch, buttonReplacement);
}

fs.writeFileSync(appPath, content);
console.log('App.jsx seat map text colors fixed.');
