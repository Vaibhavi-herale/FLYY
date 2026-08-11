import { useState, useEffect } from 'react';
import { Download, Check, QrCode, Clock } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function MyTickets() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const bookingId = new URLSearchParams(window.location.search).get('booking_id');

    useEffect(() => {
        if (bookingId) {
            fetchTickets();
        }
    }, [bookingId]);

    const fetchTickets = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API}/api/tickets/${bookingId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setTickets(data.tickets);
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const downloadPDF = async (ticketId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API}/api/tickets/${ticketId}/pdf`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ticket_${ticketId}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading ticket:', error);
        }
    };

    const checkIn = async (ticketId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API}/api/tickets/${ticketId}/checkin`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                fetchTickets();
                alert('Check-in successful!');
            }
        } catch (error) {
            console.error('Error checking in:', error);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Loading tickets...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">✈️ My Tickets</h1>

                {tickets.length === 0 ? (
                    <div className="bg-[#f0f8ff] p-8 rounded-lg shadow text-center">
                        <p className="text-gray-500">No tickets found</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {tickets.map((ticket) => (
                            <div
                                key={ticket._id}
                                className="bg-[#f0f8ff] p-6 rounded-lg shadow hover:shadow-lg transition"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h2 className="text-xl font-bold">{ticket.ticketNumber}</h2>
                                        <p className="text-[#000080]">PNR: {ticket.pnr}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                        ticket.status === 'issued' ? 'bg-yellow-100 text-yellow-800' :
                                        ticket.status === 'checked_in' ? 'bg-#1e293b text-[#1e3a8a]' :
                                        ticket.status === 'boarded' ? 'bg-green-100 text-green-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {ticket.status.replace('_', ' ').toUpperCase()}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <p className="text-sm text-[#000080]">Passenger</p>
                                        <p className="font-semibold">{ticket.passengerName}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-[#000080]">Seat</p>
                                        <p className="font-semibold">{ticket.seatNumber}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-[#000080]">Class</p>
                                        <p className="font-semibold capitalize">{ticket.cabinClass}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-[#000080]">Baggage</p>
                                        <p className="font-semibold">{ticket.baggage.pieces} piece ({ticket.baggage.weight}kg)</p>
                                    </div>
                                </div>

                                {ticket.qrCode && (
                                    <div className="mb-4 flex items-center gap-2">
                                        <QrCode size={20} />
                                        <img src={ticket.qrCode} alt="QR Code" className="h-24" />
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    {ticket.status === 'issued' && (
                                        <button
                                            onClick={() => checkIn(ticket._id)}
                                            className="flex items-center gap-2 bg-sky-600 text-[#000080] px-4 py-2 rounded hover:bg-sky-700"
                                        >
                                            <Check size={18} /> Check In
                                        </button>
                                    )}
                                    <button
                                        onClick={() => downloadPDF(ticket._id)}
                                        className="flex items-center gap-2 bg-green-600 text-[#000080] px-4 py-2 rounded hover:bg-green-700"
                                    >
                                        <Download size={18} /> Download PDF
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}