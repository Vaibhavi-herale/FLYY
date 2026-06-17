const mongoose = require('mongoose');

const RefundSchema = new mongoose.Schema({
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true
    },
    originalAmount: {
        type: Number,
        required: true
    },
    refundAmount: Number,
    refundPercentage: Number,
    reason: {
        type: String,
        enum: ['passenger_request', 'flight_cancelled', 'flight_delayed', 'no_show', 'death', 'medical', 'other'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'processed', 'failed'],
        default: 'pending'
    },
    requestedAt: {
        type: Date,
        default: Date.now
    },
    approvedAt: Date,
    processedAt: Date,
    refundMethod: {
        type: String,
        enum: ['original_payment', 'credit_note', 'wallet'],
        default: 'original_payment'
    },
    transactionId: String,
    notes: String,
    cancellationPolicyApplied: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CancellationPolicy'
    },
    hoursBeforeDeparture: Number,
    processingFee: {
        type: Number,
        default: 0
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

RefundSchema.index({ bookingId: 1, status: 1 });
RefundSchema.index({ status: 1 });
RefundSchema.index({ requestedAt: -1 });

module.exports = mongoose.model('Refund', RefundSchema);