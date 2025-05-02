const request = require('supertest');
const app = require('../server');
const db = require('../db/knex');

describe('GET /api/v1/categories/{id}', () => {

    let categoryToFetch;

    beforeEach(async () => {

        [categoryToFetch] = await db('categories').insert({
            name: `Kategoria ID Test ${Date.now()}`,
            description: `Opis testowy kategorii ID ${Date.now()}`
        }).returning('*');
    });

    it('should return category data for an existing ID (200)', async () => {
        const response = await request(app)
            .get(`/api/v1/categories/${categoryToFetch.id}`);

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('id', categoryToFetch.id);
        expect(response.body).toHaveProperty('name', categoryToFetch.name);
        expect(response.body).toHaveProperty('description', categoryToFetch.description);
        expect(response.body).toHaveProperty('created_at');
        expect(response.body).toHaveProperty('updated_at');
    });

    it('should return 404 if category ID does not exist', async () => {
        const nonExistentId = categoryToFetch.id + 999;
        const response = await request(app)
            .get(`/api/v1/categories/${nonExistentId}`);

        expect(response.statusCode).toBe(404);
        expect(response.body).toHaveProperty('message', 'Category not found');
    });

    it('should return 400 if category ID format is invalid', async () => {
        const invalidId = 'abc';
        const response = await request(app)
            .get(`/api/v1/categories/${invalidId}`);

        expect(response.statusCode).toBe(400);

        expect(response.body).toHaveProperty('message');

    });
});