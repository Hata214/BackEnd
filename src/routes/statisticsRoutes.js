const express = require('express');
const router = express.Router();
const Transaction = require('../models/transactionModel');
const { authMiddleware } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Statistics
 *   description: Financial statistics and reports API
 */

/**
 * @swagger
 * /api/statistics/summary:
 *   get:
 *     summary: Get financial summary for a specific period
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the summary (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the summary (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Financial summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalIncome:
 *                   type: number
 *                 totalExpense:
 *                   type: number
 *                 balance:
 *                   type: number
 *                 transactionCount:
 *                   type: number
 */
router.get('/summary', authMiddleware, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const query = { userId: req.user._id };

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        const summary = await Transaction.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalIncome: {
                        $sum: {
                            $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0]
                        }
                    },
                    totalExpense: {
                        $sum: {
                            $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0]
                        }
                    },
                    transactionCount: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalIncome: 1,
                    totalExpense: 1,
                    balance: { $subtract: ['$totalIncome', '$totalExpense'] },
                    transactionCount: 1
                }
            }
        ]);

        res.json(summary[0] || {
            totalIncome: 0,
            totalExpense: 0,
            balance: 0,
            transactionCount: 0
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * @swagger
 * /api/statistics/by-category:
 *   get:
 *     summary: Get transaction statistics grouped by category
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [income, expense]
 *         description: Filter by transaction type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Category-wise statistics
 */
router.get('/by-category', authMiddleware, async (req, res) => {
    try {
        const { type, startDate, endDate } = req.query;
        const query = { userId: req.user._id };

        if (type) query.type = type;
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        const categoryStats = await Transaction.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$categoryId',
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 },
                    transactions: {
                        $push: {
                            amount: '$amount',
                            description: '$description',
                            date: '$date'
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: '$category' },
            {
                $project: {
                    _id: 0,
                    categoryId: '$_id',
                    categoryName: '$category.name',
                    totalAmount: 1,
                    count: 1,
                    transactions: 1
                }
            }
        ]);

        res.json(categoryStats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * @swagger
 * /api/statistics/monthly:
 *   get:
 *     summary: Get monthly transaction statistics
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Year for monthly statistics
 *     responses:
 *       200:
 *         description: Monthly statistics
 */
router.get('/monthly', authMiddleware, async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);

        const monthlyStats = await Transaction.aggregate([
            {
                $match: {
                    userId: req.user._id,
                    date: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' },
                        type: '$type'
                    },
                    totalAmount: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: {
                        year: '$_id.year',
                        month: '$_id.month'
                    },
                    income: {
                        $sum: {
                            $cond: [{ $eq: ['$_id.type', 'income'] }, '$totalAmount', 0]
                        }
                    },
                    expense: {
                        $sum: {
                            $cond: [{ $eq: ['$_id.type', 'expense'] }, '$totalAmount', 0]
                        }
                    },
                    transactionCount: { $sum: '$count' }
                }
            },
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    month: '$_id.month',
                    income: 1,
                    expense: 1,
                    balance: { $subtract: ['$income', '$expense'] },
                    transactionCount: 1
                }
            },
            { $sort: { year: 1, month: 1 } }
        ]);

        res.json(monthlyStats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router; 