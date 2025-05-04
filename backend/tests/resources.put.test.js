const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

const createFullUpdateResourceData = (currentResourceData, updates) => {
    const {id, created_at, updated_at, ...baseData} = currentResourceData;
    return {
        ...baseData,
        ...updates,
    };
};

describe('PUT /api/v1/resources/{id}', () => {
    let adminToken;
    let memberToken;
    let resourceToUpdate;
    let otherResource;

    beforeEach(async () => {

        const adminCredentials = {
            email: `put.res.admin@test.com`,
            plainPassword: 'PasswordAdminPutRes!',
            role: ROLES.ADMINISTRATOR
        };
        const memberCredentials = {
            email: `put.res.member@test.com`,
            plainPassword: 'PasswordMemberPutRes!',
            role: ROLES.MEMBER
        };
        const saltRounds = 10;
        const adminHashedPassword = await bcrypt.hash(adminCredentials.plainPassword, saltRounds);
        const memberHashedPassword = await bcrypt.hash(memberCredentials.plainPassword, saltRounds);

        const [adminUser] = await db('users').insert({
            first_name: 'Admin', last_name: 'ResPutter', nick: `admin_res_putter_${Date.now()}`,
            email: adminCredentials.email, password: adminHashedPassword, role: adminCredentials.role
        }).returning('*');
        const [memberUser] = await db('users').insert({
            first_name: 'Member', last_name: 'ResPutter', nick: `member_res_putter_${Date.now()}`,
            email: memberCredentials.email, password: memberHashedPassword, role: memberCredentials.role
        }).returning('*');

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const memberPayload = {id: memberUser.id, nick: memberUser.nick, role: memberUser.role, jti: uuidv4()};
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        [resourceToUpdate] = await db('resources').insert({
            name: `Resource To Update ${Date.now()}`,
            description: `Description to update ${Date.now()}`
        }).returning('*');
        [otherResource] = await db('resources').insert({
            name: `Other Resource ${Date.now()}`,
            description: `Other resource description ${Date.now()}`
        }).returning('*');
    });

    it('should update an existing resource successfully (200)', async () => {
        const updates = {
            name: 'Updated Resource Name',
            description: 'Updated resource description.',
        };
        const fullUpdateData = createFullUpdateResourceData(resourceToUpdate, updates);

        const response = await request(app)
            .put(`/api/v1/resources/${resourceToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);

        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBe(resourceToUpdate.id);
        expect(response.body.name).toBe(updates.name);
        expect(response.body.description).toBe(updates.description);
        expect(new Date(response.body.updated_at).getTime()).toBeGreaterThan(new Date(resourceToUpdate.created_at).getTime());
    });

    it('should return 401 if no token is provided', async () => {
        const fullUpdateData = createFullUpdateResourceData(resourceToUpdate, {name: 'UpdateAttempt'});
        const response = await request(app)
            .put(`/api/v1/resources/${resourceToUpdate.id}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const fullUpdateData = createFullUpdateResourceData(resourceToUpdate, {name: 'UpdateAttempt'});
        const response = await request(app)
            .put(`/api/v1/resources/${resourceToUpdate.id}`)
            .set('Authorization', 'Bearer invalidtoken123')
            .send(fullUpdateData);
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin (member token)', async () => {
        const fullUpdateData = createFullUpdateResourceData(resourceToUpdate, {name: 'UpdateAttempt'});
        const response = await request(app)
            .put(`/api/v1/resources/${resourceToUpdate.id}`)
            .set('Authorization', `Bearer ${memberToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(403);
    });

    it('should return 404 if resource ID does not exist', async () => {
        const nonExistentId = resourceToUpdate.id + 999;
        const dummyUpdateData = createFullUpdateResourceData({name: 'NotFound', description: 'UpdateDesc'}, {});
        const response = await request(app)
            .put(`/api/v1/resources/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(dummyUpdateData);
        expect(response.statusCode).toBe(404);
    });

    it('should return 400 if resource ID format is invalid', async () => {
        const invalidId = 'abc';
        const dummyUpdateData = createFullUpdateResourceData({name: 'InvalidId', description: 'UpdateDesc'}, {});
        const response = await request(app)
            .put(`/api/v1/resources/${invalidId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(dummyUpdateData);
        expect(response.statusCode).toBe(400);
    });

    it('should return 400 if updated name is empty', async () => {
        const updates = {name: ''};
        const fullUpdateData = createFullUpdateResourceData(resourceToUpdate, updates);
        const response = await request(app)
            .put(`/api/v1/resources/${resourceToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'name' && err.msg.includes('required'))).toBe(true);
    });

    it('should return 400 if updated description is empty', async () => {
        const updates = {description: ''};
        const fullUpdateData = createFullUpdateResourceData(resourceToUpdate, updates);
        const response = await request(app)
            .put(`/api/v1/resources/${resourceToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'description' && err.msg.includes('required'))).toBe(true);
    });

    it('should return 400 if updated name is too short/long', async () => {
        const updatesShort = {name: 'A'};
        const fullDataShort = createFullUpdateResourceData(resourceToUpdate, updatesShort);

        const responseShort = await request(app)
            .put(`/api/v1/resources/${resourceToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullDataShort);

        expect(responseShort.statusCode).toBe(400);
        expect(responseShort.body.errors.some(err => err.path === 'name' && err.msg.includes('characters'))).toBe(true);
    });

    it('should return 400 if updated name already exists for another resource', async () => {
        const updates = {name: otherResource.name};
        const fullUpdateData = createFullUpdateResourceData(resourceToUpdate, updates);
        const response = await request(app)
            .put(`/api/v1/resources/${resourceToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'name' && err.msg.includes('Resource name already exists.'))).toBe(true);
    });

    it('should return 400 if updated description already exists for another resource', async () => {
        const updates = {description: otherResource.description};
        const fullUpdateData = createFullUpdateResourceData(resourceToUpdate, updates);
        const response = await request(app)
            .put(`/api/v1/resources/${resourceToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'description' && err.msg.includes('Resource description already exists.'))).toBe(true);
    });

    it('should ALLOW updating a resource with its own existing name/description (200)', async () => {
        const updates = {name: resourceToUpdate.name, description: resourceToUpdate.description};
        const fullUpdateData = createFullUpdateResourceData(resourceToUpdate, updates);

        const response = await request(app)
            .put(`/api/v1/resources/${resourceToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);

        expect(response.statusCode).toBe(200);
        expect(response.body.name).toBe(resourceToUpdate.name);
        expect(response.body.description).toBe(resourceToUpdate.description);
    });
});