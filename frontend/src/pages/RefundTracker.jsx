import { useState, useEffect } from 'react';
import { AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function RefundTracker() {
    const [refunds, setRefunds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [formData, setFormData] = useState({
        bookingId: '',
        reason: 'passenger_request',
        notes: ''
    });
    const bookingId = new URLSearchParams(window.location.search).get('booking_id');

    useEffect(() => {
        if (bookingId) {
            fetchRefunds();
        }
    }, [bookingId]);

    const fetchRefunds = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API}/api/refunds/booking/${bookingId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setRefunds(data.refunds);
            }
        } catch (error) {
            console.error('Error fetching refunds:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestRefund = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API}/api/refunds/request`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    bookingId,
                    reason: formData.reason,
                    notes: formData.notes
                })
            });
            const data = await res.json();
            if (data.success) {
                fetchRefunds();
                setShowRequestForm(false);
                setFormData({ bookingId: '', reason: 'passenger_request', notes: '' });
                alert('Refund request submitted!');
            }
        } catch (error) {
            console.error('Error requesting refund:', error);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending':
                return <Clock className="text-yellow-600" size={24} />;
            case 'approved':
                return <CheckCircle className="text-green-600" size={24} />;
            case 'processed':
                return <CheckCircle className="text-blue-600" size={24} />;
            case 'rejected':
                return <XCircle className="text-red-600" size={24} />;
            default:
                return <AlertCircle size={24} />;
        }
    };

    const getStatusBgColor = (status) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-50 border-yellow-300';
            case 'approved':
                return 'bg-green-50 border-green-300';
            case 'processed':
                return 'bg-blue-50 border-blue-300';
            case 'rejected':
                return 'bg-red-50 border-red-300';
            default:
                return 'bg-gray-50 border-gray-300';
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Loading refunds...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">💰 Refund Tracker</h1>
                    <button
                        onClick={() => setShowRequestForm(!showRequestForm)}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        Request Refund
                    </button>
                </div>

                {showRequestForm && (
                    <div className="bg-white p-6 rounded-lg shadow mb-8">
                        <h2 className="text-xl font-bold mb-4">Request Refund</h2>
                        <form onSubmit={handleRequestRefund}>
                            <div className="mb-4">
                                <label className="block text-sm font-semibold mb-2">Reason</label>
                                <select
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    className="w-full border rounded px-3 py-2"
                                >
                                    <option value="passenger_request">Passenger Request</option>
                                    <option value="flight_delayed">Flight Delayed</option>
                                    <option value="medical">Medical Emergency</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-semibold mb-2">Notes</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full border rounded px-3 py-2"
                                    rows="4"
                                    placeholder="Additional details..."
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                                >
                                    Submit Request
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowRequestForm(false)}
                                    className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {refunds.length === 0 ? (
                    <div className="bg-white p-8 rounded-lg shadow text-center">
                        <p className="text-gray-500">No refunds yet</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {refunds.map((refund) => (
                            <div
                                key={refund._id}
                                className={`border-2 p-6 rounded-lg ${getStatusBgColor(refund.status)}`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-4">
                                        {getStatusIcon(refund.status)}
                                        <div>
                                            <h3 className="font-bold text-lg">Refund ID: {refund._id}</h3>
                                            <p className="text-sm text-gray-600">Status: {refund.status.toUpperCase()}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold">${refund.refundAmount}</p>
                                        <p className="text-sm text-gray-600">{refund.refundPercentage}% of original</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                    <div>
                                        <p className="text-gray-600">Original Amount</p>
                                        <p className="font-semibold">${refund.originalAmount}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Reason</p>
                                        <p className="font-semibold">{refund.reason.replace('_', ' ')}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Requested</p>
                                        <p className="font-semibold">{new Date(refund.requestedAt).toLocaleDateString()}</p>
                                    </div>
                                    {refund.processedAt && (
                                        <div>
                                            <p className="text-gray-600">Processed</p>
                                            <p className="font-semibold">{new Date(refund.processedAt).toLocaleDateString()}</p>
                                        </div>
                                    )}
                                </div>

                                {refund.notes && (
                                    <div className="mt-4 pt-4 border-t">
                                        <p className="text-sm text-gray-600">Notes: {refund.notes}</p>
                                    </div>
                                )}

                                {refund.status === 'processed' && refund.transactionId && (
                                    <div className="mt-4 pt-4 border-t bg-white bg-opacity-50 p-3 rounded">
                                        <p className="text-sm">Transaction ID: <span className="font-mono font-semibold">{refund.transactionId}</span></p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}