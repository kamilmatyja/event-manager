const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

const createValidSponsorData = (overrides = {}) => ({
    name: `Test Sponsor Post ${Date.now()}`,
    description: `Test Sponsor Desc Post ${Date.now()}`,
    ...overrides,
});

describe('POST /api/v1/sponsors', () => {
    let adminToken;
    let memberToken;
    let existingSponsor;

    beforeEach(async () => {

        const adminCredentials = {
            email: `post.spon.admin@test.com`,
            plainPassword: 'PasswordAdminPostSpon!',
            role: ROLES.ADMINISTRATOR
        };
        const memberCredentials = {
            email: `post.spon.member@test.com`,
            plainPassword: 'PasswordMemberPostSpon!',
            role: ROLES.MEMBER
        };
        const saltRounds = 10;
        const adminHashedPassword = await bcrypt.hash(adminCredentials.plainPassword, saltRounds);
        const memberHashedPassword = await bcrypt.hash(memberCredentials.plainPassword, saltRounds);

        const [adminUser] = await db('users').insert({
            first_name: 'Admin', last_name: 'SponPoster', nick: `admin_spon_poster_${Date.now()}`,
            email: adminCredentials.email, password: adminHashedPassword, role: adminCredentials.role
        }).returning('*');
        const [memberUser] = await db('users').insert({
            first_name: 'Member', last_name: 'SponPoster', nick: `member_spon_poster_${Date.now()}`,
            email: memberCredentials.email, password: memberHashedPassword, role: memberCredentials.role
        }).returning('*');

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const memberPayload = {id: memberUser.id, nick: memberUser.nick, role: memberUser.role, jti: uuidv4()};
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        [existingSponsor] = await db('sponsors').insert({
            name: 'Existing Sponsor Name',
            description: 'Existing Sponsor Description'
        }).returning('*');
    });

    it('should create a new sponsor with valid data as admin (201)', async () => {
        const newSponsor = createValidSponsorData();

        const response = await request(app)
            .post('/api/v1/sponsors')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newSponsor);

        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe(newSponsor.name);
        expect(response.body.description).toBe(newSponsor.description);
        expect(response.body).toHaveProperty('created_at');
        expect(response.body).toHaveProperty('updated_at');

        const createdSponsor = await db('sponsors').where({id: response.body.id}).first();
        expect(createdSponsor).toBeDefined();
        expect(createdSponsor.name).toBe(newSponsor.name);
    });

    it('should return 401 if no token is provided', async () => {
        const newSponsor = createValidSponsorData();
        const response = await request(app)
            .post('/api/v1/sponsors')
            .send(newSponsor);
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const newSponsor = createValidSponsorData();
        const response = await request(app)
            .post('/api/v1/sponsors')
            .set('Authorization', 'Bearer invalidtoken123')
            .send(newSponsor);
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin (member token)', async () => {
        const newSponsor = createValidSponsorData();
        const response = await request(app)
            .post('/api/v1/sponsors')
            .set('Authorization', `Bearer ${memberToken}`)
            .send(newSponsor);
        expect(response.statusCode).toBe(403);
    });

    it('should return 400 if name is missing', async () => {
        const invalidData = createValidSponsorData();
        delete invalidData.name;

        const response = await request(app)
            .post('/api/v1/sponsors')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidData);

        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'name' && err.msg.includes('is required'))).toBe(true);
    });

    it('should return 400 if description is missing', async () => {
        const invalidData = createValidSponsorData();
        delete invalidData.description;

        const response = await request(app)
            .post('/api/v1/sponsors')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidData);

        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'description' && err.msg.includes('is required'))).toBe(true);
    });

    it('should return 400 if name is too short/long (assuming limits exist)', async () => {
        const invalidDataShort = createValidSponsorData({name: 'A'});
        const responseShort = await request(app)
            .post('/api/v1/sponsors')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidDataShort);

        expect(responseShort.statusCode).toBe(400);
        expect(responseShort.body.errors.some(err => err.path === 'name' && err.msg.includes('characters'))).toBe(true);
    });

    it('should return 400 if sponsor name already exists', async () => {
        const newSponsorAttempt = createValidSponsorData({
            name: existingSponsor.name
        });
        const response = await request(app)
            .post('/api/v1/sponsors')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newSponsorAttempt);

        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'name' && err.msg.includes('Sponsor name already exists.'))).toBe(true);
    });

    it('should return 400 if sponsor description already exists', async () => {
        const newSponsorAttempt = createValidSponsorData({
            description: existingSponsor.description
        });
        const response = await request(app)
            .post('/api/v1/sponsors')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newSponsorAttempt);

        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'description' && err.msg.includes('Sponsor description already exists.'))).toBe(true);
    });

});