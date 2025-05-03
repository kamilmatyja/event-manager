const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');
const blacklist = require('../config/blacklist');

describe('POST /api/v1/auth/logout', () => {

    const testUser = {
        first_name: 'Logout', last_name: 'User', nick: 'logout_test_user',
        email: 'logout@test.com', plainPassword: 'PasswordLogout123!', role: ROLES.MEMBER
    };
    let testUserId;
    let validToken;
    let validTokenJti;
    let validTokenExp;

    beforeEach(async () => {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(testUser.plainPassword, saltRounds);
        try {
            await db('users').where({email: testUser.email}).del();
            const [createdUser] = await db('users')
                .insert({
                    first_name: testUser.first_name,
                    last_name: testUser.last_name,
                    nick: testUser.nick,
                    email: testUser.email,
                    password: hashedPassword,
                    role: testUser.role,
                })
                .returning('id');
            testUserId = typeof createdUser === 'object' ? createdUser.id : createdUser;
            if (!testUserId) throw new Error("Failed to create user in beforeAll");

            const payload = {id: testUserId, nick: testUser.nick, role: testUser.role, jti: uuidv4()};
            validToken = jwt.sign(payload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
            const decoded = jwt.decode(validToken);
            validTokenJti = decoded.jti;
            validTokenExp = decoded.exp;

        } catch (error) {
            console.error(`[LOGOUT TEST SETUP - beforeEach] Error:`, error.message);
            throw error;
        }
    });

    it('should successfully logout and revoke the token (200)', async () => {

        expect(blacklist.has(validTokenJti)).toBe(false);

        const beforeLogoutRes = await request(app)
            .get('/api/v1/auth/me')
            .set('Authorization', `Bearer ${validToken}`);
        expect(beforeLogoutRes.statusCode).toBe(200);

        const logoutResponse = await request(app)
            .post('/api/v1/auth/logout')
            .set('Authorization', `Bearer ${validToken}`);

        expect(logoutResponse.statusCode).toBe(200);
        expect(logoutResponse.body).toHaveProperty('message', 'Logout successful. Token has been revoked.');

        expect(blacklist.has(validTokenJti)).toBe(true);

        const afterLogoutRes = await request(app)
            .get('/api/v1/auth/me')
            .set('Authorization', `Bearer ${validToken}`);
        expect(afterLogoutRes.statusCode).toBe(401);
        expect(afterLogoutRes.body).toHaveProperty('message', 'Unauthorized: Token has been revoked.');
    });

    it('should return 401 if no token is provided', async () => {
        const response = await request(app)
            .post('/api/v1/auth/logout');

        expect(response.statusCode).toBe(401);
        expect(response.body).toHaveProperty('message', 'Unauthorized: Missing token.');
    });

    it('should return 401 if the token is invalid (bad signature)', async () => {
        const invalidToken = jwt.sign({id: testUserId, role: testUser.role}, 'wrong-secret', {expiresIn: '1h'});
        const response = await request(app)
            .post('/api/v1/auth/logout')
            .set('Authorization', `Bearer ${invalidToken}`);

        expect(response.statusCode).toBe(401);

        expect(response.body).toHaveProperty('message', 'Unauthorized: Token has been revoked.');
    });

    it('should return 401 if the token is expired', async () => {
        const expiredPayload = {id: testUserId, nick: testUser.nick, role: testUser.role, jti: uuidv4()};
        const expiredToken = jwt.sign(expiredPayload, config.jwt.secret, {expiresIn: '-1s'});

        const response = await request(app)
            .post('/api/v1/auth/logout')
            .set('Authorization', `Bearer ${expiredToken}`);

        expect(response.statusCode).toBe(401);
        expect(response.body).toHaveProperty('message', 'Unauthorized: Token expired.');
    });

    it('should return 401 if the token is already revoked (blacklisted)', async () => {

        const payloadToRevoke = {id: testUserId, nick: testUser.nick, role: testUser.role, jti: uuidv4()};
        const tokenToRevoke = jwt.sign(payloadToRevoke, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const decoded = jwt.decode(tokenToRevoke);

        blacklist.add(decoded.jti, decoded.exp);
        expect(blacklist.has(decoded.jti)).toBe(true);

        const response = await request(app)
            .post('/api/v1/auth/logout')
            .set('Authorization', `Bearer ${tokenToRevoke}`);

        expect(response.statusCode).toBe(401);
        expect(response.body).toHaveProperty('message', 'Unauthorized: Token has been revoked.');
    });

    it('should prevent access to a protected route (/auth/me) using a token after logout (401)', async () => {

        const freshPayload = {id: testUserId, nick: testUser.nick, role: testUser.role, jti: uuidv4()};
        const freshToken = jwt.sign(freshPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const decodedFresh = jwt.decode(freshToken);

        const meBeforeLogout = await request(app)
            .get('/api/v1/auth/me')
            .set('Authorization', `Bearer ${freshToken}`);
        expect(meBeforeLogout.statusCode).toBe(200);

        const logoutResponse = await request(app)
            .post('/api/v1/auth/logout')
            .set('Authorization', `Bearer ${freshToken}`);
        expect(logoutResponse.statusCode).toBe(200);

        expect(blacklist.has(decodedFresh.jti)).toBe(true);

        const meAfterLogout = await request(app)
            .get('/api/v1/auth/me')
            .set('Authorization', `Bearer ${freshToken}`);

        expect(meAfterLogout.statusCode).toBe(401);
        expect(meAfterLogout.body).toHaveProperty('message', 'Unauthorized: Token has been revoked.');
    });

});