const express = require('express');
const router = express.Router();
const { validateSchema, schemas } = require('../middleware/validation');
const Transaction = require('../models/transactionModel');
const Category = require('../models/categoryModel');
const { authMiddleware } = require('../middleware/auth');
const websocketService = require('../services/websocketService');

/**
 * @swagger
 * components:
 *   schemas:
 *     Transaction:
 *       type: object
 *       required:
 *         - amount
 *         - type
 *         - category
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the transaction
 *         amount:
 *           type: number
 *           description: The amount of the transaction
 *         type:
 *           type: string
 *           enum: [income, expense]
 *           description: The type of transaction
 *         category:
 *           type: string
 *           description: The category of the transaction
 *         description:
 *           type: string
 *           description: Additional details about the transaction
 *         date:
 *           type: string
 *           format: date
 *           description: The date of the transaction
 *         budgetId:
 *           type: string
 *           description: The budget ID this transaction belongs to
 *         userId:
 *           type: string
 *           description: The user ID who made this transaction
 *       example:
 *         id: 60d21b4667d0d8992e610c87
 *         amount: 50000
 *         type: expense
 *         category: Food
 *         description: Lunch at restaurant
 *         date: 2023-08-15
 *         budgetId: 60d21b4667d0d8992e610c85
 *         userId: 60d21b4667d0d8992e610c80
 */

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Transaction management API
 */

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: Returns the list of all transactions
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: The list of transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 */
router.get('/', (req, res) => {
    res.json([
        {
            id: '60d21b4667d0d8992e610c87',
            amount: 50000,
            type: 'expense',
            category: 'Food',
            description: 'Lunch at restaurant',
            date: '2023-08-15',
            budgetId: '60d21b4667d0d8992e610c85',
            userId: '60d21b4667d0d8992e610c80'
        }
    ]);
});

/**
 * @swagger
 * /api/transactions/{id}:
 *   get:
 *     summary: Get a transaction by id
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The transaction id
 *     responses:
 *       200:
 *         description: The transaction description by id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       404:
 *         description: The transaction was not found
 */
router.get('/:id', (req, res) => {
    res.json({
        id: req.params.id,
        amount: 50000,
        type: 'expense',
        category: 'Food',
        description: 'Lunch at restaurant',
        date: '2023-08-15',
        budgetId: '60d21b4667d0d8992e610c85',
        userId: '60d21b4667d0d8992e610c80'
    });
});

/**
 * @swagger
 * /api/transactions:
 *   post:
 *     summary: Create a new transaction
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - type
 *               - categoryId
 *               - date
 *             properties:
 *               amount:
 *                 type: number
 *               type:
 *                 type: string
 *                 enum: [income, expense]
 *               categoryId:
 *                 type: string
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: The transaction was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       500:
 *         description: Server error
 */
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { amount, type, categoryId, description, date } = req.body;

        // Validate category exists
        const category = await Category.findOne({ _id: categoryId, userId: req.user._id });
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        const transaction = new Transaction({
            amount,
            type,
            categoryId,
            description,
            date: new Date(date),
            userId: req.user._id
        });

        await transaction.save();

        // Send real-time notification
        websocketService.notifyNewTransaction(req.user._id, transaction);

        // Check budget limit and notify if exceeded
        const categoryTransactions = await Transaction.find({
            userId: req.user._id,
            categoryId,
            type: 'expense',
            date: {
                $gte: new Date(new Date().setDate(1)), // Start of current month
                $lte: new Date() // Current date
            }
        });

        const totalAmount = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
        if (category.budgetLimit && totalAmount > category.budgetLimit) {
            websocketService.notifyBudgetLimit(req.user._id, category.name, totalAmount, category.budgetLimit);
        }

        // Update balance notification
        const allTransactions = await Transaction.find({ userId: req.user._id });
        const balance = allTransactions.reduce((sum, t) => {
            return sum + (t.type === 'income' ? t.amount : -t.amount);
        }, 0);
        websocketService.notifyBalanceUpdate(req.user._id, balance);

        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * @swagger
 * /api/transactions/{id}:
 *   put:
 *     summary: Update a transaction by id
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The transaction id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Transaction'
 *     responses:
 *       200:
 *         description: The transaction was updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       404:
 *         description: The transaction was not found
 *       500:
 *         description: Server error
 */
router.put('/:id', (req, res) => {
    res.json({
        id: req.params.id,
        ...req.body
    });
});

/**
 * @swagger
 * /api/transactions/{id}:
 *   delete:
 *     summary: Delete a transaction by id
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The transaction id
 *     responses:
 *       200:
 *         description: The transaction was deleted
 *       404:
 *         description: The transaction was not found
 */
router.delete('/:id', (req, res) => {
    res.json({ message: `Transaction ${req.params.id} deleted successfully` });
});

module.exports = router; 