const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

const createFullUpdateLocData = (currentLocaleData, updates) => {
    const {id, created_at, updated_at, ...baseData} = currentLocaleData;
    return {
        ...baseData,
        ...updates,
    };
};

describe('PUT /api/v1/locales/{id}', () => {
    let adminToken;
    let memberToken;
    let localeToUpdate;
    let otherLocale;

    beforeEach(async () => {

        const adminCredentials = {
            email: `put.loc.admin@test.com`,
            plainPassword: 'PasswordAdminPutLoc!',
            role: ROLES.ADMINISTRATOR
        };
        const memberCredentials = {
            email: `put.loc.member@test.com`,
            plainPassword: 'PasswordMemberPutLoc!',
            role: ROLES.MEMBER
        };
        const saltRounds = 10;
        const adminHashedPassword = await bcrypt.hash(adminCredentials.plainPassword, saltRounds);
        const memberHashedPassword = await bcrypt.hash(memberCredentials.plainPassword, saltRounds);

        const [adminUser] = await db('users').insert({
            first_name: 'Admin', last_name: 'LocPutter', nick: `admin_loc_putter_${Date.now()}`,
            email: adminCredentials.email, password: adminHashedPassword, role: adminCredentials.role
        }).returning('*');
        const [memberUser] = await db('users').insert({
            first_name: 'Member', last_name: 'LocPutter', nick: `member_loc_putter_${Date.now()}`,
            email: memberCredentials.email, password: memberHashedPassword, role: memberCredentials.role
        }).returning('*');

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const memberPayload = {id: memberUser.id, nick: memberUser.nick, role: memberUser.role, jti: uuidv4()};
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        [localeToUpdate] = await db('locales').insert({
            city: `City To Update ${Date.now()}`,
            name: `Venue To Update ${Date.now()}`
        }).returning('*');
        [otherLocale] = await db('locales').insert({
            city: `Other City ${Date.now()}`,
            name: `Other Venue ${Date.now()}`
        }).returning('*');
    });

    it('should update an existing locale successfully (200)', async () => {
        const updates = {
            city: 'Updated Test City',
            name: 'Updated Test Venue Name',
        };
        const fullUpdateData = createFullUpdateLocData(localeToUpdate, updates);

        const response = await request(app)
            .put(`/api/v1/locales/${localeToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);

        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBe(localeToUpdate.id);
        expect(response.body.city).toBe(updates.city);
        expect(response.body.name).toBe(updates.name);
        expect(new Date(response.body.updated_at).getTime()).toBeGreaterThan(new Date(localeToUpdate.updated_at).getTime());
    });

    it('should return 401 if no token is provided', async () => {
        const fullUpdateData = createFullUpdateLocData(localeToUpdate, {name: 'UpdateAttempt'});
        const response = await request(app)
            .put(`/api/v1/locales/${localeToUpdate.id}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const fullUpdateData = createFullUpdateLocData(localeToUpdate, {name: 'UpdateAttempt'});
        const response = await request(app)
            .put(`/api/v1/locales/${localeToUpdate.id}`)
            .set('Authorization', 'Bearer invalidtoken123')
            .send(fullUpdateData);
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin (member token)', async () => {
        const fullUpdateData = createFullUpdateLocData(localeToUpdate, {name: 'UpdateAttempt'});
        const response = await request(app)
            .put(`/api/v1/locales/${localeToUpdate.id}`)
            .set('Authorization', `Bearer ${memberToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(403);
    });

    it('should return 404 if locale ID does not exist', async () => {
        const nonExistentId = localeToUpdate.id + 999;
        const dummyUpdateData = createFullUpdateLocData({city: 'NF City', name: 'NF Name'}, {});
        const response = await request(app)
            .put(`/api/v1/locales/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(dummyUpdateData);
        expect(response.statusCode).toBe(404);
    });

    it('should return 400 if locale ID format is invalid', async () => {
        const invalidId = 'abc';
        const dummyUpdateData = createFullUpdateLocData({city: 'InvId City', name: 'InvId Name'}, {});
        const response = await request(app)
            .put(`/api/v1/locales/${invalidId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(dummyUpdateData);
        expect(response.statusCode).toBe(400);
    });

    it('should return 400 if updated city is empty', async () => {
        const updates = {city: ''};
        const fullUpdateData = createFullUpdateLocData(localeToUpdate, updates);
        const response = await request(app)
            .put(`/api/v1/locales/${localeToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'city' && err.msg.includes('required'))).toBe(true);
    });

    it('should return 400 if updated name is empty', async () => {
        const updates = {name: ''};
        const fullUpdateData = createFullUpdateLocData(localeToUpdate, updates);
        const response = await request(app)
            .put(`/api/v1/locales/${localeToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'name' && err.msg.includes('required'))).toBe(true);
    });

    it('should return 400 if updated name is too short/long (assuming limits)', async () => {
        const updatesShort = {name: 'A'};
        const fullDataShort = createFullUpdateLocData(localeToUpdate, updatesShort);

        const responseShort = await request(app)
            .put(`/api/v1/locales/${localeToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullDataShort);

        expect(responseShort.statusCode).toBe(400);
        expect(responseShort.body.errors.some(err => err.path === 'name' && err.msg.includes('characters'))).toBe(true);
    });

    it('should return 400 if updated name already exists for another locale', async () => {
        const updates = {name: otherLocale.name};
        const fullUpdateData = createFullUpdateLocData(localeToUpdate, updates);

        const response = await request(app)
            .put(`/api/v1/locales/${localeToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);

        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'name' && err.msg.includes('Locale name already exists.'))).toBe(true);
    });

    it('should ALLOW updating city when name exists for another locale (200)', async () => {
        const updates = {city: 'New City For Conflicting Name'};
        const fullUpdateData = createFullUpdateLocData(localeToUpdate, updates);

        const response = await request(app)
            .put(`/api/v1/locales/${localeToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);

        expect(response.statusCode).toBe(200);
        expect(response.body.city).toBe('New City For Conflicting Name');
        expect(response.body.name).toBe(localeToUpdate.name);
    });

    it('should ALLOW updating a locale with its own existing name (200)', async () => {
        const updates = {name: localeToUpdate.name};
        const fullUpdateData = createFullUpdateLocData(localeToUpdate, updates);

        const response = await request(app)
            .put(`/api/v1/locales/${localeToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);

        expect(response.statusCode).toBe(200);
        expect(response.body.name).toBe(localeToUpdate.name);
    });
});