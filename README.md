# VanLangBudget Backend

Backend API cho ứng dụng quản lý ngân sách VanLangBudget.

## Công nghệ sử dụng

- Node.js
- Express.js
- MongoDB
- Swagger UI
- Socket.io (cho tính năng real-time)

## Cài đặt

1. Clone repository:
```bash
git clone https://github.com/Hata214/BackEnd.git
cd BackEnd
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Tạo file `.env` trong thư mục gốc với nội dung:
```
NODE_ENV=development
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1d
```

4. Chạy ứng dụng:
```bash
npm start
```

## Cấu hình Vercel

Khi triển khai trên Vercel, bạn cần cấu hình các biến môi trường sau:

1. `NODE_ENV`: Đặt là "production"
2. `MONGODB_URI`: Chuỗi kết nối MongoDB của bạn
3. `JWT_SECRET`: Khóa bí mật cho JWT
4. `JWT_EXPIRES_IN`: Thời gian hết hạn của JWT

**Lưu ý quan trọng về bảo mật**: 
- Không bao giờ commit thông tin đăng nhập MongoDB vào mã nguồn
- Luôn sử dụng biến môi trường cho các thông tin nhạy cảm
- Đảm bảo MongoDB Atlas của bạn được cấu hình để chỉ chấp nhận kết nối từ các IP được phép

## API Documentation

Sau khi chạy ứng dụng, bạn có thể truy cập tài liệu API tại:
- Local: http://localhost:3000/api-docs
- Production: https://your-vercel-url.vercel.app/api-docs

## Tính năng

- Quản lý người dùng và xác thực
- Quản lý ngân sách
- Quản lý giao dịch
- Quản lý danh mục
- Thống kê tài chính
- Thông báo real-time
- API documentation với Swagger UI

## Cấu trúc dự án

```
src/
├── config/         # Cấu hình ứng dụng
├── controllers/    # Xử lý logic nghiệp vụ
├── middleware/     # Middleware
├── models/         # Mô hình dữ liệu
├── routes/         # Định tuyến API
├── services/       # Dịch vụ
├── utils/          # Tiện ích
└── app.js          # Điểm khởi đầu ứng dụng
```

## API Endpoints

### Auth Routes
- POST /api/auth/register - Đăng ký người dùng mới
- POST /api/auth/login - Đăng nhập
- POST /api/auth/logout - Đăng xuất

### User Routes
- GET /api/users/profile - Lấy thông tin người dùng
- PUT /api/users/profile - Cập nhật thông tin người dùng
- PUT /api/users/password - Đổi mật khẩu

## Bảo mật

- Mật khẩu được mã hóa bằng bcrypt
- JWT cho xác thực
- Rate limiting cho API endpoints
- Validation và sanitization cho input

## Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

[MIT License](LICENSE) 