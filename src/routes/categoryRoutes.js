const express = require('express');
const router = express.Router();
const Category = require('../models/categoryModel');
const { authMiddleware } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Category management API
 */

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories for the logged-in user
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [income, expense]
 *         description: Filter categories by type
 *     responses:
 *       200:
 *         description: List of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 *       401:
 *         description: Not authenticated
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const query = { userId: req.user._id };
        if (req.query.type) {
            query.type = req.query.type;
        }

        const categories = await Category.find(query);
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get a category by ID
 *     tags: [Categories]
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
 *         description: Category details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       404:
 *         description: Category not found
 */
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const category = await Category.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Category'
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       400:
 *         description: Invalid input data
 */
router.post('/', authMiddleware, async (req, res) => {
    try {
        const category = new Category({
            ...req.body,
            userId: req.user._id
        });

        const newCategory = await category.save();
        res.status(201).json(newCategory);
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ message: 'Category name already exists' });
        } else {
            res.status(400).json({ message: error.message });
        }
    }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update a category
 *     tags: [Categories]
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
 *             $ref: '#/components/schemas/Category'
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       404:
 *         description: Category not found
 */
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const category = await Category.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { $set: req.body },
            { new: true, runValidators: true }
        );

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.json(category);
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ message: 'Category name already exists' });
        } else {
            res.status(400).json({ message: error.message });
        }
    }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     tags: [Categories]
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
 *         description: Category deleted successfully
 *       404:
 *         description: Category not found
 */
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const category = await Category.findOne({
            _id: req.params.id,
            userId: req.user._id,
            isDefault: false
        });

        if (!category) {
            return res.status(404).json({ message: 'Category not found or cannot delete default category' });
        }

        await category.remove();
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router; 