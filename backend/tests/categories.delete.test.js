const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

describe('DELETE /api/v1/categories/{id}', () => {
    let adminToken;
    let memberToken;
    let categoryToDelete;
    let categoryInUse;
    let eventUsingCategory;

    beforeEach(async () => {

        const adminCredentials = {
            email: `delete.cat.admin@test.com`,
            plainPassword: 'PasswordAdminDeleteCat!',
            role: ROLES.ADMINISTRATOR
        };
        const memberCredentials = {
            email: `delete.cat.member@test.com`,
            plainPassword: 'PasswordMemberDeleteCat!',
            role: ROLES.MEMBER
        };
        const saltRounds = 10;
        const adminHashedPassword = await bcrypt.hash(adminCredentials.plainPassword, saltRounds);
        const memberHashedPassword = await bcrypt.hash(memberCredentials.plainPassword, saltRounds);

        const [adminUser] = await db('users').insert({
            first_name: 'Admin', last_name: 'CatDeleter', nick: `admin_cat_deleter_${Date.now()}`,
            email: adminCredentials.email, password: adminHashedPassword, role: adminCredentials.role
        }).returning('*');
        const [memberUser] = await db('users').insert({
            first_name: 'Member', last_name: 'CatDeleter', nick: `member_cat_deleter_${Date.now()}`,
            email: memberCredentials.email, password: memberHashedPassword, role: memberCredentials.role
        }).returning('*');

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const memberPayload = {id: memberUser.id, nick: memberUser.nick, role: memberUser.role, jti: uuidv4()};
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        [categoryToDelete] = await db('categories').insert({
            name: `Category To Delete ${Date.now()}`,
            description: `Description to delete ${Date.now()}`
        }).returning('*');
        [categoryInUse] = await db('categories').insert({
            name: `Category In Use ${Date.now()}`,
            description: `Description in use ${Date.now()}`
        }).returning('*');

        const [locale] = await db('locales').insert({
            city: `DeleteCatTestCity_${Date.now()}`,
            name: `DeleteCatTestVenue_${Date.now()}`
        }).returning('*');
        [eventUsingCategory] = await db('events').insert({
            locale_id: locale.id,
            category_id: categoryInUse.id,
            name: `Event Using Category ${Date.now()}`,
            description: 'This event uses a category',
            price: 5.00,
            started_at: new Date(Date.now() + 86400000),
            ended_at: new Date(Date.now() + 2 * 86400000)
        }).returning('*');
    });

    it('should delete a category successfully if it is not in use (204)', async () => {
        const response = await request(app)
            .delete(`/api/v1/categories/${categoryToDelete.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(204);

        const deletedCategory = await db('categories').where({id: categoryToDelete.id}).first();
        expect(deletedCategory).toBeUndefined();
    });

    it('should return 401 if no token is provided', async () => {
        const response = await request(app)
            .delete(`/api/v1/categories/${categoryToDelete.id}`);
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const response = await request(app)
            .delete(`/api/v1/categories/${categoryToDelete.id}`)
            .set('Authorization', 'Bearer invalidtoken123');
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin (member token)', async () => {
        const response = await request(app)
            .delete(`/api/v1/categories/${categoryToDelete.id}`)
            .set('Authorization', `Bearer ${memberToken}`);
        expect(response.statusCode).toBe(403);
    });

    it('should return 404 if category ID does not exist', async () => {
        const nonExistentId = categoryToDelete.id + 999;
        const response = await request(app)
            .delete(`/api/v1/categories/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(404);
    });

    it('should return 400 if category ID format is invalid', async () => {
        const invalidId = 'abc';
        const response = await request(app)
            .delete(`/api/v1/categories/${invalidId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty('message');
    });

    it('should return 409 if trying to delete a category that is in use by an event', async () => {
        const response = await request(app)
            .delete(`/api/v1/categories/${categoryInUse.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(409);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('Cannot delete category: It is used by');

        const notDeletedCategory = await db('categories').where({id: categoryInUse.id}).first();
        expect(notDeletedCategory).toBeDefined();

        const relatedEvent = await db('events').where({id: eventUsingCategory.id}).first();
        expect(relatedEvent).toBeDefined();
    });
});