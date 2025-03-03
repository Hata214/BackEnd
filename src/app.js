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

// Connect to database
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

// Import routes
const adminRoutes = require('./routes/adminRoutes');

// Import favicon generator
require('./utils/faviconGenerator');

const app = express();
const server = http.createServer(app);

// Initialize socket service
socketService.init(server);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Performance Middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(monitorPerformance());

// Rate limiting middleware
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 100, // giới hạn mỗi IP 100 request trong 15 phút
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        message: 'Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút'
    }
});

// Áp dụng rate limiting cho tất cả các routes API
app.use('/api', apiLimiter);

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "http:"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'", "https:", "http:", "ws:", "wss:"],
            fontSrc: ["'self'", "data:", "https:", "http:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'self'"],
        }
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS ?
    process.env.ALLOWED_ORIGINS.split(',') :
    ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

// Logging
app.use(morgan('dev'));

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve Swagger UI static files directly from node_modules
app.use('/api-docs/swagger-ui.css', express.static(path.join(__dirname, '../node_modules/swagger-ui-dist/swagger-ui.css')));
app.use('/api-docs/swagger-ui-bundle.js', express.static(path.join(__dirname, '../node_modules/swagger-ui-dist/swagger-ui-bundle.js')));
app.use('/api-docs/swagger-ui-standalone-preset.js', express.static(path.join(__dirname, '../node_modules/swagger-ui-dist/swagger-ui-standalone-preset.js')));
app.use('/api-docs/favicon-32x32.png', express.static(path.join(__dirname, '../node_modules/swagger-ui-dist/favicon-32x32.png')));
app.use('/api-docs/favicon-16x16.png', express.static(path.join(__dirname, '../node_modules/swagger-ui-dist/favicon-16x16.png')));

// Swagger configuration
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'VanLangBudget API',
            version: '1.0.0',
            description: 'API documentation for VanLangBudget application',
            contact: {
                name: 'API Support',
                email: 'support@vanlangbudget.com'
            }
        },
        servers: [
            {
                url: process.env.API_URL || 'http://localhost:3000',
                description: 'Development server'
            },
            {
                url: 'https://back-end-phi-jet.vercel.app',
                description: 'Production server'
            }
        ],
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
        }]
    },
    apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Serve Swagger JSON
app.get('/api-docs/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// Custom Swagger UI HTML
app.get('/api-docs', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>VanLangBudget API Documentation</title>
        <link rel="stylesheet" type="text/css" href="/api-docs/swagger-ui.css" />
        <link rel="icon" type="image/png" href="/api-docs/favicon-32x32.png" sizes="32x32" />
        <link rel="icon" type="image/png" href="/api-docs/favicon-16x16.png" sizes="16x16" />
        <style>
            html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
            *, *:before, *:after { box-sizing: inherit; }
            body { margin: 0; background: #fafafa; }
            .swagger-ui .topbar { display: none; }
        </style>
    </head>
    <body>
        <div id="swagger-ui"></div>
        <script src="/api-docs/swagger-ui-bundle.js"></script>
        <script src="/api-docs/swagger-ui-standalone-preset.js"></script>
        <script>
            window.onload = function() {
                window.ui = SwaggerUIBundle({
                    url: '/api-docs/swagger.json',
                    dom_id: '#swagger-ui',
                    deepLinking: true,
                    presets: [
                        SwaggerUIBundle.presets.apis,
                        SwaggerUIStandalonePreset
                    ],
                    plugins: [
                        SwaggerUIBundle.plugins.DownloadUrl
                    ],
                    layout: "StandaloneLayout",
                    persistAuthorization: true,
                    displayRequestDuration: true,
                    docExpansion: 'none',
                    filter: true,
                    showExtensions: true,
                    showCommonExtensions: true,
                    tryItOutEnabled: true
                });
            };
        </script>
    </body>
    </html>
    `);
});

// Routes
app.use('/api/auth', validateRequest, authRoutes);
app.use('/api/users', authMiddleware, validateRequest, paginateResults, optimizeQuery, userRoutes);
app.use('/api/budgets', authMiddleware, validateRequest, paginateResults, optimizeQuery, budgetRoutes);
app.use('/api/transactions', authMiddleware, validateRequest, paginateResults, optimizeQuery, transactionRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/categories', authMiddleware, validateRequest, paginateResults, optimizeQuery, categoryRoutes);
app.use('/api/statistics', authMiddleware, validateRequest, optimizeQuery, statisticsRoutes);

// Serve favicon.ico
app.get('/favicon.ico', (req, res) => {
    const faviconPath = path.join(__dirname, 'public', 'favicon.ico');
    if (fs.existsSync(faviconPath)) {
        res.sendFile(faviconPath);
    } else {
        res.status(204).end(); // No content response if favicon doesn't exist
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    // Thêm thông tin chi tiết về kết nối MongoDB
    const mongoDetails = {
        status: dbStatus,
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host || 'not connected',
        name: mongoose.connection.name || 'not connected'
    };

    // Thêm thông tin về biến môi trường (không hiển thị giá trị nhạy cảm)
    const envVars = {
        NODE_ENV: process.env.NODE_ENV || 'not set',
        MONGODB_URI_SET: process.env.MONGODB_URI ? 'true' : 'false',
        VERCEL: process.env.VERCEL || 'not set'
    };

    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        server: {
            status: 'running',
            environment: process.env.NODE_ENV || 'development',
            uptime: process.uptime() + ' seconds',
            memory: process.memoryUsage(),
            version: process.version
        },
        database: mongoDetails,
        environment: envVars
    });
});

// Thêm middleware xử lý lỗi toàn cục
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);

    // Xử lý lỗi MongoDB
    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
        return res.status(500).json({
            status: 'error',
            message: 'Lỗi kết nối cơ sở dữ liệu',
            error: process.env.NODE_ENV === 'development' ? err.message : 'Database error'
        });
    }

    // Xử lý lỗi validation
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            status: 'error',
            message: 'Dữ liệu không hợp lệ',
            error: process.env.NODE_ENV === 'development' ? err.message : 'Validation error'
        });
    }

    // Xử lý lỗi JWT
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({
            status: 'error',
            message: 'Lỗi xác thực',
            error: process.env.NODE_ENV === 'development' ? err.message : 'Authentication error'
        });
    }

    // Lỗi mặc định
    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'Lỗi máy chủ nội bộ',
        error: process.env.NODE_ENV === 'development' ? err : 'Internal server error'
    });
});

// Handle 404
app.use((req, res) => {
    // Check if request is for API documentation
    if (req.url.startsWith('/api-docs')) {
        res.redirect('/api-docs');
        return;
    }

    // Check if request is for API endpoints
    if (req.url.startsWith('/api')) {
        res.status(404).json({
            status: 'error',
            message: 'API endpoint not found',
            path: req.url
        });
        return;
    }

    // For all other routes
    res.status(404).json({
        status: 'error',
        message: 'Route not found',
        path: req.url
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
});

module.exports = app; 