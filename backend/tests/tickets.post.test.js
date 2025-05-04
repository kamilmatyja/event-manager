const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

describe('POST /api/v1/tickets', () => {
    let memberToken;
    let adminToken;
    let memberUser;
    let eventAvailable;
    let eventAlreadyRegistered;
    let eventConflictingTime;
    let eventPast;

    beforeEach(async () => {

        const adminCredentials = {
            email: `post.ticket.admin@test.com`,
            plainPassword: 'PasswordAdminPostTicket!',
            role: ROLES.ADMINISTRATOR
        };
        const memberCredentials = {
            email: `post.ticket.member@test.com`,
            plainPassword: 'PasswordMemberPostTicket!',
            role: ROLES.MEMBER
        };
        const saltRounds = 10;
        const adminHashedPassword = await bcrypt.hash(adminCredentials.plainPassword, saltRounds);
        const memberHashedPassword = await bcrypt.hash(memberCredentials.plainPassword, saltRounds);

        const [adminUser] = await db('users').insert({
            first_name: 'Admin',
            last_name: 'TicketPoster',
            nick: `admin_ticket_poster_${Date.now()}`,
            email: adminCredentials.email,
            password: adminHashedPassword,
            role: adminCredentials.role
        }).returning('*');
        [memberUser] = await db('users').insert({
            first_name: 'Member',
            last_name: 'TicketPoster',
            nick: `member_ticket_poster_${Date.now()}`,
            email: memberCredentials.email,
            password: memberHashedPassword,
            role: memberCredentials.role
        }).returning('*');

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const memberPayload = {id: memberUser.id, nick: memberUser.nick, role: memberUser.role, jti: uuidv4()};
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        const [locale] = await db('locales').insert({
            city: `PostTicket City ${Date.now()}`,
            name: `PostTicket Venue ${Date.now()}`
        }).returning('*');
        const [category] = await db('categories').insert({
            name: `PostTicket Cat ${Date.now()}`,
            description: 'Cat for post ticket test'
        }).returning('*');

        const startTimeAvailable = new Date(Date.now() + 5 * 86400000);
        const endTimeAvailable = new Date(Date.now() + 6 * 86400000);
        const startTimeConflict = new Date(Date.now() + 7 * 86400000);
        const endTimeConflict = new Date(Date.now() + 8 * 86400000);
        const startTimePast = new Date(Date.now() - 2 * 86400000);
        const endTimePast = new Date(Date.now() - 1 * 86400000);

        [eventAvailable] = await db('events').insert({
            locale_id: locale.id, category_id: category.id, name: `Event Available ${Date.now()}`,
            description: 'Event to register for', price: 100.00,
            started_at: startTimeAvailable, ended_at: endTimeAvailable
        }).returning('*');

        [eventAlreadyRegistered] = await db('events').insert({
            locale_id: locale.id, category_id: category.id, name: `Event Registered ${Date.now()}`,
            description: 'Event member is already on', price: 50.00,
            started_at: startTimeConflict, ended_at: endTimeConflict
        }).returning('*');

        [eventConflictingTime] = await db('events').insert({
            locale_id: locale.id, category_id: category.id, name: `Event Conflict Time ${Date.now()}`,
            description: 'Event that conflicts time-wise', price: 25.00,

            started_at: startTimeConflict, ended_at: endTimeConflict
        }).returning('*');

        [eventPast] = await db('events').insert({
            locale_id: locale.id, category_id: category.id, name: `Event Past ${Date.now()}`,
            description: 'Event that already ended', price: 10.00,
            started_at: startTimePast, ended_at: endTimePast
        }).returning('*');

        await db('event_tickets').insert({
            event_id: eventAlreadyRegistered.id,
            user_id: memberUser.id,
            price: eventAlreadyRegistered.price
        });
    });

    it('should allow a member to register for an available event (201)', async () => {
        const response = await request(app)
            .post('/api/v1/tickets')
            .set('Authorization', `Bearer ${memberToken}`)
            .send({event_id: eventAvailable.id});

        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.event_id).toBe(eventAvailable.id);
        expect(response.body.user_id).toBe(memberUser.id);
        expect(response.body.price).toBe(eventAvailable.price.toString());
        expect(response.body).toHaveProperty('created_at');
        expect(response.body).toHaveProperty('updated_at');

        const createdTicket = await db('event_tickets').where({id: response.body.id}).first();
        expect(createdTicket).toBeDefined();
        expect(createdTicket.user_id).toBe(memberUser.id);
    });

    it('should return 401 if no token is provided', async () => {
        const response = await request(app).post('/api/v1/tickets').send({event_id: eventAvailable.id});
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const response = await request(app).post('/api/v1/tickets').set('Authorization', 'Bearer invalid').send({event_id: eventAvailable.id});
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is an admin', async () => {
        const response = await request(app).post('/api/v1/tickets').set('Authorization', `Bearer ${adminToken}`).send({event_id: eventAvailable.id});
        expect(response.statusCode).toBe(403);
    });

    it('should return 400 if event_id is missing', async () => {
        const response = await request(app).post('/api/v1/tickets').set('Authorization', `Bearer ${memberToken}`).send({});
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'event_id' && err.msg.includes('required'))).toBe(true);
    });

    it('should return 400 if event_id format is invalid (string)', async () => {
        const response = await request(app).post('/api/v1/tickets').set('Authorization', `Bearer ${memberToken}`).send({event_id: 'abc'});
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'event_id' && err.msg.includes('Invalid Event ID format'))).toBe(true);
    });

    it('should return 400 if event_id format is invalid (zero)', async () => {
        const response = await request(app).post('/api/v1/tickets').set('Authorization', `Bearer ${memberToken}`).send({event_id: 0});
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'event_id' && err.msg.includes('Invalid Event ID format'))).toBe(true);
    });

    it('should return 400 if event_id does not exist', async () => {
        const nonExistentId = eventAvailable.id + 999;
        const response = await request(app).post('/api/v1/tickets').set('Authorization', `Bearer ${memberToken}`).send({event_id: nonExistentId});
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'event_id' && err.msg.includes('Event with the provided ID does not exist.'))).toBe(true);
    });

    it('should return 409 if member is already registered for this event', async () => {
        const response = await request(app)
            .post('/api/v1/tickets')
            .set('Authorization', `Bearer ${memberToken}`)
            .send({event_id: eventAlreadyRegistered.id});

        expect(response.statusCode).toBe(409);
    });

    it('should return 409 if member has a time conflict with another registered event', async () => {
        const response = await request(app)
            .post('/api/v1/tickets')
            .set('Authorization', `Bearer ${memberToken}`)
            .send({event_id: eventConflictingTime.id});

        expect(response.statusCode).toBe(409);
    });

    it('should return 400 if trying to register for an event that already ended', async () => {
        const response = await request(app)
            .post('/api/v1/tickets')
            .set('Authorization', `Bearer ${memberToken}`)
            .send({event_id: eventPast.id});

        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'event_id' && err.msg.includes('Cannot create a ticket for an event that has already ended.'))).toBe(true);
    });

});