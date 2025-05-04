const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

const createFullUpdateSponsorData = (currentSponsorData, updates) => {
    const {id, created_at, updated_at, ...baseData} = currentSponsorData;
    return {
        ...baseData,
        ...updates,
    };
};

describe('PUT /api/v1/sponsors/{id}', () => {
    let adminToken;
    let memberToken;
    let sponsorToUpdate;
    let otherSponsor;

    beforeEach(async () => {

        const adminCredentials = {
            email: `put.spon.admin@test.com`,
            plainPassword: 'PasswordAdminPutSpon!',
            role: ROLES.ADMINISTRATOR
        };
        const memberCredentials = {
            email: `put.spon.member@test.com`,
            plainPassword: 'PasswordMemberPutSpon!',
            role: ROLES.MEMBER
        };
        const saltRounds = 10;
        const adminHashedPassword = await bcrypt.hash(adminCredentials.plainPassword, saltRounds);
        const memberHashedPassword = await bcrypt.hash(memberCredentials.plainPassword, saltRounds);

        const [adminUser] = await db('users').insert({
            first_name: 'Admin', last_name: 'SponPutter', nick: `admin_spon_putter_${Date.now()}`,
            email: adminCredentials.email, password: adminHashedPassword, role: adminCredentials.role
        }).returning('*');
        const [memberUser] = await db('users').insert({
            first_name: 'Member', last_name: 'SponPutter', nick: `member_spon_putter_${Date.now()}`,
            email: memberCredentials.email, password: memberHashedPassword, role: memberCredentials.role
        }).returning('*');

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const memberPayload = {id: memberUser.id, nick: memberUser.nick, role: memberUser.role, jti: uuidv4()};
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        [sponsorToUpdate] = await db('sponsors').insert({
            name: `Sponsor To Update ${Date.now()}`,
            description: `Description to update ${Date.now()}`
        }).returning('*');
        [otherSponsor] = await db('sponsors').insert({
            name: `Other Sponsor ${Date.now()}`,
            description: `Other sponsor description ${Date.now()}`
        }).returning('*');
    });

    it('should update an existing sponsor successfully (200)', async () => {
        const updates = {
            name: 'Updated Sponsor Name',
            description: 'Updated sponsor description.',
        };
        const fullUpdateData = createFullUpdateSponsorData(sponsorToUpdate, updates);

        const response = await request(app)
            .put(`/api/v1/sponsors/${sponsorToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);

        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBe(sponsorToUpdate.id);
        expect(response.body.name).toBe(updates.name);
        expect(response.body.description).toBe(updates.description);
        expect(new Date(response.body.updated_at).getTime()).toBeGreaterThan(new Date(sponsorToUpdate.created_at).getTime());
    });

    it('should return 401 if no token is provided', async () => {
        const fullUpdateData = createFullUpdateSponsorData(sponsorToUpdate, {name: 'UpdateAttempt'});
        const response = await request(app)
            .put(`/api/v1/sponsors/${sponsorToUpdate.id}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const fullUpdateData = createFullUpdateSponsorData(sponsorToUpdate, {name: 'UpdateAttempt'});
        const response = await request(app)
            .put(`/api/v1/sponsors/${sponsorToUpdate.id}`)
            .set('Authorization', 'Bearer invalidtoken123')
            .send(fullUpdateData);
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin (member token)', async () => {
        const fullUpdateData = createFullUpdateSponsorData(sponsorToUpdate, {name: 'UpdateAttempt'});
        const response = await request(app)
            .put(`/api/v1/sponsors/${sponsorToUpdate.id}`)
            .set('Authorization', `Bearer ${memberToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(403);
    });

    it('should return 404 if sponsor ID does not exist', async () => {
        const nonExistentId = sponsorToUpdate.id + 999;
        const dummyUpdateData = createFullUpdateSponsorData({name: 'NotFound', description: 'UpdateDesc'}, {});
        const response = await request(app)
            .put(`/api/v1/sponsors/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(dummyUpdateData);
        expect(response.statusCode).toBe(404);
    });

    it('should return 400 if sponsor ID format is invalid', async () => {
        const invalidId = 'abc';
        const dummyUpdateData = createFullUpdateSponsorData({name: 'InvalidId', description: 'UpdateDesc'}, {});
        const response = await request(app)
            .put(`/api/v1/sponsors/${invalidId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(dummyUpdateData);
        expect(response.statusCode).toBe(400);
    });

    it('should return 400 if updated name is empty', async () => {
        const updates = {name: ''};
        const fullUpdateData = createFullUpdateSponsorData(sponsorToUpdate, updates);
        const response = await request(app)
            .put(`/api/v1/sponsors/${sponsorToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'name' && err.msg.includes('required'))).toBe(true);
    });

    it('should return 400 if updated description is empty', async () => {
        const updates = {description: ''};
        const fullUpdateData = createFullUpdateSponsorData(sponsorToUpdate, updates);
        const response = await request(app)
            .put(`/api/v1/sponsors/${sponsorToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'description' && err.msg.includes('required'))).toBe(true);
    });

    it('should return 400 if updated name is too short/long', async () => {
        const updatesShort = {name: 'A'};
        const fullDataShort = createFullUpdateSponsorData(sponsorToUpdate, updatesShort);

        const responseShort = await request(app)
            .put(`/api/v1/sponsors/${sponsorToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullDataShort);

        expect(responseShort.statusCode).toBe(400);
        expect(responseShort.body.errors.some(err => err.path === 'name' && err.msg.includes('characters'))).toBe(true);
    });

    it('should return 400 if updated name already exists for another sponsor', async () => {
        const updates = {name: otherSponsor.name};
        const fullUpdateData = createFullUpdateSponsorData(sponsorToUpdate, updates);
        const response = await request(app)
            .put(`/api/v1/sponsors/${sponsorToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'name' && err.msg.includes('Sponsor name already exists.'))).toBe(true);
    });

    it('should return 400 if updated description already exists for another sponsor', async () => {
        const updates = {description: otherSponsor.description};
        const fullUpdateData = createFullUpdateSponsorData(sponsorToUpdate, updates);
        const response = await request(app)
            .put(`/api/v1/sponsors/${sponsorToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'description' && err.msg.includes('Sponsor description already exists.'))).toBe(true);
    });

    it('should ALLOW updating a sponsor with its own existing name/description (200)', async () => {
        const updates = {name: sponsorToUpdate.name, description: sponsorToUpdate.description};
        const fullUpdateData = createFullUpdateSponsorData(sponsorToUpdate, updates);

        const response = await request(app)
            .put(`/api/v1/sponsors/${sponsorToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);

        expect(response.statusCode).toBe(200);
        expect(response.body.name).toBe(sponsorToUpdate.name);
        expect(response.body.description).toBe(sponsorToUpdate.description);
    });
});