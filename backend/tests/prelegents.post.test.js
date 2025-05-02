const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

const createValidPrelegentData = (userId, overrides = {}) => ({
    user_id: userId,
    name: `Test Prelegent Name ${Date.now()}`,
    description: `Test Prelegent Desc ${Date.now()}`,
    ...overrides,
});

describe('POST /api/v1/prelegents', () => {
    let adminToken;
    let memberToken;
    let userForNewPrelegent;
    let userAlreadyPrelegent;
    let existingPrelegent;

    beforeEach(async () => {

        const adminCredentials = {
            email: `post.prel.admin@test.com`,
            plainPassword: 'PasswordAdminPostPrel!',
            role: ROLES.ADMINISTRATOR
        };
        const memberCredentials = {
            email: `post.prel.member@test.com`,
            plainPassword: 'PasswordMemberPostPrel!',
            role: ROLES.MEMBER
        };
        const newUserCredentials = {
            email: `post.prel.newuser@test.com`,
            nick: `new_prel_user_${Date.now()}`,
            plainPassword: 'PasswordNewUserPrel!',
            role: ROLES.MEMBER
        };
        const existingPrelegentUserCredentials = {
            email: `post.prel.existinguser@test.com`,
            nick: `existing_prel_user_${Date.now()}`,
            plainPassword: 'PasswordExistingUserPrel!',
            role: ROLES.MEMBER
        };

        const saltRounds = 10;
        const passwords = await Promise.all([
            bcrypt.hash(adminCredentials.plainPassword, saltRounds),
            bcrypt.hash(memberCredentials.plainPassword, saltRounds),
            bcrypt.hash(newUserCredentials.plainPassword, saltRounds),
            bcrypt.hash(existingPrelegentUserCredentials.plainPassword, saltRounds),
        ]);

        const [adminUser] = await db('users').insert({
            first_name: 'Admin',
            last_name: 'PrelPoster',
            nick: `admin_prel_poster_${Date.now()}`,
            email: adminCredentials.email,
            password: passwords[0],
            role: adminCredentials.role
        }).returning('*');
        const [memberUser] = await db('users').insert({
            first_name: 'Member',
            last_name: 'PrelPoster',
            nick: `member_prel_poster_${Date.now()}`,
            email: memberCredentials.email,
            password: passwords[1],
            role: memberCredentials.role
        }).returning('*');
        [userForNewPrelegent] = await db('users').insert({
            first_name: 'New',
            last_name: 'PrelUser',
            nick: newUserCredentials.nick,
            email: newUserCredentials.email,
            password: passwords[2],
            role: newUserCredentials.role
        }).returning('*');
        [userAlreadyPrelegent] = await db('users').insert({
            first_name: 'Existing',
            last_name: 'PrelUser',
            nick: existingPrelegentUserCredentials.nick,
            email: existingPrelegentUserCredentials.email,
            password: passwords[3],
            role: existingPrelegentUserCredentials.role
        }).returning('*');

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const memberPayload = {id: memberUser.id, nick: memberUser.nick, role: memberUser.role, jti: uuidv4()};
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        [existingPrelegent] = await db('prelegents').insert({
            user_id: userAlreadyPrelegent.id,
            name: 'Existing Prelegent Name',
            description: 'Existing Prelegent Description'
        }).returning('*');
    });

    it('should create a new prelegent with valid data as admin (201)', async () => {
        const newPrelegentData = createValidPrelegentData(userForNewPrelegent.id);

        const response = await request(app)
            .post('/api/v1/prelegents')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newPrelegentData);

        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.user_id).toBe(userForNewPrelegent.id);
        expect(response.body.name).toBe(newPrelegentData.name);
        expect(response.body.description).toBe(newPrelegentData.description);
        expect(response.body).toHaveProperty('created_at');
        expect(response.body).toHaveProperty('updated_at');

        expect(response.body).toHaveProperty('user_nick', userForNewPrelegent.nick);
        expect(response.body).toHaveProperty('user_email', userForNewPrelegent.email);

        const createdPrelegent = await db('prelegents').where({id: response.body.id}).first();
        expect(createdPrelegent).toBeDefined();
        expect(createdPrelegent.user_id).toBe(userForNewPrelegent.id);
    });

    it('should return 401 if no token is provided', async () => {
        const newPrelegentData = createValidPrelegentData(userForNewPrelegent.id);
        const response = await request(app)
            .post('/api/v1/prelegents')
            .send(newPrelegentData);
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const newPrelegentData = createValidPrelegentData(userForNewPrelegent.id);
        const response = await request(app)
            .post('/api/v1/prelegents')
            .set('Authorization', 'Bearer invalidtoken123')
            .send(newPrelegentData);
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin (member token)', async () => {
        const newPrelegentData = createValidPrelegentData(userForNewPrelegent.id);
        const response = await request(app)
            .post('/api/v1/prelegents')
            .set('Authorization', `Bearer ${memberToken}`)
            .send(newPrelegentData);
        expect(response.statusCode).toBe(403);
    });

    const requiredFields = ['user_id', 'name', 'description'];
    requiredFields.forEach(field => {
        it(`should return 400 if ${field} is missing`, async () => {
            const invalidData = createValidPrelegentData(userForNewPrelegent.id);
            delete invalidData[field];
            const response = await request(app)
                .post('/api/v1/prelegents')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(invalidData);
            expect(response.statusCode).toBe(400);
            expect(response.body.errors.some(err => err.path === field && err.msg.includes('required'))).toBe(true);
        });
    });

    it('should return 400 if user_id format is invalid (not integer)', async () => {
        const invalidData = createValidPrelegentData('abc');
        const response = await request(app)
            .post('/api/v1/prelegents')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'user_id' && err.msg.includes('Invalid User ID format'))).toBe(true);
    });

    it('should return 400 if user_id format is invalid (zero or negative)', async () => {
        const invalidData = createValidPrelegentData(0);
        const response = await request(app)
            .post('/api/v1/prelegents')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'user_id' && err.msg.includes('Invalid User ID format'))).toBe(true);
    });

    it('should return 400 if name is too short/long (assuming limits exist)', async () => {
        const invalidDataShort = createValidPrelegentData(userForNewPrelegent.id, {name: 'A'});
        const responseShort = await request(app)
            .post('/api/v1/prelegents')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidDataShort);
        expect(responseShort.statusCode).toBe(400);
        expect(responseShort.body.errors.some(err => err.path === 'name' && err.msg.includes('characters'))).toBe(true);
    });

    it('should return 400 if user_id does not exist in users table', async () => {
        const nonExistentUserId = userForNewPrelegent.id + 999;
        const prelegentData = createValidPrelegentData(nonExistentUserId);
        const response = await request(app)
            .post('/api/v1/prelegents')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(prelegentData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'user_id' && err.msg.includes('User with the provided ID does not exist.'))).toBe(true);
    });

    it('should return 400 if prelegent name already exists', async () => {
        const newPrelegentAttempt = createValidPrelegentData(userForNewPrelegent.id, {
            name: existingPrelegent.name
        });
        const response = await request(app)
            .post('/api/v1/prelegents')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newPrelegentAttempt);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'name' && err.msg.includes('Prelegent name already exists.'))).toBe(true);
    });

    it('should return 400 if prelegent description already exists', async () => {
        const newPrelegentAttempt = createValidPrelegentData(userForNewPrelegent.id, {
            description: existingPrelegent.description
        });
        const response = await request(app)
            .post('/api/v1/prelegents')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newPrelegentAttempt);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'description' && err.msg.includes('Prelegent description already exists.'))).toBe(true);
    });

    it('should return 400 if user_id is already assigned to another prelegent', async () => {

        const newPrelegentAttempt = createValidPrelegentData(userAlreadyPrelegent.id);

        const response = await request(app)
            .post('/api/v1/prelegents')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newPrelegentAttempt);

        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'user_id' && err.msg.includes('This user is already assigned to a prelegent.'))).toBe(true);
    });

});