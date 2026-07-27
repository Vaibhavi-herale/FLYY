const Refund = require('../models/Refund');
const Booking = require('../models/Booking');
const CancellationPolicy = require('../models/CancellationPolicy');
const Ticket = require('../models/Ticket');
const emailNotifications = require('./emailNotifications');

class RefundService {
    /**
     * Request refund for booking
     */
    async requestRefund(bookingId, reason, notes, cancelledCount) {
        try {
            const booking = await Booking.findById(bookingId).populate('flight');
            if (!booking) throw new Error('Booking not found');
            
            const existingRefund = await Refund.findOne({ bookingId, status: 'pending' });
            if (existingRefund) throw new Error('A pending refund request already exists for this booking. Please process it first.');

            // Calculate refund amount
            const actualCancelledCount = cancelledCount || booking.passengers.length;
            const refundData = await this.calculateRefund(booking, reason, actualCancelledCount);

            const refund = await Refund.create({
                bookingId,
                originalAmount: booking.totalAmount,
                refundAmount: refundData.refundAmount,
                refundPercentage: refundData.percentage,
                reason,
                notes,
                status: 'pending',
                hoursBeforeDeparture: refundData.hoursBeforeDeparture,
                processingFee: refundData.processingFee,
                cancellationPolicyApplied: refundData.policyId
            });

            // Cancel tickets
            await Ticket.updateMany(
                { bookingId },
                { status: 'cancelled' }
            );

            // Notify user
            await emailNotifications.sendRefundRequestAcknowledgement(
                booking.contactEmail,
                refund
            );

            return refund;
        } catch (error) {
            throw new Error(`Refund request failed: ${error.message}`);
        }
    }

    /**
     * Calculate refund amount based on policy and time
     */
    async calculateRefund(booking, reason, cancelledCount) {
        try {
            const now = new Date();
            const departureTime = new Date(booking.flight.departureDate);
            const hoursBeforeDeparture = (departureTime - now) / (1000 * 60 * 60);

            let percentage = 0;
            let processingFee = 0;

            if (reason === 'flight_cancelled') {
                percentage = 100;
            } else if (reason === 'flight_delayed') {
                percentage = 50;
            } else {
                // Get cancellation policy
                const policy = await CancellationPolicy.findOne({
                    airline: booking.flight.airline,
                    cabinClass: booking.cabinClass,
                    isActive: true
                });

                if (policy && policy.policies) {
                    // Find applicable policy based on hours before departure
                    const applicablePolicy = policy.policies.find(p => 
                        hoursBeforeDeparture >= p.hoursBeforeDeparture
                    );
                    percentage = applicablePolicy ? applicablePolicy.refundPercentage : 0;
                    processingFee = policy.cancellationFee || 0;
                }
            }

            const originalPassengerCount = booking.passengers.length;
            const amountForCancelled = (booking.totalAmount / originalPassengerCount) * cancelledCount;
            
            const refundAmount = (amountForCancelled * percentage) / 100 - (processingFee * cancelledCount);

            return {
                refundAmount: Math.max(0, refundAmount),
                percentage,
                processingFee,
                hoursBeforeDeparture,
                policyId: null
            };
        } catch (error) {
            throw new Error(`Refund calculation failed: ${error.message}`);
        }
    }

    /**
     * Approve refund by admin
     */
    async approveRefund(refundId, notes) {
        try {
            const refund = await Refund.findById(refundId);
            if (!refund) throw new Error('Refund not found');
            if (refund.status !== 'pending') throw new Error('Only pending refunds can be approved');

            refund.status = 'approved';
            refund.approvedAt = new Date();
            if (notes) refund.notes = notes;
            await refund.save();

            // Notify user
            const booking = await Booking.findById(refund.bookingId);
            await emailNotifications.sendRefundApprovedEmail(
                booking.contactEmail,
                refund
            );

            return refund;
        } catch (error) {
            throw new Error(`Refund approval failed: ${error.message}`);
        }
    }

    /**
     * Reject refund by admin
     */
    async rejectRefund(refundId, reason) {
        try {
            const refund = await Refund.findById(refundId);
            if (!refund) throw new Error('Refund not found');
            if (refund.status !== 'pending') throw new Error('Only pending refunds can be rejected');

            refund.status = 'rejected';
            refund.notes = reason;
            await refund.save();

            // Restore booking status
            await Booking.findByIdAndUpdate(
                refund.bookingId,
                { bookingStatus: 'Confirmed' }
            );

            // Restore tickets
            await Ticket.updateMany(
                { bookingId: refund.bookingId },
                { status: 'issued' }
            );

            // Notify user
            const booking = await Booking.findById(refund.bookingId);
            await emailNotifications.sendRefundRejectedEmail(
                booking.contactEmail,
                refund,
                reason
            );

            return refund;
        } catch (error) {
            throw new Error(`Refund rejection failed: ${error.message}`);
        }
    }

