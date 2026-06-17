import React, { useState } from 'react';

export default function TrackFlightPanel() {
    const [flightNumber, setFlightNumber] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleTrack = async (e) => {
        e.preventDefault();
        if (!flightNumber.trim()) return;

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const res = await fetch(`/api/flights/track/${encodeURIComponent(flightNumber.trim().toUpperCase())}`);
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'No data found');
            setResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const statusStyles = {
        active:    { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-800',  dot: 'bg-green-500'  },
        landed:    { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-800',   dot: 'bg-blue-500'   },
        scheduled: { bg: 'bg-gray-50',   border: 'border-gray-200',   text: 'text-gray-700',   dot: 'bg-gray-400'   },
        cancelled: { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-800',    dot: 'bg-red-500'    },
        diverted:  { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', dot: 'bg-orange-500' },
    };
    const style = statusStyles[result?.rawStatus] || statusStyles.scheduled;

    function fmtTime(ts) {
        if (!ts) return '—';
        return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 max-w-lg mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Live Flight Tracker</h2>
            <p className="text-sm text-gray-500 mb-5">Enter IATA flight number (e.g. AI302, EK501, 6E341)</p>

            {/* Search form */}
            <form onSubmit={handleTrack} className="flex gap-2 mb-5">
                <input
                    type="text"
                    value={flightNumber}
                    onChange={e => setFlightNumber(e.target.value)}
                    placeholder="e.g. AI302"
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono uppercase placeholder:normal-case placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-blue-300"
                    maxLength={8}
                />
                <button
                    type="submit"
                    disabled={loading || !flightNumber.trim()}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                    {loading ? '⏳' : '📡 Track'}
                </button>
            </form>

            {/* Error */}
            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-4">
                    ⚠️ {error}
                </div>
            )}

            {/* Result */}
            {result && (
                <div className={`rounded-xl border ${style.border} ${style.bg} overflow-hidden`}>
                    {/* Header */}
                    <div className="px-5 py-3 flex items-center justify-between">
                        <div>
                            <p className="text-lg font-extrabold text-gray-900">{result.flightNumber}</p>
                            <p className="text-sm text-gray-500">{result.airline}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${style.dot} ${result.rawStatus === 'active' ? 'animate-pulse' : ''}`} />
                            <span className={`text-sm font-semibold ${style.text}`}>{result.status}</span>
                        </div>
                    </div>

                    {/* Route */}
                    <div className="px-5 py-3 border-t border-white/60 flex items-center gap-3">
                        <div className="text-center flex-1">
                            <p className="text-2xl font-extrabold text-gray-900">{result.departure.iata}</p>
                            <p className="text-xs text-gray-500 truncate max-w-[100px]">{result.departure.airport}</p>
                        </div>
                        <div className="flex-1 flex flex-col items-center">
                            <span className="text-blue-400 text-xl">✈</span>
                        </div>
                        <div className="text-center flex-1">
                            <p className="text-2xl font-extrabold text-gray-900">{result.arrival.iata}</p>
                            <p className="text-xs text-gray-500 truncate max-w-[100px]">{result.arrival.airport}</p>
                        </div>
                    </div>

                    {/* Details grid */}
                    <div className="px-5 py-3 border-t border-white/60 grid grid-cols-2 gap-3 text-xs">
                        <div>
                            <p className="text-gray-400 uppercase tracking-wide font-medium mb-1">Departure</p>
                            <p className="font-semibold text-gray-800">
                                {result.departure.actual ? `Actual: ${fmtTime(result.departure.actual)}` :
                                 result.departure.estimated ? `Est: ${fmtTime(result.departure.estimated)}` :
                                 `Sched: ${fmtTime(result.departure.scheduled)}`}
                            </p>
                            <p className="text-gray-500">Terminal {result.departure.terminal} · Gate {result.departure.gate}</p>
                            {result.departure.delay !== 'None' && (
                                <p className="text-orange-600 font-semibold mt-0.5">⚠ Delay: {result.departure.delay}</p>
                            )}
                        </div>
                        <div>
                            <p className="text-gray-400 uppercase tracking-wide font-medium mb-1">Arrival</p>
                            <p className="font-semibold text-gray-800">
                                {result.arrival.estimated ? `Est: ${fmtTime(result.arrival.estimated)}` :
                                 `Sched: ${fmtTime(result.arrival.scheduled)}`}
                            </p>
                            <p className="text-gray-500">Terminal {result.arrival.terminal}</p>
                            {result.arrival.baggage !== 'N/A' && (
                                <p className="text-gray-500">Baggage: {result.arrival.baggage}</p>
                            )}
                            {result.arrival.delay !== 'None' && (
                                <p className="text-orange-600 font-semibold mt-0.5">⚠ Delay: {result.arrival.delay}</p>
                            )}
                        </div>
                    </div>

                    {/* Live data */}
                    {result.live && (
                        <div className="px-5 py-3 border-t border-white/60">
                            <p className="text-xs font-semibold text-green-700 mb-2">🛰 Live Telemetry</p>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="bg-white/70 rounded-lg p-2 text-center">
                                    <p className="text-gray-400">Altitude</p>
                                    <p className="font-bold text-gray-800">{result.live.altitude?.toLocaleString() || '—'} ft</p>
                                </div>
                                <div className="bg-white/70 rounded-lg p-2 text-center">
                                    <p className="text-gray-400">Speed</p>
                                    <p className="font-bold text-gray-800">{Math.round(result.live.speed || 0)} km/h</p>
                                </div>
                                <div className="bg-white/70 rounded-lg p-2 text-center">
                                    <p className="text-gray-400">Position</p>
                                    <p className="font-bold text-gray-800">{result.live.isGround ? 'Ground' : 'Airborne'}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
