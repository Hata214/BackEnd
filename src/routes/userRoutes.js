const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Joi = require('joi');
const { authMiddleware } = require('../middleware/auth');
const { loginLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const { getTokenExpiration } = require('../middleware/auth');

// Validation schema
const registerSchema = Joi.object({
    username: Joi.string().min(3).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
});

// Add login validation schema
const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

// Middleware to check if user is super-admin
const isSuperAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (user.role !== 'super_admin') {
            return res.status(403).json({ message: 'Access denied. Super Admin role required.' });
        }
        next();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           description: The username
 *         email:
 *           type: string
 *           description: The user email
 *         password:
 *           type: string
 *           description: The user password
 *       example:
 *         username: johndoe
 *         email: john@example.com
 *         password: password123
 */

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management API
 */

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: The user was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/register', async (req, res) => {
    try {
        // Validate input
        const { error } = registerSchema.validate(req.body);
        if (error) {
            console.log('Registration validation error:', error.details[0].message);
            return res.status(400).json({ message: error.details[0].message });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email: req.body.email });
        if (existingUser) {
            console.log('Registration failed: Email already exists -', req.body.email);
            return res.status(400).json({ message: 'Email already exists' });
        }

        console.log('Creating new user with email:', req.body.email);

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        console.log('Password hashed successfully');

        // Create new user
        const user = new User({
            username: req.body.username,
            email: req.body.email,
            password: hashedPassword,
            role: 'user'
        });

        const savedUser = await user.save();
        console.log('User saved successfully:', {
            id: savedUser._id,
            email: savedUser.email,
            username: savedUser.username
        });

        // Create and assign token with role-based expiration
        const token = jwt.sign(
            { id: savedUser._id, role: savedUser.role },
            process.env.JWT_SECRET,
            { expiresIn: getTokenExpiration(savedUser.role) }
        );

        res.status(201).json({
            id: savedUser._id,
            username: savedUser.username,
            email: savedUser.email,
            role: savedUser.role,
            token
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ message: err.message });
    }
});

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Login a user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid input format
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many login attempts
 *       500:
 *         description: Server error
 */
router.post('/login', loginLimiter, async (req, res) => {
    try {
        // Check if JWT_SECRET is configured
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not configured');
            return res.status(500).json({
                message: 'Server configuration error',
                details: 'Authentication service is not properly configured'
            });
        }

        console.log('Login attempt with:', {
            email: req.body.email,
            providedPassword: req.body.password ? 'Yes' : 'No'
        });

        // Validate input format
        const { error } = loginSchema.validate(req.body);
        if (error) {
            console.log('Validation error:', error.details[0].message);
            return res.status(400).json({
                message: 'Validation error',
                details: error.details[0].message
            });
        }

        // Check if user exists and include password field
        const user = await User.findOne({ email: req.body.email }).select('+password');
        console.log('User found:', user ? {
            id: user._id,
            email: user.email,
            hasPassword: user.password ? 'Yes' : 'No',
            isLocked: user.isLocked ? user.isLocked() : false,
            loginAttempts: user.loginAttempts
        } : 'No user found');

        if (!user) {
            return res.status(401).json({
                message: 'Invalid credentials',
                details: 'Email or password is incorrect'
            });
        }

        // Check if account is locked
        if (user.lockUntil && user.lockUntil > Date.now()) {
            const waitTime = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60); // minutes
            console.log('Account locked for', waitTime, 'minutes');
            return res.status(401).json({
                message: 'Account locked',
                details: `Account is locked for ${waitTime} more minutes`
            });
        }

        // Validate password
        console.log('Comparing passwords...');
        const validPassword = await user.comparePassword(req.body.password);
        console.log('Password valid:', validPassword);

        if (!validPassword) {
            // Increment login attempts
            user.loginAttempts += 1;
            console.log('Failed login attempt:', user.loginAttempts);

            // Lock account if too many attempts (5 attempts)
            if (user.loginAttempts >= 5) {
                user.lockUntil = Date.now() + (15 * 60 * 1000); // Lock for 15 minutes
                await user.save();
                return res.status(401).json({
                    message: 'Account locked',
                    details: 'Too many failed attempts. Account is locked for 15 minutes.'
                });
            }

            await user.save();

            return res.status(401).json({
                message: 'Invalid credentials',
                details: 'Email or password is incorrect',
                attemptsLeft: 5 - user.loginAttempts
            });
        }

        // Reset login attempts and lock on successful login
        user.loginAttempts = 0;
        user.lockUntil = null;
        user.lastLogin = Date.now();
        await user.save();

        // Create and assign token with role-based expiration
        const token = jwt.sign(
            {
                id: user._id,
                role: user.role,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: getTokenExpiration(user.role),
                algorithm: 'HS256'
            }
        );

        // Send response
        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                lastLogin: user.lastLogin
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Add logout endpoint
router.post('/logout', (req, res) => {
    // In a real app, you would invalidate the token
    res.json({ message: 'Logged out successfully' });
});

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *       401:
 *         description: Not authenticated
 */
router.get('/profile', (req, res) => {
    // In a real app, you would get the user from the JWT token
    res.json({
        id: '60d21b4667d0d8992e610c80',
        username: 'johndoe',
        email: 'john@example.com',
        role: 'user'
    });
});

/**
 * @swagger
 * /api/users/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const resetToken = user.generatePasswordResetToken();
        await user.save();

        // TODO: Send email with reset token
        // For now, just return the token in response
        res.json({
            message: 'Password reset instructions sent to email',
            resetToken // Remove this in production
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * @swagger
 * /api/users/reset-password:
 *   post:
 *     summary: Reset password using token
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 *       500:
 *         description: Server error
 */
router.post('/reset-password', async (req, res) => {
    try {
        const user = await User.findOne({
            resetPasswordToken: req.body.token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        user.password = req.body.newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Password reset successful' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * @swagger
 * /api/users/verify-email:
 *   get:
 *     summary: Verify email using token
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *         required: true
 *         description: Email verification token
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 *       500:
 *         description: Server error
 */
router.get('/verify-email', async (req, res) => {
    try {
        const user = await User.findOne({
            emailVerificationToken: req.query.token,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired verification token' });
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        res.json({ message: 'Email verified successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * @swagger
 * /api/users/resend-verification:
 *   post:
 *     summary: Resend email verification
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Verification email sent
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.post('/resend-verification', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (user.isEmailVerified) {
            return res.status(400).json({ message: 'Email already verified' });
        }

        const verificationToken = user.generateEmailVerificationToken();
        await user.save();

        // TODO: Send verification email
        // For now, just return the token in response
        res.json({
            message: 'Verification email sent',
            verificationToken // Remove this in production
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router; 