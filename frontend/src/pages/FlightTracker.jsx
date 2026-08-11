import { useState, useEffect } from 'react';
import { Plane, AlertTriangle, CheckCircle, MapPin, Clock } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix plane icon using divIcon
const planeIcon = L.divIcon({
    html: `<div style="font-size: 28px; transform: rotate(45deg); display: inline-block; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">✈️</div>`,
    className: 'custom-plane-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
});

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function FlightTracker() {
    const [flightStatus, setFlightStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState('');
    const flightId = new URLSearchParams(window.location.search).get('flight_id');

    useEffect(() => {
        if (flightId) {
            fetchFlightStatus();
        } else {
            setLoading(false);
        }
    }, [flightId]);

    useEffect(() => {
        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            if (flightId) fetchFlightStatus();
        }, 30000);
        return () => clearInterval(interval);
    }, [flightId]);

    const fetchFlightStatus = async () => {
        try {
            setLoading(true);
            // Try live tracking first
            const liveRes = await fetch(`${API}/api/tracking/live/${flightId}`);
            const liveData = await liveRes.json();
            if (liveData.success && liveData.status) {
                const mapped = {
                    flightNumber: liveData.flightNumber || flightId,
                    currentStatus: liveData.status === 'active' ? 'in_flight' : liveData.status,
                    airline: liveData.airline,
                    scheduledDeparture: liveData.departure?.scheduled,
                    estimatedDeparture: liveData.departure?.scheduled,
                    scheduledArrival: liveData.arrival?.scheduled,
                    estimatedArrival: liveData.arrival?.scheduled,
                    gate: liveData.departure?.gate,
                    terminal: liveData.departure?.terminal || liveData.arrival?.terminal,
                    delayMinutes: liveData.departure?.delay || liveData.arrival?.delay || 0,
                    bagageCarousel: liveData.arrival?.baggage,
                    live: liveData.live,
                    departureAirport: liveData.departure?.airport,
                    destinationAirport: liveData.arrival?.airport
                };
                setFlightStatus(mapped);
                setLoading(false);
                return;
            }
        } catch (error) {
            console.error('Error fetching live flight status, trying local:', error);
        }

        // Fallback to local
        try {
            const res = await fetch(`${API}/api/tracking/flight/${flightId}`);
            const data = await res.json();
            if (data.success) {
                setFlightStatus(data.status);
            }
        } catch (error) {
            console.error('Error fetching flight status:', error);
        } finally {
            setLoading(false);
        }
    };

    const searchFlight = async (e) => {
        e.preventDefault();
        if (!searchInput) return;
        try {
            setLoading(true);
            // Try live tracking first
            const liveRes = await fetch(`${API}/api/tracking/live/${searchInput.trim().toUpperCase()}`);
            const liveData = await liveRes.json();
            if (liveData.success && liveData.status) {
                const mapped = {
                    flightNumber: liveData.flightNumber || searchInput.trim().toUpperCase(),
                    currentStatus: liveData.status === 'active' ? 'in_flight' : liveData.status,
                    airline: liveData.airline,
                    scheduledDeparture: liveData.departure?.scheduled,
                    estimatedDeparture: liveData.departure?.scheduled,
                    scheduledArrival: liveData.arrival?.scheduled,
                    estimatedArrival: liveData.arrival?.scheduled,
                    gate: liveData.departure?.gate,
                    terminal: liveData.departure?.terminal || liveData.arrival?.terminal,
                    delayMinutes: liveData.departure?.delay || liveData.arrival?.delay || 0,
                    bagageCarousel: liveData.arrival?.baggage,
                    live: liveData.live,
                    departureAirport: liveData.departure?.airport,
                    destinationAirport: liveData.arrival?.airport
                };
                setFlightStatus(mapped);
                setLoading(false);
                return;
            }
        } catch (error) {
            console.error('Error searching live flight, trying local:', error);
        }

        // Local fallback
        try {
            const res = await fetch(`${API}/api/tracking/flight-number/${searchInput.trim().toUpperCase()}`);
            const data = await res.json();
            if (data.success) {
                setFlightStatus(data.status);
            }
        } catch (error) {
            console.error('Error searching flight:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'scheduled':
                return 'text-sky-700';
            case 'delayed':
                return 'text-yellow-600';
            case 'cancelled':
                return 'text-red-600';
            case 'boarding':
            case 'departed':
                return 'text-green-600';
            case 'in_flight':
                return 'text-purple-600';
            case 'landed':
                return 'text-green-600';
            case 'diverted':
                return 'text-orange-600';
            default:
                return 'text-[#000080]';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'delayed':
            case 'diverted':
                return <AlertTriangle size={24} />;
            case 'landed':
            case 'departed':
            case 'boarding':
                return <CheckCircle size={24} />;
            default:
                return <Plane size={24} />;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-6">✈️ Flight Tracker</h1>
                    <form onSubmit={searchFlight} className="flex gap-2">
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search by flight number (e.g., AA100)"
                            className="flex-1 px-4 py-2 rounded border border-gray-300"
                        />
                        <button
                            type="submit"
                            className="bg-sky-600 text-[#000080] px-6 py-2 rounded hover:bg-sky-700"
                        >
                            Search
                        </button>
                    </form>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Loading flight information...</p>
                    </div>
                ) : flightStatus ? (
                    <div className="bg-[#f0f8ff] rounded-lg shadow-lg overflow-hidden">
                        {/* Header */}
                        <div className={`p-6 ${getStatusColor(flightStatus.currentStatus).replace('text-', 'bg-')} bg-opacity-10`}>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className={`${getStatusColor(flightStatus.currentStatus)}`}>
                                        {getStatusIcon(flightStatus.currentStatus)}
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-bold">{flightStatus.flightNumber}</h2>
                                        <p className="text-lg font-semibold capitalize">{flightStatus.currentStatus.replace('_', ' ')}</p>
                                    </div>
                                </div>
                                {flightStatus.delayMinutes > 0 && (
                                    <div className="bg-yellow-100 border border-yellow-400 p-3 rounded">
                                        <p className="font-bold text-yellow-800">⚠️ {flightStatus.delayMinutes} min delay</p>
                                        <p className="text-sm text-yellow-700">{flightStatus.delayReason}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Route Information */}
                        <div className="grid grid-cols-2 gap-6 p-6 border-b">
                            <div>
                                <p className="text-sm text-[#000080] mb-2">DEPARTURE</p>
                                <p className="text-2xl font-bold">
                                    {flightStatus.flightId?.departureCity || flightStatus.departureAirport || 'TBD'}
                                </p>
                                <p className="text-[#000080] mt-2">
                                    {flightStatus.scheduledDeparture
                                        ? new Date(flightStatus.scheduledDeparture).toLocaleString()
                                        : 'TBD'
                                    }
                                </p>
                                {flightStatus.gate && (
                                    <p className="text-sm text-[#000080] mt-2">Gate: {flightStatus.gate}</p>
                                )}
                            </div>
                            <div>
                                <p className="text-sm text-[#000080] mb-2">ARRIVAL</p>
                                <p className="text-2xl font-bold">
                                    {flightStatus.flightId?.destinationCity || flightStatus.destinationAirport || 'TBD'}
                                </p>
                                <p className="text-[#000080] mt-2">
                                    {flightStatus.estimatedArrival
                                        ? new Date(flightStatus.estimatedArrival).toLocaleString()
                                        : 'TBD'
                                    }
                                </p>
                            </div>
                        </div>

                        {/* Interactive Live Tracking Map */}
                        {flightStatus.live && flightStatus.live.latitude && flightStatus.live.longitude && (
                            <div className="p-6 border-b bg-indigo-50/50">
                                <p className="text-sm font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </span>
                                    LIVE TELEMETRY & FLIGHT PATH
                                </p>
                                <div className="h-[350px] w-full rounded-xl overflow-hidden border-2 border-indigo-200 shadow-lg relative z-0">
                                    <MapContainer 
                                        center={[flightStatus.live.latitude, flightStatus.live.longitude]} 
                                        zoom={6} 
                                        scrollWheelZoom={false}
                                        style={{ height: '100%', width: '100%' }}
                                    >
                                        <TileLayer
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        />
                                        <Marker 
                                            position={[flightStatus.live.latitude, flightStatus.live.longitude]}
                                            icon={planeIcon}
                                        >
                                            <Popup>
                                                <div className="text-sm p-1">
                                                    <p className="font-bold text-indigo-900">{flightStatus.flightNumber}</p>
                                                    <p className="mt-1">✈️ <strong>Altitude:</strong> {flightStatus.live.altitude ? `${flightStatus.live.altitude.toLocaleString()} ft` : 'N/A'}</p>
                                                    <p>🚀 <strong>Speed:</strong> {flightStatus.live.speed ? `${flightStatus.live.speed} mph` : 'N/A'}</p>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    </MapContainer>
                                </div>
                                <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                                    <div className="bg-[#f0f8ff] p-3 rounded-lg border border-indigo-100 shadow-sm">
                                        <p className="text-xs text-gray-500 font-medium">Altitude</p>
                                        <p className="font-extrabold text-indigo-900 mt-0.5">
                                            {flightStatus.live.altitude ? `${flightStatus.live.altitude.toLocaleString()} ft` : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="bg-[#f0f8ff] p-3 rounded-lg border border-indigo-100 shadow-sm">
                                        <p className="text-xs text-gray-500 font-medium">Ground Speed</p>
                                        <p className="font-extrabold text-indigo-900 mt-0.5">
                                            {flightStatus.live.speed ? `${flightStatus.live.speed} mph` : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="bg-[#f0f8ff] p-3 rounded-lg border border-indigo-100 shadow-sm">
                                        <p className="text-xs text-gray-500 font-medium">Coordinates</p>
                                        <p className="font-extrabold text-indigo-900 mt-1 text-[10px] sm:text-xs">
                                            {flightStatus.live.latitude.toFixed(4)}°, {flightStatus.live.longitude.toFixed(4)}°
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Additional Details */}
                        <div className="grid grid-cols-2 gap-4 p-6 bg-gray-50">
                            {flightStatus.terminal && (
                                <div>
                                    <p className="text-sm text-[#000080]">Terminal</p>
                                    <p className="font-semibold">{flightStatus.terminal}</p>
                                </div>
                            )}
                            {flightStatus.aircraft && (
                                <div>
                                    <p className="text-sm text-[#000080]">Aircraft</p>
                                    <p className="font-semibold">{flightStatus.aircraft}</p>
                                </div>
                            )}
                            {flightStatus.weather && (
                                <div>
                                    <p className="text-sm text-[#000080]">Weather</p>
                                    <p className="font-semibold">{flightStatus.weather.condition || 'Clear'}</p>
                                </div>
                            )}
                            {flightStatus.bagageCarousel && (
                                <div>
                                    <p className="text-sm text-[#000080]">Baggage Carousel</p>
                                    <p className="font-semibold">{flightStatus.bagageCarousel}</p>
                                </div>
                            )}
                        </div>

                        {/* Cancellation Info */}
                        {flightStatus.cancellation && (
                            <div className="p-6 bg-red-50 border-t border-red-200">
                                <p className="text-red-800 font-semibold">Flight Cancelled</p>
                                <p className="text-red-700">Reason: {flightStatus.cancellation.reason}</p>
                            </div>
                        )}

                        {/* Diversion Info */}
                        {flightStatus.diversion && (
                            <div className="p-6 bg-orange-50 border-t border-orange-200">
                                <p className="text-orange-800 font-semibold">Flight Diverted</p>
                                <p className="text-orange-700">Diverted to: {flightStatus.diversion.airport}</p>
                                <p className="text-orange-700">Reason: {flightStatus.diversion.reason}</p>
                            </div>
                        )}

                        {/* Last Updated */}
                        <div className="p-4 text-center border-t bg-gray-50">
                            <p className="text-sm text-gray-500">
                                {flightStatus.lastUpdated || flightStatus.updatedAt
                                    ? `Last updated: ${new Date(flightStatus.lastUpdated || flightStatus.updatedAt).toLocaleString()}`
                                    : flightStatus.live ? '🔴 Live data stream active' : 'Data from local records'
                                }
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-[#f0f8ff] p-8 rounded-lg shadow text-center">
                        <p className="text-gray-500">No flight information found</p>
                    </div>
                )}
            </div>
        </div>
    );
}