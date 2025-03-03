const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['income', 'expense'],
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: [0, 'Amount must be positive']
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    budget: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Budget'
    },
    attachments: [{
        type: String // URL to attachment
    }],
    tags: [{
        type: String,
        trim: true
    }],
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            default: [0, 0]
        }
    },
    isRecurring: {
        type: Boolean,
        default: false
    },
    recurringDetails: {
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'yearly']
        },
        startDate: Date,
        endDate: Date
    }
}, {
    timestamps: true
});

// Indexes
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ category: 1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ location: '2dsphere' });

// Virtual field for formatted amount
transactionSchema.virtual('formattedAmount').get(function () {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(this.amount);
});

// Method to get transaction details
transactionSchema.methods.toJSON = function () {
    const obj = this.toObject();
    obj.id = obj._id;
    delete obj._id;
    delete obj.__v;
    return obj;
};

// Static method to get user's transaction summary
transactionSchema.statics.getTransactionSummary = async function (userId, startDate, endDate) {
    const summary = await this.aggregate([
        {
            $match: {
                user: mongoose.Types.ObjectId(userId),
                date: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                }
            }
        },
        {
            $group: {
                _id: '$type',
                total: { $sum: '$amount' },
                count: { $sum: 1 }
            }
        }
    ]);

    const result = {
        income: 0,
        expense: 0,
        incomeCount: 0,
        expenseCount: 0
    };

    summary.forEach(item => {
        if (item._id === 'income') {
            result.income = item.total;
            result.incomeCount = item.count;
        } else {
            result.expense = item.total;
            result.expenseCount = item.count;
        }
    });

    result.balance = result.income - result.expense;
    result.totalCount = result.incomeCount + result.expenseCount;

    return result;
};

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction; 