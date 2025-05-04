const request = require('supertest');
const app = require('../server');
const db = require('../db/knex');

describe('GET /api/v1/events/{id}', () => {

    let eventToFetch, locale1, category1, prelegent1, resource1, sponsor1, catering1, user1;

    beforeEach(async () => {

        [locale1] = await db('locales').insert({
            city: `EventGetId City ${Date.now()}`,
            name: `EventGetId Venue ${Date.now()}`
        }).returning('*');
        [category1] = await db('categories').insert({
            name: `EventGetId Cat ${Date.now()}`,
            description: `EventGetId Cat Desc ${Date.now()}`
        }).returning('*');
        [user1] = await db('users').insert({
            first_name: 'EventId', last_name: 'User', nick: `event_getid_user_${Date.now()}`,
            email: `event.getid.user@test.com`, password: 'password', role: 1
        }).returning('*');
        [user2] = await db('users').insert({
            first_name: 'Andrzej', last_name: 'Duda', nick: `dudu${Date.now()}`,
            email: `dudu@dlugopis.com`, password: 'password', role: 1
        }).returning('*');
        [prelegent1] = await db('prelegents').insert({
            user_id: user1.id,
            name: `EventGetId Prel ${Date.now()}`,
            description: `EventGetId Prel Desc ${Date.now()}`
        }).returning('*');
        [resource1] = await db('resources').insert({
            name: `EventGetId Res ${Date.now()}`,
            description: `EventGetId Res Desc ${Date.now()}`
        }).returning('*');
        [sponsor1] = await db('sponsors').insert({
            name: `EventGetId Spon ${Date.now()}`,
            description: `EventGetId Spon Desc ${Date.now()}`
        }).returning('*');
        [catering1] = await db('caterings').insert({
            name: `EventGetId Catr ${Date.now()}`,
            description: `EventGetId Catr Desc ${Date.now()}`
        }).returning('*');

        [eventToFetch] = await db('events').insert({
            locale_id: locale1.id, category_id: category1.id, name: `Event To Fetch ${Date.now()}`,
            description: 'Event for get by id test', price: 123.45,
            started_at: new Date(Date.now() + 1 * 86400000), ended_at: new Date(Date.now() + 2 * 86400000)
        }).returning('*');

        await db('event_prelegents').insert({event_id: eventToFetch.id, prelegent_id: prelegent1.id});
        await db('event_resources').insert({event_id: eventToFetch.id, resource_id: resource1.id});
        await db('event_sponsors').insert({event_id: eventToFetch.id, sponsor_id: sponsor1.id});
        await db('event_caterings').insert({event_id: eventToFetch.id, catering_id: catering1.id});
        await db('event_tickets').insert({event_id: eventToFetch.id, user_id: user1.id, price: eventToFetch.price});

        await db('event_tickets').insert({event_id: eventToFetch.id, user_id: user2.id, price: eventToFetch.price});
    });

    it('should return event data with details for an existing ID (200)', async () => {
        const response = await request(app)
            .get(`/api/v1/events/${eventToFetch.id}`);

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('id', eventToFetch.id);
        expect(response.body).toHaveProperty('name', eventToFetch.name);
        expect(response.body).toHaveProperty('description', eventToFetch.description);
        expect(response.body).toHaveProperty('price', eventToFetch.price.toString());
        expect(response.body).toHaveProperty('locale_id', locale1.id);
        expect(response.body).toHaveProperty('category_id', category1.id);
        expect(response.body).toHaveProperty('locale_name', locale1.name);
        expect(response.body).toHaveProperty('category_name', category1.name);

        expect(new Date(response.body.started_at).toISOString()).toBe(eventToFetch.started_at.toISOString());
        expect(new Date(response.body.ended_at).toISOString()).toBe(eventToFetch.ended_at.toISOString());

        expect(response.body).toHaveProperty('ticket_count', 2);
        expect(response.body).toHaveProperty('prelegent_ids', [prelegent1.id]);
        expect(response.body).toHaveProperty('resource_ids', [resource1.id]);
        expect(response.body).toHaveProperty('sponsor_ids', [sponsor1.id]);
        expect(response.body).toHaveProperty('catering_ids', [catering1.id]);
        expect(response.body).toHaveProperty('created_at');
        expect(response.body).toHaveProperty('updated_at');
    });

    it('should return 404 if event ID does not exist', async () => {
        const nonExistentId = eventToFetch.id + 999;
        const response = await request(app)
            .get(`/api/v1/events/${nonExistentId}`);

        expect(response.statusCode).toBe(404);
    });

    it('should return 400 if event ID format is invalid', async () => {
        const invalidId = 'not-an-id';
        const response = await request(app)
            .get(`/api/v1/events/${invalidId}`);

        expect(response.statusCode).toBe(400);
    });
});