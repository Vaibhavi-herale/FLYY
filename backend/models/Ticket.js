const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true
    },
    ticketNumber: {
        type: String,
        unique: true,
        required: true
    },
    passengerId: {
        type: String,
        required: true
    },
    passengerName: String,
    flightId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Flight',
        required: true
    },
    pnr: String,
    seatNumber: String,
    cabinClass: {
        type: String,
        enum: ['economy', 'business', 'first']
    },
    issueDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['issued', 'checked_in', 'boarded', 'used', 'cancelled'],
        default: 'issued'
    },
    checkInTime: Date,
    boardingTime: Date,
    qrCode: String,
    barcode: String,
    pdfUrl: String,
    baggage: {
        pieces: {
            type: Number,
            default: 1
        },
        weight: {
            type: Number,
            default: 20 // kg
        }
    },
    specialServices: [String], // wheelchair, meal preferences, etc
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

TicketSchema.index({ bookingId: 1, status: 1 });
TicketSchema.index({ passengerName: 1 });

module.exports = mongoose.model('Ticket', TicketSchema);