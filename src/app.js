const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware cơ bản
app.use(express.json());
app.use(cors());

// Kết nối MongoDB
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return true;
    } catch (error) {
        console.error(`Error: ${error.message}`);
        return false;
    }
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
    res.status(200).json({
        environment: process.env.NODE_ENV || 'development',
        mongodb_status: isConnected ? 'connected' : 'disconnected',
        mongodb_uri_exists: !!process.env.MONGODB_URI,
        mongodb_uri_prefix: process.env.MONGODB_URI ? `${process.env.MONGODB_URI.split('@')[0].split('://')[0]}://*****@${process.env.MONGODB_URI.split('@')[1]}` : null,
        vercel_environment: process.env.VERCEL || false,
        node_version: process.version,
        memory_usage: process.memoryUsage(),
        uptime: process.uptime()
    });
});

// Kết nối MongoDB khi khởi động
connectDB().then((connected) => {
    if (!connected) {
        console.log('Warning: Starting server without MongoDB connection');
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        status: 'error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
        path: req.url
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