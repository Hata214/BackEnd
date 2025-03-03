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
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: function (v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: props => `${props.value} is not a valid email!`
        }
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long']
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
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
    passwordHistory: [String],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
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

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
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

// Method to get public profile
userSchema.methods.toPublicJSON = function () {
    return {
        id: this._id,
        email: this.email,
        name: this.name,
        role: this.role,
        isVerified: this.isEmailVerified,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
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

const User = mongoose.model('User', userSchema);

module.exports = User; 