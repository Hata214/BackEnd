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
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token. Your role will be displayed here after authorization.'
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

// Create HTML for Swagger UI
const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>VanLangBudget API Documentation</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css" />
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.min.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: window.location.origin + '/swagger.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl,
                    {
                        statePlugins: {
                            auth: {
                                wrapActions: {
                                    authorize: (ori) => (...args) => {
                                        const [{ bearerAuth }] = args;
                                        if (bearerAuth) {
                                            try {
                                                const token = bearerAuth.value;
                                                const payload = JSON.parse(atob(token.split('.')[1]));
                                                const role = payload.role || 'unknown';
                                                let roleElement = document.getElementById('current-role');
                                                if (!roleElement) {
                                                    roleElement = document.createElement('div');
                                                    roleElement.id = 'current-role';
                                                    document.querySelector('.auth-wrapper').appendChild(roleElement);
                                                }
                                                roleElement.textContent = 'Current Role: ' + role;
                                            } catch (e) {
                                                console.error('Error parsing token:', e);
                                            }
                                        }
                                        return ori(...args);
                                    }
                                }
                            }
                        }
                    }
                ],
                layout: "BaseLayout",
                docExpansion: 'none',
                defaultModelsExpandDepth: -1,
                displayRequestDuration: true,
                filter: true,
                persistAuthorization: true,
                oauth2RedirectUrl: window.location.origin + '/oauth2-redirect.html'
            });
            window.ui = ui;
        };
    </script>
    <style>
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { font-size: 2.5em }
        body { margin: 0; padding: 0; }
        #swagger-ui { max-width: 1460px; margin: 0 auto; padding: 20px; }
        .auth-wrapper .auth-btn-wrapper {
            position: relative;
            padding-top: 25px !important;
        }
        .auth-wrapper .auth-btn-wrapper::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            font-size: 14px;
            color: #3b4151;
            width: 100%;
            text-align: left;
            font-weight: bold;
        }
        .auth-wrapper {
            position: relative;
        }
        #current-role {
            position: absolute;
            top: -20px;
            left: 0;
            font-size: 14px;
            color: #3b4151;
            font-weight: bold;
        }
    </style>
</body>
</html>
`;

// Serve swagger.json
app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// Serve Swagger UI
app.get('/api-docs', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(swaggerHtml);
});

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