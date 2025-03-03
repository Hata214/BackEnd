const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const http = require('http');
const socketService = require('./services/socketService');
const {
    apiLimiter,
    authLimiter,
    securityHeaders,
    errorHandler,
    corsOptions
} = require('./middleware/security');
const connectDB = require('./config/db');
const { authMiddleware } = require('./middleware/auth');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { compressResponse, paginateResults, optimizeQuery, monitorPerformance } = require('./middleware/performance');
const { validateRequest } = require('./middleware/validation');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const statisticsRoutes = require('./routes/statisticsRoutes');
const swaggerDocument = require('./swagger.json');
const WebSocket = require('./websocket');
require('dotenv').config();

// Connect to database
connectDB();

// Import routes
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const server = http.createServer(app);

// Initialize socket service
socketService.initialize(server);

// Performance Middleware
app.use(compression()); // Enable response compression
app.use(monitorPerformance); // Monitor API performance

// Security Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Logging
app.use(morgan('dev'));

// Body Parser
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
        servers: [
            {
                url: process.env.API_URL || 'http://localhost:3000',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    },
    apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
console.log('budgetRoutes type:', typeof budgetRoutes);
console.log('authMiddleware type:', typeof authMiddleware);

const budgetRouter = budgetRoutes;
console.log('budgetRouter type:', typeof budgetRouter);

app.use('/api/auth', validateRequest, authRoutes);
app.use('/api/users', authMiddleware, validateRequest, paginateResults, optimizeQuery, userRoutes);
app.use('/api/budgets', authMiddleware, validateRequest, paginateResults, optimizeQuery, budgetRouter);
app.use('/api/transactions', authMiddleware, validateRequest, paginateResults, optimizeQuery, transactionRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/categories', authMiddleware, validateRequest, paginateResults, optimizeQuery, categoryRoutes);
app.use('/api/statistics', authMiddleware, validateRequest, optimizeQuery, statisticsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// WebSocket Setup
WebSocket.init(app);

// Handle 404
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route not found'
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
});

module.exports = app; 