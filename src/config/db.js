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

        // Kết nối với các options cơ bản
        const conn = await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);

        return mongoose.connection;
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        // Không throw lỗi để ứng dụng vẫn chạy được
        return null;
    }
};

module.exports = connectDB; 