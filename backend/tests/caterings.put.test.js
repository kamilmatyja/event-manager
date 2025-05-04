const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

const createFullUpdateCateringData = (currentCateringData, updates) => {
    const {id, created_at, updated_at, ...baseData} = currentCateringData;
    return {
        ...baseData,
        ...updates,
    };
};

describe('PUT /api/v1/caterings/{id}', () => {
    let adminToken;
    let memberToken;
    let cateringToUpdate;
    let otherCatering;

    beforeEach(async () => {

        const adminCredentials = {
            email: `put.catr.admin@test.com`,
            plainPassword: 'PasswordAdminPutCatr!',
            role: ROLES.ADMINISTRATOR
        };
        const memberCredentials = {
            email: `put.catr.member@test.com`,
            plainPassword: 'PasswordMemberPutCatr!',
            role: ROLES.MEMBER
        };
        const saltRounds = 10;
        const adminHashedPassword = await bcrypt.hash(adminCredentials.plainPassword, saltRounds);
        const memberHashedPassword = await bcrypt.hash(memberCredentials.plainPassword, saltRounds);

        const [adminUser] = await db('users').insert({
            first_name: 'Admin', last_name: 'CatrPutter', nick: `admin_catr_putter_${Date.now()}`,
            email: adminCredentials.email, password: adminHashedPassword, role: adminCredentials.role
        }).returning('*');
        const [memberUser] = await db('users').insert({
            first_name: 'Member', last_name: 'CatrPutter', nick: `member_catr_putter_${Date.now()}`,
            email: memberCredentials.email, password: memberHashedPassword, role: memberCredentials.role
        }).returning('*');

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const memberPayload = {id: memberUser.id, nick: memberUser.nick, role: memberUser.role, jti: uuidv4()};
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        [cateringToUpdate] = await db('caterings').insert({
            name: `Catering To Update ${Date.now()}`,
            description: `Description to update ${Date.now()}`
        }).returning('*');
        [otherCatering] = await db('caterings').insert({
            name: `Other Catering ${Date.now()}`,
            description: `Other catering description ${Date.now()}`
        }).returning('*');
    });

    it('should update an existing catering option successfully (200)', async () => {
        const updates = {
            name: 'Updated Catering Name',
            description: 'Updated catering description.',
        };
        const fullUpdateData = createFullUpdateCateringData(cateringToUpdate, updates);

        const response = await request(app)
            .put(`/api/v1/caterings/${cateringToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);

        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBe(cateringToUpdate.id);
        expect(response.body.name).toBe(updates.name);
        expect(response.body.description).toBe(updates.description);
        expect(new Date(response.body.updated_at).getTime()).toBeGreaterThan(new Date(cateringToUpdate.created_at).getTime());
    });

    it('should return 401 if no token is provided', async () => {
        const fullUpdateData = createFullUpdateCateringData(cateringToUpdate, {name: 'UpdateAttempt'});
        const response = await request(app)
            .put(`/api/v1/caterings/${cateringToUpdate.id}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const fullUpdateData = createFullUpdateCateringData(cateringToUpdate, {name: 'UpdateAttempt'});
        const response = await request(app)
            .put(`/api/v1/caterings/${cateringToUpdate.id}`)
            .set('Authorization', 'Bearer invalidtoken123')
            .send(fullUpdateData);
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin (member token)', async () => {
        const fullUpdateData = createFullUpdateCateringData(cateringToUpdate, {name: 'UpdateAttempt'});
        const response = await request(app)
            .put(`/api/v1/caterings/${cateringToUpdate.id}`)
            .set('Authorization', `Bearer ${memberToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(403);
    });

    it('should return 404 if catering ID does not exist', async () => {
        const nonExistentId = cateringToUpdate.id + 999;
        const dummyUpdateData = createFullUpdateCateringData({name: 'NotFound', description: 'UpdateDesc'}, {});
        const response = await request(app)
            .put(`/api/v1/caterings/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(dummyUpdateData);
        expect(response.statusCode).toBe(404);
    });

    it('should return 400 if catering ID format is invalid', async () => {
        const invalidId = 'abc';
        const dummyUpdateData = createFullUpdateCateringData({name: 'InvalidId', description: 'UpdateDesc'}, {});
        const response = await request(app)
            .put(`/api/v1/caterings/${invalidId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(dummyUpdateData);
        expect(response.statusCode).toBe(400);
    });

    it('should return 400 if updated name is empty', async () => {
        const updates = {name: ''};
        const fullUpdateData = createFullUpdateCateringData(cateringToUpdate, updates);
        const response = await request(app)
            .put(`/api/v1/caterings/${cateringToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'name' && err.msg.includes('required'))).toBe(true);
    });

    it('should return 400 if updated description is empty', async () => {
        const updates = {description: ''};
        const fullUpdateData = createFullUpdateCateringData(cateringToUpdate, updates);
        const response = await request(app)
            .put(`/api/v1/caterings/${cateringToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'description' && err.msg.includes('required'))).toBe(true);
    });

    it('should return 400 if updated name is too short/long', async () => {
        const updatesShort = {name: 'A'};
        const fullDataShort = createFullUpdateCateringData(cateringToUpdate, updatesShort);

        const responseShort = await request(app)
            .put(`/api/v1/caterings/${cateringToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullDataShort);

        expect(responseShort.statusCode).toBe(400);
        expect(responseShort.body.errors.some(err => err.path === 'name' && err.msg.includes('characters'))).toBe(true);
    });

    it('should return 400 if updated name already exists for another catering option', async () => {
        const updates = {name: otherCatering.name};
        const fullUpdateData = createFullUpdateCateringData(cateringToUpdate, updates);
        const response = await request(app)
            .put(`/api/v1/caterings/${cateringToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'name' && err.msg.includes('Catering name already exists.'))).toBe(true);
    });

    it('should return 400 if updated description already exists for another catering option', async () => {
        const updates = {description: otherCatering.description};
        const fullUpdateData = createFullUpdateCateringData(cateringToUpdate, updates);
        const response = await request(app)
            .put(`/api/v1/caterings/${cateringToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'description' && err.msg.includes('Catering description already exists.'))).toBe(true);
    });

    it('should ALLOW updating a catering option with its own existing name/description (200)', async () => {
        const updates = {name: cateringToUpdate.name, description: cateringToUpdate.description};
        const fullUpdateData = createFullUpdateCateringData(cateringToUpdate, updates);

        const response = await request(app)
            .put(`/api/v1/caterings/${cateringToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);

        expect(response.statusCode).toBe(200);
        expect(response.body.name).toBe(cateringToUpdate.name);
        expect(response.body.description).toBe(cateringToUpdate.description);
    });
});