const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    email: { type: String, required: true },
    departureCity: { type: String, required: true },
    destinationCity: { type: String, required: true },
    targetPrice: { type: Number, required: true },
    date: { type: Date, required: true },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);
