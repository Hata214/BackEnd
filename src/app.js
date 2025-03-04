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
const server = http.createServer(app);

// Initialize socket service
// socketService.init(server);

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
    try {
        const faviconPath = path.join(__dirname, 'public', 'favicon.ico');
        if (fs.existsSync(faviconPath)) {
            res.sendFile(faviconPath);
        } else {
            // Nếu không tìm thấy file, trả về 204 No Content
            console.log('Favicon not found, returning 204');
            res.status(204).end();
        }
    } catch (error) {
        console.error('Error serving favicon:', error);
        res.status(204).end();
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    try {
        const dbStatus = mongoose.connection ?
            (mongoose.connection.readyState === 1 ? 'connected' : 'disconnected') :
            'not initialized';

        // Thêm thông tin chi tiết về kết nối MongoDB
        const mongoDetails = {
            status: dbStatus,
            readyState: mongoose.connection ? mongoose.connection.readyState : 'not initialized',
            host: mongoose.connection && mongoose.connection.host ? mongoose.connection.host : 'not connected',
            name: mongoose.connection && mongoose.connection.name ? mongoose.connection.name : 'not connected'
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
                memory: {
                    rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
                    heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
                    heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB'
                },
                version: process.version
            },
            database: mongoDetails,
            environment: envVars
        });
    } catch (error) {
        console.error('Error in health check endpoint:', error);
        res.status(500).json({
            status: 'ERROR',
            message: 'Error checking health',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Middleware để bắt lỗi trong quá trình xử lý request
app.use((req, res, next) => {
    try {
        next();
    } catch (error) {
        console.error('Middleware error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
});

// Thêm middleware xử lý lỗi toàn cục
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);

    // Ghi log chi tiết lỗi
    console.error(err.stack);

    res.status(err.statusCode || 500).json({
        success: false,
        error: {
            message: err.message || 'Internal Server Error',
            code: err.code || 'UNKNOWN_ERROR'
        }
    });
});

// Thêm endpoint debug
app.get('/api/debug', (req, res) => {
    res.json({
        environment: process.env.NODE_ENV,
        mongodb_uri_exists: !!process.env.MONGODB_URI,
        mongodb_uri_prefix: process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 15) + '...' : null,
        vercel_environment: process.env.VERCEL_ENV,
        memory_usage: process.memoryUsage(),
        uptime: process.uptime()
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

// Thêm endpoint root đơn giản không phụ thuộc vào database
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'VanLangBudget API is running',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Endpoint debug
app.get('/debug', (req, res) => {
    res.status(200).json({
        environment: process.env.NODE_ENV,
        mongodb_uri_set: process.env.MONGODB_URI ? 'true' : 'false',
        jwt_secret_set: process.env.JWT_SECRET ? 'true' : 'false',
        vercel: process.env.VERCEL || 'not set',
        node_version: process.version,
        timestamp: new Date().toISOString()
    });
});

module.exports = app; 