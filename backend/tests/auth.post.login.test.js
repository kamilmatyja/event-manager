const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');

describe('POST /api/v1/auth/login', () => {

    const testUserCredentials = {
        first_name: 'Login',
        last_name: 'User',
        nick: 'login_test_user',
        email: 'login@test.com',
        plainPassword: 'PasswordLogin123!',
        role: ROLES.MEMBER,
    };
    let hashedPassword;
    let testUserId;

    beforeEach(async () => {
        const saltRounds = 10;
        hashedPassword = await bcrypt.hash(testUserCredentials.plainPassword, saltRounds);

        try {

            await db('users').where({email: testUserCredentials.email}).del();

            const [createdUser] = await db('users')
                .insert({
                    first_name: testUserCredentials.first_name,
                    last_name: testUserCredentials.last_name,
                    nick: testUserCredentials.nick,
                    email: testUserCredentials.email,
                    password: hashedPassword,
                    role: testUserCredentials.role,
                })
                .returning('id');

            testUserId = typeof createdUser === 'object' ? createdUser.id : createdUser;
        } catch (error) {
            console.error(`[LOGIN TEST SETUP - beforeEach] Error:`, error.message);
            throw error;
        }
    });

    it('should login successfully with correct credentials (200)', async () => {
        const loginData = {
            email: testUserCredentials.email,
            password: testUserCredentials.plainPassword,
        };

        const response = await request(app)
            .post('/api/v1/auth/login')
            .send(loginData);

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user).not.toHaveProperty('password');
        expect(response.body.user.id).toBe(testUserId);
        expect(response.body.user.email).toBe(testUserCredentials.email);
        expect(response.body.user.nick).toBe(testUserCredentials.nick);
        expect(response.body.user.role).toBe(testUserCredentials.role);
    });

    it('should return 400 if email is missing', async () => {
        const loginData = {

            password: testUserCredentials.plainPassword,
        };
        const response = await request(app)
            .post('/api/v1/auth/login')
            .send(loginData);

        expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({path: 'email', msg: 'Email is required.'}),

            ])
        );

        expect(response.body.errors.some(err => err.path === 'email' && err.msg.includes('is required'))).toBe(true);
    });

    it('should return 400 if password is missing', async () => {
        const loginData = {
            email: testUserCredentials.email,

        };
        const response = await request(app)
            .post('/api/v1/auth/login')
            .send(loginData);

        expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({path: 'password', msg: 'Password is required.'})
            ])
        );
        expect(response.body.errors.some(err => err.path === 'password' && err.msg.includes('is required'))).toBe(true);
    });

    it('should return 400 for invalid email format', async () => {
        const loginData = {
            email: 'invalid-email',
            password: testUserCredentials.plainPassword,
        };
        const response = await request(app)
            .post('/api/v1/auth/login')
            .send(loginData);

        expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({path: 'email', msg: 'Invalid email format.'})
            ])
        );
        expect(response.body.errors.some(err => err.path === 'email' && err.msg.includes('Invalid email format'))).toBe(true);

    });

    it('should return 401 for incorrect password', async () => {
        const loginData = {
            email: testUserCredentials.email,
            password: 'WrongPassword123!',
        };
        const response = await request(app)
            .post('/api/v1/auth/login')
            .send(loginData);

        expect(response.statusCode).toBe(409);
        expect(response.body).toHaveProperty('message', 'Invalid credentials.');
        expect(response.body).not.toHaveProperty('errors');
    });

    it('should return 401 for non-existent email', async () => {
        const loginData = {
            email: 'nonexistent@test.com',
            password: 'anyPassword',
        };
        const response = await request(app)
            .post('/api/v1/auth/login')
            .send(loginData);

        expect(response.statusCode).toBe(409);
        expect(response.body).toHaveProperty('message', 'Invalid credentials.');
        expect(response.body).not.toHaveProperty('errors');
    });

});