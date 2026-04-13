const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const ADMIN_BYPASS_ROLES = new Set(['Quản trị', 'Siêu quản trị viên']);

const hasAdminBypass = (user) => {
    if (!user) return false;
    if (user.isSuperAdmin === true) return true;
    return ADMIN_BYPASS_ROLES.has(String(user.role || '').trim());
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (hasAdminBypass(req.user)) {
            return next();
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
};

module.exports = { authenticateToken, authorizeRole };