const express = require('express');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Budget:
 *       type: object
 *       required:
 *         - name
 *         - amount
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the budget
 *         name:
 *           type: string
 *           description: The name of the budget
 *         amount:
 *           type: number
 *           description: The total amount of the budget
 *         startDate:
 *           type: string
 *           format: date
 *           description: The start date of the budget
 *         endDate:
 *           type: string
 *           format: date
 *           description: The end date of the budget
 *         userId:
 *           type: string
 *           description: The user ID who owns this budget
 *       example:
 *         id: 60d21b4667d0d8992e610c85
 *         name: Monthly Budget
 *         amount: 1000000
 *         startDate: 2023-08-01
 *         endDate: 2023-08-31
 *         userId: 60d21b4667d0d8992e610c80
 */

/**
 * @swagger
 * tags:
 *   name: Budgets
 *   description: Budget management API
 */

/**
 * @swagger
 * /api/budgets:
 *   get:
 *     summary: Returns the list of all budgets
 *     tags: [Budgets]
 *     responses:
 *       200:
 *         description: The list of budgets
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Budget'
 */
router.get('/', (req, res) => {
    res.json([
        {
            id: '60d21b4667d0d8992e610c85',
            name: 'Monthly Budget',
            amount: 1000000,
            startDate: '2023-08-01',
            endDate: '2023-08-31',
            userId: '60d21b4667d0d8992e610c80'
        }
    ]);
});

/**
 * @swagger
 * /api/budgets/{id}:
 *   get:
 *     summary: Get a budget by id
 *     tags: [Budgets]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The budget id
 *     responses:
 *       200:
 *         description: The budget description by id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Budget'
 *       404:
 *         description: The budget was not found
 */
router.get('/:id', (req, res) => {
    res.json({
        id: req.params.id,
        name: 'Monthly Budget',
        amount: 1000000,
        startDate: '2023-08-01',
        endDate: '2023-08-31',
        userId: '60d21b4667d0d8992e610c80'
    });
});

/**
 * @swagger
 * /api/budgets:
 *   post:
 *     summary: Create a new budget
 *     tags: [Budgets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Budget'
 *     responses:
 *       201:
 *         description: The budget was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Budget'
 *       500:
 *         description: Server error
 */
router.post('/', (req, res) => {
    res.status(201).json({
        id: '60d21b4667d0d8992e610c86',
        ...req.body
    });
});

/**
 * @swagger
 * /api/budgets/{id}:
 *   put:
 *     summary: Update a budget by id
 *     tags: [Budgets]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The budget id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Budget'
 *     responses:
 *       200:
 *         description: The budget was updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Budget'
 *       404:
 *         description: The budget was not found
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
 * /api/budgets/{id}:
 *   delete:
 *     summary: Delete a budget by id
 *     tags: [Budgets]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The budget id
 *     responses:
 *       200:
 *         description: The budget was deleted
 *       404:
 *         description: The budget was not found
 */
router.delete('/:id', (req, res) => {
    res.json({ message: `Budget ${req.params.id} deleted successfully` });
});

module.exports = router; 