const jwt = require('jsonwebtoken');

// Hàm xác định thời gian hết hạn token dựa trên role
const getTokenExpiration = (role) => {
    switch (role) {
        case 'super_admin':
            return '1h';  // Super admin token expires in 1 hour
        case 'admin':
        case 'user':
            return '24h'; // Admin and user tokens expire in 24 hours
        default:
            return '1h';  // Default to 1 hour for safety
    }
};

const authMiddleware = (req, res, next) => {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    // Check if token exists
    if (!token) {
        return res.status(401).json({
            message: 'Access denied. No token provided.'
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Add user info to request object
        req.user = decoded;

        // Check if token is about to expire
        const now = Math.floor(Date.now() / 1000);
        const expiresIn = decoded.exp - now;

        if (expiresIn < 300) { // If token expires in less than 5 minutes
            // Generate new token with role-based expiration
            const newToken = jwt.sign(
                { id: decoded.id, role: decoded.role },
                process.env.JWT_SECRET,
                { expiresIn: getTokenExpiration(decoded.role) }
            );

            // Set new token in response header
            res.set('Authorization', `Bearer ${newToken}`);
        }

        next();
    } catch (err) {
        res.status(401).json({
            message: 'Invalid token',
            error: err.message
        });
    }
};

// Update role hierarchy and permissions
const roleMiddleware = (roles) => {
    return (req, res, next) => {
        const roleHierarchy = {
            'super_admin': 3,
            'admin': 2,
            'user': 1
        };

        // Super admin can access everything
        if (req.user.role === 'super_admin') return next();

        const userRoleLevel = roleHierarchy[req.user.role];
        const requiredRoleLevel = Math.min(...roles.map(role => roleHierarchy[role]));

        if (userRoleLevel < requiredRoleLevel) {
            return res.status(403).json({
                message: 'Access denied. Insufficient permissions.'
            });
        }
        next();
    };
};

// New middleware to check for super admin only
const superAdminMiddleware = (req, res, next) => {
    if (req.user.role !== 'super_admin') {
        return res.status(403).json({
            message: 'Access denied. Super admin privileges required.'
        });
    }
    next();
};

module.exports = {
    authMiddleware,
    roleMiddleware,
    superAdminMiddleware,
    getTokenExpiration
}; 