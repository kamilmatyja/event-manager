const request = require('supertest');
const app = require('../server');
const db = require('../db/knex');

describe('GET /api/v1/sponsors', () => {

    let sponsor1, sponsor2;

    beforeEach(async () => {

        [sponsor1] = await db('sponsors').insert({
            name: `Test Sponsor 1 ${Date.now()}`,
            description: `Opis sponsora 1 ${Date.now()}`
        }).returning('*');

        [sponsor2] = await db('sponsors').insert({
            name: `Test Sponsor 2 ${Date.now()}`,
            description: `Opis sponsora 2 ${Date.now()}`
        }).returning('*');
    });

    it('should return a list of all sponsors (200)', async () => {
        const response = await request(app)
            .get('/api/v1/sponsors');

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(2);

        const receivedIds = response.body.map(sp => sp.id);
        expect(receivedIds).toContain(sponsor1.id);
        expect(receivedIds).toContain(sponsor2.id);

        const foundSponsor = response.body.find(sp => sp.id === sponsor1.id);
        expect(foundSponsor).toHaveProperty('id', sponsor1.id);
        expect(foundSponsor).toHaveProperty('name', sponsor1.name);
        expect(foundSponsor).toHaveProperty('description', sponsor1.description);
        expect(foundSponsor).toHaveProperty('created_at');
        expect(foundSponsor).toHaveProperty('updated_at');
    });

    it('should return an empty list if no sponsors exist (200)', async () => {
        await db('sponsors').whereIn('id', [sponsor1.id, sponsor2.id]).del();

        const response = await request(app)
            .get('/api/v1/sponsors');

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(0);
    });
});