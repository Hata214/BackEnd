const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            connectTimeoutMS: 30000
        });
        console.log('MongoDB connected for admin creation');
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    }
};

const createAdminAccounts = async () => {
    try {
        await connectDB();

        // Tạo Super Admin nếu chưa tồn tại
        const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
        if (existingSuperAdmin) {
            console.log('Super admin already exists:', existingSuperAdmin.email);
        } else {
            const saltSuperAdmin = await bcrypt.genSalt(10);
            const hashedPasswordSuperAdmin = await bcrypt.hash(process.env.DEFAULT_SUPER_ADMIN_PASSWORD, saltSuperAdmin);

            const superAdmin = new User({
                username: 'Super Admin',
                email: process.env.DEFAULT_SUPER_ADMIN_EMAIL,
                password: hashedPasswordSuperAdmin,
                role: 'super_admin'
            });

            await superAdmin.save();
            console.log('Super admin created successfully:', superAdmin.email);
        }

        // Tạo Admin nếu chưa tồn tại
        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
            console.log('Admin already exists:', existingAdmin.email);
        } else {
            const saltAdmin = await bcrypt.genSalt(10);
            const hashedPasswordAdmin = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD, saltAdmin);

            const admin = new User({
                username: 'Admin',
                email: process.env.DEFAULT_ADMIN_EMAIL,
                password: hashedPasswordAdmin,
                role: 'admin'
            });

            await admin.save();
            console.log('Admin created successfully:', admin.email);
        }
    } catch (err) {
        console.error('Error creating admin accounts:', err.message);
    } finally {
        mongoose.connection.close(); // Đóng kết nối sau khi hoàn thành
    }
};

createAdminAccounts(); 