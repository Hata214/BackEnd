const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Chỉ sử dụng biến môi trường, không hardcode thông tin đăng nhập
        const mongoURI = process.env.MONGODB_URI;

        if (!mongoURI) {
            console.error('MONGODB_URI environment variable is not set');
            return null;
        }

        console.log('Attempting to connect to MongoDB...');

        // Kết nối với các options cơ bản
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('MongoDB Connected Successfully');

        // Thêm event listeners
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });

        // Xử lý đóng kết nối khi ứng dụng dừng
        process.on('SIGINT', async () => {
            try {
                await mongoose.connection.close();
                console.log('MongoDB connection closed through app termination');
                process.exit(0);
            } catch (err) {
                console.error('Error closing MongoDB connection:', err);
                process.exit(1);
            }
        });

        return mongoose.connection;
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        console.error('Could not connect to MongoDB');
        // Không throw lỗi để ứng dụng vẫn chạy được
        return null;
    }
};

module.exports = connectDB; 