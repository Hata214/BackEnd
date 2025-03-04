// Đơn giản hóa triệt để - chỉ import app từ src/app.js
const app = require('./src/app');
const port = process.env.PORT || 3000;

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

module.exports = app; 