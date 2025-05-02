const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

describe('GET /api/v1/users/{id}', () => {
    let adminToken;
    let memberToken;
    let adminUser;
    let userToFetch;

    const adminCredentials = {
        email: 'getid.users.admin@test.com',
        plainPassword: 'PasswordAdminGetId!',
        role: ROLES.ADMINISTRATOR
    };
    const userToFetchCredentials = {
        email: 'getid.users.target@test.com',
        plainPassword: 'PasswordTargetGetId!',
        role: ROLES.MEMBER
    };
    const memberCredentials = {
        email: 'getid.users.member@test.com',
        plainPassword: 'PasswordMemberGetId!',
        role: ROLES.MEMBER
    };

    beforeEach(async () => {
        const saltRounds = 10;
        const adminHashedPassword = await bcrypt.hash(adminCredentials.plainPassword, saltRounds);
        const targetHashedPassword = await bcrypt.hash(userToFetchCredentials.plainPassword, saltRounds);
        const memberHashedPassword = await bcrypt.hash(memberCredentials.plainPassword, saltRounds);

        [adminUser] = await db('users').insert({
            first_name: 'Admin', last_name: 'GetterId', nick: 'admin_getter_id',
            email: adminCredentials.email, password: adminHashedPassword, role: adminCredentials.role
        }).returning('*');

        [userToFetch] = await db('users').insert({
            first_name: 'Target', last_name: 'User', nick: 'target_user_id',
            email: userToFetchCredentials.email, password: targetHashedPassword, role: userToFetchCredentials.role
        }).returning('*');

        const [accessingMember] = await db('users').insert({
            first_name: 'Member', last_name: 'GetterId', nick: 'member_getter_id',
            email: memberCredentials.email, password: memberHashedPassword, role: memberCredentials.role
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

    it('should return user data for an admin requesting an existing user (200)', async () => {
        const response = await request(app)
            .get(`/api/v1/users/${userToFetch.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body).not.toHaveProperty('password');
        expect(response.body.id).toBe(userToFetch.id);
        expect(response.body.email).toBe(userToFetch.email);
        expect(response.body.nick).toBe(userToFetch.nick);
        expect(response.body.role).toBe(userToFetch.role);
    });

    it('should return 401 if no token is provided', async () => {
        const response = await request(app)
            .get(`/api/v1/users/${userToFetch.id}`);

        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const response = await request(app)
            .get(`/api/v1/users/${userToFetch.id}`)
            .set('Authorization', 'Bearer invalidtoken123');

        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin (member token)', async () => {
        const response = await request(app)
            .get(`/api/v1/users/${userToFetch.id}`)
            .set('Authorization', `Bearer ${memberToken}`);

        expect(response.statusCode).toBe(403);
        expect(response.body).toHaveProperty('message', 'Forbidden: Insufficient permissions.');
    });

    it('should return 404 if user ID does not exist', async () => {
        const nonExistentId = userToFetch.id + 999;
        const response = await request(app)
            .get(`/api/v1/users/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(404);
        expect(response.body).toHaveProperty('message', 'User not found.');
    });

    it('should return 400 if user ID format is invalid', async () => {
        const invalidId = 'abc';
        const response = await request(app)
            .get(`/api/v1/users/${invalidId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(400);

        expect(response.body).toHaveProperty('message');

    });

});