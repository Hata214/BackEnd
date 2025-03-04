const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Transaction:
 *       type: object
 *       required:
 *         - amount
 *         - type
 *         - category
 *         - user
 *       properties:
 *         amount:
 *           type: number
 *           description: Số tiền giao dịch
 *         type:
 *           type: string
 *           enum: [income, expense]
 *           description: Loại giao dịch (thu nhập hoặc chi tiêu)
 *         category:
 *           type: string
 *           description: ID của danh mục
 *         description:
 *           type: string
 *           description: Mô tả giao dịch
 *         date:
 *           type: string
 *           format: date
 *           description: Ngày giao dịch
 *         budget:
 *           type: string
 *           description: ID của ngân sách (nếu có)
 *         user:
 *           type: string
 *           description: ID của người dùng
 *         paymentMethod:
 *           type: string
 *           enum: [cash, bank_transfer, credit_card, e_wallet]
 *           description: Phương thức thanh toán
 *         status:
 *           type: string
 *           enum: [completed, pending, cancelled]
 *           description: Trạng thái giao dịch
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *           description: Danh sách các file đính kèm
 */

const transactionSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: [true, 'Transaction amount is required'],
        validate: {
            validator: function (value) {
                return value !== 0;
            },
            message: 'Transaction amount cannot be zero'
        }
    },
    type: {
        type: String,
        required: [true, 'Transaction type is required'],
        enum: {
            values: ['income', 'expense'],
            message: 'Transaction type must be either income or expense'
        }
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Category is required']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    date: {
        type: Date,
        default: Date.now
    },
    budget: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Budget'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    paymentMethod: {
        type: String,
        enum: {
            values: ['cash', 'bank_transfer', 'credit_card', 'e_wallet'],
            message: 'Invalid payment method'
        },
        default: 'cash'
    },
    status: {
        type: String,
        enum: {
            values: ['completed', 'pending', 'cancelled'],
            message: 'Invalid transaction status'
        },
        default: 'completed'
    },
    attachments: [{
        type: String,
        validate: {
            validator: function (v) {
                // Basic URL validation
                return /^(http|https):\/\/[^ "]+$/.test(v);
            },
            message: props => `${props.value} is not a valid URL!`
        }
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ budget: 1 });
transactionSchema.index({ category: 1 });
transactionSchema.index({ type: 1 });

// Virtual for formatted amount
transactionSchema.virtual('formattedAmount').get(function () {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(this.amount);
});

// Pre-save middleware
transactionSchema.pre('save', async function (next) {
    if (this.isNew && this.budget) {
        try {
            const Budget = mongoose.model('Budget');
            const budget = await Budget.findById(this.budget);
            if (budget && this.type === 'expense') {
                await budget.addExpense(this.amount);
            }
        } catch (error) {
            next(error);
        }
    }
    next();
});

// Method to check if transaction can be edited
transactionSchema.methods.canEdit = function () {
    const now = new Date();
    const transactionDate = new Date(this.date);
    const diffTime = Math.abs(now - transactionDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7; // Can only edit transactions within 7 days
};

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction; 