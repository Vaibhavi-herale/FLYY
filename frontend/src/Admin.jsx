import { Fragment, useEffect, useState } from "react";
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export default function Admin() {
    const [flights, setFlights] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [refunds, setRefunds] = useState([]);
    const [activeTab, setActiveTab] = useState('flights');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loginParams, setLoginParams] = useState({ username: '', password: '' });
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [selectedUserStats, setSelectedUserStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const initialFormState = {
        flightNumber: '',
        airline: '',
        flightName: '',
        departureCity: '',
        departureAirport: '',
        destinationCity: '',
        destinationAirport: '',
        departureDate: '',
        departureTime: '',
        prices: { economy: '', business: '', first: '' },
        availableSeats: { economy: 60, business: 20, first: 10 }
    };

    const [formData, setFormData] = useState(initialFormState);
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (token) {
            setIsAuthenticated(true);
            fetchFlights(token);
            fetchBookings(token);
            fetchRefunds(token);
            fetchUsers(token);
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API}/api/admin/login`, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginParams)
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('adminToken', data.token);
                setIsAuthenticated(true);
                fetchFlights(data.token);
                fetchBookings(data.token);
                fetchRefunds(data.token);
                fetchUsers(data.token);
            } else {
                alert(data.message || 'Login failed');
            }
        } catch (error) {
            console.error("Login failed:", error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        setIsAuthenticated(false);
        setFlights([]);
        setBookings([]);
        setRefunds([]);
        setUsers([]);
        setSelectedUserStats(null);
    };

    const fetchFlights = async (token = localStorage.getItem('adminToken')) => {
        if (!token) return;
        try {
            const res = await fetch(`${API}/api/admin/flights`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setFlights(data.flights);
            } else {
                if (res.status === 401) handleLogout();
            }
        } catch (error) {
            console.error("Error fetching flights:", error);
        }
    };

    const fetchBookings = async (token = localStorage.getItem('adminToken')) => {
        if (!token) return;
        try {
            const res = await fetch(`${API}/api/admin/bookings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setBookings(data.bookings);
            }
        } catch (error) {
            console.error("Error fetching bookings:", error);
        }
    };

    const fetchRefunds = async (token = localStorage.getItem('adminToken')) => {
        if (!token) return;
        try {
            const res = await fetch(`${API}/api/admin/refunds`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setRefunds(data.refunds);
            }
        } catch (error) {
            console.error("Error fetching refunds:", error);
        }
    };

    const fetchUsers = async (token = localStorage.getItem('adminToken')) => {
        if (!token) return;
        try {
            setLoadingUsers(true);
            const res = await fetch(`${API}/api/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setUsers(data.users);
            } else {
                if (res.status === 401) handleLogout();
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoadingUsers(false);
        }
    };

    const toggleUserStatus = async (userId) => {
        try {
            const res = await fetch(`${API}/api/admin/users/${userId}/toggle-status`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
            });
            const data = await res.json();
            if (data.success) {
                setUsers(users.map(u => u._id === userId ? { ...u, isDisabled: data.user.isDisabled } : u));
                if (selectedUserStats && selectedUserStats.userId === userId) {
                    setSelectedUserStats(prev => ({ ...prev, isDisabled: data.user.isDisabled }));
                }
            } else {
                alert(data.message || 'Status toggle failed');
            }
        } catch (error) {
            console.error("Error toggling user status:", error);
        }
    };

    const viewUserStats = async (userId) => {
        if (selectedUserStats && selectedUserStats.userId === userId) {
            setSelectedUserStats(null);
            return;
        }
        try {
            setStatsLoading(true);
            const res = await fetch(`${API}/api/admin/users/${userId}/booking-stats`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
            });
            const data = await res.json();
            if (data.success) {
                setSelectedUserStats({ userId, ...data.stats });
            } else {
                alert(data.message || 'Error fetching stats');
            }
        } catch (error) {
            console.error("Error fetching user stats:", error);
        } finally {
            setStatsLoading(false);
        }
    };

    const deleteUser = async (userId) => {
        try {
            if (!window.confirm("Are you sure you want to permanently delete this user? All associated bookings will be unlinked.")) return;
            const res = await fetch(`${API}/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
            });
            const data = await res.json();
            if (data.success) {
                setUsers(users.filter(u => u._id !== userId));
                if (selectedUserStats && selectedUserStats.userId === userId) {
                    setSelectedUserStats(null);
                }
                alert('User deleted successfully.');
            } else {
                alert(data.message || 'User deletion failed');
            }
        } catch (error) {
            console.error("Error deleting user:", error);
        }
    };

    const handleApproveRefund = async (refundId) => {
        try {
            const res = await fetch(`${API}/api/refunds/${refundId}/approve`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                },
                body: JSON.stringify({ notes: 'Approved by admin' })
            });
            const data = await res.json();
            if (data.success) {
                fetchRefunds();
                alert('Refund approved successfully');
            } else {
                alert(data.message || 'Approval failed');
            }
        } catch (error) {
            console.error("Error approving refund:", error);
            alert('Approval failed');
        }
    };

    const handleRejectRefund = async (refundId) => {
        try {
            const reason = prompt('Enter rejection reason:');
            if (!reason) return;
            const res = await fetch(`${API}/api/refunds/${refundId}/reject`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                },
                body: JSON.stringify({ reason })
            });
            const data = await res.json();
            if (data.success) {
                fetchRefunds();
                alert('Refund rejected successfully');
            } else {
                alert(data.message || 'Rejection failed');
            }
        } catch (error) {
            console.error("Error rejecting refund:", error);
            alert('Rejection failed');
        }
    };

    const handleProcessRefund = async (refundId) => {
        try {
            if (!window.confirm("Are you sure you want to process this refund? This will call the Dodo Payments API.")) return;
            const res = await fetch(`${API}/api/refunds/${refundId}/process`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });
            const data = await res.json();
            if (data.success) {
                fetchRefunds();
                alert('Refund processed successfully');
            } else {
                alert(data.message || 'Processing failed');
            }
        } catch (error) {
            console.error("Error processing refund:", error);
            alert('Processing failed');
        }
    };

    const exportUsersCSV = () => {
        if (users.length === 0) {
            alert('No user records available to export.');
            return;
        }
        const headers = ['User ID', 'Name', 'Email', 'Status', 'Total Bookings', 'Total Spent', 'Registered Date'];
        const rows = users.map(u => [
            u._id,
            u.name,
            u.email,
            u.isDisabled ? 'Disabled' : 'Active',
            u.stats?.totalBookings || 0,
            u.stats?.totalSpent || 0,
            new Date(u.createdAt).toISOString()
        ]);
        
        let csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `users_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('price_')) {
            const field = name.split('_')[1];
            setFormData(prev => ({ ...prev, prices: { ...prev.prices, [field]: value } }));
        } else if (name.startsWith('seat_')) {
            const field = name.split('_')[1];
            setFormData(prev => ({ ...prev, availableSeats: { ...prev.availableSeats, [field]: value } }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
           const url = editingId
  ? `${API}/api/admin/flight/${editingId}`
  : `${API}/api/admin/flight`;

            const method = editingId ? "PUT" : "POST";

            await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                },
                body: JSON.stringify(formData)
            });

            setFormData(initialFormState);
            setEditingId(null);
            fetchFlights();
        } catch (error) {
            console.error("Error saving flight:", error);
        }
    };

    const handleEdit = (flight) => {
        setEditingId(flight._id);
        setFormData({
            flightNumber: flight.flightNumber || '',
            airline: flight.airline || '',
            flightName: flight.flightName || '',
            departureCity: flight.departureCity || '',
            departureAirport: flight.departureAirport || '',
            destinationCity: flight.destinationCity || '',
            destinationAirport: flight.destinationAirport || '',
            departureDate: flight.departureDate ? flight.departureDate.split('T')[0] : '',
            departureTime: flight.departureTime || '',

            prices: flight.prices || { economy: '', business: '', first: '' },
            availableSeats: flight.availableSeats || { economy: 60, business: 20, first: 10 }
        });
    };

    const deleteFlight = async (id) => {
        try {
            if (!window.confirm("Are you sure you want to delete this flight?")) return;
            await fetch(`${API}/api/admin/flight/${id}`, {
                method: "DELETE",
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });
            fetchFlights();
        } catch (error) {
            console.error("Error deleting flight:", error);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#050B14] relative">
                <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#00e5ff_1px,transparent_1px)] [background-size:20px_20px]"></div>
                <form onSubmit={handleLogin} className="bg-[#0A121F]/80 backdrop-blur-xl p-8 rounded-2xl shadow-[0_0_30px_rgba(0,229,255,0.1)] border border-[#00e5ff]/30 w-96 max-w-full relative z-10">
                    <h2 className="text-2xl font-bold mb-6 text-center text-white tracking-widest"><span className="text-[#00e5ff]">ADMIN</span> PORTAL</h2>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-[#00e5ff]/70 mb-1">Username</label>
                        <input
                            type="text"
                            required
                            value={loginParams.username}
                            onChange={e => setLoginParams({ ...loginParams, username: e.target.value })}
                            className="w-full p-2.5 bg-[#050B14] border border-[#00e5ff]/30 rounded-lg text-white focus:outline-none focus:border-[#00e5ff]/80 focus:shadow-[0_0_10px_rgba(0,229,255,0.2)]"
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-[#00e5ff]/70 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            value={loginParams.password}
                            onChange={e => setLoginParams({ ...loginParams, password: e.target.value })}
                            className="w-full p-2.5 bg-[#050B14] border border-[#00e5ff]/30 rounded-lg text-white focus:outline-none focus:border-[#00e5ff]/80 focus:shadow-[0_0_10px_rgba(0,229,255,0.2)]"
                        />
                    </div>
                    <button type="submit" className="w-full bg-[#00e5ff]/20 hover:bg-[#00e5ff]/40 text-[#00e5ff] border border-[#00e5ff]/50 font-medium py-2.5 px-4 rounded-lg transition shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                        Initialize Session
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050B14] text-[#e0e0e0] pb-10 relative">
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#00e5ff_1px,transparent_1px)] [background-size:20px_20px]"></div>
            
            <div className="p-6 max-w-7xl mx-auto relative z-10">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-white tracking-widest"><span className="text-[#00e5ff]">ADMIN</span> PANEL</h1>
                    <button onClick={handleLogout} className="px-4 py-2 border border-red-500/50 text-red-500 hover:bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)] rounded-lg transition text-sm font-medium">Terminate Session</button>
                </div>

                <div className="flex border-b border-[#00e5ff]/20 mb-6">
                    <button
                        onClick={() => setActiveTab('flights')}
                        className={`py-2 px-6 font-medium text-lg transition ${activeTab === 'flights' ? 'text-[#00e5ff] border-b-2 border-[#00e5ff] bg-[#00e5ff]/10 shadow-[0_0_15px_rgba(0,229,255,0.1)_inset]' : 'text-[#00e5ff]/50 hover:text-[#00e5ff] hover:bg-[#00e5ff]/5'}`}
                    >
                        Manage Flights
                    </button>
                    <button
                        onClick={() => { setActiveTab('bookings'); fetchBookings(); }}
                        className={`py-2 px-6 font-medium text-lg transition ${activeTab === 'bookings' ? 'text-[#00e5ff] border-b-2 border-[#00e5ff] bg-[#00e5ff]/10 shadow-[0_0_15px_rgba(0,229,255,0.1)_inset]' : 'text-[#00e5ff]/50 hover:text-[#00e5ff] hover:bg-[#00e5ff]/5'}`}
                    >
                        View Bookings
                    </button>
                    <button
                        onClick={() => { setActiveTab('refunds'); fetchRefunds(); }}
                        className={`py-2 px-6 font-medium text-lg transition ${activeTab === 'refunds' ? 'text-[#00e5ff] border-b-2 border-[#00e5ff] bg-[#00e5ff]/10 shadow-[0_0_15px_rgba(0,229,255,0.1)_inset]' : 'text-[#00e5ff]/50 hover:text-[#00e5ff] hover:bg-[#00e5ff]/5'}`}
                    >
                        Manage Refunds
                    </button>
                    <button
                        onClick={() => { setActiveTab('users'); fetchUsers(); }}
                        className={`py-2 px-6 font-medium text-lg transition ${activeTab === 'users' ? 'text-[#00e5ff] border-b-2 border-[#00e5ff] bg-[#00e5ff]/10 shadow-[0_0_15px_rgba(0,229,255,0.1)_inset]' : 'text-[#00e5ff]/50 hover:text-[#00e5ff] hover:bg-[#00e5ff]/5'}`}
                    >
                        Manage Users
                    </button>
                </div >

                {activeTab === 'flights' && (
                    <>
                        <div className="bg-[#0A121F]/80 backdrop-blur-xl p-6 rounded-2xl shadow-[0_0_20px_rgba(0,229,255,0.05)] mb-8 border border-[#00e5ff]/30">
                            <h2 className="text-xl font-semibold mb-6 flex items-center text-[#00e5ff] tracking-wider">
                                {editingId ? '> EDIT_FLIGHT_DATA' : '> ALLOCATE_NEW_FLIGHT'}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-[#00e5ff]/70 mb-1">Flight Number</label>
                                        <input required name="flightNumber" value={formData.flightNumber} onChange={handleChange} placeholder="e.g. AI-202" className="w-full bg-[#050B14] border border-[#00e5ff]/30 text-[#00e5ff] p-2.5 rounded-lg focus:outline-none focus:border-[#00e5ff]/80 focus:shadow-[0_0_10px_rgba(0,229,255,0.2)] placeholder-[#00e5ff]/30" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#00e5ff]/70 mb-1">Airline</label>
                                        <input required name="airline" value={formData.airline} onChange={handleChange} placeholder="e.g. Air India" className="w-full bg-[#050B14] border border-[#00e5ff]/30 text-[#00e5ff] p-2.5 rounded-lg focus:outline-none focus:border-[#00e5ff]/80 focus:shadow-[0_0_10px_rgba(0,229,255,0.2)] placeholder-[#00e5ff]/30" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#00e5ff]/70 mb-1">Flight Name</label>
                                        <input required name="flightName" value={formData.flightName} onChange={handleChange} placeholder="e.g. Boeing 777" className="w-full bg-[#050B14] border border-[#00e5ff]/30 text-[#00e5ff] p-2.5 rounded-lg focus:outline-none focus:border-[#00e5ff]/80 focus:shadow-[0_0_10px_rgba(0,229,255,0.2)] placeholder-[#00e5ff]/30" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[#00e5ff]/70 mb-1">Departure City</label>
                                        <input required name="departureCity" value={formData.departureCity} onChange={handleChange} placeholder="e.g. Mumbai" className="w-full bg-[#050B14] border border-[#00e5ff]/30 text-[#00e5ff] p-2.5 rounded-lg focus:outline-none focus:border-[#00e5ff]/80 focus:shadow-[0_0_10px_rgba(0,229,255,0.2)] placeholder-[#00e5ff]/30" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#00e5ff]/70 mb-1">Departure Airport</label>
                                        <input required name="departureAirport" value={formData.departureAirport} onChange={handleChange} placeholder="e.g. BOM" className="w-full bg-[#050B14] border border-[#00e5ff]/30 text-[#00e5ff] p-2.5 rounded-lg focus:outline-none focus:border-[#00e5ff]/80 focus:shadow-[0_0_10px_rgba(0,229,255,0.2)] placeholder-[#00e5ff]/30" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#00e5ff]/70 mb-1">Departure Date</label>
                                        <input required type="date" name="departureDate" value={formData.departureDate} onChange={handleChange} className="w-full bg-[#050B14] border border-[#00e5ff]/30 text-[#00e5ff] p-2.5 rounded-lg focus:outline-none focus:border-[#00e5ff]/80 focus:shadow-[0_0_10px_rgba(0,229,255,0.2)] css-date-icon-invert" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[#00e5ff]/70 mb-1">Destination City</label>
                                        <input required name="destinationCity" value={formData.destinationCity} onChange={handleChange} placeholder="e.g. Delhi" className="w-full bg-[#050B14] border border-[#00e5ff]/30 text-[#00e5ff] p-2.5 rounded-lg focus:outline-none focus:border-[#00e5ff]/80 focus:shadow-[0_0_10px_rgba(0,229,255,0.2)] placeholder-[#00e5ff]/30" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#00e5ff]/70 mb-1">Destination Airport</label>
                                        <input required name="destinationAirport" value={formData.destinationAirport} onChange={handleChange} placeholder="e.g. DEL" className="w-full bg-[#050B14] border border-[#00e5ff]/30 text-[#00e5ff] p-2.5 rounded-lg focus:outline-none focus:border-[#00e5ff]/80 focus:shadow-[0_0_10px_rgba(0,229,255,0.2)] placeholder-[#00e5ff]/30" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#00e5ff]/70 mb-1">Departure Time</label>
                                        <input required type="time" name="departureTime" value={formData.departureTime} onChange={handleChange} className="w-full bg-[#050B14] border border-[#00e5ff]/30 text-[#00e5ff] p-2.5 rounded-lg focus:outline-none focus:border-[#00e5ff]/80 focus:shadow-[0_0_10px_rgba(0,229,255,0.2)] css-date-icon-invert" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 mt-6 border-t border-[#00e5ff]/20">
                                    <div>
                                        <h3 className="font-medium text-[#00e5ff] mb-3 tracking-widest">TICKET_PRICES (₹/$)</h3>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-xs text-[#00e5ff]/70 mb-1">Economy</label>
                                                <input required type="number" name="price_economy" value={formData.prices.economy} onChange={handleChange} className="w-full bg-[#050B14] border border-[#00e5ff]/30 text-[#00e5ff] p-2.5 rounded-lg focus:outline-none focus:border-[#00e5ff]/80 focus:shadow-[0_0_10px_rgba(0,229,255,0.2)]" />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-[#00e5ff]/70 mb-1">Business</label>
                                                <input required type="number" name="price_business" value={formData.prices.business} onChange={handleChange} className="w-full bg-[#050B14] border border-[#00e5ff]/30 text-[#00e5ff] p-2.5 rounded-lg focus:outline-none focus:border-[#00e5ff]/80 focus:shadow-[0_0_10px_rgba(0,229,255,0.2)]" />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-[#00e5ff]/70 mb-1">First Class</label>
                                                <input required type="number" name="price_first" value={formData.prices.first} onChange={handleChange} className="w-full bg-[#050B14] border border-[#00e5ff]/30 text-[#00e5ff] p-2.5 rounded-lg focus:outline-none focus:border-[#00e5ff]/80 focus:shadow-[0_0_10px_rgba(0,229,255,0.2)]" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-medium text-[#00e5ff] mb-3 tracking-widest">AVAILABLE_SEATS</h3>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-xs text-[#00e5ff]/70 mb-1">Economy</label>
                                                <input required type="number" name="seat_economy" value={formData.availableSeats.economy} onChange={handleChange} className="w-full bg-[#050B14] border border-[#00e5ff]/30 text-[#00e5ff] p-2.5 rounded-lg focus:outline-none focus:border-[#00e5ff]/80 focus:shadow-[0_0_10px_rgba(0,229,255,0.2)]" />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-[#00e5ff]/70 mb-1">Business</label>
                                                <input required type="number" name="seat_business" value={formData.availableSeats.business} onChange={handleChange} className="w-full bg-[#050B14] border border-[#00e5ff]/30 text-[#00e5ff] p-2.5 rounded-lg focus:outline-none focus:border-[#00e5ff]/80 focus:shadow-[0_0_10px_rgba(0,229,255,0.2)]" />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-[#00e5ff]/70 mb-1">First Class</label>
                                                <input required type="number" name="seat_first" value={formData.availableSeats.first} onChange={handleChange} className="w-full bg-[#050B14] border border-[#00e5ff]/30 text-[#00e5ff] p-2.5 rounded-lg focus:outline-none focus:border-[#00e5ff]/80 focus:shadow-[0_0_10px_rgba(0,229,255,0.2)]" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-[#00e5ff]/20">
                                    {editingId && (
                                        <button type="button" onClick={() => { setEditingId(null); setFormData(initialFormState); }} className="px-5 py-2.5 bg-transparent text-[#00e5ff]/60 border border-[#00e5ff]/30 rounded-lg hover:bg-[#00e5ff]/10 hover:text-[#00e5ff] font-medium transition">
                                            Cancel
                                        </button>
                                    )}
                                    <button type="submit" className="bg-[#00e5ff]/20 hover:bg-[#00e5ff]/40 text-[#00e5ff] border border-[#00e5ff]/50 px-6 py-2.5 rounded-lg font-medium transition shadow-[0_0_15px_rgba(0,229,255,0.2)] tracking-wider">
                                        {editingId ? 'UPDATE_FLIGHT' : 'COMMIT_FLIGHT'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div className="bg-[#0A121F]/80 backdrop-blur-xl rounded-2xl shadow-[0_0_20px_rgba(0,229,255,0.05)] border border-[#00e5ff]/30 overflow-hidden">
                            <div className="px-6 py-5 border-b border-[#00e5ff]/20 bg-[#050B14]/50 flex justify-between items-center">
                                <h2 className="text-xl font-semibold text-[#00e5ff] tracking-wider">DATABASE_INDEX // FLIGHTS</h2>
                                <span className="bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/30 text-xs px-2.5 py-0.5 rounded-full font-medium">{flights.length} RECORDS</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-[#00e5ff]/20">
                                    <thead className="bg-[#050B14]/50 text-[#00e5ff]/70">
                                        <tr>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Flight Info</th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Route</th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Schedule</th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Seats Left</th>
                                            <th scope="col" className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#00e5ff]/10">
                                        {flights.map(f => (
                                            <tr key={f._id} className="hover:bg-[#00e5ff]/5 transition">
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <div className="text-sm font-semibold text-[#00e5ff] bg-[#00e5ff]/10 border border-[#00e5ff]/30 px-2 py-0.5 rounded inline-block mb-1">{f.flightNumber}</div>
                                                    <div className="text-sm font-medium text-gray-300">{f.airline}</div>
                                                    <div className="text-xs text-[#00e5ff]/50">{f.flightName}</div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="text-sm text-gray-200 flex items-center gap-2">
                                                        <span className="font-medium" title={f.departureCity}>{f.departureAirport}</span>
                                                        <span className="text-[#00e5ff]/50">→</span>
                                                        <span className="font-medium" title={f.destinationCity}>{f.destinationAirport}</span>
                                                    </div>
                                                    <div className="text-xs text-[#00e5ff]/50 mt-1">{f.departureCity} to {f.destinationCity}</div>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-300">{f.departureDate ? new Date(f.departureDate).toLocaleDateString() : ''}</div>
                                                    <div className="text-sm text-[#00e5ff] font-mono mt-1 bg-[#050B14] border border-[#00e5ff]/20 px-1.5 py-0.5 rounded inline-block">{f.departureTime}</div>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <div className="flex flex-col gap-1 text-sm bg-[#050B14] p-2.5 rounded-lg border border-[#00e5ff]/20">
                                                        <div className="flex justify-between w-24">
                                                            <span className="font-medium text-[#00e5ff]/60">Eco:</span>
                                                            <span className={`font-bold ${f.availableSeats?.economy === 0 ? 'text-red-400' : 'text-[#00e5ff]'}`}>{f.availableSeats?.economy || 0}</span>
                                                        </div>
                                                        <div className="flex justify-between w-24">
                                                            <span className="font-medium text-[#00e5ff]/60">Bus:</span>
                                                            <span className={`font-bold ${f.availableSeats?.business === 0 ? 'text-red-400' : 'text-[#00e5ff]'}`}>{f.availableSeats?.business || 0}</span>
                                                        </div>
                                                        <div className="flex justify-between w-24">
                                                            <span className="font-medium text-[#00e5ff]/60">First:</span>
                                                            <span className={`font-bold ${f.availableSeats?.first === 0 ? 'text-red-400' : 'text-[#00e5ff]'}`}>{f.availableSeats?.first || 0}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap text-center text-sm font-medium">
                                                    <div className="flex justify-center space-x-3">
                                                        <button onClick={() => handleEdit(f)} className="text-[#00e5ff] hover:text-[#00e5ff]/80 bg-[#00e5ff]/10 hover:bg-[#00e5ff]/20 border border-[#00e5ff]/30 px-3 py-1.5 rounded transition">Edit</button>
                                                        <button onClick={() => deleteFlight(f._id)} className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-3 py-1.5 rounded transition">Delete</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table >
                                {
                                    flights.length === 0 && (
                                        <div className="py-12 text-center text-gray-500 bg-[#1e1e1e]">
                                            <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                                            </svg>
                                            <p className="text-lg font-medium text-gray-400">No flights available</p>
                                            <p className="text-sm text-gray-500">Use the form above to add your first flight to the database.</p>
                                        </div>
                                    )
                                }
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'bookings' && (
                    <div className="bg-[#0A121F]/80 backdrop-blur-xl rounded-2xl shadow-[0_0_20px_rgba(0,229,255,0.05)] border border-[#00e5ff]/30 overflow-hidden">
                        <div className="px-6 py-5 border-b border-[#00e5ff]/20 bg-[#050B14]/50 flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-[#00e5ff] tracking-wider">DATABASE_INDEX // BOOKINGS</h2>
                            <span className="bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/30 text-xs px-2.5 py-1 rounded-full font-medium">{bookings.length} TOTAL</span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-[#00e5ff]/20">
                                <thead className="bg-[#050B14]/50 text-[#00e5ff]/70">
                                    <tr>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">PNR</th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Flight Info</th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Passenger Details</th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Revenue</th>
                                        <th scope="col" className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#00e5ff]/10">
                                    {bookings.map(b => (
                                        <tr key={b._id} className="hover:bg-[#00e5ff]/5 transition">
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="text-sm font-bold text-[#00e5ff] bg-[#00e5ff]/10 px-2 py-1 rounded inline-block tracking-wider border border-[#00e5ff]/30">{b.pnr}</div>
                                                <div className="text-xs text-[#00e5ff]/50 mt-2">{new Date(b.createdAt).toLocaleDateString()}</div>
                                            </td>
                                            <td className="px-6 py-5">
                                                {b.flight ? (
                                                    <>
                                                        <div className="text-sm font-semibold text-gray-200 mb-1">{b.flight.flightNumber}</div>
                                                        <div className="text-xs text-[#00e5ff]/60 whitespace-nowrap">{b.flight.departureAirport} → {b.flight.destinationAirport}</div>
                                                        <div className="text-xs text-[#00e5ff]/40 mt-1 capitalize">{b.cabinClass} Class</div>
                                                    </>
                                                ) : (
                                                    <span className="text-red-400 italic">Flight deleted</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-sm text-gray-300 font-medium mb-1 truncate max-w-[200px]" title={b.contactEmail}>
                                                    {b.contactEmail}
                                                </div>
                                                <div className="text-xs text-[#00e5ff] bg-[#050B14] inline-block px-2 py-0.5 rounded border border-[#00e5ff]/20">
                                                    {b.passengers?.length || 0} ticket(s)
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="text-sm font-bold text-[#00e5ff]">
                                                    ₹{b.totalAmount}
                                                </div>
                                                <div className="text-xs text-[#00e5ff]/50 mt-1 uppercase">
                                                    {b.payment?.paymentMethod || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-center">
                                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${b.bookingStatus === 'Confirmed' ? 'bg-[#00e5ff]/10 text-[#00e5ff] border-[#00e5ff]/30 shadow-[0_0_10px_rgba(0,229,255,0.2)]' : b.bookingStatus === 'Partially Cancelled' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                    {b.bookingStatus}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {bookings.length === 0 && (
                                <div className="py-12 text-center text-[#00e5ff]/40 bg-[#050B14]/30">
                                    <p className="text-lg font-medium text-[#00e5ff]/60 tracking-widest">NO_RECORDS_FOUND</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'refunds' && (
                    <div className="bg-[#0A121F]/80 backdrop-blur-xl rounded-2xl shadow-[0_0_20px_rgba(0,229,255,0.05)] border border-[#00e5ff]/30 overflow-hidden">
                        <div className="px-6 py-5 border-b border-[#00e5ff]/20 bg-[#050B14]/50 flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-[#00e5ff] tracking-wider">DATABASE_INDEX // REFUNDS</h2>
                            <span className="bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/30 text-xs px-2.5 py-1 rounded-full font-medium">{refunds.length} RECORDS</span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-[#00e5ff]/20">
                                <thead className="bg-[#050B14]/50 text-[#00e5ff]/70">
                                    <tr>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Refund ID</th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Booking ID</th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Amount</th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Reason</th>
                                        <th scope="col" className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#00e5ff]/10">
                                    {refunds.map(r => (
                                        <tr key={r._id} className="hover:bg-[#00e5ff]/5 transition">
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="text-sm font-bold text-[#00e5ff] bg-[#00e5ff]/10 px-2 py-1 rounded inline-block tracking-wider border border-[#00e5ff]/30">{r._id.substring(0, 8)}</div>
                                                <div className="text-xs text-[#00e5ff]/50 mt-2">{new Date(r.requestedAt).toLocaleDateString()}</div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-sm font-semibold text-gray-200 mb-1">{r.bookingId?.pnr || 'N/A'}</div>
                                                <div className="text-xs text-[#00e5ff]/60">{r.bookingId?._id?.substring(0, 8) || 'N/A'}</div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="text-sm font-bold text-[#00e5ff]">
                                                    ${r.refundAmount}
                                                </div>
                                                <div className="text-xs text-[#00e5ff]/50 mt-1">{r.refundPercentage}% of ${r.originalAmount}</div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${
                                                    r.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                    r.status === 'approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                    r.status === 'processed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    r.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                    'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                                }`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="text-sm text-gray-300">{r.reason.replace('_', ' ')}</div>
                                                {r.notes && <div className="text-xs text-[#00e5ff]/50 mt-1">{r.notes}</div>}
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-center text-sm font-medium">
                                                <div className="flex justify-center space-x-2">
                                                    {r.status === 'pending' && (
                                                        <>
                                                            <button 
                                                                onClick={() => handleApproveRefund(r._id)}
                                                                className="text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 px-3 py-1.5 rounded transition"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button 
                                                                onClick={() => handleRejectRefund(r._id)}
                                                                className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-3 py-1.5 rounded transition"
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}
                                                    {r.status === 'approved' && (
                                                        <button 
                                                            onClick={() => handleProcessRefund(r._id)}
                                                            className="text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 px-3 py-1.5 rounded transition"
                                                        >
                                                            Process
                                                        </button>
                                                    )}
                                                    {r.status === 'processed' && r.transactionId && (
                                                        <div className="text-xs text-[#00e5ff]/60 font-mono">{r.transactionId.substring(0, 12)}...</div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {refunds.length === 0 && (
                                <div className="py-12 text-center text-[#00e5ff]/40 bg-[#050B14]/30">
                                    <p className="text-lg font-medium text-[#00e5ff]/60 tracking-widest">NO_REFUNDS_FOUND</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="bg-[#0A121F]/80 backdrop-blur-xl rounded-2xl shadow-[0_0_20px_rgba(0,229,255,0.05)] border border-[#00e5ff]/30 overflow-hidden">
                        <div className="px-6 py-5 border-b border-[#00e5ff]/20 bg-[#050B14]/50 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-semibold text-[#00e5ff] tracking-wider">DATABASE_INDEX // USERS</h2>
                                <span className="bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/30 text-xs px-2.5 py-1 rounded-full font-medium">{users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()) || u._id.toLowerCase().includes(searchQuery.toLowerCase())).length} OF {users.length} RECORDS</span>
                            </div>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <input
                                    type="text"
                                    placeholder="Search by Name, Email or ID..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full md:w-64 bg-[#050B14] border border-[#00e5ff]/30 text-[#00e5ff] px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:border-[#00e5ff]/80 placeholder-[#00e5ff]/30"
                                />
                                <button
                                    onClick={exportUsersCSV}
                                    className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-lg text-sm transition font-medium whitespace-nowrap"
                                >
                                    Export CSV
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-[#00e5ff]/20">
                                <thead className="bg-[#050B14]/50 text-[#00e5ff]/70">
                                    <tr>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">User Info</th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Bookings Count</th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Revenue</th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Registered</th>
                                        <th scope="col" className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#00e5ff]/10">
                                    {loadingUsers ? (
                                        <tr>
                                            <td colSpan="6" className="py-12 text-center text-[#00e5ff]/40">
                                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00e5ff]"></div>
                                                <p className="mt-2 text-sm">Querying database records...</p>
                                            </td>
                                        </tr>
                                    ) : users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()) || u._id.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="py-12 text-center text-[#00e5ff]/40">
                                                <p className="text-lg font-medium text-[#00e5ff]/60 tracking-widest">NO_RECORDS_FOUND</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()) || u._id.toLowerCase().includes(searchQuery.toLowerCase())).map(u => {
                                            const isExpanded = selectedUserStats && selectedUserStats.userId === u._id;
                                            return (
                                                <Fragment key={u._id}>
                                                    <tr className="hover:bg-[#00e5ff]/5 transition">
                                                        <td className="px-6 py-5 whitespace-nowrap">
                                                            <div className="text-sm font-semibold text-white">{u.name}</div>
                                                            <div className="text-sm text-gray-300">{u.email}</div>
                                                            <div className="text-xs text-[#00e5ff]/40 font-mono mt-0.5">{u._id}</div>
                                                        </td>
                                                        <td className="px-6 py-5 whitespace-nowrap">
                                                            <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${u.isDisabled ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                                                                {u.isDisabled ? 'Disabled' : 'Active'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-5 whitespace-nowrap">
                                                            <div className="text-sm text-gray-300 font-medium font-mono">{u.stats?.totalBookings || 0}</div>
                                                        </td>
                                                        <td className="px-6 py-5 whitespace-nowrap">
                                                            <div className="text-sm font-bold text-[#00e5ff] font-mono">₹{u.stats?.totalSpent || 0}</div>
                                                        </td>
                                                        <td className="px-6 py-5 whitespace-nowrap">
                                                            <div className="text-sm text-gray-300">{new Date(u.createdAt).toLocaleDateString()}</div>
                                                        </td>
                                                        <td className="px-6 py-5 whitespace-nowrap text-center text-sm font-medium">
                                                            <div className="flex justify-center space-x-2">
                                                                <button
                                                                    onClick={() => viewUserStats(u._id)}
                                                                    className={`px-3 py-1.5 rounded transition border ${isExpanded ? 'bg-[#00e5ff]/25 text-[#00e5ff] border-[#00e5ff]' : 'text-[#00e5ff] hover:text-[#00e5ff]/80 bg-[#00e5ff]/10 hover:bg-[#00e5ff]/20 border-[#00e5ff]/30'}`}
                                                                >
                                                                    {statsLoading && isExpanded ? 'Loading...' : isExpanded ? 'Hide Stats' : 'Stats'}
                                                                </button>
                                                                <button
                                                                    onClick={() => toggleUserStatus(u._id)}
                                                                    className={`px-3 py-1.5 rounded transition border ${u.isDisabled ? 'text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 border-green-500/30' : 'text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border-red-500/30'}`}
                                                                >
                                                                    {u.isDisabled ? 'Enable' : 'Disable'}
                                                                </button>
                                                                <button
                                                                    onClick={() => deleteUser(u._id)}
                                                                    className="text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3 py-1.5 rounded transition"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    
                                                    {isExpanded && (
                                                        <tr>
                                                            <td colSpan="6" className="bg-[#050B14]/60 p-6 border-l-2 border-[#00e5ff]">
                                                                <div className="space-y-6">
                                                                    <h3 className="text-sm font-semibold text-[#00e5ff] tracking-widest uppercase mb-4">&gt; USER_BOOKING_METRICS</h3>
                                                                    
                                                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                                        <div className="bg-[#0A121F] p-4 rounded-xl border border-[#00e5ff]/20 shadow-[0_0_10px_rgba(0,229,255,0.02)]">
                                                                            <div className="text-xs text-[#00e5ff]/60 uppercase tracking-wider mb-1">Total Bookings</div>
                                                                            <div className="text-xl font-bold font-mono text-white">{selectedUserStats.totalBookings}</div>
                                                                        </div>
                                                                        <div className="bg-[#0A121F] p-4 rounded-xl border border-[#00e5ff]/20 shadow-[0_0_10px_rgba(0,229,255,0.02)]">
                                                                            <div className="text-xs text-green-400/60 uppercase tracking-wider mb-1">Confirmed</div>
                                                                            <div className="text-xl font-bold font-mono text-green-400">{selectedUserStats.confirmedBookings}</div>
                                                                        </div>
                                                                        <div className="bg-[#0A121F] p-4 rounded-xl border border-[#00e5ff]/20 shadow-[0_0_10px_rgba(0,229,255,0.02)]">
                                                                            <div className="text-xs text-red-400/60 uppercase tracking-wider mb-1">Cancelled</div>
                                                                            <div className="text-xl font-bold font-mono text-red-400">{selectedUserStats.cancelledBookings}</div>
                                                                        </div>
                                                                        <div className="bg-[#0A121F] p-4 rounded-xl border border-[#00e5ff]/20 shadow-[0_0_10px_rgba(0,229,255,0.02)]">
                                                                            <div className="text-xs text-[#00e5ff]/60 uppercase tracking-wider mb-1">Total Contribution</div>
                                                                            <div className="text-xl font-bold font-mono text-[#00e5ff]">₹{selectedUserStats.totalSpent}</div>
                                                                        </div>
                                                                    </div>

                                                                    <div>
                                                                        <h4 className="text-xs font-semibold text-[#00e5ff]/80 uppercase tracking-wider mb-3">Recent Booking Records (Last 5)</h4>
                                                                        {selectedUserStats.recentBookings && selectedUserStats.recentBookings.length > 0 ? (
                                                                            <div className="overflow-x-auto border border-[#00e5ff]/10 rounded-lg">
                                                                                <table className="min-w-full divide-y divide-[#00e5ff]/10 text-left text-xs bg-[#0A121F]/50">
                                                                                    <thead className="bg-[#050B14]/40 text-[#00e5ff]/60">
                                                                                        <tr>
                                                                                            <th className="px-4 py-2 uppercase font-semibold">PNR</th>
                                                                                            <th className="px-4 py-2 uppercase font-semibold">Flight</th>
                                                                                            <th className="px-4 py-2 uppercase font-semibold">Route</th>
                                                                                            <th className="px-4 py-2 uppercase font-semibold">Class</th>
                                                                                            <th className="px-4 py-2 uppercase font-semibold">Amount</th>
                                                                                            <th className="px-4 py-2 uppercase font-semibold">Status</th>
                                                                                            <th className="px-4 py-2 uppercase font-semibold">Date</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody className="divide-y divide-[#00e5ff]/5">
                                                                                        {selectedUserStats.recentBookings.map(b => (
                                                                                            <tr key={b._id} className="hover:bg-[#00e5ff]/5 transition">
                                                                                                <td className="px-4 py-3 font-bold text-[#00e5ff] tracking-wider">{b.pnr}</td>
                                                                                                <td className="px-4 py-3">{b.flight ? b.flight.flightNumber : 'Deleted'}</td>
                                                                                                <td className="px-4 py-3">{b.flight ? `${b.flight.departureAirport} → ${b.flight.destinationAirport}` : 'N/A'}</td>
                                                                                                <td className="px-4 py-3 capitalize">{b.cabinClass}</td>
                                                                                                <td className="px-4 py-3 font-mono font-semibold">₹{b.totalAmount}</td>
                                                                                                <td className="px-4 py-3">
                                                                                                    <span className={`px-2 py-0.5 rounded-full border text-[10px] ${b.bookingStatus === 'Confirmed' ? 'bg-[#00e5ff]/10 text-[#00e5ff] border-[#00e5ff]/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                                                                        {b.bookingStatus}
                                                                                                    </span>
                                                                                                </td>
                                                                                                <td className="px-4 py-3 text-[#00e5ff]/50">{new Date(b.createdAt).toLocaleDateString()}</td>
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                        ) : (
                                                                            <p className="text-sm text-[#00e5ff]/40 italic">No bookings registered for this account.</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <style dangerouslySetInnerHTML={{
                    __html: `
                .css-date-icon-invert::-webkit-calendar-picker-indicator {
                    filter: invert(1);
                }
                `}} />
            </div>
        </div>
    );
}