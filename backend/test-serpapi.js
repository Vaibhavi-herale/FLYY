const axios = require('axios');
const API_KEY = '96e835b8684de87a40cb3ce812000c6cc520a7d36a05a9f05c5139377c9d62fb';

async function test() {
    try {
        const { data } = await axios.get('https://serpapi.com/search', {
            params: {
                engine: 'google_flights',
                departure_id: 'MAA',
                arrival_id: 'BLR',
                outbound_date: '2026-06-01', // Google Flights needs dates usually within 330 days, 2026 might be too far!
                type: '2',
                currency: 'INR',
                api_key: API_KEY
            }
        });
        
        console.log("BEST FLIGHTS:");
        console.log(JSON.stringify(data.best_flights ? data.best_flights.slice(0, 1) : null, null, 2));
    } catch (e) {
        console.error(e.response?.data || e.message);
    }
}
test();
