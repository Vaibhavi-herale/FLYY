import React, { useState } from 'react';

export default function FlightCard({ flight, onBook, showTrack = true }) {
    const [tracking, setTracking] = useState(null);
    const [trackLoading, setTrackLoading] = useState(false);
    const [trackError, setTrackError] = useState('');
    const [expanded, setExpanded] = useState(false);

    const isAmadeus = flight._source === 'amadeus';

    const depAirport = flight.departureAirport || flight.departureCity || 'N/A';
    const arrAirport = flight.destinationAirport || flight.destinationCity || 'N/A';

    const depTime = flight.departureTime || (flight.departureDate
        ? new Date(flight.departureDate).toTimeString().substring(0, 5)
        : 'N/A');
    const arrTime = flight.arrivalTime || 'N/A';

    const economyPrice = flight.prices?.economy || flight.price || 0;

    // ── TRACK FLIGHT ──
    const handleTrack = async () => {
        if (tracking) { setTracking(null); return; }
        setTrackLoading(true);
        setTrackError('');
        try {
            const res = await fetch(`/api/flights/track/${encodeURIComponent(flight.flightNumber)}`);
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Tracking unavailable');
            setTracking(data);
        } catch (err) {
            setTrackError(err.message);
        } finally {
            setTrackLoading(false);
        }
    };

    const statusColor = {
        active:     'bg-green-100 text-green-800',
        landed:     'bg-blue-100 text-blue-800',
        scheduled:  'bg-gray-100 text-gray-800',
        cancelled:  'bg-red-100 text-red-800',
        diverted:   'bg-orange-100 text-orange-800',
    }[tracking?.rawStatus] || 'bg-gray-100 text-gray-700';

    return (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-200">

            {/* SOURCE BADGE */}
            <div className={`px-4 py-1.5 flex items-center justify-between text-xs font-semibold ${
                isAmadeus ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
                <span>{isAmadeus ? '🌐 Real-time via Amadeus' : '🗄️ Database flight'}</span>
                {flight.stops === 0
                    ? <span className="bg-white/20 rounded px-2 py-0.5">Non-stop</span>
                    : <span className="bg-white/20 rounded px-2 py-0.5">{flight.stops} stop{flight.stops > 1 ? 's' : ''}</span>
                }
            </div>

            {/* MAIN CARD */}
            <div className="p-5">
                {/* Route + Times */}
                <div className="flex items-center justify-between mb-4">
                    <div className="text-center">
                        <p className="text-3xl font-extrabold text-gray-900">{depAirport}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{flight.departureCity || ''}</p>
                        <p className="text-lg font-bold text-blue-700 mt-1">{depTime}</p>
                    </div>

                    <div className="flex-1 mx-4 flex flex-col items-center">
                        <p className="text-xs text-gray-400 mb-1">{flight.duration || '—'}</p>
                        <div className="flex items-center w-full">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="mx-2 text-blue-500 text-lg">✈</span>
                            <div className="flex-1 h-px bg-gray-200" />
                        </div>
                        {flight.stops > 0 && (
                            <p className="text-xs text-orange-500 mt-1">{flight.stops} stop{flight.stops > 1 ? 's' : ''}</p>
                        )}
                    </div>

                    <div className="text-center">
                        <p className="text-3xl font-extrabold text-gray-900">{arrAirport}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{flight.destinationCity || ''}</p>
                        <p className="text-lg font-bold text-blue-700 mt-1">{arrTime}</p>
                    </div>
                </div>

                {/* Airline + Flight No */}
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-sm font-bold text-blue-700">
                        {(flight.airline || 'FL').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-800">{flight.airline || 'Unknown Airline'}</p>
                        <p className="text-xs text-gray-400">{flight.flightNumber}</p>
                    </div>
                    <div className="ml-auto text-right">
                        <p className="text-xs text-gray-400">From</p>
                        <p className="text-2xl font-extrabold text-blue-700">${economyPrice}</p>
                        <p className="text-xs text-gray-400">/ economy</p>
                    </div>
                </div>

                {/* SEGMENTS (expandable) */}
                {flight.segments?.length > 1 && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-xs text-blue-500 underline mb-3"
                    >
                        {expanded ? 'Hide' : 'Show'} segment details
                    </button>
                )}

                {expanded && flight.segments && (
                    <div className="mb-3 space-y-2">
                        {flight.segments.map((seg, i) => (
                            <div key={i} className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                                <span className="font-semibold">{seg.flightNumber}</span>
                                {' · '}
                                {seg.departure.airport} {new Date(seg.departure.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {' → '}
                                {seg.arrival.airport} {new Date(seg.arrival.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {' · '}{seg.duration}
                                {seg.departure.terminal && ` · Terminal ${seg.departure.terminal}`}
                            </div>
                        ))}
                    </div>
                )}

                {/* ACTIONS */}
                <div className="flex gap-2 mt-2">
                    {showTrack && flight.flightNumber && (
                        <button
                            onClick={handleTrack}
                            disabled={trackLoading}
                            className="flex-1 py-2 px-4 rounded-xl border border-blue-200 text-blue-700 text-sm font-semibold hover:bg-blue-50 transition-colors disabled:opacity-60"
                        >
                            {trackLoading ? '⏳ Tracking...' : tracking ? '✕ Hide Status' : '📡 Track Flight'}
                        </button>
                    )}
                    <button
                        onClick={() => onBook && onBook(flight)}
                        className="flex-1 py-2 px-4 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
                    >
                        Book →
                    </button>
                </div>

                {/* TRACKING PANEL */}
                {trackError && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                        ⚠️ {trackError}
                    </div>
                )}

                {tracking && (
                    <div className="mt-3 border border-gray-100 rounded-xl overflow-hidden">
                        <div className={`px-4 py-2 text-sm font-semibold ${statusColor}`}>
                            {tracking.status}
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <p className="text-gray-400 uppercase tracking-wide mb-1">Departure</p>
                                <p className="font-semibold text-gray-800">{tracking.departure.iata}</p>
                                <p className="text-gray-500">
                                    {tracking.departure.actual
                                        ? `Actual: ${new Date(tracking.departure.actual).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                        : tracking.departure.estimated
                                            ? `Est: ${new Date(tracking.departure.estimated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                            : tracking.departure.scheduled
                                                ? `Sched: ${new Date(tracking.departure.scheduled).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                                : 'N/A'
                                    }
                                </p>
                                <p className="text-gray-500">Terminal: {tracking.departure.terminal} · Gate: {tracking.departure.gate}</p>
                                {tracking.departure.delay !== 'None' && (
                                    <p className="text-orange-600 font-medium">Delay: {tracking.departure.delay}</p>
                                )}
                            </div>
                            <div>
                                <p className="text-gray-400 uppercase tracking-wide mb-1">Arrival</p>
                                <p className="font-semibold text-gray-800">{tracking.arrival.iata}</p>
                                <p className="text-gray-500">
                                    {tracking.arrival.estimated
                                        ? `Est: ${new Date(tracking.arrival.estimated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                        : tracking.arrival.scheduled
                                            ? `Sched: ${new Date(tracking.arrival.scheduled).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                            : 'N/A'
                                    }
                                </p>
                                <p className="text-gray-500">Terminal: {tracking.arrival.terminal}</p>
                                {tracking.arrival.baggage !== 'N/A' && (
                                    <p className="text-gray-500">Baggage: {tracking.arrival.baggage}</p>
                                )}
                                {tracking.arrival.delay !== 'None' && (
                                    <p className="text-orange-600 font-medium">Delay: {tracking.arrival.delay}</p>
                                )}
                            </div>
                            {tracking.live && (
                                <div className="col-span-2 bg-green-50 rounded-lg p-2">
                                    <p className="text-green-700 font-semibold">🛰 Live Position</p>
                                    <p className="text-green-600">
                                        Alt: {tracking.live.altitude?.toLocaleString()}ft ·
                                        Speed: {Math.round(tracking.live.speed || 0)} km/h ·
                                        {tracking.live.isGround ? ' On Ground' : ' Airborne'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
