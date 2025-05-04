const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

describe('GET /api/v1/users', () => {
    let adminToken;
    let memberToken;
    let adminUser;
    let memberUser;

    const adminCredentials = {
        email: 'get.users.admin@test.com',
        plainPassword: 'PasswordAdminGet!',
        role: ROLES.ADMINISTRATOR
    };
    const memberCredentials = {
        email: 'get.users.member@test.com',
        plainPassword: 'PasswordMemberGet!',
        role: ROLES.MEMBER
    };

    beforeEach(async () => {

        const saltRounds = 10;
        const adminHashedPassword = await bcrypt.hash(adminCredentials.plainPassword, saltRounds);
        const memberHashedPassword = await bcrypt.hash(memberCredentials.plainPassword, saltRounds);

        [adminUser] = await db('users').insert({
            first_name: 'Admin', last_name: 'Getter', nick: 'admin_getter',
            email: adminCredentials.email, password: adminHashedPassword, role: adminCredentials.role
        }).returning('*');

        [memberUser] = await db('users').insert({
            first_name: 'Member', last_name: 'Getter', nick: 'member_getter',
            email: memberCredentials.email, password: memberHashedPassword, role: memberCredentials.role
        }).returning('*');

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        const memberPayload = {id: memberUser.id, nick: memberUser.nick, role: memberUser.role, jti: uuidv4()};
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
    });

    it('should return a list of users for an admin (200)', async () => {
        const response = await request(app)
            .get('/api/v1/users')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);

        expect(response.body.length).toBeGreaterThanOrEqual(2);

        const userInResponse = response.body.find(u => u.id === adminUser.id);
        expect(userInResponse).toBeDefined();
        expect(userInResponse).not.toHaveProperty('password');
        expect(userInResponse).toHaveProperty('id', adminUser.id);
        expect(userInResponse).toHaveProperty('email', adminUser.email);
        expect(userInResponse).toHaveProperty('nick', adminUser.nick);
        expect(userInResponse).toHaveProperty('role', adminUser.role);
    });

    it('should return an empty list (or just the admin) if only admin exists (200)', async () => {

        await db('users').where({id: memberUser.id}).del();

        const response = await request(app)
            .get('/api/v1/users')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(1);
        expect(response.body[0].id).toBe(adminUser.id);
    });

    it('should return 401 if no token is provided', async () => {
        const response = await request(app)
            .get('/api/v1/users');

        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const response = await request(app)
            .get('/api/v1/users')
            .set('Authorization', 'Bearer invalidtoken123');

        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin (member token)', async () => {
        const response = await request(app)
            .get('/api/v1/users')
            .set('Authorization', `Bearer ${memberToken}`);

        expect(response.statusCode).toBe(403);
    });
});