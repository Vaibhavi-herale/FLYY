import React, { useState } from 'react';

/**
 * DownloadTicketButton
 * Props:
 *   pnr          – booking PNR
 *   bookingStatus – to show only for confirmed
 *   className    – extra Tailwind classes
 */
export default function DownloadTicketButton({ pnr, bookingStatus, className = '' }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (bookingStatus !== 'Confirmed') return null;

    const handleDownload = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/bookings/ticket/${pnr}`);
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || 'Failed to download ticket');
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `FlightTicket_${pnr}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={className}>
            <button
                onClick={handleDownload}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 shadow-sm"
            >
                {loading ? (
                    <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                            <path d="M12 2a10 10 0 0 1 10 10" />
                        </svg>
                        Generating...
                    </>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Download Ticket (PDF)
                    </>
                )}
            </button>
            {error && (
                <p className="mt-1.5 text-xs text-red-600">{error}</p>
            )}
        </div>
    );
}
