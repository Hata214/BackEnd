const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');

const app = express();
const port = process.env.PORT || 3000;

// Middleware cơ bản
app.use(express.json());
app.use(cors());

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
    apis: ['./src/routes/*.js']
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

const initMongoDB = async () => {
    if (isInitialized) return;

    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI is not defined');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            family: 4
        });

        console.log('MongoDB Connected');
        isInitialized = true;

    } catch (error) {
        console.error('MongoDB connection error:', error);
    }
};

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        status: 'error',
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Khởi động server
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
        initMongoDB();
    });
}

module.exports = app; 