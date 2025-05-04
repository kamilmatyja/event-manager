const request = require('supertest');
const app = require('../server');
const db = require('../db/knex');

describe('GET /api/v1/sponsors/{id}', () => {

    let sponsorToFetch;

    beforeEach(async () => {
        [sponsorToFetch] = await db('sponsors').insert({
            name: `Sponsor ID Test ${Date.now()}`,
            description: `Opis sponsora ID ${Date.now()}`
        }).returning('*');
    });

    it('should return sponsor data for an existing ID (200)', async () => {
        const response = await request(app)
            .get(`/api/v1/sponsors/${sponsorToFetch.id}`);

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('id', sponsorToFetch.id);
        expect(response.body).toHaveProperty('name', sponsorToFetch.name);
        expect(response.body).toHaveProperty('description', sponsorToFetch.description);
        expect(response.body).toHaveProperty('created_at');
        expect(response.body).toHaveProperty('updated_at');
    });

    it('should return 404 if sponsor ID does not exist', async () => {
        const nonExistentId = sponsorToFetch.id + 999;
        const response = await request(app)
            .get(`/api/v1/sponsors/${nonExistentId}`);

        expect(response.statusCode).toBe(404);
    });

    it('should return 400 if sponsor ID format is invalid', async () => {
        const invalidId = 'bad-sponsor-id';
        const response = await request(app)
            .get(`/api/v1/sponsors/${invalidId}`);

        expect(response.statusCode).toBe(400);

    });
});