    /**
     * Process approved refund (send to payment gateway)
     */
    async processRefund(refundId) {
    try {
        const refund = await Refund.findById(refundId);
        if (!refund) throw new Error('Refund not found');
        if (refund.status !== 'approved' && refund.status !== 'failed') {
            throw new Error('Only approved or previously failed refunds can be processed');
        }

        const booking = await Booking.findById(refund.bookingId);
        if (!booking) throw new Error('Booking not found');

        // Initialize Dodo SDK early so we can use it for lookup if needed
        const DodoPayments = require('dodopayments');
        const dodo = new DodoPayments({
            bearerToken: process.env.DODO_API_KEY,
            environment: 'test_mode'
        });

        let dodoPaymentId = booking.payment?.dodoPaymentId;

        // If payment ID is missing from DB, attempt to fetch it from Dodo API
        // using the booking ID stored in payment metadata
        if (!dodoPaymentId) {
            console.log(`[RefundService] dodoPaymentId missing for booking ${booking._id}. Attempting to fetch from Dodo API...`);
            try {
                // List recent payments and find the one with our booking_id in metadata
                const payments = await dodo.payments.list({ limit: 100 });
                const matchedPayment = payments?.items?.find(p =>
                    p.metadata?.booking_id === booking._id.toString() &&
                    p.status === 'succeeded'
                );

                if (matchedPayment) {
                    dodoPaymentId = matchedPayment.payment_id;
                    console.log(`[RefundService] Found Dodo payment ID via API lookup: ${dodoPaymentId}`);

                    // Save it back to the booking so future refunds work immediately
                    await Booking.findByIdAndUpdate(booking._id, {
                        $set: { 'payment.dodoPaymentId': dodoPaymentId }
                    });
                } else {
                    throw new Error(
                        `No completed Dodo payment found for booking ${booking._id}. ` +
                        `This booking may have been paid outside of Dodo Payments, or the webhook ` +
                        `(payment.succeeded) was never received. Please check your Dodo dashboard ` +
                        `and ensure DODO_WEBHOOK_SECRET is correctly set in your .env file.`
                    );
                }
            } catch (lookupError) {
                throw new Error(`Could not retrieve Dodo payment ID: ${lookupError.message}`);
            }
        }

        // Real Dodo refund API call (dodo SDK already initialized above)

        if (refund.refundAmount <= 0) {
            refund.status = 'processed';
            refund.processedAt = new Date();
            refund.transactionId = 'zero_amount_refund';
            refund.notes = (refund.notes ? refund.notes + ' | ' : '') + 'Processed automatically (zero refund amount due to policy).';
            await refund.save();

            await Booking.findByIdAndUpdate(refund.bookingId, { bookingStatus: 'Refunded' });
            await emailNotifications.sendRefundProcessedEmail(booking.contactEmail, refund);
            return refund;
        }

        const dodoRefund = await dodo.refunds.create({
            payment_id: dodoPaymentId,
            amount: Math.round(refund.refundAmount * 100),
            reason: refund.reason,
            metadata: {
                refund_id: refund._id.toString(),
                booking_id: refund.bookingId.toString()
            }
        });

        // dodoRefund.status will be 'pending' or 'succeeded'
        // Store the real refund_id from Dodo
        refund.status = 'processed';
        refund.processedAt = new Date();
        refund.transactionId = dodoRefund.refund_id;  // real ID like "ref_xxxx"
        await refund.save();

        await Booking.findByIdAndUpdate(refund.bookingId, { bookingStatus: 'Refunded' });

        await emailNotifications.sendRefundProcessedEmail(booking.contactEmail, refund);

        return refund;
    } catch (error) {
        // Mark as failed so admin can see what went wrong
        await Refund.findByIdAndUpdate(refundId, {
            status: 'failed',
            notes: error.message
        });
        throw new Error(`Refund processing failed: ${error.message}`);
    }
}

    /**
     * Get refund status
     */
    async getRefundStatus(refundId) {
        try {
            const refund = await Refund.findById(refundId)
                .populate('bookingId')
                .populate('cancellationPolicyApplied');
            return refund;
        } catch (error) {
            throw new Error(`Failed to fetch refund: ${error.message}`);
        }
    }

    /**
     * Get all refunds for booking
     */
    async getRefundsByBooking(bookingId) {
        try {
            const refunds = await Refund.find({ bookingId }).sort({ requestedAt: -1 });
            return refunds;
        } catch (error) {
            throw new Error(`Failed to fetch refunds: ${error.message}`);
        }
    }
}

module.exports = new RefundService();