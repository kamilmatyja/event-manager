const request = require('supertest');
const app = require('../server');
const db = require('../db/knex');

describe('GET /api/v1/resources', () => {

    let resource1, resource2;

    beforeEach(async () => {

        [resource1] = await db('resources').insert({
            name: `Test Zasób 1 ${Date.now()}`,
            description: `Opis zasobu 1 ${Date.now()}`
        }).returning('*');

        [resource2] = await db('resources').insert({
            name: `Test Zasób 2 ${Date.now()}`,
            description: `Opis zasobu 2 ${Date.now()}`
        }).returning('*');
    });

    it('should return a list of all resources (200)', async () => {
        const response = await request(app)
            .get('/api/v1/resources');

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(2);

        const receivedIds = response.body.map(res => res.id);
        expect(receivedIds).toContain(resource1.id);
        expect(receivedIds).toContain(resource2.id);

        const foundResource = response.body.find(res => res.id === resource1.id);
        expect(foundResource).toHaveProperty('id', resource1.id);
        expect(foundResource).toHaveProperty('name', resource1.name);
        expect(foundResource).toHaveProperty('description', resource1.description);
        expect(foundResource).toHaveProperty('created_at');
        expect(foundResource).toHaveProperty('updated_at');
    });

    it('should return an empty list if no resources exist (200)', async () => {
        await db('resources').whereIn('id', [resource1.id, resource2.id]).del();

        const response = await request(app)
            .get('/api/v1/resources');

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(0);
    });
});