const request = require('supertest');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');

const createValidUserData = (overrides = {}) => ({
    first_name: 'ValidFName',
    last_name: 'ValidLName',
    nick: `valid_nick_${Date.now()}_${Math.random()}`,
    email: `valid_${Date.now()}_${Math.random()}@test.com`,
    password: 'Password123!',
    ...overrides,
});

describe('POST /api/v1/auth/register', () => {

    it('should register a new user successfully with valid data (201)', async () => {
        const newUser = createValidUserData({
            first_name: 'Happy',
            last_name: 'Rabbit',
            nick: 'happy_reg_user',
            email: 'happy.reg@test.com'
        });
        const response = await request(app)
            .post('/api/v1/auth/register')
            .send(newUser);

        expect(response.statusCode).toBe(201);

    });

    const requiredFields = ['email', 'password', 'nick', 'first_name', 'last_name'];
    requiredFields.forEach(field => {
        it(`should return 400 if ${field} is missing`, async () => {

            const invalidUser = createValidUserData();
            delete invalidUser[field];

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(invalidUser);

            expect(response.statusCode).toBe(400);
            expect(response.body).toHaveProperty('errors');

            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({

                        path: field,
                        msg: expect.stringContaining('is required'),
                    })
                ])
            );
        });
    });

    it('should return 400 for invalid email format', async () => {

        const invalidUser = createValidUserData({email: 'invalid-email-format'});
        const response = await request(app)
            .post('/api/v1/auth/register')
            .send(invalidUser);

        expect(response.statusCode).toBe(400);
        expect(response.body.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({path: 'email', msg: 'Invalid email format.'})
            ])
        );
    });

    it('should return 400 for password too short', async () => {
        const invalidUser = createValidUserData({password: 'Pass1'});
        const response = await request(app)
            .post('/api/v1/auth/register')
            .send(invalidUser);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({path: 'password', msg: expect.stringContaining('at least 8 characters')})
            ])
        );
    });

    it('should return 400 for password without number', async () => {
        const invalidUser = createValidUserData({password: 'PasswordWithoutDigit'});
        const response = await request(app)
            .post('/api/v1/auth/register')
            .send(invalidUser);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({path: 'password', msg: expect.stringContaining('contain at least one number')})
            ])
        );
    });

    it('should return 400 for password without letter', async () => {
        const invalidUser = createValidUserData({password: '1234567890'});
        const response = await request(app)
            .post('/api/v1/auth/register')
            .send(invalidUser);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({path: 'password', msg: expect.stringContaining('contain at least one letter')})
            ])
        );
    });

    it('should return 400 for invalid nick format (special chars)', async () => {
        const invalidUser = createValidUserData({nick: 'bad-nick!'});
        const response = await request(app)
            .post('/api/v1/auth/register')
            .send(invalidUser);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    path: 'nick',
                    msg: expect.stringContaining('letters, numbers, and underscores')
                })
            ])
        );
    });

    const lengthFields = [
        {field: 'nick', min: 5, max: 100},
        {field: 'first_name', min: 5, max: 100},
        {field: 'last_name', min: 5, max: 100},
    ];

    lengthFields.forEach(({field, min, max}) => {
        it(`should return 400 if ${field} is too short`, async () => {
            const invalidUser = createValidUserData({[field]: 'a'.repeat(min - 1)});
            const response = await request(app).post('/api/v1/auth/register').send(invalidUser);
            expect(response.statusCode).toBe(400);
            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({path: field, msg: expect.stringContaining(`be between ${min} and ${max}`)})
                ])
            );
        });

        it(`should return 400 if ${field} is too long`, async () => {
            const invalidUser = createValidUserData({[field]: 'a'.repeat(max + 1)});
            const response = await request(app).post('/api/v1/auth/register').send(invalidUser);
            expect(response.statusCode).toBe(400);
            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({path: field, msg: expect.stringContaining(`be between ${min} and ${max}`)})
                ])
            );
        });
    });

    describe('Conflict Tests', () => {
        const existingUserData = createValidUserData({
            first_name: 'ConflictReg',
            last_name: 'User',
            nick: 'conflict_reg_user_unique',
            email: 'conflict.register@test.com',
            role: ROLES.MEMBER
        });

        beforeEach(async () => {
            const bcrypt = require('bcrypt');
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(existingUserData.password, saltRounds);
            try {
                await db('users').insert({
                    first_name: existingUserData.first_name,
                    last_name: existingUserData.last_name,
                    nick: existingUserData.nick,
                    email: existingUserData.email,
                    password: hashedPassword,
                    role: existingUserData.role
                });
            } catch (error) {
                console.error(`[CONFLICT TEST SETUP - beforeEach] Error inserting user ${existingUserData.email}:`, error.message);
                throw error;
            }
        });

        it('should return 400 if email already exists', async () => {

            const newUserAttempt = createValidUserData({
                email: existingUserData.email,
                nick: 'new_nick_for_email_conflict'
            });

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(newUserAttempt);

            expect(response.statusCode).toBe(400);
            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        path: 'email',
                        msg: expect.stringContaining('Email already exists.')
                    })
                ])
            );
        });

        it('should return 400 if nick already exists', async () => {

            const newUserAttempt = createValidUserData({
                nick: existingUserData.nick,
                email: 'new_email_for_nick_conflict@test.com'
            });

            const response = await request(app)
                .post('/api/v1/auth/register')
                .send(newUserAttempt);

            expect(response.statusCode).toBe(400);
            expect(response.body.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        path: 'nick',
                        msg: expect.stringContaining('Nick already exists.')
                    })
                ])
            );
        });
    });
});