const mongoose = require('mongoose');

const CancellationPolicySchema = new mongoose.Schema({
    airline: {
        type: String,
        required: true
    },
    cabinClass: {
        type: String,
        enum: ['economy', 'business', 'first'],
        required: true
    },
    policies: [
        {
            hoursBeforeDeparture: {
                type: Number,
                required: true // e.g., 72, 48, 24, 12, 6
            },
            refundPercentage: {
                type: Number,
                required: true // 0-100
            },
            description: String // "Full refund if cancelled 72 hours before"
        }
    ],
    noShowRefundPercentage: {
        type: Number,
        default: 0 // Usually no refund for no-shows
    },
    cancellationFee: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    effectiveFrom: Date,
    effectiveTo: Date,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

CancellationPolicySchema.index({ airline: 1, cabinClass: 1 });

module.exports = mongoose.model('CancellationPolicy', CancellationPolicySchema);