const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware cơ bản
app.use(express.json());
app.use(cors());

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

module.exports = app; 