const { validationResult } = require('express-validator');
const Joi = require('joi');

// Middleware để validate request với express-validator
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 'error',
            errors: errors.array()
        });
    }
    next();
};

// Schema validation với Joi
const schemas = {
    // User schemas
    userRegister: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        name: Joi.string().required()
    }),

    userLogin: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    }),

    forgotPassword: Joi.object({
        email: Joi.string().email().required()
    }),

    resetPassword: Joi.object({
        token: Joi.string().required(),
        newPassword: Joi.string().min(6).required()
    }),

    changePassword: Joi.object({
        currentPassword: Joi.string().required(),
        newPassword: Joi.string().min(6).required()
            .not(Joi.ref('currentPassword')).messages({
                'any.invalid': 'New password must be different from current password'
            })
    }),

    // Budget schemas
    budgetCreate: Joi.object({
        name: Joi.string().required(),
        amount: Joi.number().positive().required(),
        startDate: Joi.date().required(),
        endDate: Joi.date().min(Joi.ref('startDate')).required(),
        category: Joi.string().required()
    }),

    // Transaction schemas
    transactionCreate: Joi.object({
        type: Joi.string().valid('income', 'expense').required(),
        amount: Joi.number().positive().required(),
        category: Joi.string().required(),
        description: Joi.string(),
        date: Joi.date()
    }),

    // Category schemas
    categoryCreate: Joi.object({
        name: Joi.string().required(),
        type: Joi.string().valid('income', 'expense').required(),
        color: Joi.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    })
};

// Middleware để validate với Joi schema
const validateSchema = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, {
            abortEarly: false,
            allowUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path[0],
                message: detail.message
            }));

            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors
            });
        }

        next();
    };
};

module.exports = {
    validateRequest,
    validateSchema,
    schemas
}; 