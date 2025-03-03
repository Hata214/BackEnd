const mongoose = require('mongoose');

const connectDB = async () => {
    const maxRetries = 3;
    let retryCount = 0;

    const tryConnect = async () => {
        try {
            const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://hoang:A123456@dataweb.bptnx.mongodb.net/test?retryWrites=true&w=majority&appName=DataWeb';

            console.log('Attempting to connect to MongoDB...');

            const options = {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 30000, // Tăng timeout lên 30 giây
                heartbeatFrequencyMS: 2000,      // Giảm thời gian heartbeat
                socketTimeoutMS: 45000,
                maxPoolSize: 50,                 // Tăng kích thước pool
                minPoolSize: 10,                 // Đặt minimum pool size
                connectTimeoutMS: 30000,         // Tăng connect timeout
                retryWrites: true,
                w: 'majority',
                dbName: 'test'
            };

            // Thêm event listeners
            mongoose.connection.on('connected', () => {
                console.log('MongoDB connected successfully');
            });

            mongoose.connection.on('error', (err) => {
                console.error('MongoDB connection error:', err);
            });

            mongoose.connection.on('disconnected', () => {
                console.log('MongoDB disconnected');
                // Thử kết nối lại khi bị ngắt kết nối
                if (retryCount < maxRetries) {
                    retryCount++;
                    console.log(`Retrying connection... Attempt ${retryCount} of ${maxRetries}`);
                    setTimeout(tryConnect, 5000);
                }
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
            console.log('MongoDB Connected Successfully');
            retryCount = 0; // Reset retry count on successful connection

            // Bật debug mode trong môi trường development
            if (process.env.NODE_ENV === 'development') {
                mongoose.set('debug', true);
            }

            return mongoose.connection;

        } catch (err) {
            console.error('MongoDB connection error:', err.message);

            if (retryCount < maxRetries) {
                retryCount++;
                console.log(`Connection failed. Retrying... Attempt ${retryCount} of ${maxRetries}`);
                return new Promise(resolve => setTimeout(() => resolve(tryConnect()), 5000));
            } else {
                console.error('Max retry attempts reached. Could not connect to MongoDB.');
                throw err;
            }
        }
    };

    return tryConnect();
};

module.exports = connectDB; 