const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

describe('DELETE /api/v1/users/{id}', () => {
    let adminToken;
    let memberToken;
    let adminUser;
    let userToDelete;
    let userAsPrelegent;
    let userWithTicket;
    let prelegentRecord;
    let eventRecord;

    const adminCredentials = {
        email: 'delete.users.admin@test.com',
        plainPassword: 'PasswordAdminDelete!',
        role: ROLES.ADMINISTRATOR
    };
    const memberCredentials = {
        email: 'delete.users.member@test.com',
        plainPassword: 'PasswordMemberDelete!',
        role: ROLES.MEMBER
    };
    const toDeleteCredentials = {
        email: 'delete.users.target@test.com',
        nick: 'target_delete_user',
        plainPassword: 'PasswordTargetDelete!',
        role: ROLES.MEMBER
    };
    const prelegentUserCredentials = {
        email: 'delete.users.prelegent@test.com',
        nick: 'prelegent_delete_user',
        plainPassword: 'PasswordPrelegentDelete!',
        role: ROLES.MEMBER
    };
    const ticketUserCredentials = {
        email: 'delete.users.ticket@test.com',
        nick: 'ticket_delete_user',
        plainPassword: 'PasswordTicketDelete!',
        role: ROLES.MEMBER
    };

    beforeEach(async () => {
        const saltRounds = 10;
        const passwords = await Promise.all([
            bcrypt.hash(adminCredentials.plainPassword, saltRounds),
            bcrypt.hash(memberCredentials.plainPassword, saltRounds),
            bcrypt.hash(toDeleteCredentials.plainPassword, saltRounds),
            bcrypt.hash(prelegentUserCredentials.plainPassword, saltRounds),
            bcrypt.hash(ticketUserCredentials.plainPassword, saltRounds),
        ]);

        [adminUser] = await db('users').insert({
            first_name: 'Admin',
            last_name: 'Deleter',
            nick: 'admin_deleter',
            email: adminCredentials.email,
            password: passwords[0],
            role: adminCredentials.role
        }).returning('*');
        const [accessingMember] = await db('users').insert({
            first_name: 'Member',
            last_name: 'Deleter',
            nick: 'member_deleter',
            email: memberCredentials.email,
            password: passwords[1],
            role: memberCredentials.role
        }).returning('*');
        [userToDelete] = await db('users').insert({
            first_name: 'ToDelete',
            last_name: 'User',
            email: toDeleteCredentials.email,
            nick: toDeleteCredentials.nick,
            password: passwords[2],
            role: toDeleteCredentials.role
        }).returning('*');
        [userAsPrelegent] = await db('users').insert({
            first_name: 'Prelegent',
            last_name: 'User',
            email: prelegentUserCredentials.email,
            nick: prelegentUserCredentials.nick,
            password: passwords[3],
            role: prelegentUserCredentials.role
        }).returning('*');
        [userWithTicket] = await db('users').insert({
            first_name: 'Ticket',
            last_name: 'User',
            email: ticketUserCredentials.email,
            nick: ticketUserCredentials.nick,
            password: passwords[4],
            role: ticketUserCredentials.role
        }).returning('*');

        [prelegentRecord] = await db('prelegents').insert({
            user_id: userAsPrelegent.id,
            name: `PrelegentToDeleteTest_${userAsPrelegent.id}`,
            description: `Test desc prelegent delete ${userAsPrelegent.id}`
        }).returning('*');

        const [locale] = await db('locales').insert({
            city: 'DeleteTestCity',
            name: `DeleteTestVenue_${Date.now()}`
        }).returning('*');
        const [category] = await db('categories').insert({
            name: `DeleteTestCategory_${Date.now()}`,
            description: 'Delete test desc cat'
        }).returning('*');
        [eventRecord] = await db('events').insert({
            locale_id: locale.id,
            category_id: category.id,
            name: `DeleteTestEvent_${Date.now()}`,
            description: 'Event for delete test',
            price: 10.00,
            started_at: new Date(Date.now() + 86400000),
            ended_at: new Date(Date.now() + 2 * 86400000)
        }).returning('*');
        await db('event_tickets').insert({
            event_id: eventRecord.id,
            user_id: userWithTicket.id,
            price: eventRecord.price
        });

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        const memberPayload = {
            id: accessingMember.id,
            nick: accessingMember.nick,
            role: accessingMember.role,
            jti: uuidv4()
        };
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
    });

    it('should delete a user successfully if they have no dependencies (204)', async () => {
        const response = await request(app)
            .delete(`/api/v1/users/${userToDelete.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(204);

        const deletedUser = await db('users').where({id: userToDelete.id}).first();
        expect(deletedUser).toBeUndefined();
    });

    it('should return 401 if no token is provided', async () => {
        const response = await request(app)
            .delete(`/api/v1/users/${userToDelete.id}`);
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const response = await request(app)
            .delete(`/api/v1/users/${userToDelete.id}`)
            .set('Authorization', 'Bearer invalidtoken123');
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin (member token)', async () => {
        const response = await request(app)
            .delete(`/api/v1/users/${userToDelete.id}`)
            .set('Authorization', `Bearer ${memberToken}`);
        expect(response.statusCode).toBe(403);
    });

    it('should return 404 if user ID does not exist', async () => {
        const nonExistentId = userToDelete.id + 999;
        const response = await request(app)
            .delete(`/api/v1/users/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(404);
    });

    it('should return 400 if user ID format is invalid', async () => {
        const invalidId = 'abc';
        const response = await request(app)
            .delete(`/api/v1/users/${invalidId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(400);
    });

    it('should return 409 if trying to delete a user who is a prelegent', async () => {
        const response = await request(app)
            .delete(`/api/v1/users/${userAsPrelegent.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(409);

        const notDeletedUser = await db('users').where({id: userAsPrelegent.id}).first();
        expect(notDeletedUser).toBeDefined();
    });

    it('should return 409 if trying to delete a user who has tickets', async () => {
        const response = await request(app)
            .delete(`/api/v1/users/${userWithTicket.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(409);

        const notDeletedUser = await db('users').where({id: userWithTicket.id}).first();
        expect(notDeletedUser).toBeDefined();
    });

    it('should return 400 if admin tries to delete themselves', async () => {

        const response = await request(app)
            .delete(`/api/v1/users/${adminUser.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(400);

        const notDeletedUser = await db('users').where({id: adminUser.id}).first();
        expect(notDeletedUser).toBeDefined();
    });

});