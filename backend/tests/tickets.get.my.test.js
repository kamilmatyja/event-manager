const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

describe('GET /api/v1/tickets/my', () => {
    let memberToken;
    let adminToken;
    let memberUser;
    let otherMemberUser;
    let event1, event2, locale1, category1;

    beforeEach(async () => {

        const adminCredentials = {
            email: `getmy.ticket.admin@test.com`,
            plainPassword: 'PasswordAdminGetMyTicket!',
            role: ROLES.ADMINISTRATOR
        };
        const memberCredentials = {
            email: `getmy.ticket.member@test.com`,
            plainPassword: 'PasswordMemberGetMyTicket!',
            role: ROLES.MEMBER
        };
        const otherMemberCredentials = {
            email: `getmy.ticket.other@test.com`,
            plainPassword: 'PasswordOtherGetMyTicket!',
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
            last_name: 'MyTicket',
            nick: `admin_myticket_${Date.now()}`,
            email: adminCredentials.email,
            password: passwords[0],
            role: adminCredentials.role
        }).returning('*');
        [memberUser] = await db('users').insert({
            first_name: 'Member',
            last_name: 'MyTicket',
            nick: `member_myticket_${Date.now()}`,
            email: memberCredentials.email,
            password: passwords[1],
            role: memberCredentials.role
        }).returning('*');
        [otherMemberUser] = await db('users').insert({
            first_name: 'Other',
            last_name: 'MyTicket',
            nick: `other_myticket_${Date.now()}`,
            email: otherMemberCredentials.email,
            password: passwords[2],
            role: otherMemberCredentials.role
        }).returning('*');

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const memberPayload = {id: memberUser.id, nick: memberUser.nick, role: memberUser.role, jti: uuidv4()};
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        [locale1] = await db('locales').insert({
            city: `GetMyTicket City ${Date.now()}`,
            name: `GetMyTicket Venue ${Date.now()}`
        }).returning('*');
        [category1] = await db('categories').insert({
            name: `GetMyTicket Cat ${Date.now()}`,
            description: 'Cat for get my ticket test'
        }).returning('*');
        [event1] = await db('events').insert({
            locale_id: locale1.id, category_id: category1.id, name: `Event 1 My Tickets ${Date.now()}`,
            description: 'First event for my tickets', price: 50.00,
            started_at: new Date(Date.now() + 1 * 86400000), ended_at: new Date(Date.now() + 2 * 86400000)
        }).returning('*');
        [event2] = await db('events').insert({
            locale_id: locale1.id, category_id: category1.id, name: `Event 2 My Tickets ${Date.now()}`,
            description: 'Second event for my tickets', price: 75.00,
            started_at: new Date(Date.now() + 3 * 86400000), ended_at: new Date(Date.now() + 4 * 86400000)
        }).returning('*');

        await db('event_tickets').insert([
            {event_id: event1.id, user_id: memberUser.id, price: event1.price},
            {event_id: event2.id, user_id: memberUser.id, price: event2.price}
        ]);

        await db('event_tickets').insert({event_id: event1.id, user_id: otherMemberUser.id, price: event1.price});
    });

    it('should return a list of tickets for the logged-in member (200)', async () => {
        const response = await request(app)
            .get('/api/v1/tickets/my')
            .set('Authorization', `Bearer ${memberToken}`);

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(2);

        const eventIds = response.body.map(t => t.event_id);
        expect(eventIds).toContain(event1.id);
        expect(eventIds).toContain(event2.id);

        const ticket1 = response.body.find(t => t.event_id === event1.id);
        expect(ticket1).toBeDefined();
        expect(ticket1).toHaveProperty('id');
        expect(ticket1).toHaveProperty('event_id', event1.id);
        expect(ticket1).toHaveProperty('user_id', memberUser.id);
        expect(ticket1).toHaveProperty('price', event1.price.toString());
        expect(ticket1).toHaveProperty('created_at');
        expect(ticket1).toHaveProperty('updated_at');
    });

    it('should return an empty list if the logged-in member has no tickets (200)', async () => {

        await db('event_tickets').where({user_id: memberUser.id}).del();

        const response = await request(app)
            .get('/api/v1/tickets/my')
            .set('Authorization', `Bearer ${memberToken}`);

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(0);
    });

    it('should return 401 if no token is provided', async () => {
        const response = await request(app)
            .get('/api/v1/tickets/my');
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const response = await request(app)
            .get('/api/v1/tickets/my')
            .set('Authorization', 'Bearer invalidtoken123');
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is an admin (requires Member role)', async () => {
        const response = await request(app)
            .get('/api/v1/tickets/my')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(403);
    });
});