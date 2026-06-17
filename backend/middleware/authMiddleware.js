const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getToken = (req) => req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : null;

exports.protectUser = async (req, res, next) => {
    try {
        const token = getToken(req);
        if (!token) return res.status(401).json({ success: false, message: "No token provided, authorization denied" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.type && decoded.type !== 'user') {
            return res.status(401).json({ success: false, message: "Token is not valid for user access" });
        }

        const user = await User.findById(decoded.id).select('-password');
        if (!user) return res.status(401).json({ success: false, message: "User no longer exists" });

        if (user.isDisabled) {
            return res.status(403).json({ success: false, message: "Your account has been disabled." });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: "Token is not valid" });
    }
};

exports.protectAdmin = (req, res, next) => {
    try {
        const token = getToken(req);
        if (!token) return res.status(401).json({ success: false, message: "No token provided, authorization denied" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.username) {
            return res.status(401).json({ success: false, message: "Token is not valid for admin access" });
        }
        req.admin = decoded;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: "Token is not valid" });
    }
};
