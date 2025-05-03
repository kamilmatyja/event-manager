const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

describe('DELETE /api/v1/resources/{id}', () => {
    let adminToken;
    let memberToken;
    let resourceToDelete;
    let resourceInUse;
    let eventUsingResource;

    beforeEach(async () => {

        const adminCredentials = {
            email: `delete.res.admin@test.com`,
            plainPassword: 'PasswordAdminDeleteRes!',
            role: ROLES.ADMINISTRATOR
        };
        const memberCredentials = {
            email: `delete.res.member@test.com`,
            plainPassword: 'PasswordMemberDeleteRes!',
            role: ROLES.MEMBER
        };
        const saltRounds = 10;
        const adminHashedPassword = await bcrypt.hash(adminCredentials.plainPassword, saltRounds);
        const memberHashedPassword = await bcrypt.hash(memberCredentials.plainPassword, saltRounds);

        const [adminUser] = await db('users').insert({
            first_name: 'Admin', last_name: 'ResDeleter', nick: `admin_res_deleter_${Date.now()}`,
            email: adminCredentials.email, password: adminHashedPassword, role: adminCredentials.role
        }).returning('*');
        const [memberUser] = await db('users').insert({
            first_name: 'Member', last_name: 'ResDeleter', nick: `member_res_deleter_${Date.now()}`,
            email: memberCredentials.email, password: memberHashedPassword, role: memberCredentials.role
        }).returning('*');

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const memberPayload = {id: memberUser.id, nick: memberUser.nick, role: memberUser.role, jti: uuidv4()};
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        [resourceToDelete] = await db('resources').insert({
            name: `Resource To Delete ${Date.now()}`,
            description: `Desc To Delete ${Date.now()}`
        }).returning('*');
        [resourceInUse] = await db('resources').insert({
            name: `Resource In Use ${Date.now()}`,
            description: `Desc In Use ${Date.now()}`
        }).returning('*');

        const [locale] = await db('locales').insert({
            city: `DeleteResTestCity_${Date.now()}`,
            name: `DeleteResTestVenue_${Date.now()}`
        }).returning('*');
        const [category] = await db('categories').insert({
            name: `DeleteResTestCat_${Date.now()}`,
            description: 'Cat for delete res test'
        }).returning('*');
        [eventUsingResource] = await db('events').insert({
            locale_id: locale.id, category_id: category.id, name: `Event Using Resource ${Date.now()}`,
            description: 'This event uses a resource', price: 25.00,
            started_at: new Date(Date.now() + 86400000), ended_at: new Date(Date.now() + 2 * 86400000)
        }).returning('*');

        await db('event_resources').insert({
            event_id: eventUsingResource.id,
            resource_id: resourceInUse.id
        });
    });

    it('should delete a resource successfully if it is not in use (204)', async () => {
        const response = await request(app)
            .delete(`/api/v1/resources/${resourceToDelete.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(204);

        const deletedResource = await db('resources').where({id: resourceToDelete.id}).first();
        expect(deletedResource).toBeUndefined();
    });

    it('should return 401 if no token is provided', async () => {
        const response = await request(app)
            .delete(`/api/v1/resources/${resourceToDelete.id}`);
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const response = await request(app)
            .delete(`/api/v1/resources/${resourceToDelete.id}`)
            .set('Authorization', 'Bearer invalidtoken123');
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin (member token)', async () => {
        const response = await request(app)
            .delete(`/api/v1/resources/${resourceToDelete.id}`)
            .set('Authorization', `Bearer ${memberToken}`);
        expect(response.statusCode).toBe(403);
    });

    it('should return 404 if resource ID does not exist', async () => {
        const nonExistentId = resourceToDelete.id + 999;
        const response = await request(app)
            .delete(`/api/v1/resources/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(404);
    });

    it('should return 400 if resource ID format is invalid', async () => {
        const invalidId = 'abc';
        const response = await request(app)
            .delete(`/api/v1/resources/${invalidId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty('message');
    });

    it('should return 409 if trying to delete a resource that is in use by an event', async () => {
        const response = await request(app)
            .delete(`/api/v1/resources/${resourceInUse.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(409);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('Cannot delete resource: It is assigned to');

        const notDeletedResource = await db('resources').where({id: resourceInUse.id}).first();
        expect(notDeletedResource).toBeDefined();

        const relatedEvent = await db('events').where({id: eventUsingResource.id}).first();
        expect(relatedEvent).toBeDefined();

        const eventResourceLink = await db('event_resources').where({resource_id: resourceInUse.id}).first();
        expect(eventResourceLink).toBeDefined();
    });
});