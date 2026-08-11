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
        <div className="flex min-h-screen bg-[#f0f8ff] items-center justify-center p-4 selection:bg-[#87CEEB]/30 text-[#000080] font-sans relative overflow-hidden ">
            {/* Background cyber grid effect */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:20px_20px]"></div>
            
            {/* Ambient glow blobs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#87CEEB]/5 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#87CEEB]/5 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="w-full max-w-md pro-card p-8 sm:p-10 relative z-10">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#3b82f6] to-[#ffffff] rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                        <span className="text-3xl">✈️</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-[#000080] mt-3 tracking-tight">
                        FlightAgent AI
                    </h2>
                    <p className="text-sm text-[#87CEEB]/60 mt-2">
                        {isLogin ? 'Secure access to your account' : 'Create your account'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-700 text-sm rounded-xl p-4 mb-6 flex items-start gap-3">
                        <span className="text-lg">⚠️</span>
                        <span className="leading-tight">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {!isLogin && (
                        <div>
                            <label className="block text-sm font-semibold text-[#000080] mb-2">Full Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your name"
                                className="pro-input w-full"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-[#000080] mb-2">Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            className="pro-input w-full"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-[#000080] mb-2">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="pro-input w-full"
                        />
                    </div>

                    {!isLogin && (
                        <div>
                            <label className="block text-sm font-semibold text-[#000080] mb-2">Confirm Password</label>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm your password"
                                className="pro-input w-full"
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="pro-btn-primary w-full"
                    >
                        {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm">
                    <span className="text-[#87CEEB]/60">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                    </span>
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                        }}
                        className="text-[#000080] font-semibold hover:text-[#87CEEB] focus:outline-none transition ml-1"
                    >
                        {isLogin ? 'Sign up' : 'Sign in'}
                    </button>
                </div>
            </div>
        </div>
    );
}
