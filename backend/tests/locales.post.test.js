const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

const createValidLocaleData = (overrides = {}) => ({
    city: `Test City Post ${Date.now()}`,
    name: `Test Venue Post ${Date.now()}`,
    ...overrides,
});

describe('POST /api/v1/locales', () => {
    let adminToken;
    let memberToken;
    let existingLocale;

    beforeEach(async () => {

        const adminCredentials = {
            email: `post.loc.admin@test.com`,
            plainPassword: 'PasswordAdminPostLoc!',
            role: ROLES.ADMINISTRATOR
        };
        const memberCredentials = {
            email: `post.loc.member@test.com`,
            plainPassword: 'PasswordMemberPostLoc!',
            role: ROLES.MEMBER
        };
        const saltRounds = 10;
        const adminHashedPassword = await bcrypt.hash(adminCredentials.plainPassword, saltRounds);
        const memberHashedPassword = await bcrypt.hash(memberCredentials.plainPassword, saltRounds);

        const [adminUser] = await db('users').insert({
            first_name: 'Admin', last_name: 'LocPoster', nick: `admin_loc_poster_${Date.now()}`,
            email: adminCredentials.email, password: adminHashedPassword, role: adminCredentials.role
        }).returning('*');
        const [memberUser] = await db('users').insert({
            first_name: 'Member', last_name: 'LocPoster', nick: `member_loc_poster_${Date.now()}`,
            email: memberCredentials.email, password: memberHashedPassword, role: memberCredentials.role
        }).returning('*');

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const memberPayload = {id: memberUser.id, nick: memberUser.nick, role: memberUser.role, jti: uuidv4()};
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        [existingLocale] = await db('locales').insert({
            city: 'Existing City',
            name: 'Existing Venue Name'
        }).returning('*');
    });

    it('should create a new locale with valid data as admin (201)', async () => {
        const newLocale = createValidLocaleData();

        const response = await request(app)
            .post('/api/v1/locales')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newLocale);

        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.city).toBe(newLocale.city);
        expect(response.body.name).toBe(newLocale.name);
        expect(response.body).toHaveProperty('created_at');
        expect(response.body).toHaveProperty('updated_at');

        const createdLocale = await db('locales').where({id: response.body.id}).first();
        expect(createdLocale).toBeDefined();
        expect(createdLocale.name).toBe(newLocale.name);
    });

    it('should return 401 if no token is provided', async () => {
        const newLocale = createValidLocaleData();
        const response = await request(app)
            .post('/api/v1/locales')
            .send(newLocale);
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const newLocale = createValidLocaleData();
        const response = await request(app)
            .post('/api/v1/locales')
            .set('Authorization', 'Bearer invalidtoken123')
            .send(newLocale);
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin (member token)', async () => {
        const newLocale = createValidLocaleData();
        const response = await request(app)
            .post('/api/v1/locales')
            .set('Authorization', `Bearer ${memberToken}`)
            .send(newLocale);
        expect(response.statusCode).toBe(403);
    });

    it('should return 400 if city is missing', async () => {
        const invalidData = createValidLocaleData();
        delete invalidData.city;

        const response = await request(app)
            .post('/api/v1/locales')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidData);

        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'city' && err.msg.includes('is required'))).toBe(true);
    });

    it('should return 400 if name is missing', async () => {
        const invalidData = createValidLocaleData();
        delete invalidData.name;

        const response = await request(app)
            .post('/api/v1/locales')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidData);

        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'name' && err.msg.includes('is required'))).toBe(true);
    });

    it('should return 400 if city is too short/long (assuming limits exist)', async () => {
        const invalidDataShort = createValidLocaleData({city: 'A'});
        const invalidDataLong = createValidLocaleData({city: 'A'.repeat(101)});

        const responseShort = await request(app)
            .post('/api/v1/locales')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidDataShort);

        expect(responseShort.statusCode).toBe(400);
        expect(responseShort.body.errors.some(err => err.path === 'city' && err.msg.includes('characters'))).toBe(true);

    });

    it('should return 400 if name is too short/long (assuming limits exist)', async () => {
        const invalidDataShort = createValidLocaleData({name: 'A'});
        const invalidDataLong = createValidLocaleData({name: 'A'.repeat(101)});

        const responseShort = await request(app)
            .post('/api/v1/locales')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidDataShort);

        expect(responseShort.statusCode).toBe(400);
        expect(responseShort.body.errors.some(err => err.path === 'name' && err.msg.includes('characters'))).toBe(true);

    });

    it('should return 400 if locale name already exists', async () => {
        const newLocaleAttempt = createValidLocaleData({
            name: existingLocale.name
        });
        const response = await request(app)
            .post('/api/v1/locales')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newLocaleAttempt);

        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'name' && err.msg.includes('Locale name already exists.'))).toBe(true);
    });
});