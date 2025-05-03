const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

const createValidCategoryData = (overrides = {}) => ({
    name: `Test Category Name ${Date.now()}`,
    description: `Test Category Description ${Date.now()}`,
    ...overrides,
});

describe('POST /api/v1/categories', () => {
    let adminToken;
    let memberToken;
    let existingCategory;

    beforeEach(async () => {

        const adminCredentials = {
            email: `post.cat.admin@test.com`,
            plainPassword: 'PasswordAdminPostCat!',
            role: ROLES.ADMINISTRATOR
        };
        const memberCredentials = {
            email: `post.cat.member@test.com`,
            plainPassword: 'PasswordMemberPostCat!',
            role: ROLES.MEMBER
        };
        const saltRounds = 10;
        const adminHashedPassword = await bcrypt.hash(adminCredentials.plainPassword, saltRounds);
        const memberHashedPassword = await bcrypt.hash(memberCredentials.plainPassword, saltRounds);

        const [adminUser] = await db('users').insert({
            first_name: 'Admin', last_name: 'CatPoster', nick: `admin_cat_poster_${Date.now()}`,
            email: adminCredentials.email, password: adminHashedPassword, role: adminCredentials.role
        }).returning('*');
        const [memberUser] = await db('users').insert({
            first_name: 'Member', last_name: 'CatPoster', nick: `member_cat_poster_${Date.now()}`,
            email: memberCredentials.email, password: memberHashedPassword, role: memberCredentials.role
        }).returning('*');

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const memberPayload = {id: memberUser.id, nick: memberUser.nick, role: memberUser.role, jti: uuidv4()};
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        [existingCategory] = await db('categories').insert({
            name: 'Existing Cat Name',
            description: 'Existing Cat Description'
        }).returning('*');
    });

    it('should create a new category with valid data (201)', async () => {
        const newCategory = createValidCategoryData();

        const response = await request(app)
            .post('/api/v1/categories')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newCategory);

        expect(response.statusCode).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe(newCategory.name);
        expect(response.body.description).toBe(newCategory.description);
        expect(response.body).toHaveProperty('created_at');
        expect(response.body).toHaveProperty('updated_at');
    });

    it('should return 401 if no token is provided', async () => {
        const newCategory = createValidCategoryData();
        const response = await request(app)
            .post('/api/v1/categories')
            .send(newCategory);
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const newCategory = createValidCategoryData();
        const response = await request(app)
            .post('/api/v1/categories')
            .set('Authorization', 'Bearer invalidtoken123')
            .send(newCategory);
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin (member token)', async () => {
        const newCategory = createValidCategoryData();
        const response = await request(app)
            .post('/api/v1/categories')
            .set('Authorization', `Bearer ${memberToken}`)
            .send(newCategory);
        expect(response.statusCode).toBe(403);
    });

    it('should return 400 if name is missing', async () => {
        const invalidData = createValidCategoryData();
        delete invalidData.name;

        const response = await request(app)
            .post('/api/v1/categories')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidData);

        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'name' && err.msg.includes('is required'))).toBe(true);
    });

    it('should return 400 if description is missing', async () => {
        const invalidData = createValidCategoryData();
        delete invalidData.description;

        const response = await request(app)
            .post('/api/v1/categories')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidData);

        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'description' && err.msg.includes('is required'))).toBe(true);
    });

    it('should return 400 if name is too short/long (assuming limits exist)', async () => {

        const invalidDataShort = createValidCategoryData({name: 'A'});
        const invalidDataLong = createValidCategoryData({name: 'A'.repeat(101)});

        const responseShort = await request(app)
            .post('/api/v1/categories')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(invalidDataShort);

        expect(responseShort.statusCode).toBe(400);
        expect(responseShort.body.errors.some(err => err.path === 'name' && err.msg.includes('characters'))).toBe(true);

    });

    it('should return 400 if category name already exists', async () => {
        const newCategoryAttempt = createValidCategoryData({
            name: existingCategory.name
        });
        const response = await request(app)
            .post('/api/v1/categories')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newCategoryAttempt);

        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'name' && err.msg.includes('Category name already exists.'))).toBe(true);
    });

    it('should return 400 if category description already exists', async () => {
        const newCategoryAttempt = createValidCategoryData({
            description: existingCategory.description
        });
        const response = await request(app)
            .post('/api/v1/categories')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newCategoryAttempt);

        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'description' && err.msg.includes('Category description already exists.'))).toBe(true);
    });

});