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
 *         - user
 *       properties:
 *         name:
 *           type: string
 *           description: Tên danh mục
 *         type:
 *           type: string
 *           enum: [income, expense]
 *           description: Loại danh mục (thu nhập hoặc chi tiêu)
 *         description:
 *           type: string
 *           description: Mô tả danh mục
 *         color:
 *           type: string
 *           description: Mã màu cho danh mục (hex code)
 *         user:
 *           type: string
 *           description: ID của người dùng sở hữu
 *         parent:
 *           type: string
 *           description: ID của danh mục cha (nếu là danh mục con)
 *         isDefault:
 *           type: boolean
 *           description: Có phải là danh mục mặc định không
 */

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true,
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
            message: props => `${props.value} is not a valid hex color!`
        }
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
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
categorySchema.index({ user: 1, type: 1 });
categorySchema.index({ parent: 1 });

// Virtual for subcategories
categorySchema.virtual('subcategories', {
    ref: 'Category',
    localField: '_id',
    foreignField: 'parent'
});

// Pre-save middleware
categorySchema.pre('save', function (next) {
    if (this.isDefault) {
        this.constructor.findOne({
            user: this.user,
            type: this.type,
            isDefault: true
        }).then(existingDefault => {
            if (existingDefault && existingDefault._id.toString() !== this._id.toString()) {
                next(new Error('Only one default category per type is allowed'));
            } else {
                next();
            }
        }).catch(err => next(err));
    } else {
        next();
    }
});

// Static method to get default categories
categorySchema.statics.getDefaultCategories = function () {
    return [
        { name: 'Salary', type: 'income', color: '#4CAF50', isDefault: true },
        { name: 'Bonus', type: 'income', color: '#8BC34A', isDefault: true },
        { name: 'Investment', type: 'income', color: '#009688', isDefault: true },
        { name: 'Food & Beverage', type: 'expense', color: '#F44336', isDefault: true },
        { name: 'Transportation', type: 'expense', color: '#FF9800', isDefault: true },
        { name: 'Shopping', type: 'expense', color: '#E91E63', isDefault: true },
        { name: 'Bills & Utilities', type: 'expense', color: '#3F51B5', isDefault: true },
        { name: 'Healthcare', type: 'expense', color: '#2196F3', isDefault: true },
        { name: 'Education', type: 'expense', color: '#673AB7', isDefault: true }
    ];
};

// Method to get full path
categorySchema.methods.getFullPath = async function () {
    let path = [this.name];
    let current = this;

    while (current.parent) {
        current = await this.constructor.findById(current.parent);
        if (!current) break;
        path.unshift(current.name);
    }

    return path.join(' > ');
};

const Category = mongoose.model('Category', categorySchema);

module.exports = Category; 