const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Kiểm tra biến môi trường MONGODB_URI
        const mongoURI = process.env.MONGODB_URI;

        if (!mongoURI) {
            console.error('MONGODB_URI environment variable is not set');
            return null;
        }

        console.log('Attempting to connect to MongoDB...');

        // Thêm timeout dài hơn cho kết nối Vercel
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000, // Tăng timeout lên 30 giây
            socketTimeoutMS: 45000, // Tăng socket timeout
            connectTimeoutMS: 30000, // Tăng connect timeout
            keepAlive: true,
            keepAliveInitialDelay: 300000 // 5 phút
        };

        // Thử kết nối với MongoDB
        const conn = await mongoose.connect(mongoURI, options);

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

        return mongoose.connection;
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        // Thêm thông tin chi tiết hơn về lỗi
        if (err.name === 'MongoServerSelectionError') {
            console.error('Could not select MongoDB server. Check network connectivity and MongoDB status.');
        }
        // Không throw lỗi để ứng dụng vẫn chạy được
        return null;
    }
};

module.exports = connectDB; 