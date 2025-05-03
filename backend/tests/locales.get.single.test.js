const request = require('supertest');
const app = require('../server');
const db = require('../db/knex');

describe('GET /api/v1/locales/{id}', () => {

    let localeToFetch;

    beforeEach(async () => {
        [localeToFetch] = await db('locales').insert({
            city: `Test City ID ${Date.now()}`,
            name: `Test Venue ID ${Date.now()}`
        }).returning('*');
    });

    it('should return locale data for an existing ID (200)', async () => {
        const response = await request(app)
            .get(`/api/v1/locales/${localeToFetch.id}`);

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('id', localeToFetch.id);
        expect(response.body).toHaveProperty('city', localeToFetch.city);
        expect(response.body).toHaveProperty('name', localeToFetch.name);
        expect(response.body).toHaveProperty('created_at');
        expect(response.body).toHaveProperty('updated_at');
    });

    it('should return 404 if locale ID does not exist', async () => {
        const nonExistentId = localeToFetch.id + 999;
        const response = await request(app)
            .get(`/api/v1/locales/${nonExistentId}`);

        expect(response.statusCode).toBe(404);
        expect(response.body).toHaveProperty('message', 'Locale not found.');
    });

    it('should return 400 if locale ID format is invalid', async () => {
        const invalidId = 'xyz';
        const response = await request(app)
            .get(`/api/v1/locales/${invalidId}`);

        expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty('message');

    });
});