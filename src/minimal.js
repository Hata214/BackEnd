// Ứng dụng Express tối giản để kiểm tra trên Vercel
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

// Khởi tạo ứng dụng Express
const app = express();

// Middleware để log tất cả các requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Kết nối MongoDB
const connectDB = async () => {
    try {
        // Kiểm tra biến môi trường MONGODB_URI
        let mongoURI = process.env.MONGODB_URI;

        if (!mongoURI) {
            console.error('MONGODB_URI environment variable is not set');
            return null;
        }

        // Log thông tin kết nối (che password)
        const logURI = mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
        console.log(`Attempting to connect to MongoDB with URI: ${logURI}`);
        console.log(`Running on Vercel: ${process.env.VERCEL ? 'Yes' : 'No'}`);
        console.log(`Node.js version: ${process.version}`);
        console.log(`Mongoose version: ${mongoose.version}`);

        // Thử chuỗi kết nối khác cho Vercel
        if (process.env.VERCEL === '1') {
            console.log('Using alternative connection string for Vercel');

            // Thử sử dụng chuỗi kết nối với DNS Seedlist format
            mongoURI = 'mongodb+srv://hoang:A123456@dataweb.bptnx.mongodb.net/test?retryWrites=true&w=majority';

            // Log chuỗi kết nối mới
            const newLogURI = mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
            console.log(`New connection string: ${newLogURI}`);
        }

        // Kết nối với các options cơ bản
        const mongooseOptions = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000, // 10 giây
            socketTimeoutMS: 45000, // 45 giây
        };

        console.log('Mongoose options:', JSON.stringify(mongooseOptions));

        // Thử kết nối
        await mongoose.connect(mongoURI, mongooseOptions);

        console.log('MongoDB Connected Successfully');
        return mongoose.connection;
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        console.error('Error code:', err.code);
        console.error('Error name:', err.name);

        if (err.reason) {
            console.error('Error reason:', err.reason);
        }

        // Không throw lỗi để ứng dụng vẫn chạy được
        return null;
    }
};

// Thử kết nối MongoDB nhưng không chờ đợi
connectDB().then(connection => {
    if (connection) {
        console.log('Database connected successfully');
        console.log('Connection state:', connection.readyState);

        // Thêm các event listeners để theo dõi trạng thái kết nối
        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });

        mongoose.connection.on('error', (err) => {
            console.log('MongoDB connection error:', err);
        });

        mongoose.connection.on('connected', () => {
            console.log('MongoDB connected');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
        });
    } else {
        console.warn('Running without database connection');
    }
}).catch(err => {
    console.error('Failed to connect to database:', err.message);
});

// Route đơn giản
app.get('/health', (req, res) => {
    const dbStatus = mongoose.connection ?
        (mongoose.connection.readyState === 1 ? 'connected' : 'disconnected') :
        'not initialized';

    // Thêm thông tin chi tiết về môi trường
    const envInfo = {
        NODE_ENV: process.env.NODE_ENV || 'not set',
        VERCEL: process.env.VERCEL || 'not set',
        MONGODB_URI: process.env.MONGODB_URI ? 'set' : 'not set',
        NODE_VERSION: process.version,
        MONGOOSE_VERSION: mongoose.version
    };

    res.status(200).json({
        status: 'OK',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        database: {
            status: dbStatus,
            readyState: mongoose.connection ? mongoose.connection.readyState : 'none',
            connectionError: mongoose.connection && mongoose.connection.error ?
                mongoose.connection.error.message : 'none'
        },
        environment: envInfo
    });
});

// Route để kiểm tra DNS
app.get('/dns-test', async (req, res) => {
    try {
        const dns = require('dns');
        const util = require('util');
        const lookup = util.promisify(dns.lookup);
        const resolve = util.promisify(dns.resolve);

        const host = 'dataweb.bptnx.mongodb.net';

        const lookupResult = await lookup(host);
        const resolveResult = await resolve(host);

        res.status(200).json({
            status: 'OK',
            dns: {
                lookup: lookupResult,
                resolve: resolveResult
            }
        });
    } catch (err) {
        res.status(500).json({
            status: 'error',
            message: err.message,
            stack: err.stack
        });
    }
});

// Route favicon
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// Route mặc định
app.get('/', (req, res) => {
    res.status(200).send('VanLangBudget API is running');
});

// Xử lý lỗi 404
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route not found'
    });
});

// Xác định port
const PORT = process.env.PORT || 3000;

// Khởi động server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app; 