const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Budget:
 *       type: object
 *       required:
 *         - name
 *         - amount
 *         - startDate
 *         - endDate
 *         - user
 *       properties:
 *         name:
 *           type: string
 *           description: Tên ngân sách
 *         description:
 *           type: string
 *           description: Mô tả ngân sách
 *         amount:
 *           type: number
 *           description: Số tiền ngân sách
 *         startDate:
 *           type: string
 *           format: date
 *           description: Ngày bắt đầu
 *         endDate:
 *           type: string
 *           format: date
 *           description: Ngày kết thúc
 *         categories:
 *           type: array
 *           items:
 *             type: string
 *           description: Danh sách các category ID
 *         status:
 *           type: string
 *           enum: [active, completed, cancelled]
 *           description: Trạng thái ngân sách
 *         user:
 *           type: string
 *           description: ID của người dùng sở hữu
 *         spent:
 *           type: number
 *           description: Số tiền đã chi tiêu
 *         remaining:
 *           type: number
 *           description: Số tiền còn lại
 */

const budgetSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Budget name is required'],
        trim: true,
        maxlength: [100, 'Budget name cannot exceed 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    amount: {
        type: Number,
        required: [true, 'Budget amount is required'],
        min: [0, 'Budget amount cannot be negative']
    },
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required'],
        validate: {
            validator: function (value) {
                return value > this.startDate;
            },
            message: 'End date must be after start date'
        }
    },
    categories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    }],
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    spent: {
        type: Number,
        default: 0,
        min: [0, 'Spent amount cannot be negative']
    },
    remaining: {
        type: Number,
        default: function () {
            return this.amount;
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
budgetSchema.index({ user: 1, startDate: -1 });
budgetSchema.index({ status: 1 });

// Virtual for progress percentage
budgetSchema.virtual('progress').get(function () {
    return (this.spent / this.amount) * 100;
});

// Pre-save middleware to update remaining amount
budgetSchema.pre('save', function (next) {
    this.remaining = this.amount - this.spent;
    next();
});

// Method to check if budget is exceeded
budgetSchema.methods.isExceeded = function () {
    return this.spent > this.amount;
};

// Method to add expense
budgetSchema.methods.addExpense = async function (amount) {
    this.spent += amount;
    this.remaining = this.amount - this.spent;
    if (this.remaining <= 0) {
        this.status = 'completed';
    }
    return this.save();
};

const Budget = mongoose.model('Budget', budgetSchema);

module.exports = Budget; 