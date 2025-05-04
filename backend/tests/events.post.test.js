const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

const createValidEventData = (localeId, categoryId, overrides = {}) => ({
    locale_id: localeId,
    category_id: categoryId,
    name: `Test Event Post ${Date.now()}`,
    description: `Test Event Description Post ${Date.now()}`,
    price: 199.99,
    started_at: new Date(Date.now() + 5 * 86400000).toISOString(),
    ended_at: new Date(Date.now() + 6 * 86400000).toISOString(),
    prelegent_ids: null,
    resource_ids: null,
    sponsor_ids: null,
    catering_ids: null,
    ...overrides,
});

describe('POST /api/v1/events', () => {
    let adminToken;
    let memberToken;
    let existingEvent;
    let locale1, category1, user1, prelegent1, prelegent2, resource1, resource2, sponsor1, catering1;
    let conflictingEvent;

    beforeEach(async () => {

        const adminCredentials = {
            email: `post.event.admin@test.com`,
            plainPassword: 'PasswordAdminPostEvent!',
            role: ROLES.ADMINISTRATOR
        };
        const memberCredentials = {
            email: `post.event.member@test.com`,
            plainPassword: 'PasswordMemberPostEvent!',
            role: ROLES.MEMBER
        };
        const prelegentUserCredentials = {
            email: `post.event.preluser@test.com`,
            nick: `prel_user_post_ev_${Date.now()}`,
            plainPassword: 'PasswordPrelUserPostEv!',
            role: ROLES.PRELEGENT
        };

        const saltRounds = 10;
        const passwords = await Promise.all([
            bcrypt.hash(adminCredentials.plainPassword, saltRounds),
            bcrypt.hash(memberCredentials.plainPassword, saltRounds),
            bcrypt.hash(prelegentUserCredentials.plainPassword, saltRounds),
        ]);

        const [adminUser] = await db('users').insert({
            first_name: 'Admin',
            last_name: 'EventPoster',
            nick: `admin_event_poster_${Date.now()}`,
            email: adminCredentials.email,
            password: passwords[0],
            role: adminCredentials.role
        }).returning('*');
        const [memberUser] = await db('users').insert({
            first_name: 'Member',
            last_name: 'EventPoster',
            nick: `member_event_poster_${Date.now()}`,
            email: memberCredentials.email,
            password: passwords[1],
            role: memberCredentials.role
        }).returning('*');
        [user1] = await db('users').insert({
            first_name: 'Prelegent',
            last_name: 'UserEvent',
            nick: prelegentUserCredentials.nick,
            email: prelegentUserCredentials.email,
            password: passwords[2],
            role: prelegentUserCredentials.role
        }).returning('*');

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const memberPayload = {id: memberUser.id, nick: memberUser.nick, role: memberUser.role, jti: uuidv4()};
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        [locale1] = await db('locales').insert({
            city: `PostEvent City ${Date.now()}`,
            name: `PostEvent Venue ${Date.now()}`
        }).returning('*');
        [category1] = await db('categories').insert({
            name: `PostEvent Cat ${Date.now()}`,
            description: `PostEvent Cat Desc ${Date.now()}`
        }).returning('*');
        [prelegent1] = await db('prelegents').insert({
            user_id: user1.id,
            name: `PostEvent Prel ${Date.now()}`,
            description: `PostEvent Prel Desc ${Date.now()}`
        }).returning('*');
        [prelegent2] = await db('prelegents').insert({
            user_id: user1.id,
            name: `PostEvent Prel2 ${Date.now()}`,
            description: `PostEvent Prel2 Desc ${Date.now()}`
        }).returning('*');
        [resource1] = await db('resources').insert({
            name: `PostEvent Res ${Date.now()}`,
            description: `PostEvent Res Desc ${Date.now()}`
        }).returning('*');
        [resource2] = await db('resources').insert({
            name: `PostEvent Res2 ${Date.now()}`,
            description: `PostEvent Res2 Desc ${Date.now()}`
        }).returning('*');
        [sponsor1] = await db('sponsors').insert({
            name: `PostEvent Spon ${Date.now()}`,
            description: `PostEvent Spon Desc ${Date.now()}`
        }).returning('*');
        [catering1] = await db('caterings').insert({
            name: `PostEvent Catr ${Date.now()}`,
            description: `PostEvent Catr Desc ${Date.now()}`
        }).returning('*');

        [existingEvent] = await db('events').insert({
            locale_id: locale1.id, category_id: category1.id, name: 'Existing Event Name',
            description: 'Existing Event Description', price: 10.00,
            started_at: new Date(Date.now() + 10 * 86400000), ended_at: new Date(Date.now() + 11 * 86400000)
        }).returning('*');

        const conflictingStartTime = new Date(Date.now() + 5 * 86400000 + 1000);
        const conflictingEndTime = new Date(Date.now() + 5 * 86400000 + 3600000);
        [conflictingEvent] = await db('events').insert({
            locale_id: locale1.id, category_id: category1.id, name: `Conflicting Time Event ${Date.now()}`,
            description: 'Event for time conflict tests', price: 10.00,
            started_at: conflictingStartTime, ended_at: conflictingEndTime
        }).returning('*');

        await db('event_prelegents').insert({event_id: conflictingEvent.id, prelegent_id: prelegent1.id});
        await db('event_resources').insert({event_id: conflictingEvent.id, resource_id: resource1.id});
    });

    it('should create a new event with valid data and no relations as admin (201)', async () => {
        const newEventData = createValidEventData(locale1.id, category1.id);

        const response = await request(app)
            .post('/api/v1/events')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newEventData);

        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe(newEventData.name);
        expect(response.body.description).toBe(newEventData.description);
        expect(response.body.price).toBe(newEventData.price.toString());
        expect(response.body.locale_id).toBe(locale1.id);
        expect(response.body.category_id).toBe(category1.id);

        expect(response.body.prelegent_ids).toEqual([]);
        expect(response.body.resource_ids).toEqual([]);
        expect(response.body.sponsor_ids).toEqual([]);
        expect(response.body.catering_ids).toEqual([]);
        expect(response.body).toHaveProperty('ticket_count', 0);

        const createdEvent = await db('events').where({id: response.body.id}).first();
        expect(createdEvent).toBeDefined();
    });

    it('should create a new event with valid data and relations as admin (201)', async () => {
        const newEventData = createValidEventData(locale1.id, category1.id, {
            prelegent_ids: [prelegent2.id],
            resource_ids: [resource2.id],
            sponsor_ids: [sponsor1.id],
            catering_ids: [catering1.id]
        });

        const response = await request(app)
            .post('/api/v1/events')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newEventData);

        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe(newEventData.name);

        expect(response.body.prelegent_ids).toEqual([prelegent2.id]);
        expect(response.body.resource_ids).toEqual([resource2.id]);
        expect(response.body.sponsor_ids).toEqual([sponsor1.id]);
        expect(response.body.catering_ids).toEqual([catering1.id]);
        expect(response.body).toHaveProperty('ticket_count', 0);

        const links = await Promise.all([
            db('event_prelegents').where({event_id: response.body.id}),
            db('event_resources').where({event_id: response.body.id}),
            db('event_sponsors').where({event_id: response.body.id}),
            db('event_caterings').where({event_id: response.body.id}),
        ]);
        expect(links[0]).toHaveLength(1);
        expect(links[0][0].prelegent_id).toBe(prelegent2.id);
        expect(links[1]).toHaveLength(1);
        expect(links[1][0].resource_id).toBe(resource2.id);
        expect(links[2]).toHaveLength(1);
        expect(links[2][0].sponsor_id).toBe(sponsor1.id);
        expect(links[3]).toHaveLength(1);
        expect(links[3][0].catering_id).toBe(catering1.id);
    });

    it('should return 401 if no token is provided', async () => {
        const newEventData = createValidEventData(locale1.id, category1.id);
        const response = await request(app).post('/api/v1/events').send(newEventData);
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const newEventData = createValidEventData(locale1.id, category1.id);
        const response = await request(app).post('/api/v1/events').set('Authorization', 'Bearer invalid').send(newEventData);
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin (member token)', async () => {
        const newEventData = createValidEventData(locale1.id, category1.id);
        const response = await request(app).post('/api/v1/events').set('Authorization', `Bearer ${memberToken}`).send(newEventData);
        expect(response.statusCode).toBe(403);
    });

    const requiredFields = ['name', 'description', 'price', 'locale_id', 'category_id', 'started_at', 'ended_at'];
    requiredFields.forEach(field => {
        it(`should return 400 if ${field} is missing`, async () => {
            const invalidData = createValidEventData(locale1.id, category1.id);
            delete invalidData[field];
            const response = await request(app).post('/api/v1/events').set('Authorization', `Bearer ${adminToken}`).send(invalidData);
            expect(response.statusCode).toBe(400);
            expect(response.body.errors.some(err => err.path === field && err.msg.includes('required'))).toBe(true);
        });
    });

    it('should return 400 if price is not a number', async () => {
        const invalidData = createValidEventData(locale1.id, category1.id, {price: 'free'});
        const response = await request(app).post('/api/v1/events').set('Authorization', `Bearer ${adminToken}`).send(invalidData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'price' && err.msg.includes('number'))).toBe(true);
    });

    it('should return 400 if price is negative', async () => {
        const invalidData = createValidEventData(locale1.id, category1.id, {price: -10});
        const response = await request(app).post('/api/v1/events').set('Authorization', `Bearer ${adminToken}`).send(invalidData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'price' && err.msg.includes('negative'))).toBe(true);
    });

    it('should return 400 if started_at is not a valid date', async () => {
        const invalidData = createValidEventData(locale1.id, category1.id, {started_at: 'yesterday'});
        const response = await request(app).post('/api/v1/events').set('Authorization', `Bearer ${adminToken}`).send(invalidData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'started_at' && err.msg.includes('ISO8601'))).toBe(true);
    });

    it('should return 400 if ended_at is not after started_at', async () => {
        const startDate = new Date(Date.now() + 5 * 86400000);
        const invalidData = createValidEventData(locale1.id, category1.id, {
            started_at: startDate.toISOString(),
            ended_at: startDate.toISOString()
        });
        const response = await request(app).post('/api/v1/events').set('Authorization', `Bearer ${adminToken}`).send(invalidData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'ended_at' && err.msg.includes('after start date'))).toBe(true);
    });

    it('should return 400 if prelegent_ids is not an array (when provided)', async () => {
        const invalidData = createValidEventData(locale1.id, category1.id, {prelegent_ids: 'not-an-array'});
        const response = await request(app).post('/api/v1/events').set('Authorization', `Bearer ${adminToken}`).send(invalidData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'prelegent_ids' && err.msg.includes('must be an array'))).toBe(true);
    });

    it('should return 400 if prelegent_ids contains non-integer values', async () => {
        const invalidData = createValidEventData(locale1.id, category1.id, {prelegent_ids: [prelegent1.id, 'abc']});
        const response = await request(app).post('/api/v1/events').set('Authorization', `Bearer ${adminToken}`).send(invalidData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'prelegent_ids' && err.msg.includes('Invalid ID format'))).toBe(true);
    });

    it('should return 400 if prelegent_ids contains duplicate _ids', async () => {
        const invalidData = createValidEventData(locale1.id, category1.id, {prelegent_ids: [prelegent1.id, prelegent1.id]});
        const response = await request(app).post('/api/v1/events').set('Authorization', `Bearer ${adminToken}`).send(invalidData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'prelegent_ids' && err.msg.includes('Duplicate IDs found in Prelegent IDs array.'))).toBe(true);
    });

    it('should return 400 if locale_id does not exist', async () => {
        const nonExistentId = locale1.id + 999;
        const invalidData = createValidEventData(nonExistentId, category1.id);
        const response = await request(app).post('/api/v1/events').set('Authorization', `Bearer ${adminToken}`).send(invalidData);
        expect(response.statusCode).toBe(400);

        expect(response.body.errors.some(err => err.path === 'locale_id' && err.msg.includes('does not exist'))).toBe(true);
    });

    it('should return 400 if category_id does not exist', async () => {
        const nonExistentId = category1.id + 999;
        const invalidData = createValidEventData(locale1.id, nonExistentId);
        const response = await request(app).post('/api/v1/events').set('Authorization', `Bearer ${adminToken}`).send(invalidData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'category_id' && err.msg.includes('does not exist'))).toBe(true);
    });

    it('should return 400 if prelegent_ids contains non-existent ID', async () => {
        const nonExistentId = prelegent1.id + 999;
        const invalidData = createValidEventData(locale1.id, category1.id, {prelegent_ids: [prelegent1.id, nonExistentId]});
        const response = await request(app).post('/api/v1/events').set('Authorization', `Bearer ${adminToken}`).send(invalidData);
        expect(response.statusCode).toBe(400);

        expect(response.body.errors.some(err => err.path === 'prelegent_ids' && err.msg.includes('not found'))).toBe(true);
    });

    it('should return 409 if prelegent has time conflict', async () => {

        const conflictingData = createValidEventData(locale1.id, category1.id, {
            started_at: conflictingEvent.started_at.toISOString(),
            ended_at: conflictingEvent.ended_at.toISOString(),
            prelegent_ids: [prelegent1.id]
        });
        const response = await request(app).post('/api/v1/events').set('Authorization', `Bearer ${adminToken}`).send(conflictingData);
        expect(response.statusCode).toBe(409);
    });

    it('should return 409 if resource has time conflict', async () => {
        const conflictingData = createValidEventData(locale1.id, category1.id, {
            started_at: conflictingEvent.started_at.toISOString(),
            ended_at: conflictingEvent.ended_at.toISOString(),
            resource_ids: [resource1.id]
        });
        const response = await request(app).post('/api/v1/events').set('Authorization', `Bearer ${adminToken}`).send(conflictingData);
        expect(response.statusCode).toBe(409);
    });

    it('should return 400 if event name already exists', async () => {
        const newEventAttempt = createValidEventData(locale1.id, category1.id, {
            name: existingEvent.name
        });
        const response = await request(app).post('/api/v1/events').set('Authorization', `Bearer ${adminToken}`).send(newEventAttempt);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'name' && err.msg.includes('Event name already exists.'))).toBe(true);
    });

    it('should return 400 if event description already exists', async () => {
        const newEventAttempt = createValidEventData(locale1.id, category1.id, {
            description: existingEvent.description
        });
        const response = await request(app).post('/api/v1/events').set('Authorization', `Bearer ${adminToken}`).send(newEventAttempt);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'description' && err.msg.includes('Event description already exists.'))).toBe(true);
    });

});