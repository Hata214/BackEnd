const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware cơ bản
app.use(express.json());
app.use(cors());

// Kết nối MongoDB với retry logic
const connectDB = async (retries = 5) => {
    while (retries > 0) {
        try {
            const conn = await mongoose.connect(process.env.MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 10000, // Tăng timeout
                heartbeatFrequencyMS: 2000,      // Giảm thời gian heartbeat
                retryWrites: true,
                w: 'majority'
            });
            console.log(`MongoDB Connected: ${conn.connection.host}`);
            return true;
        } catch (error) {
            console.error(`Connection attempt failed: ${error.message}`);
            retries -= 1;
            if (retries === 0) {
                console.error('Failed to connect to MongoDB after multiple retries');
                return false;
            }
            // Đợi 2 giây trước khi thử lại
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    return false;
};

// Endpoint root với trạng thái MongoDB
app.get('/', async (req, res) => {
    const isConnected = mongoose.connection.readyState === 1;
    res.status(200).json({
        message: 'VanLangBudget API is running',
        environment: process.env.NODE_ENV || 'development',
        mongodb_status: isConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Endpoint debug chi tiết
app.get('/debug', async (req, res) => {
    const isConnected = mongoose.connection.readyState === 1;
    const mongodbUri = process.env.MONGODB_URI || '';

    res.status(200).json({
        environment: process.env.NODE_ENV || 'development',
        mongodb_status: isConnected ? 'connected' : 'disconnected',
        mongodb_uri_exists: !!mongodbUri,
        mongodb_uri_prefix: mongodbUri ? `${mongodbUri.split('@')[0].split('://')[0]}://*****@${mongodbUri.split('@')[1]}` : null,
        vercel_environment: process.env.VERCEL || false,
        node_version: process.version,
        memory_usage: process.memoryUsage(),
        uptime: process.uptime(),
        connection_state: mongoose.connection.readyState,
        env_vars: {
            NODE_ENV: process.env.NODE_ENV,
            VERCEL: process.env.VERCEL,
            MONGODB_URI_SET: !!process.env.MONGODB_URI
        }
    });
});

// Kết nối MongoDB khi khởi động với retry
(async () => {
    const connected = await connectDB();
    if (!connected) {
        console.log('Warning: Starting server without MongoDB connection');
    }
})();

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        status: 'error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
        path: req.url,
        error_details: process.env.NODE_ENV === 'development' ? err.stack : undefined
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