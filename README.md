# VanLangBudget Backend

Backend API cho ứng dụng quản lý ngân sách VanLangBudget.

## Công nghệ sử dụng

- Node.js
- Express.js
- MongoDB
- JWT Authentication
- Swagger API Documentation
- Vercel Deployment

## Yêu cầu hệ thống

- Node.js (v14 trở lên)
- MongoDB
- npm hoặc yarn
- Tài khoản Vercel (cho deployment)

## Cài đặt

1. Clone repository:
```bash
git clone <your-repo-url>
cd vanlangbudget-backend
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Tạo file .env từ .env.example và cấu hình các biến môi trường:
```bash
cp .env.example .env
```

4. Chạy ứng dụng:
```bash
# Development
npm run dev

# Production
npm start
```

## Deploy lên Vercel

1. Đăng nhập vào [Vercel](https://vercel.com)
2. Import project từ GitHub
3. Cấu hình các biến môi trường trong Vercel:
   - `MONGODB_URI`: Connection string MongoDB của bạn
   - `JWT_SECRET`: Khóa bí mật cho JWT
   - Các biến môi trường khác từ file .env.example
4. Deploy!

## API Documentation

- Development: `http://localhost:3000/api-docs`
- Production: `https://your-vercel-url/api-docs`

## Tính năng

- [x] Xác thực người dùng (Đăng ký, Đăng nhập)
- [x] Quản lý người dùng
- [x] JWT Authentication
- [x] API Documentation với Swagger
- [x] Deployment với Vercel
- [ ] Quản lý ngân sách
- [ ] Theo dõi chi tiêu
- [ ] Báo cáo và thống kê

## Cấu trúc thư mục

```
src/
├── config/         # Cấu hình
├── controllers/    # Controllers
├── middleware/     # Middleware
├── models/        # Database models
├── routes/        # Route definitions
└── app.js         # App entry point
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