const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');

const app = express();
const port = process.env.PORT || 3000;

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
        tags: [
            {
                name: 'Authentication',
                description: 'User authentication endpoints'
            }
        ],
        paths: {
            '/api/auth/register': {
                post: {
                    tags: ['Authentication'],
                    summary: 'Register a new user',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['email', 'password', 'name'],
                                    properties: {
                                        email: {
                                            type: 'string',
                                            format: 'email'
                                        },
                                        password: {
                                            type: 'string',
                                            minLength: 6
                                        },
                                        name: {
                                            type: 'string'
                                        }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        201: {
                            description: 'User registered successfully'
                        },
                        400: {
                            description: 'Invalid input data'
                        },
                        409: {
                            description: 'Email already exists'
                        }
                    }
                }
            },
            '/api/auth/login': {
                post: {
                    tags: ['Authentication'],
                    summary: 'Login user',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['email', 'password'],
                                    properties: {
                                        email: {
                                            type: 'string',
                                            format: 'email'
                                        },
                                        password: {
                                            type: 'string'
                                        }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        200: {
                            description: 'Login successful',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            token: {
                                                type: 'string'
                                            },
                                            user: {
                                                type: 'object',
                                                properties: {
                                                    id: {
                                                        type: 'string'
                                                    },
                                                    email: {
                                                        type: 'string'
                                                    },
                                                    name: {
                                                        type: 'string'
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        401: {
                            description: 'Invalid credentials'
                        },
                        429: {
                            description: 'Too many login attempts'
                        }
                    }
                }
            }
        }
    },
    apis: [] // Không cần quét file vì đã định nghĩa trực tiếp trong options
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Middleware cơ bản
app.use(express.json());
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Swagger UI với custom options
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "VanLangBudget API Documentation",
    customfavIcon: "/favicon.ico",
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        defaultModelsExpandDepth: -1
    }
}));

// API Test UI
app.get('/api-test', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'api-test.html'));
});

// Routes
app.use('/api/auth', authRoutes);

// Endpoint root đơn giản để test
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'VanLangBudget API is running',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    });
});

// Endpoint debug
app.get('/debug', (req, res) => {
    res.status(200).json({
        environment: process.env.NODE_ENV || 'development',
        node_version: process.version,
        memory_usage: process.memoryUsage(),
        uptime: process.uptime(),
        env_vars: {
            NODE_ENV: process.env.NODE_ENV,
            VERCEL: process.env.VERCEL,
            MONGODB_URI_SET: !!process.env.MONGODB_URI,
            NODE_OPTIONS: process.env.NODE_OPTIONS
        }
    });
});

// Khởi tạo MongoDB connection sau khi server đã chạy
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

// Endpoint để manually kích hoạt kết nối MongoDB
app.get('/connect', async (req, res) => {
    try {
        await initMongoDB();
        res.status(200).json({
            message: 'Connection attempt completed',
            mongodb_status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
        });
    } catch (error) {
        res.status(500).json({
            message: 'Connection attempt failed',
            error: error.message
        });
    }
});

// Global Error Handler đơn giản
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        status: 'error',
        message: 'Internal Server Error'
    });
});

// Khởi động server nếu file được chạy trực tiếp
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

module.exports = app; 