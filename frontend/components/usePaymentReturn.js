import { useEffect, useState } from 'react';

/**
 * usePaymentReturn
 *
 * Drop this hook in your App.jsx or a payment-return page.
 * It reads ?payment=success&booking_id=XXX from the URL,
 * calls the backend confirm endpoint, then cleans the URL.
 *
 * Usage:
 *   const { confirming, confirmed, error } = usePaymentReturn();
 */
export function usePaymentReturn() {
    const [confirming, setConfirming] = useState(false);
    const [confirmed, setConfirmed]   = useState(false);
    const [booking, setBooking]       = useState(null);
    const [error, setError]           = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const payment   = params.get('payment');
        const bookingId = params.get('booking_id');

        if (payment === 'success' && bookingId) {
            setConfirming(true);

            // Remove query params from URL immediately
            window.history.replaceState({}, '', window.location.pathname);

            fetch(`/api/webhooks/confirm/${bookingId}`, { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setConfirmed(true);
                        setBooking(data.booking || null);
                    } else {
                        setError(data.message || 'Confirmation failed');
                    }
                })
                .catch(err => setError(err.message))
                .finally(() => setConfirming(false));
        }
    }, []);

    return { confirming, confirmed, booking, error };
}
