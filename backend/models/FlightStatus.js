const mongoose = require('mongoose');

const FlightStatusSchema = new mongoose.Schema({
    flightId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Flight',
        required: true
    },
    flightNumber: String,
    currentStatus: {
        type: String,
        enum: ['scheduled', 'delayed', 'boarding', 'departed', 'in_flight', 'landed', 'cancelled', 'diverted'],
        default: 'scheduled'
    },
    scheduledDeparture: Date,
    estimatedDeparture: Date,
    actualDeparture: Date,
    scheduledArrival: Date,
    estimatedArrival: Date,
    actualArrival: Date,
    delayMinutes: {
        type: Number,
        default: 0
    },
    delayReason: String, // weather, mechanical, crew, etc
    gate: String,
    terminal: String,
    bagageCarousel: String,
    aircraft: {
        type: String,
        registration: String
    },
    weather: {
        departure: String,
        arrival: String,
        condition: String
    },
    diversion: {
        airport: String,
        reason: String,
        timestamp: Date
    },
    cancellation: {
        reason: String,
        timestamp: Date
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    dataSource: {
        type: String,
        enum: ['airline_api', 'manual_update', 'scheduled', 'auto_tracking'],
        default: 'manual_update'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

FlightStatusSchema.index({ flightId: 1 });
FlightStatusSchema.index({ flightNumber: 1 });
FlightStatusSchema.index({ currentStatus: 1 });

module.exports = mongoose.model('FlightStatus', FlightStatusSchema);