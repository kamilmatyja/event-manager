const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

describe('DELETE /api/v1/locales/{id}', () => {
    let adminToken;
    let memberToken;
    let localeToDelete;
    let localeInUse;
    let eventUsingLocale;

    beforeEach(async () => {

        const adminCredentials = {
            email: `delete.loc.admin@test.com`,
            plainPassword: 'PasswordAdminDeleteLoc!',
            role: ROLES.ADMINISTRATOR
        };
        const memberCredentials = {
            email: `delete.loc.member@test.com`,
            plainPassword: 'PasswordMemberDeleteLoc!',
            role: ROLES.MEMBER
        };
        const saltRounds = 10;
        const adminHashedPassword = await bcrypt.hash(adminCredentials.plainPassword, saltRounds);
        const memberHashedPassword = await bcrypt.hash(memberCredentials.plainPassword, saltRounds);

        const [adminUser] = await db('users').insert({
            first_name: 'Admin', last_name: 'LocDeleter', nick: `admin_loc_deleter_${Date.now()}`,
            email: adminCredentials.email, password: adminHashedPassword, role: adminCredentials.role
        }).returning('*');
        const [memberUser] = await db('users').insert({
            first_name: 'Member', last_name: 'LocDeleter', nick: `member_loc_deleter_${Date.now()}`,
            email: memberCredentials.email, password: memberHashedPassword, role: memberCredentials.role
        }).returning('*');

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const memberPayload = {id: memberUser.id, nick: memberUser.nick, role: memberUser.role, jti: uuidv4()};
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        [localeToDelete] = await db('locales').insert({
            city: `City To Delete ${Date.now()}`,
            name: `Venue To Delete ${Date.now()}`
        }).returning('*');
        [localeInUse] = await db('locales').insert({
            city: `City In Use ${Date.now()}`,
            name: `Venue In Use ${Date.now()}`
        }).returning('*');

        const [category] = await db('categories').insert({
            name: `DeleteLocTestCat_${Date.now()}`,
            description: 'Cat for delete loc test'
        }).returning('*');
        [eventUsingLocale] = await db('events').insert({
            locale_id: localeInUse.id,
            category_id: category.id,
            name: `Event Using Locale ${Date.now()}`,
            description: 'This event uses a locale',
            price: 5.00,
            started_at: new Date(Date.now() + 86400000),
            ended_at: new Date(Date.now() + 2 * 86400000)
        }).returning('*');
    });

    it('should delete a locale successfully if it is not in use (204)', async () => {
        const response = await request(app)
            .delete(`/api/v1/locales/${localeToDelete.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(204);

        const deletedLocale = await db('locales').where({id: localeToDelete.id}).first();
        expect(deletedLocale).toBeUndefined();
    });

    it('should return 401 if no token is provided', async () => {
        const response = await request(app)
            .delete(`/api/v1/locales/${localeToDelete.id}`);
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const response = await request(app)
            .delete(`/api/v1/locales/${localeToDelete.id}`)
            .set('Authorization', 'Bearer invalidtoken123');
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin (member token)', async () => {
        const response = await request(app)
            .delete(`/api/v1/locales/${localeToDelete.id}`)
            .set('Authorization', `Bearer ${memberToken}`);
        expect(response.statusCode).toBe(403);
    });

    it('should return 404 if locale ID does not exist', async () => {
        const nonExistentId = localeToDelete.id + 999;
        const response = await request(app)
            .delete(`/api/v1/locales/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(404);
    });

    it('should return 400 if locale ID format is invalid', async () => {
        const invalidId = 'abc';
        const response = await request(app)
            .delete(`/api/v1/locales/${invalidId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(400);
    });

    it('should return 409 if trying to delete a locale that is in use by an event', async () => {
        const response = await request(app)
            .delete(`/api/v1/locales/${localeInUse.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(409);

        const notDeletedLocale = await db('locales').where({id: localeInUse.id}).first();
        expect(notDeletedLocale).toBeDefined();

        const relatedEvent = await db('events').where({id: eventUsingLocale.id}).first();
        expect(relatedEvent).toBeDefined();
    });
});