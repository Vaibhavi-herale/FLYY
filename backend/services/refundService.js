const Refund = require('../models/Refund');
const Booking = require('../models/Booking');
const CancellationPolicy = require('../models/CancellationPolicy');
const Ticket = require('../models/Ticket');
const emailNotifications = require('./emailNotifications');

class RefundService {
    /**
     * Request refund for booking
     */
    async requestRefund(bookingId, reason, notes) {
        try {
            const booking = await Booking.findById(bookingId).populate('flight');
            if (!booking) throw new Error('Booking not found');
            if (booking.bookingStatus === 'Cancelled') throw new Error('Booking already cancelled');

            // Calculate refund amount
            const refundData = await this.calculateRefund(booking, reason);

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
    async calculateRefund(booking, reason) {
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

            const refundAmount = (booking.totalAmount * percentage) / 100 - processingFee;

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
        if (refund.status !== 'approved') throw new Error('Only approved refunds can be processed');

        const booking = await Booking.findById(refund.bookingId);
        if (!booking) throw new Error('Booking not found');

        const dodoPaymentId = booking.payment?.dodoPaymentId;
        if (!dodoPaymentId) throw new Error('No Dodo payment ID on this booking. Was payment completed via webhook?');

        // Real Dodo refund API call
        const DodoPayments = require('dodopayments');
        const dodo = new DodoPayments({
            bearerToken: process.env.DODO_API_KEY,
            environment: 'test_mode'
        });

        const dodoRefund = await dodo.refunds.create({
            payment_id: dodoPaymentId,
            reason: refund.reason,
            metadata: {
                refund_id: refund._id.toString(),
                booking_id: refund.bookingId.toString()
            }
            // No 'items' field = full refund of the payment
            // If you want partial: items: [{ item_id: DODO_PRODUCT_ID, amount: refund.refundAmount * 100 }]
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