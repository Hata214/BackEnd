const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        console.log('Connecting to MongoDB...');
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI is not defined');
            return null;
        }

        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4,
            maxPoolSize: 10,
            connectTimeoutMS: 10000,
            retryWrites: true
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error(`MongoDB connection error: ${error.message}`);
        // Không sử dụng process.exit() trong môi trường serverless
        return null;
    }
};

module.exports = connectDB; 