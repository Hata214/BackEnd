const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const connectDB = require('./config/db');
const { authMiddleware } = require('./middleware/auth');
require('dotenv').config();

// Connect to database
connectDB();

// Import routes
const budgetRoutes = require('./routes/budgetRoutes').default || require('./routes/budgetRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const userRoutes = require('./routes/userRoutes');
const testRoutes = require('./routes/testRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://vanlangbudget.vercel.app', 'http://localhost:3000', 'https://back-end-phi-jet.vercel.app']
        : '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger configuration
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'VanLangBudget API',
            version: '1.0.0',
            description: 'API documentation for VanLangBudget application',
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                }
            }
        },
        security: [{
            bearerAuth: []
        }],
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server',
            },
            {
                url: 'https://back-end-phi-jet.vercel.app',
                description: 'Production server'
            }
        ],
    },
    apis: ['./src/routes/*.js'], // Path to the API docs
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
        persistAuthorization: true
    }
}));

// Routes
console.log('budgetRoutes type:', typeof budgetRoutes);
console.log('authMiddleware type:', typeof authMiddleware);

const budgetRouter = budgetRoutes;
console.log('budgetRouter type:', typeof budgetRouter);

app.use('/api/budgets', authMiddleware, budgetRouter);
app.use('/api/transactions', authMiddleware, transactionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/test', testRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);

// Home route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to VanLangBudget API' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
});

module.exports = app; 