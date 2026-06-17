const axios = require('axios');
const Flight = require('../models/Flight');

const AVIATIONSTACK_BASE_URL = 'http://api.aviationstack.com/v1/flights';
const getSerpApiKey = () => process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY;

const formatTime = (value) => {
    if (!value) return '';

    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
        return date.toISOString().slice(11, 16);
    }

    if (typeof value === 'string') {
        const match = value.match(/(\d{2}:\d{2})/);
        return match ? match[1] : value;
    }

    return '';
};

const buildMockPricing = (flightNumber) => {
    const seed = (flightNumber || '')
        .split('')
        .reduce((total, char) => total + char.charCodeAt(0), 0);

    const economy = 3000 + (seed % 7000);

    return {
        economy,
        business: economy + 4500,
        first: economy + 9000
    };
};

const mapApiFlightToExistingFormat = (flight) => {
    const flightNumber = flight?.flight?.iata || flight?.flight?.number || '';
    const departureDateTime = flight?.departure?.scheduled || flight?.departure?.estimated || flight?.departure?.actual || new Date().toISOString();

    return {
        flightNumber,
        airline: flight?.airline?.name || 'Unknown Airline',
        flightName: flight?.flight?.iata || flight?.flight?.icao || flightNumber || 'Unknown Flight',
        departureCity: flight?.departure?.airport || flight?.departure?.iata || 'Unknown',
        departureAirport: flight?.departure?.iata || 'Unknown',
        destinationCity: flight?.arrival?.airport || flight?.arrival?.iata || 'Unknown',
        destinationAirport: flight?.arrival?.iata || 'Unknown',
        departureDate: new Date(departureDateTime),
        departureTime: formatTime(departureDateTime),
        prices: buildMockPricing(flightNumber),
        availableSeats: {
            economy: 60,
            business: 20,
            first: 10
        }
    };
};

const filterApiFlights = (flights, filters) => {
    return flights.filter((flight) => {
        if (filters.airline && !new RegExp(filters.airline, 'i').test(flight.airline || '')) {
            return false;
        }

        if (filters.flightNumber && !new RegExp(filters.flightNumber, 'i').test(flight.flightNumber || '')) {
            return false;
        }

        if (filters.departure && !new RegExp(filters.departure, 'i').test(flight.departureAirport || '') && !new RegExp(filters.departure, 'i').test(flight.departureCity || '')) {
            return false;
        }

        if (filters.destination && !new RegExp(filters.destination, 'i').test(flight.destinationAirport || '') && !new RegExp(filters.destination, 'i').test(flight.destinationCity || '')) {
            return false;
        }

        if (filters.date && flight.departureDate) {
            const searchDate = new Date(filters.date);
            const nextDay = new Date(searchDate);
            nextDay.setDate(searchDate.getDate() + 1);

            if (flight.departureDate < searchDate || flight.departureDate >= nextDay) {
                return false;
            }
        }

        if (filters.time && !new RegExp(filters.time, 'i').test(flight.departureTime || '')) {
            return false;
        }

        if (filters.passengers && filters.cabinClass) {
            const numPassengers = parseInt(filters.passengers, 10);
            const available = flight.availableSeats?.[filters.cabinClass.toLowerCase()] || 0;

            if (available < numPassengers) {
                return false;
            }
        }

        return true;
    });
};

