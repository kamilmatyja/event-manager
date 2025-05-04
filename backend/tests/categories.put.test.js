const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

const createFullUpdateCatData = (currentCategoryData, updates) => {
    const {id, created_at, updated_at, ...baseData} = currentCategoryData;
    return {
        ...baseData,
        ...updates,
    };
};

describe('PUT /api/v1/categories/{id}', () => {
    let adminToken;
    let memberToken;
    let categoryToUpdate;
    let otherCategory;

    beforeEach(async () => {

        const adminCredentials = {
            email: `put.cat.admin@test.com`,
            plainPassword: 'PasswordAdminPutCat!',
            role: ROLES.ADMINISTRATOR
        };
        const memberCredentials = {
            email: `put.cat.member@test.com`,
            plainPassword: 'PasswordMemberPutCat!',
            role: ROLES.MEMBER
        };
        const saltRounds = 10;
        const adminHashedPassword = await bcrypt.hash(adminCredentials.plainPassword, saltRounds);
        const memberHashedPassword = await bcrypt.hash(memberCredentials.plainPassword, saltRounds);

        const [adminUser] = await db('users').insert({
            first_name: 'Admin', last_name: 'CatPutter', nick: `admin_cat_putter_${Date.now()}`,
            email: adminCredentials.email, password: adminHashedPassword, role: adminCredentials.role
        }).returning('*');
        const [memberUser] = await db('users').insert({
            first_name: 'Member', last_name: 'CatPutter', nick: `member_cat_putter_${Date.now()}`,
            email: memberCredentials.email, password: memberHashedPassword, role: memberCredentials.role
        }).returning('*');

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const memberPayload = {id: memberUser.id, nick: memberUser.nick, role: memberUser.role, jti: uuidv4()};
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        [categoryToUpdate] = await db('categories').insert({
            name: `Category To Update ${Date.now()}`,
            description: `Description to update ${Date.now()}`
        }).returning('*');
        [otherCategory] = await db('categories').insert({
            name: `Other Category ${Date.now()}`,
            description: `Other category description ${Date.now()}`
        }).returning('*');
    });

    it('should update an existing category successfully (200)', async () => {
        const updates = {
            name: 'Updated Category Name',
            description: 'Updated category description.',
        };
        const fullUpdateData = createFullUpdateCatData(categoryToUpdate, updates);

        const response = await request(app)
            .put(`/api/v1/categories/${categoryToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);

        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBe(categoryToUpdate.id);
        expect(response.body.name).toBe(updates.name);
        expect(response.body.description).toBe(updates.description);

        expect(new Date(response.body.updated_at)).toBeInstanceOf(Date);
        expect(new Date(response.body.updated_at).getTime()).toBeGreaterThan(new Date(categoryToUpdate.created_at).getTime());
    });

    it('should update only the name successfully (200)', async () => {
        const updates = {name: 'Only Name Updated'};

        const fullUpdateData = createFullUpdateCatData(categoryToUpdate, updates);

        const response = await request(app)
            .put(`/api/v1/categories/${categoryToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);

        expect(response.statusCode).toBe(200);
        expect(response.body.name).toBe(updates.name);
        expect(response.body.description).toBe(categoryToUpdate.description);
    });

    it('should update only the description successfully (200)', async () => {
        const updates = {description: 'Only Description Updated'};

        const fullUpdateData = createFullUpdateCatData(categoryToUpdate, updates);

        const response = await request(app)
            .put(`/api/v1/categories/${categoryToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);

        expect(response.statusCode).toBe(200);
        expect(response.body.name).toBe(categoryToUpdate.name);
        expect(response.body.description).toBe(updates.description);
    });

    it('should return 401 if no token is provided', async () => {
        const fullUpdateData = createFullUpdateCatData(categoryToUpdate, {name: 'UpdateAttempt'});
        const response = await request(app)
            .put(`/api/v1/categories/${categoryToUpdate.id}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const fullUpdateData = createFullUpdateCatData(categoryToUpdate, {name: 'UpdateAttempt'});
        const response = await request(app)
            .put(`/api/v1/categories/${categoryToUpdate.id}`)
            .set('Authorization', 'Bearer invalidtoken123')
            .send(fullUpdateData);
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin (member token)', async () => {
        const fullUpdateData = createFullUpdateCatData(categoryToUpdate, {name: 'UpdateAttempt'});
        const response = await request(app)
            .put(`/api/v1/categories/${categoryToUpdate.id}`)
            .set('Authorization', `Bearer ${memberToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(403);
    });

    it('should return 404 if category ID does not exist', async () => {
        const nonExistentId = categoryToUpdate.id + 999;
        const dummyUpdateData = createFullUpdateCatData({name: 'NotFound', description: 'UpdateDesc'}, {});
        const response = await request(app)
            .put(`/api/v1/categories/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(dummyUpdateData);
        expect(response.statusCode).toBe(404);
    });

    it('should return 400 if category ID format is invalid', async () => {
        const invalidId = 'abc';
        const dummyUpdateData = createFullUpdateCatData({name: 'InvalidId', description: 'UpdateDesc'}, {});
        const response = await request(app)
            .put(`/api/v1/categories/${invalidId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(dummyUpdateData);
        expect(response.statusCode).toBe(400);
    });

    it('should return 400 if updated name is empty', async () => {
        const updates = {name: ''};
        const fullUpdateData = createFullUpdateCatData(categoryToUpdate, updates);
        const response = await request(app)
            .put(`/api/v1/categories/${categoryToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);

        expect(response.body.errors.some(err => err.path === 'name' && err.msg.includes('required'))).toBe(true);
    });

    it('should return 400 if updated description is empty', async () => {
        const updates = {description: ''};
        const fullUpdateData = createFullUpdateCatData(categoryToUpdate, updates);
        const response = await request(app)
            .put(`/api/v1/categories/${categoryToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);

        expect(response.body.errors.some(err => err.path === 'description' && err.msg.includes('required'))).toBe(true);
    });

    it('should return 400 if updated name is too short/long', async () => {
        const updatesShort = {name: 'A'};
        const fullDataShort = createFullUpdateCatData(categoryToUpdate, updatesShort);

        const responseShort = await request(app)
            .put(`/api/v1/categories/${categoryToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullDataShort);

        expect(responseShort.statusCode).toBe(400);
        expect(responseShort.body.errors.some(err => err.path === 'name' && err.msg.includes('characters'))).toBe(true);

    });

    it('should return 400 if updated name already exists for another category', async () => {
        const updates = {name: otherCategory.name};
        const fullUpdateData = createFullUpdateCatData(categoryToUpdate, updates);
        const response = await request(app)
            .put(`/api/v1/categories/${categoryToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'name' && err.msg.includes('Category name already exists.'))).toBe(true);
    });

    it('should return 400 if updated description already exists for another category', async () => {
        const updates = {description: otherCategory.description};
        const fullUpdateData = createFullUpdateCatData(categoryToUpdate, updates);
        const response = await request(app)
            .put(`/api/v1/categories/${categoryToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'description' && err.msg.includes('Category description already exists.'))).toBe(true);
    });

    it('should ALLOW updating a category with its own existing name/description (200)', async () => {

        const updates = {name: categoryToUpdate.name, description: categoryToUpdate.description};
        const fullUpdateData = createFullUpdateCatData(categoryToUpdate, updates);

        const response = await request(app)
            .put(`/api/v1/categories/${categoryToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);

        expect(response.statusCode).toBe(200);
        expect(response.body.name).toBe(categoryToUpdate.name);
        expect(response.body.description).toBe(categoryToUpdate.description);
    });
});