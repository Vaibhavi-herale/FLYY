const ticketService = require('../services/ticketService');

exports.getTicketsByBooking = async (req, res) => {
    try {
        const tickets = await ticketService.getTicketsByBooking(req.params.bookingId);
        res.json({ success: true, tickets });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.verifyTicket = async (req, res) => {
    try {
        const { ticketNumber, pnr } = req.body;
        const verification = await ticketService.verifyTicket(ticketNumber, pnr);
        res.json(verification);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.checkIn = async (req, res) => {
    try {
        const ticket = await ticketService.checkInPassenger(req.params.ticketId);
        res.json({ success: true, message: 'Checked in successfully', ticket });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.board = async (req, res) => {
    try {
        const ticket = await ticketService.boardPassenger(req.params.ticketId);
        res.json({ success: true, message: 'Boarded successfully', ticket });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.downloadPDF = async (req, res) => {
    try {
        const filePath = await ticketService.generatePDFTicket(req.params.ticketId);
        res.download(filePath);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};