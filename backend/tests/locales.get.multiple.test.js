const request = require('supertest');
const app = require('../server');
const db = require('../db/knex');

describe('GET /api/v1/locales', () => {

    let locale1, locale2;

    beforeEach(async () => {
        [locale1] = await db('locales').insert({
            city: `Test City 1 ${Date.now()}`,
            name: `Test Venue 1 ${Date.now()}`
        }).returning('*');

        [locale2] = await db('locales').insert({
            city: `Test City 2 ${Date.now()}`,
            name: `Test Venue 2 ${Date.now()}`
        }).returning('*');
    });

    it('should return a list of all locales (200)', async () => {
        const response = await request(app)
            .get('/api/v1/locales');

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(2);

        const receivedIds = response.body.map(loc => loc.id);
        expect(receivedIds).toContain(locale1.id);
        expect(receivedIds).toContain(locale2.id);

        const foundLocale = response.body.find(loc => loc.id === locale1.id);
        expect(foundLocale).toHaveProperty('id', locale1.id);
        expect(foundLocale).toHaveProperty('city', locale1.city);
        expect(foundLocale).toHaveProperty('name', locale1.name);
        expect(foundLocale).toHaveProperty('created_at');
        expect(foundLocale).toHaveProperty('updated_at');
    });

    it('should return an empty list if no locales exist (200)', async () => {
        await db('locales').whereIn('id', [locale1.id, locale2.id]).del();

        const response = await request(app)
            .get('/api/v1/locales');

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(0);
    });
});