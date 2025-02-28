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
            description: 'API documentation for VanLangBudget application'
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        },
        security: [{
            bearerAuth: []
        }],
        servers: [
            {
                url: process.env.NODE_ENV === 'production'
                    ? 'https://back-end-phi-jet.vercel.app'
                    : 'http://localhost:3000',
                description: process.env.NODE_ENV === 'production'
                    ? 'Production server'
                    : 'Development server'
            }
        ]
    },
    apis: ['./src/routes/*.js', './src/models/*.js']
};

// Initialize Swagger
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Serve swagger.json
app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// Serve Swagger UI static files
app.use('/api-docs', express.static('node_modules/swagger-ui-dist/', { index: false }));

// Setup Swagger UI
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
    explorer: true,
    swaggerUrl: '/swagger.json',
    swaggerOptions: {
        url: '/swagger.json',
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

// Add health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
});

module.exports = app; 