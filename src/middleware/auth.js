const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

/**
 * Middleware xác thực JWT token
 */
const auth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                status: 'error',
                message: 'No token provided'
            });
        }

        const token = authHeader.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'Authentication token is required'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'User not found'
            });
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({
            status: 'error',
            message: 'Please authenticate',
            error: error.message
        });
    }
};

/**
 * Middleware kiểm tra role
 */
const checkRole = (roles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Authentication required'
                });
            }

            if (!roles.includes(req.user.role)) {
                return res.status(403).json({
                    status: 'error',
                    message: 'Access denied. Required role: ' + roles.join(' or ')
                });
            }

            next();
        } catch (error) {
            console.error('Role check error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Role verification failed',
                error: error.message
            });
        }
    };
};

/**
 * Middleware kiểm tra quyền sở hữu tài nguyên
 */
const checkOwnership = (Model) => {
    return async (req, res, next) => {
        try {
            const resource = await Model.findById(req.params.id);
            if (!resource) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Resource not found'
                });
            }

            // Admin có quyền truy cập mọi tài nguyên
            if (req.user.role === 'admin') {
                req.resource = resource;
                return next();
            }

            // Kiểm tra quyền sở hữu
            if (resource.user && resource.user.toString() !== req.user.userId.toString()) {
                return res.status(403).json({
                    status: 'error',
                    message: 'Permission denied'
                });
            }

            req.resource = resource;
            next();
        } catch (error) {
            if (error.name === 'CastError') {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid resource ID'
                });
            }
            next(error);
        }
    };
};

module.exports = {
    auth,
    checkRole,
    checkOwnership
}; 