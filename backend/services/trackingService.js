const axios = require('axios');

const AVIATIONSTACK_BASE = 'http://api.aviationstack.com/v1';

// ─────────────────────────────────────────
// TRACK FLIGHT by flight number
// e.g. trackFlight("AI302")
// ─────────────────────────────────────────
async function trackFlight(flightNumber) {
    if (!process.env.AVIATION_API_KEY) {
        throw new Error('AVIATION_API_KEY is not configured');
    }

    // Normalize: strip spaces, uppercase
    const normalized = flightNumber.replace(/\s+/g, '').toUpperCase();

    const response = await axios.get(`${AVIATIONSTACK_BASE}/flights`, {
        params: {
            access_key: process.env.AVIATION_API_KEY,
            flight_iata: normalized,
            limit: 1
        },
        timeout: 10000
    });

    const data = response.data;

    if (!data || !data.data || data.data.length === 0) {
        return {
            success: false,
            message: `No live data found for flight ${normalized}. Flight may not be operating today.`
        };
    }

    const flight = data.data[0];
    return buildTrackingResponse(flight);
}

// ─────────────────────────────────────────
// TRACK BY ROUTE (origin → destination)
// ─────────────────────────────────────────
async function trackFlightByRoute(depIata, arrIata) {
    if (!process.env.AVIATION_API_KEY) {
        throw new Error('AVIATION_API_KEY is not configured');
    }

    const response = await axios.get(`${AVIATIONSTACK_BASE}/flights`, {
        params: {
            access_key: process.env.AVIATION_API_KEY,
            dep_iata: depIata.toUpperCase(),
            arr_iata: arrIata.toUpperCase(),
            limit: 5
        },
        timeout: 10000
    });

    if (!response.data?.data?.length) {
        return { success: false, message: 'No flights found for this route today' };
    }

    return {
        success: true,
        flights: response.data.data.map(buildTrackingResponse)
    };
}

// ─────────────────────────────────────────
// INTERNAL: Build clean tracking response
// ─────────────────────────────────────────
function buildTrackingResponse(flight) {
    const statusMap = {
        scheduled: 'Scheduled ✅',
        active: 'In Air 🛫',
        landed: 'Landed 🛬',
        cancelled: 'Cancelled ❌',
        incident: 'Incident ⚠️',
        diverted: 'Diverted 🔀',
        unknown: 'Unknown ❓'
    };

    const rawStatus = (flight.flight_status || 'unknown').toLowerCase();

    return {
        success: true,
        flightNumber: flight.flight?.iata || 'N/A',
        airline: flight.airline?.name || 'N/A',
        status: statusMap[rawStatus] || rawStatus,
        rawStatus,

        departure: {
            airport: flight.departure?.airport || 'N/A',
            iata: flight.departure?.iata || 'N/A',
            scheduled: flight.departure?.scheduled || null,
            estimated: flight.departure?.estimated || null,
            actual: flight.departure?.actual || null,
            terminal: flight.departure?.terminal || 'N/A',
            gate: flight.departure?.gate || 'N/A',
            delay: flight.departure?.delay ? `${flight.departure.delay} min` : 'None'
        },

        arrival: {
            airport: flight.arrival?.airport || 'N/A',
            iata: flight.arrival?.iata || 'N/A',
            scheduled: flight.arrival?.scheduled || null,
            estimated: flight.arrival?.estimated || null,
            actual: flight.arrival?.actual || null,
            terminal: flight.arrival?.terminal || 'N/A',
            gate: flight.arrival?.gate || 'N/A',
            baggage: flight.arrival?.baggage || 'N/A',
            delay: flight.arrival?.delay ? `${flight.arrival.delay} min` : 'None'
        },

        aircraft: {
            registration: flight.aircraft?.registration || 'N/A',
            iata: flight.aircraft?.iata || 'N/A'
        },

        live: flight.live ? {
            latitude: flight.live.latitude,
            longitude: flight.live.longitude,
            altitude: flight.live.altitude,
            speed: flight.live.speed_horizontal,
            isGround: flight.live.is_ground
        } : null
    };
}

module.exports = {
    trackFlight,
    trackFlightByRoute
};
