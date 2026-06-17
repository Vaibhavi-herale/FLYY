import { useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Auth({ onAuthSuccess }) {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!isLogin && password !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        const endpoint = isLogin ? '/api/users/login' : '/api/users/register';
        const payload = isLogin 
            ? { email, password } 
            : { name, email, password, confirmPassword };

        try {
            const res = await fetch(`${API}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (data.success) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                onAuthSuccess(data.token, data.user);
            } else {
                setError(data.message || 'An error occurred. Please try again.');
            }
        } catch (err) {
            console.error('Auth error:', err);
            setError('Network error. Is the backend server running?');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-[#050B14] items-center justify-center p-4 selection:bg-[#00e5ff]/30 text-[#e0e0e0] font-sans relative overflow-hidden">
            {/* Background cyber grid effect */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#00e5ff_1px,transparent_1px)] [background-size:20px_20px]"></div>
            
            {/* Ambient glow blobs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00e5ff]/5 rounded-full filter blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00e5ff]/5 rounded-full filter blur-[100px] pointer-events-none"></div>

            <div className="w-full max-w-md bg-[#0A121F]/60 backdrop-blur-2xl border border-[#00e5ff]/30 rounded-2xl p-6 sm:p-8 shadow-[0_0_30px_rgba(0,229,255,0.05)] relative z-10">
                <div className="text-center mb-8">
                    <span className="text-4xl">✈️</span>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-3 tracking-wide">
                        FlightAgent AI
                    </h2>
                    <p className="text-xs text-[#00e5ff]/70 font-mono tracking-widest mt-1 uppercase">
                        {isLogin ? 'Secure Access Portal' : 'Register New Cadet'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-xs rounded-lg p-3 mb-6 flex items-start gap-2">
                        <span className="text-sm">⚠️</span>
                        <span className="leading-tight">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {!isLogin && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your Name"
                                className="w-full bg-[#070e17] border border-[#00e5ff]/20 text-[#00e5ff] text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-[#00e5ff]/60 focus:shadow-[0_0_8px_rgba(0,229,255,0.2)] placeholder-[#00e5ff]/30 transition"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="pilot@starfleet.com"
                            className="w-full bg-[#070e17] border border-[#00e5ff]/20 text-[#00e5ff] text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-[#00e5ff]/60 focus:shadow-[0_0_8px_rgba(0,229,255,0.2)] placeholder-[#00e5ff]/30 transition"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-[#070e17] border border-[#00e5ff]/20 text-[#00e5ff] text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-[#00e5ff]/60 focus:shadow-[0_0_8px_rgba(0,229,255,0.2)] placeholder-[#00e5ff]/30 transition"
                        />
                    </div>

                    {!isLogin && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Confirm Password</label>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-[#070e17] border border-[#00e5ff]/20 text-[#00e5ff] text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-[#00e5ff]/60 focus:shadow-[0_0_8px_rgba(0,229,255,0.2)] placeholder-[#00e5ff]/30 transition"
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#00e5ff]/10 hover:bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40 shadow-[0_0_12px_rgba(0,229,255,0.1)] hover:shadow-[0_0_16px_rgba(0,229,255,0.2)] font-bold py-3 rounded-lg transition-all text-sm uppercase tracking-widest cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {loading ? 'Authorizing...' : isLogin ? 'Access System' : 'Create Account'}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs">
                    <span className="text-gray-400">
                        {isLogin ? "New to FlightAgent? " : "Already have access? "}
                    </span>
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                        }}
                        className="text-[#00e5ff] hover:underline font-bold focus:outline-none ml-1 transition"
                    >
                        {isLogin ? 'Register Here' : 'Login Here'}
                    </button>
                </div>
            </div>
        </div>
    );
}
