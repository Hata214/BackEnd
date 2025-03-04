const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { roles } = require('../config/roles');

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
 *         - name
 *       properties:
 *         username:
 *           type: string
 *           description: Tên đăng nhập
 *         email:
 *           type: string
 *           format: email
 *           description: Email đăng nhập
 *         password:
 *           type: string
 *           format: password
 *           description: Mật khẩu
 *         name:
 *           type: string
 *           description: Tên hiển thị
 *         role:
 *           type: string
 *           enum: [user, admin, super_admin]
 *           description: Vai trò người dùng
 *         isEmailVerified:
 *           type: boolean
 *           description: Trạng thái xác thực email
 *         active:
 *           type: boolean
 *           description: Trạng thái hoạt động của tài khoản
 *         lastLogin:
 *           type: string
 *           format: date-time
 *           description: Thời gian đăng nhập gần nhất
 */

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 50,
        unique: true,
        trim: true
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
        minlength: [6, 'Password must be at least 6 characters long'],
        select: false // Không trả về password trong queries
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    role: {
        type: String,
        enum: Object.values(roles),
        default: roles.USER
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
        default: true
    },
    passwordHistory: [{
        password: String,
        changedAt: {
            type: Date,
            default: Date.now
        }
    }],
    failedLoginAttempts: [{
        timestamp: Date,
        ipAddress: String
    }]
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            delete ret.password;
            delete ret.emailVerificationToken;
            delete ret.emailVerificationExpires;
            delete ret.resetPasswordToken;
            delete ret.resetPasswordExpires;
            delete ret.passwordHistory;
            delete ret.failedLoginAttempts;
            delete ret.__v;
            return ret;
        }
    }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        // Hash password
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);

        // Add to password history
        if (this.passwordHistory.length >= 5) {
            this.passwordHistory.shift();
        }
        this.passwordHistory.push({
            password: this.password,
            changedAt: new Date()
        });

        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error('Password comparison failed');
    }
};

// Method to check if account is locked
userSchema.methods.isLocked = function () {
    return this.lockUntil && this.lockUntil > Date.now();
};

// Method to increment login attempts
userSchema.methods.incrementLoginAttempts = async function (ipAddress) {
    // Reset if lock has expired
    if (this.lockUntil && this.lockUntil < Date.now()) {
        this.loginAttempts = 1;
        this.lockUntil = undefined;
        this.failedLoginAttempts = [{
            timestamp: new Date(),
            ipAddress
        }];
    } else {
        // Increment attempts
        this.loginAttempts += 1;
        this.failedLoginAttempts.push({
            timestamp: new Date(),
            ipAddress
        });

        // Lock account if too many attempts
        if (this.loginAttempts >= 5 && !this.isLocked()) {
            this.lockUntil = Date.now() + 3600000; // Lock for 1 hour
        }
    }

    return this.save();
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function () {
    return this.updateOne({
        $set: {
            loginAttempts: 0,
            lockUntil: undefined,
            failedLoginAttempts: []
        }
    });
};

// Method to generate verification token
userSchema.methods.generateVerificationToken = function () {
    this.emailVerificationToken = crypto.randomBytes(32).toString('hex');
    this.emailVerificationExpires = Date.now() + 24 * 3600000; // 24 hours
    return this.emailVerificationToken;
};

// Method to generate password reset token
userSchema.methods.generatePasswordResetToken = function () {
    this.resetPasswordToken = crypto.randomBytes(32).toString('hex');
    this.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    return this.resetPasswordToken;
};

// Method to check if user has permission
userSchema.methods.hasPermission = function (permission) {
    const { rolePermissions } = require('../config/roles');
    return rolePermissions[this.role].includes(permission);
};

// Method to check if user has any of the permissions
userSchema.methods.hasAnyPermission = function (permissions) {
    const { rolePermissions } = require('../config/roles');
    const userPermissions = rolePermissions[this.role];
    return permissions.some(permission => userPermissions.includes(permission));
};

const User = mongoose.model('User', userSchema);

module.exports = User; 