const Booking = require('../models/Booking');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const createToken = (user) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured');
    }

    return jwt.sign(
        { id: user._id.toString(), type: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

const formatUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt
});

exports.register = async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        if (!name || !email || !password || !confirmPassword) {
            return res.status(400).json({ success: false, message: 'Name, email, password, and confirm password are required' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'Passwords do not match' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'An account with this email already exists' });
        }

        const user = await User.create({
            name: String(name).trim(),
            email: normalizedEmail,
            password
        });

        return res.status(201).json({
            success: true,
            token: createToken(user),
            user: formatUser(user)
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select('+password');
        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        if (user.isDisabled) {
            return res.status(403).json({ success: false, message: 'Your account has been disabled. Please contact support.' });
        }

        return res.status(200).json({
            success: true,
            token: createToken(user),
            user: formatUser(user)
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.me = async (req, res) => {
    return res.status(200).json({ success: true, user: formatUser(req.user) });
};

exports.getUserContext = async (req, res) => {
    try {
        const { email } = req.params;
        const authenticatedUser = req.user;

        if (!email && !authenticatedUser) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const effectiveEmail = authenticatedUser ? authenticatedUser.email : email;
        const userProfile = {
            email: effectiveEmail,
            name: authenticatedUser ? authenticatedUser.name : effectiveEmail.split('@')[0]
        };

        const bookingQuery = authenticatedUser
            ? {
                $or: [
                    { userId: authenticatedUser._id },
                    { userId: { $exists: false }, contactEmail: authenticatedUser.email }
                ]
            }
            : { contactEmail: email };

        const bookings = await Booking.find(bookingQuery)
            .populate('flight')
            .sort({ createdAt: -1 });
        const savedPassengersMap = new Map();
        
        bookings.forEach(booking => {
            booking.passengers.forEach(p => {
                const uniqueKey = p.passportNumber || p.email;
                if (!savedPassengersMap.has(uniqueKey) && !p.isCancelled) {
                    savedPassengersMap.set(uniqueKey, {
                        name: p.name,
                        email: p.email,
                        passportNumber: p.passportNumber,
                        dateOfBirth: p.dateOfBirth,
                        nationality: p.nationality,
                        phoneNumber: p.phoneNumber
                    });
                }
            });
        });

        const savedPassengers = Array.from(savedPassengersMap.values());

        const now = new Date();
        const upcomingBookings = [];
        const pastBookings = [];

        bookings.forEach(b => {
            if (b.flight && b.flight.departureDate > now && b.bookingStatus !== 'Cancelled') {
                upcomingBookings.push(b);
            } else {
                pastBookings.push(b);
            }
        });

        res.status(200).json({
            success: true,
            user: userProfile,
            savedPassengers,
            bookings: {
                total: bookings.length,
                upcoming: upcomingBookings,
                past: pastBookings
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getUserBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ userId: req.user._id })
        .populate('flight')
        .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, bookings });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

