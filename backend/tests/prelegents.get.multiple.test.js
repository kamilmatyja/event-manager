const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

describe('GET /api/v1/prelegents', () => {
    let adminToken;
    let memberToken;
    let prelegent1User, prelegent2User;
    let prelegent1Record, prelegent2Record;

    beforeEach(async () => {

        const adminCredentials = {
            email: `get.prel.admin@test.com`,
            plainPassword: 'PasswordAdminGetPrel!',
            role: ROLES.ADMINISTRATOR
        };
        const memberCredentials = {
            email: `get.prel.member@test.com`,
            plainPassword: 'PasswordMemberGetPrel!',
            role: ROLES.MEMBER
        };
        const prelegent1Credentials = {
            email: `get.prel.user1@test.com`,
            nick: `prel_user1_${Date.now()}`,
            plainPassword: 'PasswordPrel1Get!',
            role: ROLES.MEMBER
        };
        const prelegent2Credentials = {
            email: `get.prel.user2@test.com`,
            nick: `prel_user2_${Date.now()}`,
            plainPassword: 'PasswordPrel2Get!',
            role: ROLES.MEMBER
        };

        const saltRounds = 10;
        const passwords = await Promise.all([
            bcrypt.hash(adminCredentials.plainPassword, saltRounds),
            bcrypt.hash(memberCredentials.plainPassword, saltRounds),
            bcrypt.hash(prelegent1Credentials.plainPassword, saltRounds),
            bcrypt.hash(prelegent2Credentials.plainPassword, saltRounds),
        ]);

        const [adminUser] = await db('users').insert({
            first_name: 'Admin',
            last_name: 'PrelGetter',
            nick: `admin_prel_getter_${Date.now()}`,
            email: adminCredentials.email,
            password: passwords[0],
            role: adminCredentials.role
        }).returning('*');
        const [memberUser] = await db('users').insert({
            first_name: 'Member',
            last_name: 'PrelGetter',
            nick: `member_prel_getter_${Date.now()}`,
            email: memberCredentials.email,
            password: passwords[1],
            role: memberCredentials.role
        }).returning('*');
        [prelegent1User] = await db('users').insert({
            first_name: 'Prelegent',
            last_name: 'One',
            nick: prelegent1Credentials.nick,
            email: prelegent1Credentials.email,
            password: passwords[2],
            role: prelegent1Credentials.role
        }).returning('*');
        [prelegent2User] = await db('users').insert({
            first_name: 'Prelegent',
            last_name: 'Two',
            nick: prelegent2Credentials.nick,
            email: prelegent2Credentials.email,
            password: passwords[3],
            role: prelegent2Credentials.role
        }).returning('*');

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const memberPayload = {id: memberUser.id, nick: memberUser.nick, role: memberUser.role, jti: uuidv4()};
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        [prelegent1Record] = await db('prelegents').insert({
            user_id: prelegent1User.id,
            name: `Prelegent Name 1 ${Date.now()}`,
            description: `Prelegent Desc 1 ${Date.now()}`
        }).returning('*');
        [prelegent2Record] = await db('prelegents').insert({
            user_id: prelegent2User.id,
            name: `Prelegent Name 2 ${Date.now()}`,
            description: `Prelegent Desc 2 ${Date.now()}`
        }).returning('*');
    });

    it('should return a list of all prelegents for an admin (200)', async () => {
        const response = await request(app)
            .get('/api/v1/prelegents')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(2);

        const receivedIds = response.body.map(p => p.id);
        expect(receivedIds).toContain(prelegent1Record.id);
        expect(receivedIds).toContain(prelegent2Record.id);

        const foundPrelegent = response.body.find(p => p.id === prelegent1Record.id);
        expect(foundPrelegent).toHaveProperty('id', prelegent1Record.id);
        expect(foundPrelegent).toHaveProperty('user_id', prelegent1User.id);
        expect(foundPrelegent).toHaveProperty('name', prelegent1Record.name);
        expect(foundPrelegent).toHaveProperty('description', prelegent1Record.description);

        expect(foundPrelegent).toHaveProperty('user_nick', prelegent1User.nick);
        expect(foundPrelegent).toHaveProperty('user_email', prelegent1User.email);
        expect(foundPrelegent).toHaveProperty('created_at');
        expect(foundPrelegent).toHaveProperty('updated_at');
    });

    it('should return an empty list if no prelegents exist (200)', async () => {

        await db('prelegents').whereIn('id', [prelegent1Record.id, prelegent2Record.id]).del();

        const response = await request(app)
            .get('/api/v1/prelegents')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(0);
    });

    it('should return 401 if no token is provided', async () => {
        const response = await request(app)
            .get('/api/v1/prelegents');
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const response = await request(app)
            .get('/api/v1/prelegents')
            .set('Authorization', 'Bearer invalidtoken123');
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin (member token)', async () => {
        const response = await request(app)
            .get('/api/v1/prelegents')
            .set('Authorization', `Bearer ${memberToken}`);
        expect(response.statusCode).toBe(403);
    });

});