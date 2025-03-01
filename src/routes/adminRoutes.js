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
router.post('/set-admin', superAdminMiddleware, async (req, res) => {
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