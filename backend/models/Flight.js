const mongoose = require('mongoose');

const flightSchema = new mongoose.Schema({
    flightNumber: { type: String, required: true },
    airline: { type: String, required: true },     // ← ADD: "Air India", "IndiGo"
    flightName: { type: String, required: true },
    departureCity: { type: String, required: true },
    departureAirport: { type: String, required: true },
    destinationCity: { type: String, required: true },
    destinationAirport: { type: String, required: true },
    departureDate: { type: Date, required: true },
    departureTime: { type: String, required: true },
    prices: {
        economy: { type: Number, required: true },
        business: { type: Number, required: true },
        first: { type: Number, required: true }
    },
    availableSeats: {
        economy: { type: Number, default: 60 },
        business: { type: Number, default: 20 },
        first: { type: Number, default: 10 }
    },
    lockedSeats: [{
        lockId: { type: String, required: true },
        cabinClass: { type: String, required: true },
        count: { type: Number, required: true },
        seats: { type: [String], default: [] },
        expiresAt: { type: Date, required: true }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Flight', flightSchema);
