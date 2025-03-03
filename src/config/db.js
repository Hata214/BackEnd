const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Kiểm tra môi trường
        const isVercel = process.env.VERCEL === '1';

        // Sử dụng chuỗi kết nối khác nhau cho Vercel và local
        let mongoURI;
        if (isVercel) {
            // Chuỗi kết nối cho Vercel (không sử dụng DNS SRV)
            mongoURI = 'mongodb://hoang:A123456@dataweb.bptnx.mongodb.net:27017/test';
        } else {
            // Chuỗi kết nối cho local
            mongoURI = process.env.MONGODB_URI || 'mongodb+srv://hoang:A123456@dataweb.bptnx.mongodb.net/test?retryWrites=true&w=majority';
        }

        console.log(`Attempting to connect to MongoDB on ${isVercel ? 'Vercel' : 'local'}...`);

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