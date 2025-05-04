const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

const createFullUpdateEventData = (currentEventData, updates) => {

    const {
        id, created_at, updated_at, locale_name, category_name,
        ticket_count, prelegent_ids, resource_ids, sponsor_ids, catering_ids,
        ...baseData
    } = currentEventData;

    const currentRelations = {
        prelegent_ids: currentEventData.prelegent_ids || [],
        resource_ids: currentEventData.resource_ids || [],
        sponsor_ids: currentEventData.sponsor_ids || [],
        catering_ids: currentEventData.catering_ids || [],
    };

    return {
        ...baseData,
        ...currentRelations,
        ...updates,
    };
};

describe('PUT /api/v1/events/{id}', () => {
    let adminToken;
    let memberToken;
    let eventToUpdate;
    let otherEvent;
    let locale1, category1, user1, prelegent1, prelegent2, resource1, resource2, sponsor1, sponsor2, catering1,
        catering2;
    let conflictingEvent;

    beforeEach(async () => {

        const adminCredentials = {
            email: `put.event.admin@test.com`,
            plainPassword: 'PasswordAdminPutEvent!',
            role: ROLES.ADMINISTRATOR
        };
        const memberCredentials = {
            email: `put.event.member@test.com`,
            plainPassword: 'PasswordMemberPutEvent!',
            role: ROLES.MEMBER
        };
        const userCredentials = {
            email: `put.event.user@test.com`,
            nick: `user_put_ev_${Date.now()}`,
            plainPassword: 'PasswordUserPutEv!',
            role: ROLES.MEMBER
        };
        const saltRounds = 10;
        const passwords = await Promise.all([
            bcrypt.hash(adminCredentials.plainPassword, saltRounds),
            bcrypt.hash(memberCredentials.plainPassword, saltRounds),
            bcrypt.hash(userCredentials.plainPassword, saltRounds),
        ]);
        const [adminUser] = await db('users').insert({
            first_name: 'Admin',
            last_name: 'EventPutter',
            nick: `admin_event_putter_${Date.now()}`,
            email: adminCredentials.email,
            password: passwords[0],
            role: adminCredentials.role
        }).returning('*');
        const [memberUser] = await db('users').insert({
            first_name: 'Member',
            last_name: 'EventPutter',
            nick: `member_event_putter_${Date.now()}`,
            email: memberCredentials.email,
            password: passwords[1],
            role: memberCredentials.role
        }).returning('*');
        [user1] = await db('users').insert({
            first_name: 'Event',
            last_name: 'UserPut',
            nick: userCredentials.nick,
            email: userCredentials.email,
            password: passwords[2],
            role: userCredentials.role
        }).returning('*');
        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const memberPayload = {id: memberUser.id, nick: memberUser.nick, role: memberUser.role, jti: uuidv4()};
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        [locale1] = await db('locales').insert({
            city: `PutEvent City ${Date.now()}`,
            name: `PutEvent Venue ${Date.now()}`
        }).returning('*');
        [category1] = await db('categories').insert({
            name: `PutEvent Cat ${Date.now()}`,
            description: `PutEvent Cat Desc ${Date.now()}`
        }).returning('*');
        [prelegent1] = await db('prelegents').insert({
            user_id: user1.id,
            name: `PutEvent Prel 1 ${Date.now()}`,
            description: `PutEvent Prel Desc 1 ${Date.now()}`
        }).returning('*');
        [prelegent2] = await db('prelegents').insert({
            user_id: adminUser.id,
            name: `PutEvent Prel 2 ${Date.now()}`,
            description: `PutEvent Prel Desc 2 ${Date.now()}`
        }).returning('*');
        [resource1] = await db('resources').insert({
            name: `PutEvent Res 1 ${Date.now()}`,
            description: `PutEvent Res Desc 1 ${Date.now()}`
        }).returning('*');
        [resource2] = await db('resources').insert({
            name: `PutEvent Res 2 ${Date.now()}`,
            description: `PutEvent Res Desc 2 ${Date.now()}`
        }).returning('*');
        [sponsor1] = await db('sponsors').insert({
            name: `PutEvent Spon 1 ${Date.now()}`,
            description: `PutEvent Spon Desc 1 ${Date.now()}`
        }).returning('*');
        [sponsor2] = await db('sponsors').insert({
            name: `PutEvent Spon 2 ${Date.now()}`,
            description: `PutEvent Spon Desc 2 ${Date.now()}`
        }).returning('*');
        [catering1] = await db('caterings').insert({
            name: `PutEvent Catr 1 ${Date.now()}`,
            description: `PutEvent Catr Desc 1 ${Date.now()}`
        }).returning('*');
        [catering2] = await db('caterings').insert({
            name: `PutEvent Catr 2 ${Date.now()}`,
            description: `PutEvent Catr Desc 2 ${Date.now()}`
        }).returning('*');

        const startTime1 = new Date(Date.now() + 7 * 86400000);
        const endTime1 = new Date(Date.now() + 8 * 86400000);
        [eventToUpdate] = await db('events').insert({
            locale_id: locale1.id, category_id: category1.id, name: `Event To Update ${Date.now()}`,
            description: 'Initial Description', price: 100.00,
            started_at: startTime1, ended_at: endTime1
        }).returning('*');

        await db('event_prelegents').insert({event_id: eventToUpdate.id, prelegent_id: prelegent1.id});
        await db('event_sponsors').insert({event_id: eventToUpdate.id, sponsor_id: sponsor1.id});

        [otherEvent] = await db('events').insert({
            locale_id: locale1.id, category_id: category1.id, name: 'Other Existing Event Name',
            description: 'Other Existing Event Description', price: 50.00,
            started_at: new Date(Date.now() + 10 * 86400000), ended_at: new Date(Date.now() + 11 * 86400000)
        }).returning('*');

        const conflictingStartTime = new Date(Date.now() + 15 * 86400000);
        const conflictingEndTime = new Date(Date.now() + 16 * 86400000);
        [conflictingEvent] = await db('events').insert({
            locale_id: locale1.id, category_id: category1.id, name: `Conflicting Time Event Put ${Date.now()}`,
            description: 'Event for time conflict tests PUT', price: 10.00,
            started_at: conflictingStartTime, ended_at: conflictingEndTime
        }).returning('*');
        await db('event_prelegents').insert({event_id: conflictingEvent.id, prelegent_id: prelegent2.id});
        await db('event_resources').insert({event_id: conflictingEvent.id, resource_id: resource2.id});
    });

    it('should update basic event data successfully (200)', async () => {
        const updates = {
            name: 'Updated Event Name',
            description: 'Updated Description',
            price: 149.99,
        };
        const currentData = await db('events').where({id: eventToUpdate.id}).first();
        const fullUpdateData = createFullUpdateEventData(currentData, updates);

        const response = await request(app)
            .put(`/api/v1/events/${eventToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);

        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBe(eventToUpdate.id);
        expect(response.body.name).toBe(updates.name);
        expect(response.body.description).toBe(updates.description);
        expect(response.body.price).toBe(updates.price.toString());
    });

    it('should update only relations successfully (add prelegent, remove sponsor) (200)', async () => {
        const updates = {
            prelegent_ids: [prelegent1.id, prelegent2.id],
            sponsor_ids: [],
            resource_ids: [],
            catering_ids: [catering1.id]
        };
        const currentData = await db('events').where({id: eventToUpdate.id}).first();
        const fullUpdateData = createFullUpdateEventData(currentData, updates);

        const response = await request(app)
            .put(`/api/v1/events/${eventToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);

        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBe(eventToUpdate.id);
        expect(response.body.prelegent_ids).toEqual(expect.arrayContaining([prelegent1.id, prelegent2.id]));
        expect(response.body.prelegent_ids).toHaveLength(2);
        expect(response.body.sponsor_ids).toEqual([]);
        expect(response.body.resource_ids).toEqual([]);
        expect(response.body.catering_ids).toEqual([catering1.id]);

        const links = await Promise.all([
            db('event_prelegents').where({event_id: eventToUpdate.id}).orderBy('prelegent_id'),
            db('event_sponsors').where({event_id: eventToUpdate.id}),
            db('event_resources').where({event_id: eventToUpdate.id}),
            db('event_caterings').where({event_id: eventToUpdate.id}),
        ]);
        expect(links[0].map(l => l.prelegent_id)).toEqual(expect.arrayContaining([prelegent1.id, prelegent2.id]));
        expect(links[1]).toHaveLength(0);
        expect(links[2]).toHaveLength(0);
        expect(links[3]).toHaveLength(1);
        expect(links[3][0].catering_id).toBe(catering1.id);
    });

    it('should update dates successfully (no conflicts) (200)', async () => {
        const newStartDate = new Date(Date.now() + 20 * 86400000).toISOString();
        const newEndDate = new Date(Date.now() + 21 * 86400000).toISOString();
        const updates = {
            started_at: newStartDate,
            ended_at: newEndDate,
        };
        const currentData = await db('events').where({id: eventToUpdate.id}).first();
        const fullUpdateData = createFullUpdateEventData(currentData, updates);

        const response = await request(app)
            .put(`/api/v1/events/${eventToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);

        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBe(eventToUpdate.id);
        expect(response.body.started_at).toBe(newStartDate);
        expect(response.body.ended_at).toBe(newEndDate);
    });

    it('should return 401 if no token is provided', async () => {

        const updates = {name: 'Update Attempt No Token'};

        const fullUpdateData = createFullUpdateEventData(eventToUpdate, updates);

        const response = await request(app)
            .put(`/api/v1/events/${eventToUpdate.id}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const updates = {name: 'Update Attempt Invalid Token'};
        const fullUpdateData = createFullUpdateEventData(eventToUpdate, updates);

        const response = await request(app)
            .put(`/api/v1/events/${eventToUpdate.id}`)
            .set('Authorization', 'Bearer invalidtoken123')
            .send(fullUpdateData);
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin', async () => {
        const updates = {name: 'Update Attempt Member Token'};
        const fullUpdateData = createFullUpdateEventData(eventToUpdate, updates);

        const response = await request(app)
            .put(`/api/v1/events/${eventToUpdate.id}`)
            .set('Authorization', `Bearer ${memberToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(403);
    });

    it('should return 404 if event ID does not exist', async () => {
        const nonExistentId = eventToUpdate.id + 999;

        const dummyEventData = {...eventToUpdate};
        delete dummyEventData.id;
        delete dummyEventData.created_at;
        delete dummyEventData.updated_at;
        const fullUpdateData = createFullUpdateEventData(dummyEventData, {
            name: 'NotFoundUpdate',
            description: 'NotFoundUpdate'
        });

        const response = await request(app)
            .put(`/api/v1/events/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);

        expect(response.statusCode).toBe(404);
    });

    it('should return 400 if event ID format is invalid', async () => {
        const invalidId = 'abc';

        const fullUpdateData = createFullUpdateEventData(eventToUpdate, {name: 'InvalidIdUpdate'});

        const response = await request(app)
            .put(`/api/v1/events/${invalidId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);
    });

    it('should return 400 if required field (e.g., name) is missing in PUT', async () => {
        const updates = {description: 'Only Desc'};
        const currentData = await db('events').where({id: eventToUpdate.id}).first();
        const fullUpdateData = createFullUpdateEventData(currentData, updates);
        delete fullUpdateData.name;

        const response = await request(app).put(`/api/v1/events/${eventToUpdate.id}`).set('Authorization', `Bearer ${adminToken}`).send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'name' && err.msg.includes('required'))).toBe(true);
    });

    it('should return 400 if updated ended_at is before started_at', async () => {
        const startDate = new Date(Date.now() + 25 * 86400000);
        const updates = {
            started_at: startDate.toISOString(),
            ended_at: new Date(startDate.getTime() - 1000).toISOString()
        };
        const currentData = await db('events').where({id: eventToUpdate.id}).first();
        const fullUpdateData = createFullUpdateEventData(currentData, updates);

        const response = await request(app).put(`/api/v1/events/${eventToUpdate.id}`).set('Authorization', `Bearer ${adminToken}`).send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'ended_at' && err.msg.includes('after start date'))).toBe(true);
    });

    it('should return 400 if prelegent_ids contains non-existent ID during update', async () => {
        const nonExistentId = prelegent1.id + 999;
        const updates = {prelegent_ids: [nonExistentId]};
        const currentData = await db('events').where({id: eventToUpdate.id}).first();
        const fullUpdateData = createFullUpdateEventData(currentData, updates);

        const response = await request(app).put(`/api/v1/events/${eventToUpdate.id}`).set('Authorization', `Bearer ${adminToken}`).send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'prelegent_ids' && err.msg.includes('not found'))).toBe(true);
    });

    it('should return 409 if updated dates cause prelegent time conflict', async () => {

        const updates = {
            started_at: conflictingEvent.started_at.toISOString(),
            ended_at: conflictingEvent.ended_at.toISOString(),
            prelegent_ids: [prelegent2.id]
        };
        const currentData = await db('events').where({id: eventToUpdate.id}).first();
        const fullUpdateData = createFullUpdateEventData(currentData, updates);

        const response = await request(app).put(`/api/v1/events/${eventToUpdate.id}`).set('Authorization', `Bearer ${adminToken}`).send(fullUpdateData);
        expect(response.statusCode).toBe(409);
    });

    it('should return 409 if updated prelegent has time conflict with updated dates', async () => {

        const updates = {
            started_at: conflictingEvent.started_at.toISOString(),
            ended_at: conflictingEvent.ended_at.toISOString(),
            prelegent_ids: [prelegent2.id]
        };
        const currentData = await db('events').where({id: eventToUpdate.id}).first();
        const fullUpdateData = createFullUpdateEventData(currentData, updates);

        const response = await request(app).put(`/api/v1/events/${eventToUpdate.id}`).set('Authorization', `Bearer ${adminToken}`).send(fullUpdateData);
        expect(response.statusCode).toBe(409);
    });

    it('should return 409 if updated resource has time conflict with updated dates', async () => {
        const updates = {
            started_at: conflictingEvent.started_at.toISOString(),
            ended_at: conflictingEvent.ended_at.toISOString(),
            resource_ids: [resource2.id]
        };
        const fullUpdateData = createFullUpdateEventData(eventToUpdate, updates);

        const response = await request(app).put(`/api/v1/events/${eventToUpdate.id}`).set('Authorization', `Bearer ${adminToken}`).send(fullUpdateData);
        expect(response.statusCode).toBe(409);
    });

    it('should return 400 if updated name already exists for another event', async () => {
        const updates = {name: otherEvent.name};
        const currentData = await db('events').where({id: eventToUpdate.id}).first();
        const fullUpdateData = createFullUpdateEventData(currentData, updates);
        const response = await request(app).put(`/api/v1/events/${eventToUpdate.id}`).set('Authorization', `Bearer ${adminToken}`).send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'name' && err.msg.includes('Event name already exists.'))).toBe(true);
    });

    it('should return 400 if updated description already exists for another event', async () => {
        const updates = {description: otherEvent.description};
        const currentData = await db('events').where({id: eventToUpdate.id}).first();
        const fullUpdateData = createFullUpdateEventData(currentData, updates);
        const response = await request(app).put(`/api/v1/events/${eventToUpdate.id}`).set('Authorization', `Bearer ${adminToken}`).send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'description' && err.msg.includes('Event description already exists.'))).toBe(true);
    });

    it('should ALLOW updating an event with its own existing name/description (200)', async () => {
        const updates = {name: eventToUpdate.name, description: eventToUpdate.description};
        const currentData = await db('events').where({id: eventToUpdate.id}).first();
        const fullUpdateData = createFullUpdateEventData(currentData, updates);
        const response = await request(app).put(`/api/v1/events/${eventToUpdate.id}`).set('Authorization', `Bearer ${adminToken}`).send(fullUpdateData);
        expect(response.statusCode).toBe(200);
    });

});