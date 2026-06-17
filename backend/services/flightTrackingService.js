const FlightStatus = require('../models/FlightStatus');
const Flight = require('../models/Flight');
const Booking = require('../models/Booking');
const emailNotifications = require('./emailNotifications');

class FlightTrackingService {
    /**
     * Create initial flight status
     */
    async createFlightStatus(flightId) {
        try {
            const flight = await Flight.findById(flightId);
            if (!flight) throw new Error('Flight not found');

            const status = await FlightStatus.create({
                flightId,
                flightNumber: flight.flightNumber,
                currentStatus: 'scheduled',
                scheduledDeparture: flight.departureDate,
                estimatedDeparture: flight.departureDate,
                scheduledArrival: flight.arrivalDate,
                estimatedArrival: flight.arrivalDate,
                dataSource: 'scheduled'
            });

            return status;
        } catch (error) {
            throw new Error(`Flight status creation failed: ${error.message}`);
        }
    }

    /**
     * Update flight delay
     */
    async updateFlightDelay(flightId, delayMinutes, reason) {
        try {
            let status = await FlightStatus.findOne({ flightId });
            if (!status) {
                status = await this.createFlightStatus(flightId);
            }

            status.delayMinutes = delayMinutes;
            status.delayReason = reason;
            status.currentStatus = delayMinutes > 0 ? 'delayed' : 'scheduled';

            // Update estimated times
            if (status.scheduledDeparture) {
                const newEstimated = new Date(status.scheduledDeparture);
                newEstimated.setMinutes(newEstimated.getMinutes() + delayMinutes);
                status.estimatedDeparture = newEstimated;
            }

            await status.save();

            // Notify all passengers
            if (delayMinutes > 0) {
                await this.notifyPassengersOfDelay(flightId, delayMinutes, reason);
            }

            return status;
        } catch (error) {
            throw new Error(`Failed to update flight delay: ${error.message}`);
        }
    }

    /**
     * Update flight cancellation
     */
    async cancelFlight(flightId, reason) {
        try {
            let status = await FlightStatus.findOne({ flightId });
            if (!status) {
                status = await this.createFlightStatus(flightId);
            }

            status.currentStatus = 'cancelled';
            status.cancellation = {
                reason,
                timestamp: new Date()
            };
            await status.save();

            // Notify all passengers and create refunds
            await this.notifyPassengersOfCancellation(flightId, reason);

            return status;
        } catch (error) {
            throw new Error(`Failed to cancel flight: ${error.message}`);
        }
    }

    /**
     * Update flight diversion
     */
    async divertFlight(flightId, airport, reason) {
        try {
            let status = await FlightStatus.findOne({ flightId });
            if (!status) {
                status = await this.createFlightStatus(flightId);
            }

            status.currentStatus = 'diverted';
            status.diversion = {
                airport,
                reason,
                timestamp: new Date()
            };
            await status.save();

            // Notify all passengers
            await this.notifyPassengersOfDiversion(flightId, airport, reason);

            return status;
        } catch (error) {
            throw new Error(`Failed to divert flight: ${error.message}`);
        }
    }

    /**
     * Update flight status (departure, arrival, etc)
     */
    async updateFlightStatus(flightId, newStatus, details = {}) {
        try {
            let status = await FlightStatus.findOne({ flightId });
            if (!status) {
                status = await this.createFlightStatus(flightId);
            }

            status.currentStatus = newStatus;
            
            if (newStatus === 'departed') {
                status.actualDeparture = new Date();
            } else if (newStatus === 'landed') {
                status.actualArrival = new Date();
            } else if (newStatus === 'boarding') {
                status.gate = details.gate;
                status.terminal = details.terminal;
            } else if (newStatus === 'in_flight') {
                status.gate = null;
            }

            if (details.gate) status.gate = details.gate;
            if (details.terminal) status.terminal = details.terminal;
            if (details.bagageCarousel) status.bagageCarousel = details.bagageCarousel;
            if (details.weather) status.weather = details.weather;

            await status.save();
            return status;
        } catch (error) {
            throw new Error(`Failed to update flight status: ${error.message}`);
        }
    }

    /**
     * Get flight status
     */
    async getFlightStatus(flightId) {
        try {
            let status = await FlightStatus.findOne({ flightId }).populate('flightId');
            if (!status) {
                status = await this.createFlightStatus(flightId);
            }
            return status;
        } catch (error) {
            throw new Error(`Failed to fetch flight status: ${error.message}`);
        }
    }

    /**
     * Get flight status by flight number
     */
    async getFlightStatusByNumber(flightNumber) {
        try {
            const status = await FlightStatus.findOne({ flightNumber }).populate('flightId');
            return status;
        } catch (error) {
            throw new Error(`Failed to fetch flight status: ${error.message}`);
        }
    }

    /**
     * Notify passengers of delay
     */
    async notifyPassengersOfDelay(flightId, delayMinutes, reason) {
        try {
            const bookings = await Booking.find({
                flight: flightId,
                bookingStatus: { $in: ['Confirmed', 'Checked-in'] }
            }).populate('flight');

            for (const booking of bookings) {
                await emailNotifications.sendFlightDelayNotification(
                    booking.contactEmail,
                    {
                        flightNumber: booking.flight.flightNumber,
                        delayMinutes,
                        reason,
                        pnr: booking.pnr,
                        passengers: booking.passengers
                    }
                );
            }
        } catch (error) {
            console.error('Error notifying passengers of delay:', error.message);
        }
    }

    /**
     * Notify passengers of cancellation
     */
    async notifyPassengersOfCancellation(flightId, reason) {
        try {
            const bookings = await Booking.find({
                flight: flightId,
                bookingStatus: { $in: ['Confirmed', 'Checked-in'] }
            }).populate('flight');

            for (const booking of bookings) {
                await emailNotifications.sendFlightCancellationNotification(
                    booking.contactEmail,
                    {
                        flightNumber: booking.flight.flightNumber,
                        reason,
                        pnr: booking.pnr,
                        passengers: booking.passengers,
                        totalAmount: booking.totalAmount
                    }
                );
            }
        } catch (error) {
            console.error('Error notifying passengers of cancellation:', error.message);
        }
    }

    /**
     * Notify passengers of diversion
     */
    async notifyPassengersOfDiversion(flightId, airport, reason) {
        try {
            const bookings = await Booking.find({
                flight: flightId,
                bookingStatus: { $in: ['Confirmed', 'Checked-in', 'Boarded'] }
            }).populate('flight');

            for (const booking of bookings) {
                await emailNotifications.sendFlightDiversionNotification(
                    booking.contactEmail,
                    {
                        flightNumber: booking.flight.flightNumber,
                        airport,
                        reason,
                        pnr: booking.pnr,
                        passengers: booking.passengers
                    }
                );
            }
        } catch (error) {
            console.error('Error notifying passengers of diversion:', error.message);
        }
    }
}

module.exports = new FlightTrackingService();