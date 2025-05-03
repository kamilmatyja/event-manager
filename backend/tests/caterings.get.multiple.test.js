const request = require('supertest');
const app = require('../server');
const db = require('../db/knex');

describe('GET /api/v1/caterings', () => {

    let catering1, catering2;

    beforeEach(async () => {

        [catering1] = await db('caterings').insert({
            name: `Catering Testowy 1 ${Date.now()}`,
            description: `Opis cateringu 1 ${Date.now()}`
        }).returning('*');

        [catering2] = await db('caterings').insert({
            name: `Catering Testowy 2 ${Date.now()}`,
            description: `Opis cateringu 2 ${Date.now()}`
        }).returning('*');
    });

    it('should return a list of all catering options (200)', async () => {
        const response = await request(app)
            .get('/api/v1/caterings');

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(2);

        const receivedIds = response.body.map(cat => cat.id);
        expect(receivedIds).toContain(catering1.id);
        expect(receivedIds).toContain(catering2.id);

        const foundCatering = response.body.find(cat => cat.id === catering1.id);
        expect(foundCatering).toHaveProperty('id', catering1.id);
        expect(foundCatering).toHaveProperty('name', catering1.name);
        expect(foundCatering).toHaveProperty('description', catering1.description);
        expect(foundCatering).toHaveProperty('created_at');
        expect(foundCatering).toHaveProperty('updated_at');
    });

    it('should return an empty list if no catering options exist (200)', async () => {
        await db('caterings').whereIn('id', [catering1.id, catering2.id]).del();

        const response = await request(app)
            .get('/api/v1/caterings');

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(0);
    });
});