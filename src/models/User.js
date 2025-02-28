const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 50
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
        select: false // Don't include password by default
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'super_admin'],
        default: 'user'
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    lastLogin: Date,
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: Date,
    active: {
        type: Boolean,
        default: true,
        select: false
    },
    passwordHistory: [String]
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            delete ret.password;
            delete ret.emailVerificationToken;
            delete ret.emailVerificationExpires;
            delete ret.resetPasswordToken;
            delete ret.resetPasswordExpires;
            delete ret.__v;
            return ret;
        }
    }
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();

    try {
        // Check if password is already hashed
        if (this.password.length === 60 && this.password.startsWith('$2')) {
            console.log('Password is already hashed, skipping...');
            return next();
        }

        console.log('Hashing password:', {
            originalLength: this.password.length,
            isString: typeof this.password === 'string'
        });

        // Ensure password is string and trim whitespace
        this.password = String(this.password).trim();

        // Generate a salt with cost factor 10
        const salt = await bcrypt.genSalt(10);

        // Hash the password using the new salt
        const hashedPassword = await bcrypt.hash(this.password, salt);

        console.log('Password hashed:', {
            originalLength: this.password.length,
            hashedLength: hashedPassword.length
        });

        // Override the cleartext password with the hashed one
        this.password = hashedPassword;

        next();
    } catch (error) {
        console.error('Password hashing error:', {
            error: error.message
        });
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        // Make sure we have both passwords
        if (!candidatePassword || !this.password) {
            console.log('Missing password data:', {
                hasCandidatePassword: !!candidatePassword,
                hasStoredPassword: !!this.password
            });
            return false;
        }

        // Ensure password is string and trim whitespace
        const candidate = String(candidatePassword).trim();

        console.log('Comparing passwords:', {
            candidateLength: candidate.length,
            storedLength: this.password.length
        });

        // Compare passwords
        const isMatch = await bcrypt.compare(candidate, this.password);

        console.log('Password comparison result:', {
            isMatch: isMatch
        });

        return isMatch;
    } catch (error) {
        console.error('Password comparison error:', {
            error: error.message
        });
        return false;
    }
};

// Method to generate password reset token
userSchema.methods.generatePasswordResetToken = function () {
    this.resetPasswordToken = crypto.randomBytes(32).toString('hex');
    this.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    return this.resetPasswordToken;
};

// Method to generate email verification token
userSchema.methods.generateEmailVerificationToken = function () {
    this.emailVerificationToken = crypto.randomBytes(32).toString('hex');
    this.emailVerificationExpires = Date.now() + 24 * 3600000; // 24 hours
    return this.emailVerificationToken;
};

// Method to check if account is locked
userSchema.methods.isLocked = function () {
    return this.lockUntil && this.lockUntil > Date.now();
};

// Method to check if a candidate password is old
userSchema.methods.isOldPassword = async function (candidatePassword) {
    try {
        const oldPasswords = this.passwordHistory || [];
        for (const oldHash of oldPasswords) {
            if (await bcrypt.compare(candidatePassword, oldHash)) {
                return true;
            }
        }
        return false;
    } catch (error) {
        throw new Error('Old password check failed');
    }
};

// Static method to find active user by email
userSchema.statics.findByEmail = function (email) {
    return this.findOne({ email: email.toLowerCase(), active: true });
};

// Thêm validation cho password
userSchema.path('password').validate(function (password) {
    return typeof password === 'string' && password.length >= 6;
}, 'Password must be a string with at least 6 characters');

// Thêm middleware kiểm tra type
userSchema.pre('validate', function (next) {
    if (this.password && typeof this.password !== 'string') {
        this.password = String(this.password);
    }
    next();
});

// Thêm logging khi save user (không log password)
userSchema.pre('save', function (next) {
    console.log('Saving user:', {
        email: this.email,
        username: this.username
    });
    next();
});

module.exports = mongoose.model('User', userSchema); 