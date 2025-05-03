const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

const createValidResourceData = (overrides = {}) => ({
    name: `Test Zasób Post ${Date.now()}`,
    description: `Test Zasób Desc Post ${Date.now()}`,
    ...overrides,
});

describe('POST /api/v1/resources', () => {
    let adminToken;
    let memberToken;
    let existingResource;

    beforeEach(async () => {

        const adminCredentials = {
            email: `post.res.admin@test.com`,
            plainPassword: 'PasswordAdminPostRes!',
            role: ROLES.ADMINISTRATOR
        };
        const memberCredentials = {
            email: `post.res.member@test.com`,
            plainPassword: 'PasswordMemberPostRes!',
            role: ROLES.MEMBER
        };
        const saltRounds = 10;
        const adminHashedPassword = await bcrypt.hash(adminCredentials.plainPassword, saltRounds);
        const memberHashedPassword = await bcrypt.hash(memberCredentials.plainPassword, saltRounds);

        const [adminUser] = await db('users').insert({
            first_name: 'Admin', last_name: 'ResPoster', nick: `admin_res_poster_${Date.now()}`,
            email: adminCredentials.email, password: adminHashedPassword, role: adminCredentials.role
        }).returning('*');
        const [memberUser] = await db('users').insert({
            first_name: 'Member', last_name: 'ResPoster', nick: `member_res_poster_${Date.now()}`,
            email: memberCredentials.email, password: memberHashedPassword, role: memberCredentials.role
        }).returning('*');

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const memberPayload = {id: memberUser.id, nick: memberUser.nick, role: memberUser.role, jti: uuidv4()};
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        [existingResource] = await db('resources').insert({
            name: 'Existing Resource Name',
            description: 'Existing Resource Description'
        }).returning('*');
    });

    it('should create a new resource with valid data as admin (201)', async () => {
        const newResource = createValidResourceData();

        const response = await request(app)
            .post('/api/v1/resources')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newResource);

        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe(newResource.name);
        expect(response.body.description).toBe(newResource.description);
        expect(response.body).toHaveProperty('created_at');
        expect(response.body).toHaveProperty('updated_at');

        const createdResource = await db('resources').where({id: response.body.id}).first();
        expect(createdResource).toBeDefined();
        expect(createdResource.name).toBe(newResource.name);
    });

    it('should return 401 if no token is provided', async () => {
        const newResource = createValidResourceData();
        const response = await request(app)
            .post('/api/v1/resources')
            .send(newResource);
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const newResource = createValidResourceData();
        const response = await request(app)
            .post('/api/v1/resources')
            .set('Authorization', 'Bearer invalidtoken123')
            .send(newResource);
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin (member token)', async () => {
        const newResource = createValidResourceData();
        const response = await request(app)
            .post('/api/v1/resources')
            .set('Authorization', `Bearer ${memberToken}`)
            .send(newResource);
        expect(response.statusCode).toBe(403);
    });

    it('should return 400 if name is missing', async () => {
        const invalidData = createValidResourceData();
        delete invalidData.name;

        const response = await request(app)
            .post('/api/v1/resources')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidData);

        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'name' && err.msg.includes('is required'))).toBe(true);
    });

    it('should return 400 if description is missing', async () => {
        const invalidData = createValidResourceData();
        delete invalidData.description;

        const response = await request(app)
            .post('/api/v1/resources')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidData);

        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'description' && err.msg.includes('is required'))).toBe(true);
    });

    it('should return 400 if name is too short/long (assuming limits exist)', async () => {
        const invalidDataShort = createValidResourceData({name: 'A'});
        const responseShort = await request(app)
            .post('/api/v1/resources')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidDataShort);

        expect(responseShort.statusCode).toBe(400);
        expect(responseShort.body.errors.some(err => err.path === 'name' && err.msg.includes('characters'))).toBe(true);
    });

    it('should return 400 if resource name already exists', async () => {
        const newResourceAttempt = createValidResourceData({
            name: existingResource.name
        });
        const response = await request(app)
            .post('/api/v1/resources')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newResourceAttempt);

        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'name' && err.msg.includes('Resource name already exists.'))).toBe(true);
    });

    it('should return 400 if resource description already exists', async () => {
        const newResourceAttempt = createValidResourceData({
            description: existingResource.description
        });
        const response = await request(app)
            .post('/api/v1/resources')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newResourceAttempt);

        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'description' && err.msg.includes('Resource description already exists.'))).toBe(true);
    });

});