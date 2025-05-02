const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

describe('DELETE /api/v1/caterings/{id}', () => {
    let adminToken;
    let memberToken;
    let cateringToDelete;
    let cateringInUse;
    let eventUsingCatering;

    beforeEach(async () => {

        const adminCredentials = {
            email: `delete.catr.admin@test.com`,
            plainPassword: 'PasswordAdminDeleteCatr!',
            role: ROLES.ADMINISTRATOR
        };
        const memberCredentials = {
            email: `delete.catr.member@test.com`,
            plainPassword: 'PasswordMemberDeleteCatr!',
            role: ROLES.MEMBER
        };
        const saltRounds = 10;
        const adminHashedPassword = await bcrypt.hash(adminCredentials.plainPassword, saltRounds);
        const memberHashedPassword = await bcrypt.hash(memberCredentials.plainPassword, saltRounds);

        const [adminUser] = await db('users').insert({
            first_name: 'Admin', last_name: 'CatrDeleter', nick: `admin_catr_deleter_${Date.now()}`,
            email: adminCredentials.email, password: adminHashedPassword, role: adminCredentials.role
        }).returning('*');
        const [memberUser] = await db('users').insert({
            first_name: 'Member', last_name: 'CatrDeleter', nick: `member_catr_deleter_${Date.now()}`,
            email: memberCredentials.email, password: memberHashedPassword, role: memberCredentials.role
        }).returning('*');

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const memberPayload = {id: memberUser.id, nick: memberUser.nick, role: memberUser.role, jti: uuidv4()};
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        [cateringToDelete] = await db('caterings').insert({
            name: `Catering To Delete ${Date.now()}`,
            description: `Description to delete ${Date.now()}`
        }).returning('*');
        [cateringInUse] = await db('caterings').insert({
            name: `Catering In Use ${Date.now()}`,
            description: `Description in use ${Date.now()}`
        }).returning('*');

        const [locale] = await db('locales').insert({
            city: `DeleteCatrTestCity_${Date.now()}`,
            name: `DeleteCatrTestVenue_${Date.now()}`
        }).returning('*');
        const [category] = await db('categories').insert({
            name: `DeleteCatrTestCat_${Date.now()}`,
            description: 'Cat for delete catr test'
        }).returning('*');
        [eventUsingCatering] = await db('events').insert({
            locale_id: locale.id,
            category_id: category.id,
            name: `Event Using Catering ${Date.now()}`,
            description: 'This event uses a catering option',
            price: 5.00,
            started_at: new Date(Date.now() + 86400000),
            ended_at: new Date(Date.now() + 2 * 86400000)
        }).returning('*');

        await db('event_caterings').insert({
            event_id: eventUsingCatering.id,
            catering_id: cateringInUse.id
        });
    });

    it('should delete a catering option successfully if it is not in use (204)', async () => {
        const response = await request(app)
            .delete(`/api/v1/caterings/${cateringToDelete.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(204);

        const deletedCatering = await db('caterings').where({id: cateringToDelete.id}).first();
        expect(deletedCatering).toBeUndefined();
    });

    it('should return 401 if no token is provided', async () => {
        const response = await request(app)
            .delete(`/api/v1/caterings/${cateringToDelete.id}`);
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const response = await request(app)
            .delete(`/api/v1/caterings/${cateringToDelete.id}`)
            .set('Authorization', 'Bearer invalidtoken123');
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin (member token)', async () => {
        const response = await request(app)
            .delete(`/api/v1/caterings/${cateringToDelete.id}`)
            .set('Authorization', `Bearer ${memberToken}`);
        expect(response.statusCode).toBe(403);
    });

    it('should return 404 if catering ID does not exist', async () => {
        const nonExistentId = cateringToDelete.id + 999;
        const response = await request(app)
            .delete(`/api/v1/caterings/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(404);
    });

    it('should return 400 if catering ID format is invalid', async () => {
        const invalidId = 'abc';
        const response = await request(app)
            .delete(`/api/v1/caterings/${invalidId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty('message');
    });

    it('should return 409 if trying to delete a catering option that is in use by an event', async () => {
        const response = await request(app)
            .delete(`/api/v1/caterings/${cateringInUse.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(409);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('Cannot delete catering: It is used by');

        const notDeletedCatering = await db('caterings').where({id: cateringInUse.id}).first();
        expect(notDeletedCatering).toBeDefined();

        const relatedEvent = await db('events').where({id: eventUsingCatering.id}).first();
        expect(relatedEvent).toBeDefined();

        const eventCateringLink = await db('event_caterings').where({catering_id: cateringInUse.id}).first();
        expect(eventCateringLink).toBeDefined();
    });
});