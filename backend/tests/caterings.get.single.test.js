const request = require('supertest');
const app = require('../server');
const db = require('../db/knex');

describe('GET /api/v1/caterings/{id}', () => {

    let cateringToFetch;

    beforeEach(async () => {
        [cateringToFetch] = await db('caterings').insert({
            name: `Catering ID Test ${Date.now()}`,
            description: `Opis cateringu ID ${Date.now()}`
        }).returning('*');
    });

    it('should return catering data for an existing ID (200)', async () => {
        const response = await request(app)
            .get(`/api/v1/caterings/${cateringToFetch.id}`);

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('id', cateringToFetch.id);
        expect(response.body).toHaveProperty('name', cateringToFetch.name);
        expect(response.body).toHaveProperty('description', cateringToFetch.description);
        expect(response.body).toHaveProperty('created_at');
        expect(response.body).toHaveProperty('updated_at');
    });

    it('should return 404 if catering ID does not exist', async () => {
        const nonExistentId = cateringToFetch.id + 999;
        const response = await request(app)
            .get(`/api/v1/caterings/${nonExistentId}`);

        expect(response.statusCode).toBe(404);
        expect(response.body).toHaveProperty('message', 'Catering not found.');
    });

    it('should return 400 if catering ID format is invalid', async () => {
        const invalidId = 'some-string-id';
        const response = await request(app)
            .get(`/api/v1/caterings/${invalidId}`);

        expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty('message');

    });
});