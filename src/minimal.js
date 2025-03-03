// Ứng dụng Express tối giản để kiểm tra trên Vercel
const express = require('express');

// Khởi tạo ứng dụng Express
const app = express();

// Route đơn giản
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Server is running',
        timestamp: new Date().toISOString()
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