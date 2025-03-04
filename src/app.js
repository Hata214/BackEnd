const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware cơ bản
app.use(express.json());
app.use(cors());

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

// Endpoint API debug
app.get('/api/debug', (req, res) => {
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