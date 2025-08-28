import request from 'supertest';
import { app } from '../../../server.js';

describe('Admin Auth Routes', () => {
    describe('POST /api/admin/auth/login', () => {
        it('should login admin with valid credentials', async () => {
            const response = await request(app)
                .post('/api/admin/auth/login')
                .send({
                    email: 'admin@test.com',
                    password: 'adminpassword'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('token');
        });

        it('should reject invalid admin email', async () => {
            const response = await request(app)
                .post('/api/admin/auth/login')
                .send({
                    email: 'user@test.com',
                    password: 'password'
                });

            expect(response.status).toBe(401);
        });
    });

    describe('POST /api/admin/auth/forgot-password', () => {
        it('should send OTP for valid admin email', async () => {
            const response = await request(app)
                .post('/api/admin/auth/forgot-password')
                .send({
                    email: 'admin@test.com'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });
});
