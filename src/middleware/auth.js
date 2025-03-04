const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

/**
 * Middleware xác thực JWT token
 */
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user || !user.active) {
            return res.status(401).json({
                status: 'error',
                message: 'User not found or inactive'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid token'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                status: 'error',
                message: 'Token expired'
            });
        }
        next(error);
    }
};

/**
 * Middleware kiểm tra role admin
 */
const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            status: 'error',
            message: 'Authentication required'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({
            status: 'error',
            message: 'Admin access required'
        });
    }

    next();
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
            if (resource.user && resource.user.toString() !== req.user._id.toString()) {
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
    authenticate,
    isAdmin,
    checkOwnership
}; 