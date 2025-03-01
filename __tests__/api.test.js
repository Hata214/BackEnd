const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');

describe('API Tests', () => {
    beforeAll(async () => {
        // Connect to test database
        await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/vanlang-budget-test');
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe('User Routes', () => {
        it('should register a new user', async () => {
            const res = await request(app)
                .post('/api/users/register')
                .send({
                    username: 'testuser',
                    email: 'test@example.com',
                    password: 'password123'
                });
            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('token');
        });

        it('should login user', async () => {
            const res = await request(app)
                .post('/api/users/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                });
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('token');
        });
    });

    describe('Budget Routes', () => {
        let token;
        let budgetId;

        beforeAll(async () => {
            // Login to get token
            const loginRes = await request(app)
                .post('/api/users/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                });
            token = loginRes.body.token;
        });

        it('should create new budget', async () => {
            const res = await request(app)
                .post('/api/budgets')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Test Budget',
                    amount: 1000000,
                    startDate: '2024-03-01',
                    endDate: '2024-03-31'
                });
            expect(res.statusCode).toBe(201);
            budgetId = res.body.id;
        });

        it('should get budget by id', async () => {
            const res = await request(app)
                .get(`/api/budgets/${budgetId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(res.statusCode).toBe(200);
            expect(res.body.name).toBe('Test Budget');
        });
    });
}); 