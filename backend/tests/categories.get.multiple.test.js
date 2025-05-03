const request = require('supertest');
const app = require('../server');
const db = require('../db/knex');

describe('GET /api/v1/categories', () => {

    let category1, category2;

    beforeEach(async () => {

        [category1] = await db('categories').insert({
            name: `Kategoria Testowa 1 ${Date.now()}`,
            description: `Opis testowy kategorii 1 ${Date.now()}`
        }).returning('*');

        [category2] = await db('categories').insert({
            name: `Kategoria Testowa 2 ${Date.now()}`,
            description: `Opis testowy kategorii 2 ${Date.now()}`
        }).returning('*');
    });

    it('should return a list of all categories (200)', async () => {
        const response = await request(app)
            .get('/api/v1/categories');

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(2);

        const receivedIds = response.body.map(cat => cat.id);
        expect(receivedIds).toContain(category1.id);
        expect(receivedIds).toContain(category2.id);

        const foundCategory = response.body.find(cat => cat.id === category1.id);
        expect(foundCategory).toHaveProperty('id', category1.id);
        expect(foundCategory).toHaveProperty('name', category1.name);
        expect(foundCategory).toHaveProperty('description', category1.description);
        expect(foundCategory).toHaveProperty('created_at');
        expect(foundCategory).toHaveProperty('updated_at');
    });

    it('should return an empty list if no categories exist (200)', async () => {

        await db('categories').whereIn('id', [category1.id, category2.id]).del();

        const response = await request(app)
            .get('/api/v1/categories');

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(0);
    });
});