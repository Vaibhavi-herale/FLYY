const Flight = require('../models/Flight');
const Booking = require('../models/Booking');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// ADMIN LOGIN
exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
      const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1d' });
      res.json({ success: true, token });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ADD FLIGHT
exports.addFlight = async (req, res) => {
  try {
    const flight = new Flight(req.body);
    await flight.save();

    res.json({ success: true, flight });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET ALL FLIGHTS
exports.getFlights = async (req, res) => {
  try {
    const flights = await Flight.find();
    res.json({ success: true, flights });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE FLIGHT
exports.deleteFlight = async (req, res) => {
  try {
    await Flight.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Flight deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// EDIT FLIGHT
exports.editFlight = async (req, res) => {
  try {
    const flight = await Flight.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, flight });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// VIEW BOOKINGS
exports.getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().populate("flight").sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

// GET ALL USERS WITH HIGH-LEVEL STATS
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    
    const stats = await Booking.aggregate([
      {
        $group: {
          _id: "$userId",
          totalBookings: { $sum: 1 },
          totalSpent: { $sum: "$totalAmount" }
        }
      }
    ]);

    const statsMap = {};
    stats.forEach(stat => {
      if (stat._id) {
        statsMap[stat._id.toString()] = {
          totalBookings: stat.totalBookings,
          totalSpent: stat.totalSpent
        };
      }
    });

    const usersWithStats = users.map(user => {
      const userStats = statsMap[user._id.toString()] || { totalBookings: 0, totalSpent: 0 };
      return {
        ...user.toObject(),
        stats: userStats
      };
    });

    res.json({ success: true, users: usersWithStats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// TOGGLE USER ACTIVE/DISABLED STATUS
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    user.isDisabled = !user.isDisabled;
    await user.save();
    res.json({ success: true, user: { _id: user._id, isDisabled: user.isDisabled } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET DETAILED BOOKING STATS FOR SPECIFIC USER
exports.getUserBookingStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const bookings = await Booking.find({ userId }).populate('flight').sort({ createdAt: -1 });
    
    let totalBookings = bookings.length;
    let confirmedBookings = 0;
    let cancelledBookings = 0;
    let totalSpent = 0;

    bookings.forEach(b => {
      if (b.bookingStatus === 'Confirmed') {
        confirmedBookings++;
        totalSpent += b.totalAmount;
      } else if (b.bookingStatus === 'Cancelled') {
        cancelledBookings++;
      } else {
        totalSpent += b.totalAmount;
      }
    });

    res.json({
      success: true,
      stats: {
        totalBookings,
        confirmedBookings,
        cancelledBookings,
        totalSpent,
        recentBookings: bookings.slice(0, 5)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE USER
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    // Update user's bookings to unlinked guest bookings
    await Booking.updateMany({ userId }, { $unset: { userId: "" } });
    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};