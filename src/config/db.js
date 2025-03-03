const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Kiểm tra biến môi trường
        const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://hoang:A123456@dataweb.bptnx.mongodb.net/test?retryWrites=true&w=majority&appName=DataWeb';

        // Cấu hình kết nối
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4,
            retryWrites: true,
            w: 'majority',
            dbName: 'test' // Chỉ định database name
        };

        // Thêm event listeners trước khi kết nối
        mongoose.connection.on('connected', () => {
            console.log('MongoDB connected successfully');
        });

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

        // Thực hiện kết nối
        await mongoose.connect(mongoURI, options);
        console.log('MongoDB Connected...');

        // Bật debug mode trong môi trường development
        if (process.env.NODE_ENV === 'development') {
            mongoose.set('debug', true);
        }

        return mongoose.connection;

    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        // Thử kết nối lại sau 5 giây nếu thất bại
        setTimeout(() => {
            console.log('Retrying MongoDB connection...');
            connectDB();
        }, 5000);
    }
};

module.exports = connectDB; 