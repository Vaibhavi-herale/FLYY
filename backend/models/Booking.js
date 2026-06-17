const mongoose = require('mongoose');

const passengerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    nationality: { type: String, required: true },
    passportNumber: { type: String, required: true },
    issueDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    phoneNumber: { type: String, required: true },
    email: { type: String, required: true },
    isCancelled: { type: Boolean, default: false }
});

const paymentSchema = new mongoose.Schema({
    cardholderName: { type: String },
    creditCardNumber: { type: String },
    cvv: { type: String },
    paymentMethod: { type: String, enum: ['card', 'UPI', 'wallet']},
    upiId: { type: String },    // Added for UPI
    walletApp: { type: String }, // Added for wallet
    dodoPaymentId: { type: String }
});

const bookingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    pnr: { type: String, required: true, unique: true },
    flight: { type: mongoose.Schema.Types.ObjectId, ref: 'Flight', required: true },
    contactEmail: { type: String, required: true }, // The main email for the booking
    passengers: [passengerSchema],
    payment: paymentSchema,
    totalAmount: { type: Number, required: true },
    cabinClass: { type: String, enum: ['economy', 'business', 'first'], required: true },
    seats: { type: [String], default: [] },
    bookingStatus: { type: String, enum: ['Pending Payment', 'Confirmed', 'Partially Cancelled', 'Cancelled'], default: 'Pending Payment' }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
