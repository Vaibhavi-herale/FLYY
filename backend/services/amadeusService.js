const axios = require('axios');

const AMADEUS_BASE = 'https://test.api.amadeus.com';
let cachedToken = null;
let tokenExpiresAt = 0;

// ─────────────────────────────────────────
// 1. OAUTH TOKEN (cached, auto-refreshes)
// ─────────────────────────────────────────
async function getAccessToken() {
    if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.AMADEUS_CLIENT_ID);
    params.append('client_secret', process.env.AMADEUS_CLIENT_SECRET);

    const response = await axios.post(
        `${AMADEUS_BASE}/v1/security/oauth2/token`,
        params,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    cachedToken = response.data.access_token;
    // Refresh 60s before expiry
    tokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;
    return cachedToken;
}

// ─────────────────────────────────────────
// 2. SEARCH FLIGHTS
// ─────────────────────────────────────────
async function searchFlights(origin, destination, date, passengers = 1, cabinClass = 'ECONOMY') {
    const token = await getAccessToken();

    const cabinMap = {
        economy: 'ECONOMY',
        business: 'BUSINESS',
        first: 'FIRST'
    };
    const travelClass = cabinMap[cabinClass.toLowerCase()] || 'ECONOMY';

    const response = await axios.get(`${AMADEUS_BASE}/v2/shopping/flight-offers`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
            originLocationCode: origin.toUpperCase(),
            destinationLocationCode: destination.toUpperCase(),
            departureDate: date,
            adults: passengers,
            travelClass,
            max: 10,
            currencyCode: 'USD'
        }
    });

    return mapAmadeusToFlightSchema(response.data.data, response.data.dictionaries);
}

// ─────────────────────────────────────────
// 3. GET FLIGHT OFFER DETAILS (price confirm)
// ─────────────────────────────────────────
async function getFlightOfferDetails(offer) {
    const token = await getAccessToken();

    const response = await axios.post(
        `${AMADEUS_BASE}/v1/shopping/flight-offers/pricing`,
        { data: { type: 'flight-offers-pricing', flightOffers: [offer] } },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    return response.data.data.flightOffers[0];
}

// ─────────────────────────────────────────
// 4. CREATE FLIGHT ORDER (simulation)
// ─────────────────────────────────────────
async function createFlightOrder(offer, travelers) {
    const token = await getAccessToken();

    const response = await axios.post(
        `${AMADEUS_BASE}/v1/booking/flight-orders`,
        {
            data: {
                type: 'flight-order',
                flightOffers: [offer],
                travelers
            }
        },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    return response.data.data;
}

// ─────────────────────────────────────────
// 5. MAP Amadeus → Your DB Schema Format
// ─────────────────────────────────────────
function mapAmadeusToFlightSchema(offers, dictionaries = {}) {
    if (!offers || !Array.isArray(offers)) return [];

    return offers.map((offer) => {
        const firstItinerary = offer.itineraries[0];
        const firstSegment = firstItinerary.segments[0];
        const lastSegment = firstItinerary.segments[firstItinerary.segments.length - 1];
        const carrierCode = firstSegment.carrierCode;
        const airlineName = dictionaries?.carriers?.[carrierCode] || carrierCode;

        // Parse total duration (e.g. "PT2H30M" → "2h 30m")
        const duration = parseDuration(firstItinerary.duration);

        // Get pricing
        const price = parseFloat(offer.price.grandTotal);

        // Build segments detail
        const segments = firstItinerary.segments.map(seg => ({
            flightNumber: `${seg.carrierCode}${seg.number}`,
            departure: {
                airport: seg.departure.iataCode,
                time: seg.departure.at,
                terminal: seg.departure.terminal
            },
            arrival: {
                airport: seg.arrival.iataCode,
                time: seg.arrival.at,
                terminal: seg.arrival.terminal
            },
            duration: parseDuration(seg.duration),
            aircraft: seg.aircraft?.code || 'Unknown',
            stops: firstItinerary.segments.length - 1
        }));

        return {
            // Amadeus-specific tracking
            _amadeusOffer: offer,
            _source: 'amadeus',

            // Match your Flight model fields
            flightNumber: `${carrierCode}${firstSegment.number}`,
            airline: airlineName,
            flightName: `${airlineName} ${firstSegment.number}`,
            departureCity: firstSegment.departure.iataCode,
            departureAirport: firstSegment.departure.iataCode,
            destinationCity: lastSegment.arrival.iataCode,
            destinationAirport: lastSegment.arrival.iataCode,
            departureDate: new Date(firstSegment.departure.at),
            departureTime: new Date(firstSegment.departure.at).toTimeString().substring(0, 5),
            arrivalTime: new Date(lastSegment.arrival.at).toTimeString().substring(0, 5),
            duration,
            stops: firstItinerary.segments.length - 1,

            prices: {
                economy: price,
                business: Math.round(price * 2.5),
                first: Math.round(price * 4)
            },
            availableSeats: {
                economy: offer.numberOfBookableSeats || 9,
                business: 4,
                first: 2
            },
            segments,
            currency: offer.price.currency || 'USD',
            lockedSeats: []
        };
    });
}

function parseDuration(isoDuration) {
    if (!isoDuration) return 'N/A';
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return isoDuration;
    const hours = match[1] ? `${match[1]}h` : '';
    const mins = match[2] ? ` ${match[2]}m` : '';
    return `${hours}${mins}`.trim();
}

module.exports = {
    getAccessToken,
    searchFlights,
    getFlightOfferDetails,
    createFlightOrder,
    mapAmadeusToFlightSchema
};
