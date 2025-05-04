const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

describe('GET /api/v1/prelegents/{id}', () => {
    let adminToken;
    let memberToken;
    let prelegentUser;
    let prelegentToFetch;

    beforeEach(async () => {

        const adminCredentials = {
            email: `getid.prel.admin@test.com`,
            plainPassword: 'PasswordAdminGetIdPrel!',
            role: ROLES.ADMINISTRATOR
        };
        const memberCredentials = {
            email: `getid.prel.member@test.com`,
            plainPassword: 'PasswordMemberGetIdPrel!',
            role: ROLES.MEMBER
        };
        const prelegentCredentials = {
            email: `getid.prel.user@test.com`,
            nick: `prel_user_getid_${Date.now()}`,
            plainPassword: 'PasswordPrelGetId!',
            role: ROLES.MEMBER
        };

        const saltRounds = 10;
        const passwords = await Promise.all([
            bcrypt.hash(adminCredentials.plainPassword, saltRounds),
            bcrypt.hash(memberCredentials.plainPassword, saltRounds),
            bcrypt.hash(prelegentCredentials.plainPassword, saltRounds),
        ]);

        const [adminUser] = await db('users').insert({
            first_name: 'Admin',
            last_name: 'PrelGetterId',
            nick: `admin_prel_getter_id_${Date.now()}`,
            email: adminCredentials.email,
            password: passwords[0],
            role: adminCredentials.role
        }).returning('*');
        const [memberUser] = await db('users').insert({
            first_name: 'Member',
            last_name: 'PrelGetterId',
            nick: `member_prel_getter_id_${Date.now()}`,
            email: memberCredentials.email,
            password: passwords[1],
            role: memberCredentials.role
        }).returning('*');
        [prelegentUser] = await db('users').insert({
            first_name: 'Prelegent',
            last_name: 'GetId',
            nick: prelegentCredentials.nick,
            email: prelegentCredentials.email,
            password: passwords[2],
            role: prelegentCredentials.role
        }).returning('*');

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const memberPayload = {id: memberUser.id, nick: memberUser.nick, role: memberUser.role, jti: uuidv4()};
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        [prelegentToFetch] = await db('prelegents').insert({
            user_id: prelegentUser.id,
            name: `Prelegent To Fetch ${Date.now()}`,
            description: `Prelegent Desc To Fetch ${Date.now()}`
        }).returning('*');
    });

    it('should return prelegent data for an existing ID for an admin (200)', async () => {
        const response = await request(app)
            .get(`/api/v1/prelegents/${prelegentToFetch.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('id', prelegentToFetch.id);
        expect(response.body).toHaveProperty('user_id', prelegentUser.id);
        expect(response.body).toHaveProperty('name', prelegentToFetch.name);
        expect(response.body).toHaveProperty('description', prelegentToFetch.description);

        expect(response.body).toHaveProperty('user_nick', prelegentUser.nick);
        expect(response.body).toHaveProperty('user_email', prelegentUser.email);
        expect(response.body).toHaveProperty('created_at');
        expect(response.body).toHaveProperty('updated_at');
    });

    it('should return 404 if prelegent ID does not exist', async () => {
        const nonExistentId = prelegentToFetch.id + 999;
        const response = await request(app)
            .get(`/api/v1/prelegents/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(404);
    });

    it('should return 400 if prelegent ID format is invalid', async () => {
        const invalidId = 'invalid-id';
        const response = await request(app)
            .get(`/api/v1/prelegents/${invalidId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(400);
    });
});