const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

describe('DELETE /api/v1/events/{id}', () => {
    let adminToken;
    let memberToken;
    let eventToDelete;
    let eventWithTickets;

    beforeEach(async () => {

        const adminCredentials = {
            email: `delete.event.admin@test.com`,
            plainPassword: 'PasswordAdminDeleteEvent!',
            role: ROLES.ADMINISTRATOR
        };
        const memberCredentials = {
            email: `delete.event.member@test.com`,
            plainPassword: 'PasswordMemberDeleteEvent!',
            role: ROLES.MEMBER
        };
        const ticketUserCredentials = {
            email: `delete.event.ticketuser@test.com`,
            nick: `ticket_user_del_ev_${Date.now()}`,
            plainPassword: 'PasswordTicketUserDelEv!',
            role: ROLES.MEMBER
        };

        const saltRounds = 10;
        const passwords = await Promise.all([
            bcrypt.hash(adminCredentials.plainPassword, saltRounds),
            bcrypt.hash(memberCredentials.plainPassword, saltRounds),
            bcrypt.hash(ticketUserCredentials.plainPassword, saltRounds),
        ]);

        const [adminUser] = await db('users').insert({
            first_name: 'Admin',
            last_name: 'EventDeleter',
            nick: `admin_event_deleter_${Date.now()}`,
            email: adminCredentials.email,
            password: passwords[0],
            role: adminCredentials.role
        }).returning('*');
        const [memberUser] = await db('users').insert({
            first_name: 'Member',
            last_name: 'EventDeleter',
            nick: `member_event_deleter_${Date.now()}`,
            email: memberCredentials.email,
            password: passwords[1],
            role: memberCredentials.role
        }).returning('*');
        const [ticketUser] = await db('users').insert({
            first_name: 'Ticket',
            last_name: 'UserEventDel',
            nick: ticketUserCredentials.nick,
            email: ticketUserCredentials.email,
            password: passwords[2],
            role: ticketUserCredentials.role
        }).returning('*');

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const memberPayload = {id: memberUser.id, nick: memberUser.nick, role: memberUser.role, jti: uuidv4()};
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        const [locale] = await db('locales').insert({
            city: `DeleteEventTestCity_${Date.now()}`,
            name: `DeleteEventTestVenue_${Date.now()}`
        }).returning('*');
        const [category] = await db('categories').insert({
            name: `DeleteEventTestCat_${Date.now()}`,
            description: 'Cat for delete event test'
        }).returning('*');

        [eventToDelete] = await db('events').insert({
            locale_id: locale.id, category_id: category.id, name: `Event To Delete ${Date.now()}`,
            description: 'Event to be deleted', price: 55.00,
            started_at: new Date(Date.now() + 86400000), ended_at: new Date(Date.now() + 2 * 86400000)
        }).returning('*');

        [eventWithTickets] = await db('events').insert({
            locale_id: locale.id, category_id: category.id, name: `Event With Tickets ${Date.now()}`,
            description: 'This event has tickets and cannot be deleted', price: 77.00,
            started_at: new Date(Date.now() + 3 * 86400000), ended_at: new Date(Date.now() + 4 * 86400000)
        }).returning('*');

        await db('event_tickets').insert({
            event_id: eventWithTickets.id,
            user_id: ticketUser.id,
            price: eventWithTickets.price
        });
    });

    it('should delete an event successfully if it has no tickets (204)', async () => {
        const response = await request(app)
            .delete(`/api/v1/events/${eventToDelete.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(204);

        const deletedEvent = await db('events').where({id: eventToDelete.id}).first();
        expect(deletedEvent).toBeUndefined();
    });

    it('should return 401 if no token is provided', async () => {
        const response = await request(app)
            .delete(`/api/v1/events/${eventToDelete.id}`);
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const response = await request(app)
            .delete(`/api/v1/events/${eventToDelete.id}`)
            .set('Authorization', 'Bearer invalidtoken123');
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin (member token)', async () => {
        const response = await request(app)
            .delete(`/api/v1/events/${eventToDelete.id}`)
            .set('Authorization', `Bearer ${memberToken}`);
        expect(response.statusCode).toBe(403);
    });

    it('should return 404 if event ID does not exist', async () => {
        const nonExistentId = eventToDelete.id + 999;
        const response = await request(app)
            .delete(`/api/v1/events/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(404);
    });

    it('should return 400 if event ID format is invalid', async () => {
        const invalidId = 'abc';
        const response = await request(app)
            .delete(`/api/v1/events/${invalidId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(400);
    });

    it('should return 409 if trying to delete an event that has tickets', async () => {
        const response = await request(app)
            .delete(`/api/v1/events/${eventWithTickets.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(409);

        const notDeletedEvent = await db('events').where({id: eventWithTickets.id}).first();
        expect(notDeletedEvent).toBeDefined();

        const relatedTicket = await db('event_tickets').where({event_id: eventWithTickets.id}).first();
        expect(relatedTicket).toBeDefined();
    });
});