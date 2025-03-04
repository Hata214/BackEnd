const jwt = require('jsonwebtoken');
const { roles, rolePermissions } = require('../config/roles');
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
 * Middleware kiểm tra role
 */
const checkRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                message: 'Authentication required'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                status: 'error',
                message: 'Permission denied'
            });
        }

        next();
    };
};

/**
 * Middleware kiểm tra permission
 */
const checkPermission = (requiredPermission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                message: 'Authentication required'
            });
        }

        const userPermissions = rolePermissions[req.user.role];
        if (!userPermissions.includes(requiredPermission)) {
            return res.status(403).json({
                status: 'error',
                message: 'Permission denied'
            });
        }

        next();
    };
};

/**
 * Middleware kiểm tra quyền sở hữu tài nguyên
 */
const checkOwnership = (Model, paramId = 'id') => {
    return async (req, res, next) => {
        try {
            const resourceId = req.params[paramId];
            const resource = await Model.findById(resourceId);

            if (!resource) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Resource not found'
                });
            }

            // Super admin có quyền truy cập mọi tài nguyên
            if (req.user.role === roles.SUPER_ADMIN) {
                req.resource = resource;
                return next();
            }

            // Admin có quyền truy cập một số tài nguyên nhất định
            if (req.user.role === roles.ADMIN) {
                // Kiểm tra quyền của admin với tài nguyên cụ thể
                const canAccess = ['Category'].includes(Model.modelName) ||
                    (Model.modelName === 'User' && resource.role !== roles.SUPER_ADMIN);
                if (canAccess) {
                    req.resource = resource;
                    return next();
                }
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
            next(error);
        }
    };
};

module.exports = {
    authenticate,
    checkRole,
    checkPermission,
    checkOwnership
}; 