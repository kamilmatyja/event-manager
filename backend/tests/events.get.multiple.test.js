const request = require('supertest');
const app = require('../server');
const db = require('../db/knex');

describe('GET /api/v1/events', () => {

    let event1, event2, locale1, category1, prelegent1, resource1, sponsor1, catering1, user1;

    beforeEach(async () => {

        [locale1] = await db('locales').insert({
            city: `EventGetAll City ${Date.now()}`,
            name: `EventGetAll Venue ${Date.now()}`
        }).returning('*');
        [category1] = await db('categories').insert({
            name: `EventGetAll Cat ${Date.now()}`,
            description: `EventGetAll Cat Desc ${Date.now()}`
        }).returning('*');

        [user1] = await db('users').insert({
            first_name: 'Event', last_name: 'User', nick: `event_getall_user_${Date.now()}`,
            email: `event.getall.user@test.com`, password: 'password', role: 1
        }).returning('*');

        [prelegent1] = await db('prelegents').insert({
            user_id: user1.id,
            name: `EventGetAll Prel ${Date.now()}`,
            description: `EventGetAll Prel Desc ${Date.now()}`
        }).returning('*');
        [resource1] = await db('resources').insert({
            name: `EventGetAll Res ${Date.now()}`,
            description: `EventGetAll Res Desc ${Date.now()}`
        }).returning('*');
        [sponsor1] = await db('sponsors').insert({
            name: `EventGetAll Spon ${Date.now()}`,
            description: `EventGetAll Spon Desc ${Date.now()}`
        }).returning('*');
        [catering1] = await db('caterings').insert({
            name: `EventGetAll Catr ${Date.now()}`,
            description: `EventGetAll Catr Desc ${Date.now()}`
        }).returning('*');

        [event1] = await db('events').insert({
            locale_id: locale1.id, category_id: category1.id, name: `Event 1 Get All ${Date.now()}`,
            description: 'First event for get all test', price: 100.00,
            started_at: new Date(Date.now() + 1 * 86400000), ended_at: new Date(Date.now() + 2 * 86400000)
        }).returning('*');
        [event2] = await db('events').insert({
            locale_id: locale1.id, category_id: category1.id, name: `Event 2 Get All ${Date.now()}`,
            description: 'Second event for get all test', price: 50.00,
            started_at: new Date(Date.now() + 3 * 86400000), ended_at: new Date(Date.now() + 4 * 86400000)
        }).returning('*');

        await db('event_prelegents').insert({event_id: event1.id, prelegent_id: prelegent1.id});
        await db('event_resources').insert({event_id: event1.id, resource_id: resource1.id});
        await db('event_sponsors').insert({event_id: event1.id, sponsor_id: sponsor1.id});
        await db('event_caterings').insert({event_id: event1.id, catering_id: catering1.id});
        await db('event_tickets').insert({event_id: event1.id, user_id: user1.id, price: event1.price});
    });

    it('should return a list of all events with details (200)', async () => {
        const response = await request(app)
            .get('/api/v1/events');

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(2);

        const foundEvent1 = response.body.find(ev => ev.id === event1.id);
        expect(foundEvent1).toBeDefined();
        expect(foundEvent1).toHaveProperty('id', event1.id);
        expect(foundEvent1).toHaveProperty('name', event1.name);
        expect(foundEvent1).toHaveProperty('locale_name', locale1.name);
        expect(foundEvent1).toHaveProperty('category_name', category1.name);
        expect(foundEvent1).toHaveProperty('ticket_count', 1);
        expect(foundEvent1).toHaveProperty('prelegent_ids', [prelegent1.id]);
        expect(foundEvent1).toHaveProperty('resource_ids', [resource1.id]);
        expect(foundEvent1).toHaveProperty('sponsor_ids', [sponsor1.id]);
        expect(foundEvent1).toHaveProperty('catering_ids', [catering1.id]);
        expect(foundEvent1).toHaveProperty('created_at');
        expect(foundEvent1).toHaveProperty('updated_at');

        const foundEvent2 = response.body.find(ev => ev.id === event2.id);
        expect(foundEvent2).toBeDefined();
        expect(foundEvent2).toHaveProperty('ticket_count', 0);
        expect(foundEvent2).toHaveProperty('prelegent_ids', []);
        expect(foundEvent2).toHaveProperty('resource_ids', []);
        expect(foundEvent2).toHaveProperty('sponsor_ids', []);
        expect(foundEvent2).toHaveProperty('catering_ids', []);
    });

    it('should return an empty list if no events exist (200)', async () => {

        await db('event_tickets').del();
        await db('event_prelegents').del();
        await db('event_resources').del();
        await db('event_sponsors').del();
        await db('event_caterings').del();
        await db('events').del();

        const response = await request(app)
            .get('/api/v1/events');

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(0);
    });
});