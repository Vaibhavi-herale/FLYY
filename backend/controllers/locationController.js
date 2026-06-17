const Flight = require('../models/Flight');

const AIRPORT_DATABASE = [

];

exports.searchLocations = async (req, res) => {
    try {
        const { query } = req.query;

        if (!query) {
            return res.status(200).json({ success: true, count: AIRPORT_DATABASE.length, locations: AIRPORT_DATABASE });
        }

        const normalizedQuery = query.toLowerCase().trim();

        let matchedAirports = AIRPORT_DATABASE.filter(airport => {
            return airport.keywords.some(keyword => keyword.includes(normalizedQuery) || normalizedQuery.includes(keyword)) ||
                   airport.city.toLowerCase().includes(normalizedQuery) ||
                   airport.name.toLowerCase().includes(normalizedQuery) ||
                   airport.code.toLowerCase() === normalizedQuery;
        });

        const flights = await Flight.find({
            $or: [
                { departureCity: new RegExp(normalizedQuery, 'i') },
                { departureAirport: new RegExp(normalizedQuery, 'i') },
                { destinationCity: new RegExp(normalizedQuery, 'i') },
                { destinationAirport: new RegExp(normalizedQuery, 'i') }
            ]
        }).select('departureCity departureAirport destinationCity destinationAirport');

        flights.forEach(f => {
            if (f.departureCity.toLowerCase().includes(normalizedQuery) || f.departureAirport.toLowerCase() === normalizedQuery) {
                if (!matchedAirports.some(a => a.code === f.departureAirport)) {
                    matchedAirports.push({ city: f.departureCity, code: f.departureAirport, name: f.departureAirport, keywords: [] });
                }
            }
            if (f.destinationCity.toLowerCase().includes(normalizedQuery) || f.destinationAirport.toLowerCase() === normalizedQuery) {
                if (!matchedAirports.some(a => a.code === f.destinationAirport)) {
                    matchedAirports.push({ city: f.destinationCity, code: f.destinationAirport, name: f.destinationAirport, keywords: [] });
                }
            }
        });

        res.status(200).json({
            success: true,
            count: matchedAirports.length,
            locations: matchedAirports
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
