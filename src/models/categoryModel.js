const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       required:
 *         - name
 *         - type
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated ID of the category
 *         name:
 *           type: string
 *           description: Name of the category
 *         type:
 *           type: string
 *           enum: [income, expense]
 *           description: Type of the category (income or expense)
 *         description:
 *           type: string
 *           description: Description of the category
 *         color:
 *           type: string
 *           description: Color code for the category
 *         userId:
 *           type: string
 *           description: ID of the user who created this category
 *         isDefault:
 *           type: boolean
 *           description: Whether this is a default category
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         name: Food & Dining
 *         type: expense
 *         description: Expenses for food and dining out
 *         color: "#FF5733"
 *         isDefault: false
 */

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true,
        minlength: [2, 'Category name must be at least 2 characters long'],
        maxlength: [50, 'Category name cannot exceed 50 characters']
    },
    type: {
        type: String,
        required: [true, 'Category type is required'],
        enum: {
            values: ['income', 'expense'],
            message: 'Category type must be either income or expense'
        }
    },
    description: {
        type: String,
        trim: true,
        maxlength: [200, 'Description cannot exceed 200 characters']
    },
    color: {
        type: String,
        default: '#000000',
        validate: {
            validator: function (v) {
                return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
            },
            message: 'Color must be a valid hex color code'
        }
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
categorySchema.index({ userId: 1, name: 1 }, { unique: true });
categorySchema.index({ type: 1 });

// Virtual for transaction count
categorySchema.virtual('transactionCount', {
    ref: 'Transaction',
    localField: '_id',
    foreignField: 'categoryId',
    count: true
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category; 