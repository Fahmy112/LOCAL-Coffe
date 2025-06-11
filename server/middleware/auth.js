// Backend/middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // Get token from header
    const token = req.header('x-auth-token');

    // If no token, deny access
    if (!token) {
        console.warn('No token provided in x-auth-token header');
        return res.status(401).json({ msg: 'لا يوجد توكن، تم رفض التفويض. | No token, authorization denied.' });
    }

    try {
        // Verify token using secret from environment variable (JWT_SECRET)
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if decoded user exists
        if (!decoded.user) {
            console.warn('Decoded token does not contain user payload');
            return res.status(401).json({ msg: 'الحمولة لا تحتوي على مستخدم. | Token payload missing user.' });
        }

        // Attach user object from payload to request
        req.user = decoded.user;
        next();
    } catch (err) {
        console.warn('Invalid or expired token:', err.message);
        res.status(401).json({ msg: 'التوكن غير صالح أو منتهي الصلاحية. | Invalid or expired token.' });
    }
};