const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const createUser = async (req, res) => {
    try {
        const { email, password, username } = req.body;

        // Validate required fields
        if (!email || !password || !username) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        console.log('Registration attempt:', {
            email: email,
            passwordLength: password ? password.length : 0,
            username: username
        });

        // Create new user with clean data
        const user = new User({
            email: email.toLowerCase().trim(),
            username: username.trim(),
            password: password // Raw password, will be hashed by the model
        });

        await user.save();

        console.log('User saved successfully:', {
            id: user._id,
            email: user.email,
            username: user.username
        });

        // Generate JWT token for immediate login
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(201).json({
            token,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({
            message: error.message
        });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log('Login attempt:', {
            email: email,
            passwordProvided: !!password,
            passwordLength: password ? password.length : 0
        });

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Find user and include password field
        const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        console.log('Found user:', {
            id: user._id,
            email: user.email,
            hashedPasswordLength: user.password ? user.password.length : 0
        });

        // Check if account is locked
        if (user.isLocked && user.isLocked()) {
            return res.status(401).json({ message: 'Account is locked. Please try again later' });
        }

        // Verify password
        const isValidPassword = await user.comparePassword(password);

        console.log('Password verification result:', {
            isValid: isValidPassword,
            attempts: user.loginAttempts
        });

        if (!isValidPassword) {
            // Increment login attempts
            user.loginAttempts = (user.loginAttempts || 0) + 1;

            // Lock account if too many attempts
            if (user.loginAttempts >= 5) {
                user.lockUntil = Date.now() + (15 * 60 * 1000); // 15 minutes
            }

            await user.save();

            return res.status(401).json({
                message: 'Invalid credentials',
                attemptsLeft: 5 - user.loginAttempts
            });
        }

        // Reset login attempts on successful login
        user.loginAttempts = 0;
        user.lockUntil = null;
        user.lastLogin = new Date();
        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
}; 