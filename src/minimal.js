// Ứng dụng Express tối giản để kiểm tra trên Vercel
const express = require('express');
require('dotenv').config();

// Khởi tạo ứng dụng Express
const app = express();
app.use(express.json());

// Middleware để log tất cả các requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Cấu hình cho MongoDB Atlas Data API
const DATA_API_URL = 'https://data.mongodb-api.com/app/data-abcde/endpoint/data/v1'; // Thay thế bằng URL thực của bạn
const DATA_API_KEY = process.env.DATA_API_KEY || 'your-api-key'; // Thêm API key vào biến môi trường
const DATA_SOURCE = 'Cluster0'; // Tên data source (thường là tên cluster)
const DATABASE = 'test'; // Tên database

// Hàm gọi MongoDB Atlas Data API
async function callDataAPI(action, collection, payload) {
    try {
        const url = `${DATA_API_URL}/action/${action}`;
        const headers = {
            'Content-Type': 'application/json',
            'api-key': DATA_API_KEY
        };

        const body = {
            dataSource: DATA_SOURCE,
            database: DATABASE,
            collection: collection,
            ...payload
        };

        console.log(`Calling Data API: ${action} on collection ${collection}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Data API error (${response.status}): ${errorText}`);
            return { error: true, status: response.status, message: errorText };
        }

        return await response.json();
    } catch (err) {
        console.error('Error calling Data API:', err);
        return { error: true, message: err.message };
    }
}

// Kiểm tra kết nối đến MongoDB thông qua Data API
async function testConnection() {
    try {
        // Thử lấy một document từ collection test
        const result = await callDataAPI('findOne', 'test', {
            filter: {}
        });

        if (result.error) {
            console.error('Failed to connect to MongoDB via Data API:', result.message);
            return false;
        }

        console.log('Successfully connected to MongoDB via Data API');
        return true;
    } catch (err) {
        console.error('Error testing MongoDB connection:', err);
        return false;
    }
}

// Thử kết nối khi khởi động
let isConnected = false;
testConnection().then(connected => {
    isConnected = connected;
    console.log(`MongoDB connection status: ${isConnected ? 'connected' : 'disconnected'}`);
});

// Route đơn giản
app.get('/health', (req, res) => {
    // Thêm thông tin chi tiết về môi trường
    const envInfo = {
        NODE_ENV: process.env.NODE_ENV || 'not set',
        VERCEL: process.env.VERCEL || 'not set',
        DATA_API_KEY: DATA_API_KEY ? 'set' : 'not set',
        NODE_VERSION: process.version
    };

    res.status(200).json({
        status: 'OK',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        database: {
            status: isConnected ? 'connected' : 'disconnected',
            type: 'MongoDB Atlas Data API'
        },
        environment: envInfo
    });
});

// Route để kiểm tra Data API
app.get('/api-test', async (req, res) => {
    try {
        // Thử lấy một document từ collection test
        const result = await callDataAPI('findOne', 'test', {
            filter: {}
        });

        res.status(200).json({
            status: 'OK',
            result: result
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