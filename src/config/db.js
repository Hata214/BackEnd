const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        // Kiểm tra biến môi trường MONGODB_URI
        const mongoURI = process.env.MONGODB_URI;

        if (!mongoURI) {
            console.error('MONGODB_URI environment variable is not set');
            return null;
        }

        console.log('Attempting to connect to MongoDB...');

        // Cấu hình kết nối MongoDB tối ưu cho Vercel
        const conn = await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 60000,
            family: 4,
            retryWrites: true,
            w: 'majority',
            maxPoolSize: 10,
            minPoolSize: 1
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Thêm event listeners
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });

        // Xử lý khi ứng dụng đóng
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('MongoDB connection closed due to app termination');
            process.exit(0);
        });

        return conn;
    } catch (error) {
        console.error(`MongoDB connection error: ${error.message}`);
        if (error.name === 'MongoServerSelectionError') {
            console.error('MongoDB server selection error details:', error.reason);
        }
        if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
        return null;
    }
};

module.exports = connectDB; 