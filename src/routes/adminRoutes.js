const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware, roleMiddleware, superAdminMiddleware } = require('../middleware/auth');
const Feedback = require('../models/Feedback');

// Middleware to check for authentication and admin role
router.use(authMiddleware);
router.use(roleMiddleware(['admin', 'super_admin']));

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management API
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
router.get('/users', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Delete a user (Admin can delete users, Super Admin can delete both users and admins)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       403:
 *         description: Not authorized to delete this user
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.delete('/users/:id', async (req, res) => {
    try {
        // Find the user to be deleted
        const userToDelete = await User.findById(req.params.id);
        if (!userToDelete) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Find the user who is performing the delete action
        const currentUser = await User.findById(req.user.id);

        // Prevent deletion of super_admin accounts
        if (userToDelete.role === 'super_admin') {
            return res.status(403).json({ message: 'Super Admin accounts cannot be deleted' });
        }

        // If user to delete is an admin, only super_admin can delete them
        if (userToDelete.role === 'admin' && currentUser.role !== 'super_admin') {
            return res.status(403).json({ message: 'Only Super Admin can delete admin accounts' });
        }

        // Proceed with deletion
        await User.findByIdAndDelete(req.params.id);
        res.json({
            message: 'User deleted successfully',
            deletedUser: {
                id: userToDelete._id,
                email: userToDelete.email,
                role: userToDelete.role
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * @swagger
 * /api/admin/users/{id}/role:
 *   put:
 *     summary: Update user role (Super Admin only)
 *     description: Toggle user role between user and admin. Super Admin can promote user to admin (max 3) or demote admin to user.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: Role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User role successfully updated to admin
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [user, admin]
 *       400:
 *         description: Cannot promote - maximum admins reached or invalid operation
 *       403:
 *         description: Not authorized or cannot modify super_admin
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.put('/users/:id/role', superAdminMiddleware, async (req, res) => {
    try {
        // Kiểm tra user cần update có tồn tại không
        const userToUpdate = await User.findById(req.params.id);
        if (!userToUpdate) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Ngăn chặn việc thay đổi role của super_admin
        if (userToUpdate.role === 'super_admin') {
            return res.status(403).json({ message: 'Cannot change role of super_admin' });
        }

        // Xác định role mới (đảo ngược role hiện tại)
        const newRole = userToUpdate.role === 'admin' ? 'user' : 'admin';

        // Nếu đang thăng cấp lên admin, kiểm tra số lượng admin hiện tại
        if (newRole === 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount >= 3) {
                return res.status(400).json({
                    message: 'Cannot promote user to admin. Maximum number of admins (3) reached.'
                });
            }
        }

        // Cập nhật role
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { role: newRole },
            { new: true }
        ).select('-password');

        const action = newRole === 'admin' ? 'promoted to admin' : 'demoted to user';
        res.json({
            message: `User successfully ${action}`,
            user: updatedUser
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * @swagger
 * /api/admin/feedback:
 *   get:
 *     summary: Get all user feedback (Admin only)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of feedback
 */
router.get('/feedback', async (req, res) => {
    try {
        const feedback = await Feedback.find();
        res.json(feedback);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * @swagger
 * /api/admin/feedback/{id}:
 *   delete:
 *     summary: Delete a feedback (Admin only)
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Feedback deleted
 */
router.delete('/feedback/:id', async (req, res) => {
    try {
        const feedback = await Feedback.findByIdAndDelete(req.params.id);
        if (!feedback) return res.status(404).json({ message: 'Feedback not found' });
        res.json({ message: 'Feedback deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router; 