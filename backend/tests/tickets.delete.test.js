const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

describe('DELETE /api/v1/tickets/{id}', () => {
    let memberToken;
    let otherMemberToken;
    let adminToken;
    let memberUser;
    let otherMemberUser;
    let event1;
    let memberTicket;
    let otherMemberTicket;
    let eventStarted;
    let ticketForStartedEvent;

    beforeEach(async () => {

        const adminCredentials = {
            email: `delete.ticket.admin@test.com`,
            plainPassword: 'PasswordAdminDeleteTicket!',
            role: ROLES.ADMINISTRATOR
        };
        const memberCredentials = {
            email: `delete.ticket.member@test.com`,
            plainPassword: 'PasswordMemberDeleteTicket!',
            role: ROLES.MEMBER
        };
        const otherMemberCredentials = {
            email: `delete.ticket.other@test.com`,
            plainPassword: 'PasswordOtherDeleteTicket!',
            role: ROLES.MEMBER
        };

        const saltRounds = 10;
        const passwords = await Promise.all([
            bcrypt.hash(adminCredentials.plainPassword, saltRounds),
            bcrypt.hash(memberCredentials.plainPassword, saltRounds),
            bcrypt.hash(otherMemberCredentials.plainPassword, saltRounds),
        ]);

        const [adminUser] = await db('users').insert({
            first_name: 'Admin',
            last_name: 'TicketDeleter',
            nick: `admin_ticket_deleter_${Date.now()}`,
            email: adminCredentials.email,
            password: passwords[0],
            role: adminCredentials.role
        }).returning('*');
        [memberUser] = await db('users').insert({
            first_name: 'Member',
            last_name: 'TicketDeleter',
            nick: `member_ticket_deleter_${Date.now()}`,
            email: memberCredentials.email,
            password: passwords[1],
            role: memberCredentials.role
        }).returning('*');
        [otherMemberUser] = await db('users').insert({
            first_name: 'Other',
            last_name: 'TicketDeleter',
            nick: `other_ticket_deleter_${Date.now()}`,
            email: otherMemberCredentials.email,
            password: passwords[2],
            role: otherMemberCredentials.role
        }).returning('*');

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const memberPayload = {id: memberUser.id, nick: memberUser.nick, role: memberUser.role, jti: uuidv4()};
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const otherMemberPayload = {
            id: otherMemberUser.id,
            nick: otherMemberUser.nick,
            role: otherMemberUser.role,
            jti: uuidv4()
        };
        otherMemberToken = jwt.sign(otherMemberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        const [locale] = await db('locales').insert({
            city: `DeleteTicket City ${Date.now()}`,
            name: `DeleteTicket Venue ${Date.now()}`
        }).returning('*');
        const [category] = await db('categories').insert({
            name: `DeleteTicket Cat ${Date.now()}`,
            description: 'Cat for delete ticket test'
        }).returning('*');

        [event1] = await db('events').insert({
            locale_id: locale.id, category_id: category.id, name: `Event For Ticket Delete ${Date.now()}`,
            description: 'Event for ticket deletion tests', price: 30.00,
            started_at: new Date(Date.now() + 5 * 86400000), ended_at: new Date(Date.now() + 6 * 86400000)
        }).returning('*');

        [eventStarted] = await db('events').insert({
            locale_id: locale.id, category_id: category.id, name: `Event Started ${Date.now()}`,
            description: 'Event that has already started', price: 15.00,
            started_at: new Date(Date.now() - 1 * 86400000), ended_at: new Date(Date.now() + 1 * 86400000)
        }).returning('*');

        [memberTicket] = await db('event_tickets').insert({
            event_id: event1.id, user_id: memberUser.id, price: event1.price
        }).returning('*');
        [otherMemberTicket] = await db('event_tickets').insert({
            event_id: event1.id, user_id: otherMemberUser.id, price: event1.price
        }).returning('*');
        [ticketForStartedEvent] = await db('event_tickets').insert({
            event_id: eventStarted.id, user_id: memberUser.id, price: eventStarted.price
        }).returning('*');
    });

    it('should allow a member to delete their own ticket (204)', async () => {
        const response = await request(app)
            .delete(`/api/v1/tickets/${memberTicket.id}`)
            .set('Authorization', `Bearer ${memberToken}`);

        expect(response.statusCode).toBe(204);

        const deletedTicket = await db('event_tickets').where({id: memberTicket.id}).first();
        expect(deletedTicket).toBeUndefined();
    });

    it('should return 401 if no token is provided', async () => {
        const response = await request(app)
            .delete(`/api/v1/tickets/${memberTicket.id}`);
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const response = await request(app)
            .delete(`/api/v1/tickets/${memberTicket.id}`)
            .set('Authorization', 'Bearer invalidtoken123');
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is an admin', async () => {

        const response = await request(app)
            .delete(`/api/v1/tickets/${memberTicket.id}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(403);

        const notDeletedTicket = await db('event_tickets').where({id: memberTicket.id}).first();
        expect(notDeletedTicket).toBeDefined();
    });

    it('should return 403 if member tries to delete another member\'s ticket', async () => {

        const response = await request(app)
            .delete(`/api/v1/tickets/${otherMemberTicket.id}`)
            .set('Authorization', `Bearer ${memberToken}`);

        expect(response.statusCode).toBe(403);
        expect(response.body).toHaveProperty('message', 'Forbidden: You can only delete your own tickets.');

        const notDeletedTicket = await db('event_tickets').where({id: otherMemberTicket.id}).first();
        expect(notDeletedTicket).toBeDefined();
    });

    it('should return 404 if ticket ID does not exist', async () => {
        const nonExistentId = memberTicket.id + 999;
        const response = await request(app)
            .delete(`/api/v1/tickets/${nonExistentId}`)
            .set('Authorization', `Bearer ${memberToken}`);
        expect(response.statusCode).toBe(404);
        expect(response.body).toHaveProperty('message', 'Ticket not found.');
    });

    it('should return 400 if ticket ID format is invalid', async () => {
        const invalidId = 'abc';
        const response = await request(app)
            .delete(`/api/v1/tickets/${invalidId}`)
            .set('Authorization', `Bearer ${memberToken}`);
        expect(response.statusCode).toBe(400);

        expect(response.body.errors.some(err => err.path === 'id' && err.msg.includes('Invalid Ticket ID format'))).toBe(true);
    });

    it('should return 400 if trying to delete a ticket for an event that has already started', async () => {

        const response = await request(app)
            .delete(`/api/v1/tickets/${ticketForStartedEvent.id}`)
            .set('Authorization', `Bearer ${memberToken}`);

        expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty('message');

        const notDeletedTicket = await db('event_tickets').where({id: ticketForStartedEvent.id}).first();
        expect(notDeletedTicket).toBeDefined();
    });

});