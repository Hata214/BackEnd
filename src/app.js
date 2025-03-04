const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const http = require('http');
const path = require('path');
const fs = require('fs');
const socketService = require('./services/websocketService');
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
require('dotenv').config();
const mongoose = require('mongoose');

// Xử lý lỗi không bắt được trước khi khởi tạo Express
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Không thoát process trong môi trường serverless
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Không thoát process trong môi trường serverless
});

// Sửa phần kết nối MongoDB
// Connect to database - Thêm try/catch và không để lỗi kết nối làm crash ứng dụng
try {
    connectDB().then(connection => {
        if (connection) {
            console.log('Database connected successfully');
        } else {
            console.warn('Running without database connection');
        }
    }).catch(err => {
        console.error('Failed to connect to database:', err.message);
        console.warn('Running without database connection');
    });
} catch (error) {
    console.error('Error during database connection setup:', error);
    console.warn('Running without database connection');
}

// Import routes
const adminRoutes = require('./routes/adminRoutes');

// Import favicon generator (chỉ khi không chạy trên Vercel)
if (process.env.VERCEL !== '1') {
    try {
        require('./utils/faviconGenerator');
    } catch (error) {
        console.error('Error importing favicon generator:', error);
    }
}

const app = express();

// Middleware cơ bản
app.use(express.json());

// Endpoint root đơn giản
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'VanLangBudget API is running',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

// Endpoint debug
app.get('/debug', (req, res) => {
    res.status(200).json({
        environment: process.env.NODE_ENV,
        mongodb_uri_exists: !!process.env.MONGODB_URI,
        mongodb_uri_prefix: process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 15) + '...' : null,
        vercel_environment: process.env.VERCEL,
        node_version: process.version,
        memory_usage: process.memoryUsage(),
        uptime: process.uptime()
    });
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route not found',
        path: req.url
    });
});

module.exports = app; 