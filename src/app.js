const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware cơ bản
app.use(express.json());
app.use(cors());

// Kết nối MongoDB với retry logic và xử lý lỗi chi tiết
const connectDB = async (retries = 5) => {
    while (retries > 0) {
        try {
            // Log để debug
            console.log('Attempting to connect to MongoDB...');
            console.log('MongoDB URI exists:', !!process.env.MONGODB_URI);

            if (!process.env.MONGODB_URI) {
                throw new Error('MONGODB_URI is not defined');
            }

            const conn = await mongoose.connect(process.env.MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 30000, // Tăng timeout lên 30s
                heartbeatFrequencyMS: 2000,
                socketTimeoutMS: 45000,
                family: 4, // Force IPv4
                maxPoolSize: 10,
                minPoolSize: 2,
                retryWrites: true,
                w: 'majority',
                maxIdleTimeMS: 10000,
                connectTimeoutMS: 30000
            });

            console.log(`MongoDB Connected: ${conn.connection.host}`);

            // Thêm event listeners cho connection
            mongoose.connection.on('error', (err) => {
                console.error('MongoDB connection error:', err);
            });

            mongoose.connection.on('disconnected', () => {
                console.log('MongoDB disconnected');
            });

            mongoose.connection.on('connected', () => {
                console.log('MongoDB connected');
            });

            return true;
        } catch (error) {
            console.error('Connection attempt failed:');
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);

            retries -= 1;
            if (retries === 0) {
                console.error('Failed to connect to MongoDB after multiple retries');
                return false;
            }

            console.log(`Retrying in 5 seconds... (${retries} attempts remaining)`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    return false;
};

// Endpoint root với trạng thái MongoDB và thông tin chi tiết
app.get('/', async (req, res) => {
    const isConnected = mongoose.connection.readyState === 1;
    const connState = ['disconnected', 'connected', 'connecting', 'disconnecting'];

    res.status(200).json({
        message: 'VanLangBudget API is running',
        environment: process.env.NODE_ENV || 'development',
        mongodb_status: isConnected ? 'connected' : 'disconnected',
        mongodb_state: connState[mongoose.connection.readyState],
        timestamp: new Date().toISOString()
    });
});

// Endpoint debug với thông tin chi tiết hơn
app.get('/debug', async (req, res) => {
    const isConnected = mongoose.connection.readyState === 1;
    const mongodbUri = process.env.MONGODB_URI || '';
    const connState = ['disconnected', 'connected', 'connecting', 'disconnecting'];

    res.status(200).json({
        environment: process.env.NODE_ENV || 'development',
        mongodb_status: isConnected ? 'connected' : 'disconnected',
        mongodb_state: connState[mongoose.connection.readyState],
        mongodb_uri_exists: !!mongodbUri,
        mongodb_uri_prefix: mongodbUri ? `${mongodbUri.split('@')[0].split('://')[0]}://*****@${mongodbUri.split('@')[1]}` : null,
        vercel_environment: process.env.VERCEL || false,
        node_version: process.version,
        memory_usage: process.memoryUsage(),
        uptime: process.uptime(),
        connection_details: {
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            name: mongoose.connection.name
        },
        env_vars: {
            NODE_ENV: process.env.NODE_ENV,
            VERCEL: process.env.VERCEL,
            MONGODB_URI_SET: !!process.env.MONGODB_URI
        }
    });
});

// Kết nối MongoDB khi khởi động
(async () => {
    try {
        const connected = await connectDB();
        if (!connected) {
            console.log('Warning: Starting server without MongoDB connection');
        }
    } catch (error) {
        console.error('Error during startup:', error);
    }
})();

// Global Error Handler với chi tiết hơn
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    console.error('Stack trace:', err.stack);

    res.status(500).json({
        status: 'error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
        path: req.url,
        error_details: process.env.NODE_ENV === 'development' ? {
            name: err.name,
            message: err.message,
            stack: err.stack
        } : undefined
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