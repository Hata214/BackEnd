const { body, query, param } = require('express-validator');

const authValidation = {
    register: [
        body('username')
            .trim()
            .isLength({ min: 3, max: 30 })
            .withMessage('Username must be between 3 and 30 characters'),
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Must be a valid email'),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters long')
            .matches(/\d/)
            .withMessage('Password must contain a number')
    ],
    login: [
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Must be a valid email'),
        body('password')
            .notEmpty()
            .withMessage('Password is required')
    ]
};

const transactionValidation = {
    create: [
        body('amount')
            .isFloat({ min: 0 })
            .withMessage('Amount must be a positive number'),
        body('type')
            .isIn(['income', 'expense'])
            .withMessage('Type must be either income or expense'),
        body('categoryId')
            .isMongoId()
            .withMessage('Invalid category ID'),
        body('description')
            .optional()
            .trim()
            .isLength({ max: 200 })
            .withMessage('Description cannot exceed 200 characters'),
        body('date')
            .isISO8601()
            .toDate()
            .withMessage('Invalid date format')
    ],
    update: [
        param('id')
            .isMongoId()
            .withMessage('Invalid transaction ID'),
        body('amount')
            .optional()
            .isFloat({ min: 0 })
            .withMessage('Amount must be a positive number'),
        body('type')
            .optional()
            .isIn(['income', 'expense'])
            .withMessage('Type must be either income or expense'),
        body('categoryId')
            .optional()
            .isMongoId()
            .withMessage('Invalid category ID'),
        body('description')
            .optional()
            .trim()
            .isLength({ max: 200 })
            .withMessage('Description cannot exceed 200 characters'),
        body('date')
            .optional()
            .isISO8601()
            .toDate()
            .withMessage('Invalid date format')
    ],
    getByDateRange: [
        query('startDate')
            .optional()
            .isISO8601()
            .toDate()
            .withMessage('Invalid start date format'),
        query('endDate')
            .optional()
            .isISO8601()
            .toDate()
            .withMessage('Invalid end date format')
    ]
};

const categoryValidation = {
    create: [
        body('name')
            .trim()
            .isLength({ min: 2, max: 50 })
            .withMessage('Category name must be between 2 and 50 characters'),
        body('type')
            .isIn(['income', 'expense'])
            .withMessage('Type must be either income or expense'),
        body('description')
            .optional()
            .trim()
            .isLength({ max: 200 })
            .withMessage('Description cannot exceed 200 characters'),
        body('color')
            .optional()
            .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
            .withMessage('Invalid color format')
    ],
    update: [
        param('id')
            .isMongoId()
            .withMessage('Invalid category ID'),
        body('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 50 })
            .withMessage('Category name must be between 2 and 50 characters'),
        body('description')
            .optional()
            .trim()
            .isLength({ max: 200 })
            .withMessage('Description cannot exceed 200 characters'),
        body('color')
            .optional()
            .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
            .withMessage('Invalid color format')
    ]
};

const userValidation = {
    updateProfile: [
        body('username')
            .optional()
            .trim()
            .isLength({ min: 3, max: 30 })
            .withMessage('Username must be between 3 and 30 characters'),
        body('email')
            .optional()
            .isEmail()
            .normalizeEmail()
            .withMessage('Must be a valid email')
    ],
    changePassword: [
        body('currentPassword')
            .notEmpty()
            .withMessage('Current password is required'),
        body('newPassword')
            .isLength({ min: 6 })
            .withMessage('New password must be at least 6 characters long')
            .matches(/\d/)
            .withMessage('New password must contain a number'),
        body('confirmPassword')
            .custom((value, { req }) => {
                if (value !== req.body.newPassword) {
                    throw new Error('Password confirmation does not match');
                }
                return true;
            })
    ]
};

module.exports = {
    authValidation,
    transactionValidation,
    categoryValidation,
    userValidation
}; 