exports.searchFlights = async (req, res) => {
    try {
        const { departure, destination, date, time, passengers, cabinClass, airline, flightNumber } = req.query;
        let query = {};

        // Simple field filters
        if (airline) query.airline = new RegExp(airline, 'i');
        if (flightNumber) query.flightNumber = new RegExp(flightNumber, 'i');

        // Departure (OR city/airport)
        if (departure) {
            query.$or = [
                { departureCity: new RegExp(departure, 'i') },
                { departureAirport: new RegExp(departure, 'i') }
            ];
        }

        // Destination (OR city/airport) - ✅ FIXED
        if (destination) {
            const destCondition = {
                $or: [
                    { destinationCity: new RegExp(destination, 'i') },
                    { destinationAirport: new RegExp(destination, 'i') }
                ]
            };
            if (!query.$and) query.$and = [];
            query.$and.push(destCondition);
        }

        // Date range
        if (date) {
            const searchDate = new Date(date);
            const nextDay = new Date(searchDate);
            nextDay.setDate(searchDate.getDate() + 1);
            query.departureDate = { $gte: searchDate, $lt: nextDay };
        }

        // Exact time
        if (time) {
            query.departureTime = new RegExp(time, 'i');
        }

        // Seat availability
        if (passengers && cabinClass) {
            const numPassengers = parseInt(passengers);
            const classKey = `availableSeats.${cabinClass.toLowerCase()}`;
            query[classKey] = { $gte: numPassengers };
        }

        const serpApiKey = getSerpApiKey();

        if (serpApiKey && departure && destination) {
            try {
                let searchDateStr = date;
                if (!searchDateStr) {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    searchDateStr = tomorrow.toISOString().split('T')[0];
                } else {
                    searchDateStr = new Date(date).toISOString().split('T')[0];
                }

                const { data } = await axios.get('https://serpapi.com/search', {
                    params: {
                        engine: 'google_flights',
                        departure_id: departure,
                        arrival_id: destination,
                        outbound_date: searchDateStr,
                        type: '2',
                        currency: 'INR',
                        api_key: serpApiKey
                    }
                });

                const apiResults = [...(data.best_flights || []), ...(data.other_flights || [])];

                const mappedFlights = apiResults.map(flightData => {
                    const firstLeg = flightData.flights && flightData.flights[0];
                    const lastLeg = flightData.flights && flightData.flights[flightData.flights.length - 1];
                    const flightNum = (firstLeg && firstLeg.flight_number) || 'G' + Math.floor(Math.random() * 9000 + 1000);
                    
                    const priceEconomy = flightData.price || buildMockPricing(flightNum).economy;

                    return {
                        flightNumber: flightNum,
                        airline: (firstLeg && firstLeg.airline) || flightData.airlines?.join(', ') || 'Unknown Airline',
                        flightName: flightNum,
                        departureCity: (firstLeg && firstLeg.departure_airport && firstLeg.departure_airport.id) || departure,
                        departureAirport: (firstLeg && firstLeg.departure_airport && firstLeg.departure_airport.id) || departure,
                        destinationCity: (lastLeg && lastLeg.arrival_airport && lastLeg.arrival_airport.id) || destination,
                        destinationAirport: (lastLeg && lastLeg.arrival_airport && lastLeg.arrival_airport.id) || destination,
                        departureDate: (firstLeg && firstLeg.departure_airport && firstLeg.departure_airport.time) ? new Date(firstLeg.departure_airport.time) : new Date(searchDateStr),
                        departureTime: (firstLeg && firstLeg.departure_airport && firstLeg.departure_airport.time) ? formatTime(firstLeg.departure_airport.time) : '00:00',
                        prices: {
                            economy: priceEconomy,
                            business: priceEconomy + 4500,
                            first: priceEconomy + 9000
                        },
                        availableSeats: { economy: 60, business: 20, first: 10 }
                    };
                });

                const apiFlights = filterApiFlights(mappedFlights, {
                    departure,
                    destination,
                    date,
                    time,
                    passengers,
                    cabinClass,
                    airline,
                    flightNumber
                });

                for (let flight of apiFlights) {
                    const searchDateStart = new Date(flight.departureDate);
                    searchDateStart.setHours(0, 0, 0, 0);
                    const searchDateEnd = new Date(flight.departureDate);
                    searchDateEnd.setHours(23, 59, 59, 999);

                    await Flight.findOneAndUpdate(
                        {
                            flightNumber: flight.flightNumber,
                            departureDate: { $gte: searchDateStart, $lte: searchDateEnd }
                        },
                        { $setOnInsert: flight },
                        { upsert: true, new: true }
                    );
                }
            } catch (apiError) {
                console.error("SerpApi Error:", apiError.message);
            }
        }

        const dbFlights = await Flight.find(query);

        res.status(200).json({ success: true, count: dbFlights.length, flights: dbFlights });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.trackFlight = async (req, res) => {
    try {
        const flightNumber = req.params.flightNumber || req.query.flightNumber || req.body.flightNumber;

        if (!flightNumber) {
            return res.status(400).json({ success: false, message: 'flightNumber is required' });
        }

        if (!process.env.AVIATION_API_KEY) {
            return res.status(500).json({ success: false, message: 'Aviation API key is not configured' });
        }

        const { data } = await axios.get(AVIATIONSTACK_BASE_URL, {
            params: {
                access_key: process.env.AVIATION_API_KEY,
                flight_iata: flightNumber
            }
        });

        const flight = Array.isArray(data?.data) ? data.data[0] : null;

        if (!flight) {
            return res.status(404).json({ success: false, message: 'Flight not found' });
        }

        return res.status(200).json({
            success: true,
            flightNumber: flight?.flight?.iata || flightNumber,
            status: flight?.flight_status || 'unknown',
            airline: flight?.airline?.name || 'Unknown Airline',
            departure: {
                airport: flight?.departure?.airport || 'Unknown',
                iata: flight?.departure?.iata || '',
                scheduled: flight?.departure?.scheduled || null,
                terminal: flight?.departure?.terminal || null,
                gate: flight?.departure?.gate || null,
                delay: flight?.departure?.delay || null
            },
            arrival: {
                airport: flight?.arrival?.airport || 'Unknown',
                iata: flight?.arrival?.iata || '',
                scheduled: flight?.arrival?.scheduled || null,
                terminal: flight?.arrival?.terminal || null,
                gate: flight?.arrival?.gate || null,
                delay: flight?.arrival?.delay || null,
                baggage: flight?.arrival?.baggage || null
            },
            live: flight?.live ? {
                latitude: flight.live.latitude || null,
                longitude: flight.live.longitude || null,
                altitude: flight.live.altitude || null,
                speed: flight.live.speed_horizontal || null
            } : null
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ✅ FIXED addFlight - Preserves ALL fields
exports.addFlight = async (req, res) => {
    try {
        let flightData = req.body;

        if (Array.isArray(flightData)) {
            // Handle array (10 flights)
            const created = [];
            for (let data of flightData) {
                const existing = await Flight.findOne({ flightNumber: data.flightNumber });
                if (!existing) {
                    const flight = new Flight(data);  // ✅ Preserves airline/flightName
                    await flight.save();
                    created.push(flight.flightNumber);
                }
            }
            res.status(201).json({
                success: true,
                created: created.length,
                flights: created
            });
        } else {
            // Single flight
            const flight = new Flight(flightData);  // ✅ Preserves ALL fields
            await flight.save();
            res.status(201).json({ success: true, flight });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createPriceAlert = async (req, res) => {
    try {
        const { email, departureCity, destinationCity, targetPrice, date } = req.body || req.query || req.params;
        
        if (!email || !departureCity || !destinationCity || !targetPrice || !date) {
            return res.status(400).json({ success: false, message: "Missing required fields for price alert" });
        }

        const Alert = require('../models/Alert');
        const newAlert = new Alert({
            email,
            departureCity,
            destinationCity,
            targetPrice,
            date
        });
        await newAlert.save();

        return res.status(201).json({ success: true, message: `Price drop alert set successfully! We will email you at ${email} if the price drops below $${targetPrice}.` });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
