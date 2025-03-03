// Ứng dụng Express tối giản để kiểm tra trên Vercel
const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

// Khởi tạo ứng dụng Express
const app = express();

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

        // Thử chuỗi kết nối khác cho Vercel
        if (process.env.VERCEL === '1') {
            console.log('Using alternative connection string for Vercel');
            // Thử sử dụng chuỗi kết nối không có các tham số phức tạp
            mongoURI = 'mongodb+srv://hoang:A123456@dataweb.bptnx.mongodb.net/test';
        }

        // Kết nối với các options cơ bản
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // Giảm timeout xuống 5 giây
            socketTimeoutMS: 45000, // Tăng socket timeout
        });

        console.log('MongoDB Connected Successfully');
        return mongoose.connection;
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        console.error('Error details:', err);
        // Không throw lỗi để ứng dụng vẫn chạy được
        return null;
    }
};

// Thử kết nối MongoDB nhưng không chờ đợi
connectDB().then(connection => {
    if (connection) {
        console.log('Database connected successfully');

        // Thêm các event listeners để theo dõi trạng thái kết nối
        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });

        mongoose.connection.on('error', (err) => {
            console.log('MongoDB connection error:', err);
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

    res.status(200).json({
        status: 'OK',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        database: {
            status: dbStatus,
            readyState: mongoose.connection ? mongoose.connection.readyState : 'none',
            vercel: process.env.VERCEL === '1' ? 'true' : 'false',
            mongodbUri: process.env.MONGODB_URI ? 'set' : 'not set'
        }
    });
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