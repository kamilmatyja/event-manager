const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

const createValidNewUserData = (overrides = {}) => ({
    first_name: 'NewPost',
    last_name: 'UserPost',

    nick: `new_user_post_${Math.round(Math.random())}`,
    email: `new.user.post_${Math.random()}@test.com`,
    password: 'PasswordPost123!',
    role: ROLES.MEMBER,
    ...overrides,
});

describe('POST /api/v1/users', () => {
    let adminToken;
    let memberToken;
    let adminUser;
    let existingUser;

    const adminCredentials = {
        email: 'post.users.admin@test.com',
        plainPassword: 'PasswordAdminPost!',
        role: ROLES.ADMINISTRATOR
    };
    const memberCredentials = {
        email: 'post.users.member@test.com',
        plainPassword: 'PasswordMemberPost!',
        role: ROLES.MEMBER
    };
    const existingUserCredentials = {
        email: 'post.users.existing@test.com',
        nick: 'existing_post_user',
        plainPassword: 'PasswordExistingPost!',
        role: ROLES.MEMBER
    };

    beforeEach(async () => {
        const saltRounds = 10;
        const adminHashedPassword = await bcrypt.hash(adminCredentials.plainPassword, saltRounds);
        const memberHashedPassword = await bcrypt.hash(memberCredentials.plainPassword, saltRounds);
        const existingHashedPassword = await bcrypt.hash(existingUserCredentials.plainPassword, saltRounds);

        [adminUser] = await db('users').insert({
            first_name: 'Admin', last_name: 'Poster', nick: 'admin_poster',
            email: adminCredentials.email, password: adminHashedPassword, role: adminCredentials.role
        }).returning('*');

        const [accessingMember] = await db('users').insert({
            first_name: 'Member', last_name: 'Poster', nick: 'member_poster',
            email: memberCredentials.email, password: memberHashedPassword, role: memberCredentials.role
        }).returning('*');

        [existingUser] = await db('users').insert({
            first_name: 'Existing', last_name: 'PostUser', nick: existingUserCredentials.nick,
            email: existingUserCredentials.email, password: existingHashedPassword, role: existingUserCredentials.role
        }).returning('*');

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        const memberPayload = {
            id: accessingMember.id,
            nick: accessingMember.nick,
            role: accessingMember.role,
            jti: uuidv4()
        };
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
    });

    it('should create a new user with valid data and role (201)', async () => {
        const newUser = createValidNewUserData({role: ROLES.PRELEGENT});

        const response = await request(app)
            .post('/api/v1/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newUser);

        expect(response.statusCode).toBe(201);
        expect(response.body).not.toHaveProperty('password');
        expect(response.body).toHaveProperty('id');
        expect(response.body.email).toBe(newUser.email.toLowerCase());
        expect(response.body.nick).toBe(newUser.nick);
        expect(response.body.first_name).toBe(newUser.first_name);
        expect(response.body.last_name).toBe(newUser.last_name);
        expect(response.body.role).toBe(ROLES.PRELEGENT);
    });

    it('should create a new user with default member role if role is valid (201)', async () => {
        const newUser = createValidNewUserData({role: ROLES.MEMBER});

        const response = await request(app)
            .post('/api/v1/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newUser);

        expect(response.statusCode).toBe(201);
        expect(response.body.role).toBe(ROLES.MEMBER);
    });

    it('should return 401 if no token is provided', async () => {
        const newUser = createValidNewUserData();
        const response = await request(app)
            .post('/api/v1/users')
            .send(newUser);
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const newUser = createValidNewUserData();
        const response = await request(app)
            .post('/api/v1/users')
            .set('Authorization', 'Bearer invalidtoken123')
            .send(newUser);
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin (member token)', async () => {
        const newUser = createValidNewUserData();
        const response = await request(app)
            .post('/api/v1/users')
            .set('Authorization', `Bearer ${memberToken}`)
            .send(newUser);
        expect(response.statusCode).toBe(403);
    });

    const requiredFields = ['email', 'password', 'nick', 'first_name', 'last_name', 'role'];
    requiredFields.forEach(field => {
        it(`should return 400 if ${field} is missing`, async () => {
            const invalidUser = createValidNewUserData();
            delete invalidUser[field];
            const response = await request(app)
                .post('/api/v1/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(invalidUser);
            expect(response.statusCode).toBe(400);
            expect(response.body.errors.some(err => err.path === field && err.msg.includes('is required'))).toBe(true);
        });
    });

    it('should return 400 for invalid email format', async () => {
        const invalidUser = createValidNewUserData({email: 'invalid-email'});
        const response = await request(app)
            .post('/api/v1/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidUser);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'email' && err.msg.includes('Invalid email format'))).toBe(true);
    });

    it('should return 400 for invalid role value (string)', async () => {
        const invalidUser = createValidNewUserData({role: 'admin'});
        const response = await request(app)
            .post('/api/v1/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidUser);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'role' && err.msg.includes('must be an integer'))).toBe(true);
    });

    it('should return 400 for invalid role value (out of range)', async () => {
        const invalidUser = createValidNewUserData({role: 99});
        const response = await request(app)
            .post('/api/v1/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidUser);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'role' && err.msg.includes('must be one of'))).toBe(true);
    });

    it('should return 400 if email already exists', async () => {
        const newUserAttempt = createValidNewUserData({
            email: existingUser.email
        });
        const response = await request(app)
            .post('/api/v1/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newUserAttempt);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'email' && err.msg.includes('Email already exists.'))).toBe(true);
    });

    it('should return 400 if nick already exists', async () => {
        const newUserAttempt = createValidNewUserData({
            nick: existingUser.nick
        });
        const response = await request(app)
            .post('/api/v1/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newUserAttempt);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'nick' && err.msg.includes('Nick already exists.'))).toBe(true);
    });

});