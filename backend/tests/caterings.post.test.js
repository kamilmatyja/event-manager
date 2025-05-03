const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

const createValidCateringData = (overrides = {}) => ({
    name: `Test Catering Post ${Date.now()}`,
    description: `Test Catering Desc Post ${Date.now()}`,
    ...overrides,
});

describe('POST /api/v1/caterings', () => {
    let adminToken;
    let memberToken;
    let existingCatering;

    beforeEach(async () => {

        const adminCredentials = {
            email: `post.catr.admin@test.com`,
            plainPassword: 'PasswordAdminPostCatr!',
            role: ROLES.ADMINISTRATOR
        };
        const memberCredentials = {
            email: `post.catr.member@test.com`,
            plainPassword: 'PasswordMemberPostCatr!',
            role: ROLES.MEMBER
        };
        const saltRounds = 10;
        const adminHashedPassword = await bcrypt.hash(adminCredentials.plainPassword, saltRounds);
        const memberHashedPassword = await bcrypt.hash(memberCredentials.plainPassword, saltRounds);

        const [adminUser] = await db('users').insert({
            first_name: 'Admin', last_name: 'CatrPoster', nick: `admin_catr_poster_${Date.now()}`,
            email: adminCredentials.email, password: adminHashedPassword, role: adminCredentials.role
        }).returning('*');
        const [memberUser] = await db('users').insert({
            first_name: 'Member', last_name: 'CatrPoster', nick: `member_catr_poster_${Date.now()}`,
            email: memberCredentials.email, password: memberHashedPassword, role: memberCredentials.role
        }).returning('*');

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const memberPayload = {id: memberUser.id, nick: memberUser.nick, role: memberUser.role, jti: uuidv4()};
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        [existingCatering] = await db('caterings').insert({
            name: 'Existing Catering Name',
            description: 'Existing Catering Description'
        }).returning('*');
    });

    it('should create a new catering option with valid data as admin (201)', async () => {
        const newCatering = createValidCateringData();

        const response = await request(app)
            .post('/api/v1/caterings')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newCatering);

        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe(newCatering.name);
        expect(response.body.description).toBe(newCatering.description);
        expect(response.body).toHaveProperty('created_at');
        expect(response.body).toHaveProperty('updated_at');

        const createdCatering = await db('caterings').where({id: response.body.id}).first();
        expect(createdCatering).toBeDefined();
        expect(createdCatering.name).toBe(newCatering.name);
    });

    it('should return 401 if no token is provided', async () => {
        const newCatering = createValidCateringData();
        const response = await request(app)
            .post('/api/v1/caterings')
            .send(newCatering);
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const newCatering = createValidCateringData();
        const response = await request(app)
            .post('/api/v1/caterings')
            .set('Authorization', 'Bearer invalidtoken123')
            .send(newCatering);
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin (member token)', async () => {
        const newCatering = createValidCateringData();
        const response = await request(app)
            .post('/api/v1/caterings')
            .set('Authorization', `Bearer ${memberToken}`)
            .send(newCatering);
        expect(response.statusCode).toBe(403);
    });

    it('should return 400 if name is missing', async () => {
        const invalidData = createValidCateringData();
        delete invalidData.name;

        const response = await request(app)
            .post('/api/v1/caterings')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidData);

        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'name' && err.msg.includes('is required'))).toBe(true);
    });

    it('should return 400 if description is missing', async () => {
        const invalidData = createValidCateringData();
        delete invalidData.description;

        const response = await request(app)
            .post('/api/v1/caterings')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidData);

        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'description' && err.msg.includes('is required'))).toBe(true);
    });

    it('should return 400 if name is too short/long (assuming limits exist)', async () => {
        const invalidDataShort = createValidCateringData({name: 'A'});
        const invalidDataLong = createValidCateringData({name: 'A'.repeat(101)});

        const responseShort = await request(app)
            .post('/api/v1/caterings')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidDataShort);

        expect(responseShort.statusCode).toBe(400);
        expect(responseShort.body.errors.some(err => err.path === 'name' && err.msg.includes('characters'))).toBe(true);
    });

    it('should return 400 if catering name already exists', async () => {
        const newCateringAttempt = createValidCateringData({
            name: existingCatering.name
        });
        const response = await request(app)
            .post('/api/v1/caterings')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newCateringAttempt);

        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'name' && err.msg.includes('Catering name already exists.'))).toBe(true);
    });

    it('should return 400 if catering description already exists', async () => {
        const newCateringAttempt = createValidCateringData({
            description: existingCatering.description
        });
        const response = await request(app)
            .post('/api/v1/caterings')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newCateringAttempt);

        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'description' && err.msg.includes('Catering description already exists.'))).toBe(true);
    });

});