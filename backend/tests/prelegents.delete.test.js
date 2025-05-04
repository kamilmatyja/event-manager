const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

describe('DELETE /api/v1/prelegents/{id}', () => {
    let adminToken;
    let memberToken;
    let prelegentToDelete;
    let prelegentInUse;
    let eventUsingPrelegent;

    beforeEach(async () => {

        const adminCredentials = {
            email: `delete.prel.admin@test.com`,
            plainPassword: 'PasswordAdminDeletePrel!',
            role: ROLES.ADMINISTRATOR
        };
        const memberCredentials = {
            email: `delete.prel.member@test.com`,
            plainPassword: 'PasswordMemberDeletePrel!',
            role: ROLES.MEMBER
        };
        const toDeleteUserCredentials = {
            email: `delete.prel.targetuser@test.com`,
            nick: `target_prel_delete_${Date.now()}`,
            plainPassword: 'PasswordTargetPrelDelete!',
            role: ROLES.MEMBER
        };
        const inUseUserCredentials = {
            email: `delete.prel.inuseuser@test.com`,
            nick: `inuse_prel_delete_${Date.now()}`,
            plainPassword: 'PasswordInUsePrelDelete!',
            role: ROLES.MEMBER
        };

        const saltRounds = 10;
        const passwords = await Promise.all([
            bcrypt.hash(adminCredentials.plainPassword, saltRounds),
            bcrypt.hash(memberCredentials.plainPassword, saltRounds),
            bcrypt.hash(toDeleteUserCredentials.plainPassword, saltRounds),
            bcrypt.hash(inUseUserCredentials.plainPassword, saltRounds),
        ]);

        const [adminUser] = await db('users').insert({
            first_name: 'Admin',
            last_name: 'PrelDeleter',
            nick: `admin_prel_deleter_${Date.now()}`,
            email: adminCredentials.email,
            password: passwords[0],
            role: adminCredentials.role
        }).returning('*');
        const [memberUser] = await db('users').insert({
            first_name: 'Member',
            last_name: 'PrelDeleter',
            nick: `member_prel_deleter_${Date.now()}`,
            email: memberCredentials.email,
            password: passwords[1],
            role: memberCredentials.role
        }).returning('*');
        const [userToDeletePrelegent] = await db('users').insert({
            first_name: 'ToDelete',
            last_name: 'PrelUser',
            nick: toDeleteUserCredentials.nick,
            email: toDeleteUserCredentials.email,
            password: passwords[2],
            role: toDeleteUserCredentials.role
        }).returning('*');
        const [userInUsePrelegent] = await db('users').insert({
            first_name: 'InUse',
            last_name: 'PrelUser',
            nick: inUseUserCredentials.nick,
            email: inUseUserCredentials.email,
            password: passwords[3],
            role: inUseUserCredentials.role
        }).returning('*');

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const memberPayload = {id: memberUser.id, nick: memberUser.nick, role: memberUser.role, jti: uuidv4()};
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        [prelegentToDelete] = await db('prelegents').insert({
            user_id: userToDeletePrelegent.id,
            name: `Prelegent To Delete ${Date.now()}`,
            description: `Desc To Delete ${Date.now()}`
        }).returning('*');
        [prelegentInUse] = await db('prelegents').insert({
            user_id: userInUsePrelegent.id,
            name: `Prelegent In Use ${Date.now()}`,
            description: `Desc In Use ${Date.now()}`
        }).returning('*');

        const [locale] = await db('locales').insert({
            city: `DeletePrelTestCity_${Date.now()}`,
            name: `DeletePrelTestVenue_${Date.now()}`
        }).returning('*');
        const [category] = await db('categories').insert({
            name: `DeletePrelTestCat_${Date.now()}`,
            description: 'Cat for delete prel test'
        }).returning('*');
        [eventUsingPrelegent] = await db('events').insert({
            locale_id: locale.id, category_id: category.id, name: `Event Using Prelegent ${Date.now()}`,
            description: 'This event uses a prelegent', price: 15.00,
            started_at: new Date(Date.now() + 86400000), ended_at: new Date(Date.now() + 2 * 86400000)
        }).returning('*');

        await db('event_prelegents').insert({
            event_id: eventUsingPrelegent.id,
            prelegent_id: prelegentInUse.id
        });
    });

    it('should delete a prelegent successfully if not assigned to any event (204)', async () => {
        const response = await request(app)
            .delete(`/api/v1/prelegents/${prelegentToDelete.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(204);

        const deletedPrelegent = await db('prelegents').where({id: prelegentToDelete.id}).first();
        expect(deletedPrelegent).toBeUndefined();

        const relatedUser = await db('users').where({id: prelegentToDelete.user_id}).first();
        expect(relatedUser).toBeDefined();
    });

    it('should return 401 if no token is provided', async () => {
        const response = await request(app)
            .delete(`/api/v1/prelegents/${prelegentToDelete.id}`);
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const response = await request(app)
            .delete(`/api/v1/prelegents/${prelegentToDelete.id}`)
            .set('Authorization', 'Bearer invalidtoken123');
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin (member token)', async () => {
        const response = await request(app)
            .delete(`/api/v1/prelegents/${prelegentToDelete.id}`)
            .set('Authorization', `Bearer ${memberToken}`);
        expect(response.statusCode).toBe(403);
    });

    it('should return 404 if prelegent ID does not exist', async () => {
        const nonExistentId = prelegentToDelete.id + 999;
        const response = await request(app)
            .delete(`/api/v1/prelegents/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(404);
    });

    it('should return 400 if prelegent ID format is invalid', async () => {
        const invalidId = 'abc';
        const response = await request(app)
            .delete(`/api/v1/prelegents/${invalidId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(400);
    });

    it('should return 409 if trying to delete a prelegent assigned to an event', async () => {
        const response = await request(app)
            .delete(`/api/v1/prelegents/${prelegentInUse.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(409);

        const notDeletedPrelegent = await db('prelegents').where({id: prelegentInUse.id}).first();
        expect(notDeletedPrelegent).toBeDefined();

        const relatedEvent = await db('events').where({id: eventUsingPrelegent.id}).first();
        expect(relatedEvent).toBeDefined();

        const eventPrelegentLink = await db('event_prelegents').where({prelegent_id: prelegentInUse.id}).first();
        expect(eventPrelegentLink).toBeDefined();
    });
});