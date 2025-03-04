const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const userController = require('../controllers/userController');
const User = require('../models/userModel');
const Feedback = require('../models/Feedback');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management endpoints
 */

// Middleware để bảo vệ tất cả admin routes
router.use(auth);
router.use(checkRole(['admin', 'super_admin']));

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Get all users
 *     description: Get list of all users (Admin only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - Admin access required
 */
router.get('/users', async (req, res) => {
    try {
        console.log('Getting all users...');
        console.log('Current user:', req.user);

        const users = await User.find({}, '-password');
        console.log('Found users:', users.length);

        res.json({
            status: 'success',
            count: users.length,
            data: users
        });
    } catch (error) {
        console.error('Error in GET /users:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Get user by ID
 *     description: Get detailed user information (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - Admin access required
 *       404:
 *         description: User not found
 */
router.get('/users/:id', userController.getUserById);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete user
 *     description: Delete a user account (Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - Admin access required
 *       404:
 *         description: User not found
 */
router.delete('/users/:id', userController.deleteUser);

/**
 * @swagger
 * /api/admin/users/{id}/role:
 *   put:
 *     tags: [Admin]
 *     summary: Update user role
 *     description: Update user role (Super Admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *     responses:
 *       200:
 *         description: User role updated successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized - Super Admin access required
 *       404:
 *         description: User not found
 */
router.put('/users/:id/role', checkRole('super_admin'), userController.updateUserRole);

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

/**
 * @swagger
 * /api/admin/set-admin:
 *   post:
 *     summary: Set or remove admin role for a user (Super Admin only)
 *     description: Set or remove admin role for a user using their email. Maximum 3 admins allowed.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - action
 *             properties:
 *               email:
 *                 type: string
 *                 description: Email of the user to update
 *               action:
 *                 type: string
 *                 enum: [up, down]
 *                 description: Action to perform - up to promote to admin, down to demote to user
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
 *                 user:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *       400:
 *         description: Invalid action or maximum admins reached
 *       403:
 *         description: Not authorized or cannot modify super_admin
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post('/set-admin', checkRole('super_admin'), async (req, res) => {
    try {
        const { email, action } = req.body;

        if (!email || !action) {
            return res.status(400).json({ message: 'Email and action are required' });
        }

        if (!['up', 'down'].includes(action)) {
            return res.status(400).json({ message: 'Invalid action. Use "up" to promote to admin or "down" to demote to user' });
        }

        // Find user by email
        const userToUpdate = await User.findOne({ email });
        if (!userToUpdate) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent modifying super_admin
        if (userToUpdate.role === 'super_admin') {
            return res.status(403).json({ message: 'Cannot modify super_admin role' });
        }

        // Handle promotion to admin (up)
        if (action === 'up') {
            if (userToUpdate.role === 'admin') {
                return res.status(400).json({
                    message: 'Cannot promote: User is already an admin',
                    currentRole: userToUpdate.role
                });
            }

            // Count current admins (excluding the user being updated)
            const adminCount = await User.countDocuments({
                role: 'admin',
                _id: { $ne: userToUpdate._id }
            });

            if (adminCount >= 3) {
                return res.status(400).json({
                    message: 'Cannot promote user to admin. Maximum number of admins (3) reached.'
                });
            }

            userToUpdate.role = 'admin';
        }
        // Handle demotion to user (down)
        else if (action === 'down') {
            if (userToUpdate.role === 'user') {
                return res.status(400).json({
                    message: 'Cannot demote: User is already a regular user',
                    currentRole: userToUpdate.role
                });
            }

            userToUpdate.role = 'user';
        }

        // Save changes
        await userToUpdate.save();

        // Return response
        const actionText = action === 'up' ? 'promoted to admin' : 'demoted to user';
        res.json({
            message: `User successfully ${actionText}`,
            user: {
                email: userToUpdate.email,
                role: userToUpdate.role
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router; 