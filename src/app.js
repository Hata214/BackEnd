const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');

const app = express();
const port = process.env.PORT || 3000;

// Middleware cơ bản
app.use(express.json());
app.use(cors());
app.use(helmet({
    contentSecurityPolicy: false // Disable CSP for Swagger UI
}));

// Xử lý favicon.ico
app.get('/favicon.ico', (req, res) => {
    res.status(204).end(); // Trả về No Content nếu không có favicon
});

// Swagger configuration
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'VanLangBudget API Documentation',
            version: '1.0.0',
            description: 'API documentation for VanLangBudget application',
        },
        servers: [
            {
                url: process.env.NODE_ENV === 'production'
                    ? 'https://back-end-phi-jet.vercel.app'
                    : `http://localhost:${port}`,
                description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
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
    apis: [path.join(process.cwd(), 'src', 'routes', '*.js')]
};

// Tạo swagger spec với try-catch
let swaggerSpec;
try {
    swaggerSpec = swaggerJsdoc(swaggerOptions);
} catch (error) {
    console.error('Swagger generation error:', error);
    swaggerSpec = {
        openapi: '3.0.0',
        info: {
            title: 'VanLangBudget API Documentation',
            version: '1.0.0',
            description: 'Error loading full documentation. Please check server logs.',
        },
        paths: {}
    };
}

// Routes
app.use('/api/auth', authRoutes);

// Swagger UI route
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "VanLangBudget API Documentation",
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        defaultModelsExpandDepth: -1
    }
}));

// Root endpoint
app.get('/', (req, res) => {
    res.redirect('/api-docs');
});

// Debug endpoint
app.get('/debug', (req, res) => {
    res.status(200).json({
        environment: process.env.NODE_ENV || 'development',
        node_version: process.version,
        memory_usage: process.memoryUsage(),
        uptime: process.uptime(),
        swagger_loaded: !!swaggerSpec,
        swagger_path: path.join(process.cwd(), 'src', 'routes', '*.js'),
        current_working_directory: process.cwd(),
        env_vars: {
            NODE_ENV: process.env.NODE_ENV,
            VERCEL: process.env.VERCEL,
            MONGODB_URI_SET: !!process.env.MONGODB_URI,
            NODE_OPTIONS: process.env.NODE_OPTIONS
        }
    });
});

// Khởi tạo MongoDB connection
let isInitialized = false;
let mongooseConnection = null;

const initMongoDB = async () => {
    if (isInitialized) return;

    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined');
        }

        mongooseConnection = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            family: 4,
            maxPoolSize: 10
        });

        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected. Attempting to reconnect...');
            setTimeout(initMongoDB, 5000);
        });

        console.log('MongoDB Connected');
        isInitialized = true;

    } catch (error) {
        console.error('MongoDB connection error:', error);
        setTimeout(initMongoDB, 5000); // Retry after 5 seconds
    }
};

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Error:', err);

    // Check if headers have already been sent
    if (res.headersSent) {
        return next(err);
    }

    // Handle specific error types
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            status: 'error',
            message: 'Validation Error',
            errors: err.errors
        });
    }

    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
        return res.status(503).json({
            status: 'error',
            message: 'Database Error',
            error: process.env.NODE_ENV === 'development' ? err.message : 'A database error occurred'
        });
    }

    // Default error response
    res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path
    });
});

// Catch 404 errors
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Cannot ${req.method} ${req.path}`
    });
});

// Khởi động server
if (require.main === module) {
    const server = app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
        initMongoDB();
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('SIGTERM signal received. Closing server...');
        server.close(async () => {
            if (mongooseConnection) {
                await mongoose.disconnect();
            }
            console.log('Server closed.');
            process.exit(0);
        });
    });
}

module.exports = app; 