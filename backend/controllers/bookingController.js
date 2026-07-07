const Booking = require('../models/Booking');
const Flight = require('../models/Flight');
const { v4: uuidv4 } = require('uuid');
const emailService = require('../services/emailService');
const refundService = require('../services/refundService');
exports.lockSeats = async (req, res) => {
    try {
        const { flightId, cabinClass, count } = req.body;
        if (!flightId || !cabinClass || !count) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        const classKey = cabinClass.toLowerCase();
        const flight = await Flight.findById(flightId);
        if (!flight) {
            return res.status(404).json({ success: false, message: 'Flight not found' });
        }
        // Clean up expired locks
        flight.lockedSeats = flight.lockedSeats.filter(lock => new Date(lock.expiresAt) > new Date());
        // Calculate currently locked seats
        const lockedCount = flight.lockedSeats
            .filter(lock => lock.cabinClass === classKey)
            .reduce((total, lock) => total + lock.count, 0);
        const available = flight.availableSeats[classKey] - lockedCount;
        if (available < count) {
            return res.status(400).json({ success: false, message: `Not enough seats available in ${cabinClass}. There might be pending bookings.` });
        }
        const lockId = uuidv4();
        // Lock for 5 minutes
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        flight.lockedSeats.push({
            lockId,
            cabinClass: classKey,
            count,
            expiresAt
        });
        await flight.save();
        res.status(200).json({ success: true, lockId, expiresAt, message: 'Seats locked for 5 minutes.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getSeatAvailability = async (req, res) => {
    try {
        const { flightId } = req.params;
        const cabinClass = (req.query.cabinClass || 'economy').toLowerCase();
        const flight = await Flight.findById(flightId);
        if (!flight) {
            return res.status(404).json({ success: false, message: 'Flight not found' });
        }
        // Clean up expired locks
        flight.lockedSeats = flight.lockedSeats.filter(lock => new Date(lock.expiresAt) > new Date());
        await flight.save();
        // Gather locked seats for this cabin class
        const unavailableSeats = new Set(
            flight.lockedSeats
                .filter(lock => lock.cabinClass === cabinClass)
                .flatMap(lock => lock.seats || [])
        );
        // Gather booked seats from active bookings
        const bookings = await Booking.find({
            flight: flightId,
            bookingStatus: { $in: ['Pending Payment', 'Confirmed'] },
            seats: { $exists: true, $ne: [] }
        }).select('seats');
        bookings.forEach(booking => {
            (booking.seats || []).forEach(seat => unavailableSeats.add(String(seat).trim().toUpperCase()));
        });
        return res.status(200).json({
            success: true,
            flightId,
            cabinClass,
            unavailableSeats: [...unavailableSeats],
            totalAvailable: flight.availableSeats[cabinClass] || 0
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.lockSpecificSeats = async (req, res) => {
    try {
        const { flightId } = req.params;
        const { cabinClass, seats, replacesLockId } = req.body;
        if (!flightId || !cabinClass || !Array.isArray(seats) || seats.length === 0) {
            return res.status(400).json({ success: false, message: 'flightId, cabinClass, and seats are required' });
        }
        const normalizedSeats = seats.map(seat => String(seat).trim().toUpperCase()).filter(Boolean);
        if (new Set(normalizedSeats).size !== normalizedSeats.length) {
            return res.status(400).json({ success: false, message: 'Duplicate seats are not allowed' });
        }
        const classKey = cabinClass.toLowerCase();
        const flight = await Flight.findById(flightId);
        if (!flight) {
            return res.status(404).json({ success: false, message: 'Flight not found' });
        }
        flight.lockedSeats = flight.lockedSeats.filter(lock => new Date(lock.expiresAt) > new Date());
        if (replacesLockId) {
            flight.lockedSeats = flight.lockedSeats.filter(lock => lock.lockId !== replacesLockId);
        }
        const bookedSeats = await Booking.find({
            flight: flightId,
            bookingStatus: { $in: ['Pending Payment', 'Confirmed'] },
            seats: { $exists: true, $ne: [] }
        }).select('seats');
        const unavailableSeats = new Set(
            flight.lockedSeats
                .filter(lock => lock.cabinClass === classKey)
                .flatMap(lock => lock.seats || [])
        );
        bookedSeats.forEach(booking => {
            (booking.seats || []).forEach(seat => unavailableSeats.add(String(seat).trim().toUpperCase()));
        });
        const alreadyUnavailable = normalizedSeats.filter(seat => unavailableSeats.has(seat));
        if (alreadyUnavailable.length > 0) {
            return res.status(409).json({
                success: false,
                message: `Seat(s) already unavailable: ${alreadyUnavailable.join(', ')}`
            });
        }
        const lockedCount = flight.lockedSeats
            .filter(lock => lock.cabinClass === classKey)
            .reduce((total, lock) => total + lock.count, 0);
        const available = flight.availableSeats[classKey] - lockedCount;
        if (available < normalizedSeats.length) {
            return res.status(400).json({ success: false, message: `Not enough seats available in ${cabinClass}` });
        }
        const lockId = uuidv4();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        flight.lockedSeats.push({
            lockId,
            cabinClass: classKey,
            count: normalizedSeats.length,
            seats: normalizedSeats,
            expiresAt
        });
        await flight.save();
        return res.status(200).json({
            success: true,
            lockId,
            seats: normalizedSeats,
            expiresAt,
            message: `Seats ${normalizedSeats.join(', ')} locked for 5 minutes.`
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.createBooking = async (req, res) => {
    try {
        const { flightId, contactEmail, passengers, cabinClass, seats } = req.body;
 
        const flight = await Flight.findById(flightId);
        if (!flight) {
            return res.status(404).json({ success: false, message: 'Flight not found' });
        }
 
        const classKey = cabinClass.toLowerCase();
 
        // Check lock or available seats
        const { lockId } = req.body;
 
        // Clean up expired locks
        flight.lockedSeats = flight.lockedSeats.filter(lock => new Date(lock.expiresAt) > new Date());
 
        if (lockId) {
            const lockIndex = flight.lockedSeats.findIndex(lock => lock.lockId === lockId);
            if (lockIndex === -1) {
                return res.status(400).json({ success: false, message: 'Seat lock expired or invalid. Please select seats and try again.' });
            }
            const lock = flight.lockedSeats[lockIndex];
            const selectedSeats = Array.isArray(seats) ? seats.map(seat => String(seat).trim().toUpperCase()).filter(Boolean) : [];
            if (lock.seats && lock.seats.length > 0) {
                const lockSeats = [...lock.seats].sort();
                const bookingSeats = [...selectedSeats].sort();
                const seatsMatch = lockSeats.length === bookingSeats.length && lockSeats.every((seat, index) => seat === bookingSeats[index]);
                if (!seatsMatch) {
                    return res.status(400).json({ success: false, message: 'Selected seats do not match the active seat lock.' });
                }
            }
            // Keep the lock intact until payment is complete? Or remove it?
            // Usually, we should remove the lock and just hold the available seats by decreasing them.
            flight.lockedSeats.splice(lockIndex, 1);
        } else {
            const lockedCount = flight.lockedSeats
                .filter(lock => lock.cabinClass === classKey)
                .reduce((total, lock) => total + lock.count, 0);
            const available = flight.availableSeats[classKey] - lockedCount;
            if (available < passengers.length) {
                return res.status(400).json({ success: false, message: `Not enough seats in ${cabinClass}. Pending bookings might be active.` });
            }
        }
 
        // Calculate total amount
        const totalAmount = flight.prices[classKey] * passengers.length;
 
        // Create initial pending PNR
        const pnr = Math.random().toString(36).substring(2, 8).toUpperCase();
 
        const normalizedBookingSeats = Array.isArray(seats) ? seats.map(seat => String(seat).trim().toUpperCase()).filter(Boolean) : [];
        const booking = await Booking.create({
            userId: req.user ? req.user._id : undefined,
            pnr,
            flight: flightId,
            contactEmail,
            passengers,
            seats: normalizedBookingSeats,
            totalAmount,
            cabinClass: classKey,
            bookingStatus: 'Pending Payment'
        });
        // Decrease available seats to hold them
        flight.availableSeats[classKey] -= passengers.length;
        await flight.save();
        // --- Create Dodo Payments Checkout url ---
        const DodoPayments = require('dodopayments');
        const dodo = new DodoPayments({
            bearerToken: process.env.DODO_API_KEY,
            environment: 'test_mode'
        });
        const payment = await dodo.payments.create({
            billing: {
                country: 'US', // Using US as fallback Default billing country
            },
            customer: {
                email: contactEmail,
                name: passengers[0].name
            },
            product_cart: [
                {
                    product_id: process.env.DODO_PRODUCT_ID || 'prod_default', // The user will setup their product in env
                    quantity: 1,
                    amount: Math.round(totalAmount * 100)
                }
            ],
            payment_link: true,
            return_url: `${req.headers.origin || 'http://localhost:5173'}?payment=success&booking_id=${booking._id}&chat_id=${req.body.chatId || ""}`,
            metadata: { booking_id: booking._id.toString() }
        });
        res.status(201).json({
            success: true,
            message: 'Booking created. Awaiting payment.',
            payment_link: payment.payment_link,
            booking
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.cancelBooking = async (req, res) => {
    try {
        const { pnr, email, passengerEmails, reason = 'passenger_request', notes = '' } = req.body;
        const booking = await Booking.findOne({
            pnr,
            $or: [
                { userId: req.user._id },
                { contactEmail: req.user.email },
                { contactEmail: email }
            ]
        }).populate('flight');
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found with provided PNR and Contact Email' });
        }
        if (booking.bookingStatus === 'Cancelled') {
            return res.status(400).json({ success: false, message: 'Booking is already completely cancelled' });
        }
        let cancelledCount = 0;
        // If specific passengers are requested to be cancelled
        if (passengerEmails && passengerEmails.length > 0) {
            booking.passengers.forEach(p => {
                if (passengerEmails.includes(p.email) && !p.isCancelled) {
                    p.isCancelled = true;
                    cancelledCount += 1;
                }
            });
            const allCancelled = booking.passengers.every(p => p.isCancelled);
            if (allCancelled) {
                booking.bookingStatus = 'Cancelled';
            } else if (cancelledCount > 0) {
                booking.bookingStatus = 'Partially Cancelled';
            }
        } else {
            // Cancel all active passengers
            booking.passengers.forEach(p => {
                if (!p.isCancelled) {
                    p.isCancelled = true;
                    cancelledCount += 1;
                }
            });
            booking.bookingStatus = 'Cancelled';
        }
        if (cancelledCount === 0) {
            return res.status(400).json({ success: false, message: 'No active passengers found to cancel' });
        }
        // Add back seats to flight
        const flight = await Flight.findById(booking.flight._id);
        const cabinClass = booking.cabinClass;
        if (flight) {
            flight.availableSeats[cabinClass] += cancelledCount;
            await flight.save();
        }
        await booking.save();
        
        // Call refundService.requestRefund() to create refund document and send acknowledgement email
        let refund = null;
        if (booking.bookingStatus === 'Cancelled' || booking.bookingStatus === 'Partially Cancelled') {
            try {
                refund = await refundService.requestRefund(booking._id, reason, notes, cancelledCount);
            } catch (refundError) {
                console.error('Refund request failed:', refundError.message);
                // Continue with cancellation even if refund fails
            }
        }
        
        res.status(200).json({
            success: true,
            message: 'Cancellation successful. Refund initiated and pending admin approval.',
            cancelledPassengersCount: cancelledCount,
            refund: refund ? {
                refundId: refund._id,
                refundAmount: refund.refundAmount,
                refundStatus: refund.status
            } : null,
            bookingStatus: booking.bookingStatus
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getBooking = async (req, res) => {
    try {
        const { pnr } = req.params;
        const booking = await Booking.findOne({
            pnr,
            $or: [
                { userId: req.user._id },
                { contactEmail: req.user.email }
            ]
        }).populate('flight');
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        res.status(200).json({ success: true, booking });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};