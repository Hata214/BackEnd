const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dns = require('dns').promises;
require('dotenv').config();

const app = express();

// Middleware cơ bản
app.use(express.json());
app.use(cors());

// Cấu hình DNS
dns.setServers(['8.8.8.8', '8.8.4.4']); // Sử dụng Google DNS

// Timeout promise helper
const timeoutPromise = (promise, timeout) => {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout)
        )
    ]);
};

// Kiểm tra và parse MongoDB URI
const parseMongoURI = (uri) => {
    try {
        const url = new URL(uri);
        return {
            valid: true,
            host: url.hostname,
            protocol: url.protocol,
            pathname: url.pathname,
            search: url.search
        };
    } catch (error) {
        return { valid: false, error: error.message };
    }
};

// Kết nối MongoDB với retry logic và xử lý lỗi chi tiết
const connectDB = async (retries = 5) => {
    while (retries > 0) {
        try {
            // Log để debug
            console.log('Attempting to connect to MongoDB...');
            console.log('MongoDB URI exists:', !!process.env.MONGODB_URI);
            console.log('Attempt remaining:', retries);

            if (!process.env.MONGODB_URI) {
                throw new Error('MONGODB_URI is not defined');
            }

            // Parse và validate URI
            const uriInfo = parseMongoURI(process.env.MONGODB_URI);
            if (!uriInfo.valid) {
                throw new Error(`Invalid MongoDB URI: ${uriInfo.error}`);
            }

            // Force disconnect nếu có kết nối cũ
            if (mongoose.connection.readyState !== 0) {
                await mongoose.disconnect();
                console.log('Cleaned up existing connections');
            }

            // Thử kết nối với timeout
            const conn = await timeoutPromise(
                mongoose.connect(process.env.MONGODB_URI, {
                    useNewUrlParser: true,
                    useUnifiedTopology: true,
                    serverSelectionTimeoutMS: 10000,
                    socketTimeoutMS: 10000,
                    connectTimeoutMS: 10000,
                    family: 4,
                    maxPoolSize: 1,
                    minPoolSize: 1,
                    retryWrites: true,
                    w: 'majority',
                    ssl: true,
                    authSource: 'admin',
                    directConnection: true
                }),
                15000
            );

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

            // Cleanup nếu timeout hoặc lỗi
            try {
                if (mongoose.connection.readyState !== 0) {
                    await mongoose.disconnect();
                }
            } catch (err) {
                console.error('Error during cleanup:', err);
            }

            retries -= 1;
            if (retries === 0) {
                console.error('Failed to connect to MongoDB after multiple retries');
                return false;
            }

            console.log(`Retrying in 3 seconds... (${retries} attempts remaining)`);
            await new Promise(resolve => setTimeout(resolve, 3000));
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

    // Thêm thông tin về DNS
    let dnsInfo = null;
    try {
        const url = new URL(mongodbUri);
        const records = await dns.resolve4(url.hostname);
        dnsInfo = {
            resolved: true,
            addresses: records,
            dnsServers: dns.getServers()
        };
    } catch (error) {
        dnsInfo = {
            resolved: false,
            error: error.message,
            dnsServers: dns.getServers()
        };
    }

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
        dns_info: dnsInfo,
        env_vars: {
            NODE_ENV: process.env.NODE_ENV,
            VERCEL: process.env.VERCEL,
            MONGODB_URI_SET: !!process.env.MONGODB_URI,
            NODE_OPTIONS: process.env.NODE_OPTIONS,
            UV_THREADPOOL_SIZE: process.env.UV_THREADPOOL_SIZE
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