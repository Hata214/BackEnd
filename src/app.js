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
            // Get current environment URL
            const currentUrl = window.location.origin;
            const swaggerJsonUrl = currentUrl + '/swagger.json';

            const ui = SwaggerUIBundle({
                url: swaggerJsonUrl,
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
                                                localStorage.setItem('bearerToken', token);
                                                const payload = JSON.parse(atob(token.split('.')[1]));
                                                const role = payload.role || 'unknown';
                                                localStorage.setItem('currentRole', role);
                                                updateRoleDisplay(role);
                                            } catch (e) {
                                                console.error('Error parsing token:', e);
                                                localStorage.removeItem('bearerToken');
                                                localStorage.removeItem('currentRole');
                                            }
                                        }
                                        return ori(...args);
                                    },
                                    logout: (ori) => (...args) => {
                                        localStorage.removeItem('bearerToken');
                                        localStorage.removeItem('currentRole');
                                        updateRoleDisplay(null);
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
                oauth2RedirectUrl: currentUrl + '/oauth2-redirect.html'
            });
            window.ui = ui;

            // Function to restore authorization state
            const restoreAuthState = () => {
                const token = localStorage.getItem('bearerToken');
                const savedRole = localStorage.getItem('currentRole');
                
                if (token && savedRole) {
                    try {
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        const tokenExpiry = payload.exp * 1000;
                        
                        if (tokenExpiry > Date.now()) {
                            updateRoleDisplay(savedRole);
                            ui.authActions.authorize({
                                bearerAuth: {
                                    name: "bearerAuth",
                                    schema: { type: "http", scheme: "bearer" },
                                    value: token
                                }
                            });
                        } else {
                            localStorage.removeItem('bearerToken');
                            localStorage.removeItem('currentRole');
                        }
                    } catch (e) {
                        console.error('Error restoring auth state:', e);
                        localStorage.removeItem('bearerToken');
                        localStorage.removeItem('currentRole');
                    }
                }
            };

            let roleContainer = document.getElementById('role-container');
            if (!roleContainer) {
                roleContainer = document.createElement('div');
                roleContainer.id = 'role-container';
                const checkAuthWrapper = setInterval(() => {
                    const authWrapper = document.querySelector('.auth-wrapper');
                    if (authWrapper) {
                        authWrapper.appendChild(roleContainer);
                        clearInterval(checkAuthWrapper);
                        restoreAuthState();
                    }
                }, 100);
            }

            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    restoreAuthState();
                }
            });
        };

        function updateRoleDisplay(role) {
            let roleContainer = document.getElementById('role-container');
            if (!roleContainer) {
                roleContainer = document.createElement('div');
                roleContainer.id = 'role-container';
                const authWrapper = document.querySelector('.auth-wrapper');
                if (authWrapper) {
                    authWrapper.appendChild(roleContainer);
                }
            }

            if (role) {
                roleContainer.innerHTML = 
                    '<div class="role-display">' +
                    '<span class="role-label">Current Role:</span>' +
                    '<span class="role-value">' + role + '</span>' +
                    '</div>';
                roleContainer.style.display = 'block';
            } else {
                roleContainer.style.display = 'none';
            }
        }
    </script>
    <style>
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info .title { font-size: 2.5em; }
        body { margin: 0; padding: 0; }
        #swagger-ui { max-width: 1460px; margin: 0 auto; padding: 20px; }
        .auth-wrapper {
            position: relative;
            margin-bottom: 20px;
        }
        .role-display {
            margin-top: 10px;
            padding: 8px 12px;
            background-color: #f0f0f0;
            border-radius: 4px;
            font-size: 14px;
            color: #3b4151;
            border: 1px solid #d9d9d9;
            text-align: center;
        }
        .role-label {
            font-weight: bold;
            margin-right: 5px;
        }
        .role-value {
            color: #2a69ac;
            font-weight: bold;
        }
    </style>
</body>
</html>`;

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

app.use('/api/users', userRoutes);
app.use('/api/budgets', authMiddleware, budgetRouter);
app.use('/api/transactions', authMiddleware, transactionRoutes);
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
    console.log(`Server is running on port ${PORT} `);
    console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
});

module.exports = app; 