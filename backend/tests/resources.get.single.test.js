const request = require('supertest');
const app = require('../server');
const db = require('../db/knex');

describe('GET /api/v1/resources/{id}', () => {

    let resourceToFetch;

    beforeEach(async () => {
        [resourceToFetch] = await db('resources').insert({
            name: `Zasób ID Test ${Date.now()}`,
            description: `Opis zasobu ID ${Date.now()}`
        }).returning('*');
    });

    it('should return resource data for an existing ID (200)', async () => {
        const response = await request(app)
            .get(`/api/v1/resources/${resourceToFetch.id}`);

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('id', resourceToFetch.id);
        expect(response.body).toHaveProperty('name', resourceToFetch.name);
        expect(response.body).toHaveProperty('description', resourceToFetch.description);
        expect(response.body).toHaveProperty('created_at');
        expect(response.body).toHaveProperty('updated_at');
    });

    it('should return 404 if resource ID does not exist', async () => {
        const nonExistentId = resourceToFetch.id + 999;
        const response = await request(app)
            .get(`/api/v1/resources/${nonExistentId}`);

        expect(response.statusCode).toBe(404);
        expect(response.body).toHaveProperty('message', 'Resource not found.');
    });

    it('should return 400 if resource ID format is invalid', async () => {
        const invalidId = 'invalid-resource-id';
        const response = await request(app)
            .get(`/api/v1/resources/${invalidId}`);

        expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty('message');

    });
});