const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');
const blacklist = require('../config/blacklist');

describe('GET /api/v1/auth/me', () => {

    const testMember = {
        first_name: 'Me', last_name: 'Member', nick: 'me_member_test',
        email: 'me.member@test.com', plainPassword: 'PasswordMe123!', role: ROLES.MEMBER
    };
    const testAdmin = {
        first_name: 'Me', last_name: 'Admin', nick: 'me_admin_test',
        email: 'me.admin@test.com', plainPassword: 'PasswordMeAdmin1!', role: ROLES.ADMINISTRATOR
    };
    let memberId, adminId, memberToken, adminToken;

    beforeEach(async () => {
        const saltRounds = 10;
        const memberHashedPassword = await bcrypt.hash(testMember.plainPassword, saltRounds);
        const adminHashedPassword = await bcrypt.hash(testAdmin.plainPassword, saltRounds);

        await db('users').whereIn('email', [testMember.email, testAdmin.email]).del();

        const [createdMember] = await db('users')
            .insert({
                first_name: testMember.first_name,
                last_name: testMember.last_name,
                nick: testMember.nick,
                email: testMember.email,
                password: memberHashedPassword,
                role: testMember.role,
            })
            .returning('id');
        memberId = typeof createdMember === 'object' ? createdMember.id : createdMember;

        const [createdAdmin] = await db('users')
            .insert({
                first_name: testAdmin.first_name,
                last_name: testAdmin.last_name,
                nick: testAdmin.nick,
                email: testAdmin.email,
                password: adminHashedPassword,
                role: testAdmin.role,
            })
            .returning('id');
        adminId = typeof createdAdmin === 'object' ? createdAdmin.id : createdAdmin;

        const memberPayload = {
            id: memberId,
            nick: testMember.nick,
            role: testMember.role,
            jti: require('uuid').v4()
        };
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        const adminPayload = {id: adminId, nick: testAdmin.nick, role: testAdmin.role, jti: require('uuid').v4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
    });

    it('should return logged-in Member data with a valid Member token (200)', async () => {
        const response = await request(app)
            .get('/api/v1/auth/me')
            .set('Authorization', `Bearer ${memberToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body).not.toHaveProperty('password');
        expect(response.body.id).toBe(memberId);
        expect(response.body.email).toBe(testMember.email);
        expect(response.body.nick).toBe(testMember.nick);
        expect(response.body.role).toBe(ROLES.MEMBER);
        expect(response.body).toHaveProperty('jti');
        expect(response.body).toHaveProperty('exp');
    });

    it('should return logged-in Admin data with a valid Admin token (200)', async () => {
        const response = await request(app)
            .get('/api/v1/auth/me')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(200);
        expect(response.body).not.toHaveProperty('password');
        expect(response.body.id).toBe(adminId);
        expect(response.body.email).toBe(testAdmin.email);
        expect(response.body.nick).toBe(testAdmin.nick);
        expect(response.body.role).toBe(ROLES.ADMINISTRATOR);
        expect(response.body).toHaveProperty('jti');
        expect(response.body).toHaveProperty('exp');
    });

    it('should return 401 if no token is provided', async () => {
        const response = await request(app)
            .get('/api/v1/auth/me');

        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if the token is invalid (bad signature)', async () => {
        const invalidToken = jwt.sign({id: memberId, role: ROLES.MEMBER}, 'wrong-secret', {expiresIn: '1h'});

        const response = await request(app)
            .get('/api/v1/auth/me')
            .set('Authorization', `Bearer ${invalidToken}`);

        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if the token is expired', async () => {

        const expiredPayload = {id: memberId, nick: testMember.nick, role: testMember.role, jti: require('uuid').v4()};
        const expiredToken = jwt.sign(expiredPayload, config.jwt.secret, {expiresIn: '-1s'});

        const response = await request(app)
            .get('/api/v1/auth/me')
            .set('Authorization', `Bearer ${expiredToken}`);

        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if the token has been revoked (blacklisted)', async () => {

        const payloadToRevoke = {id: memberId, nick: testMember.nick, role: testMember.role, jti: require('uuid').v4()};
        const tokenToRevoke = jwt.sign(payloadToRevoke, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const decoded = jwt.decode(tokenToRevoke);

        blacklist.add(decoded.jti, decoded.exp);

        const response = await request(app)
            .get('/api/v1/auth/me')
            .set('Authorization', `Bearer ${tokenToRevoke}`);

        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if the token is missing the "Bearer " prefix', async () => {
        const response = await request(app)
            .get('/api/v1/auth/me')
            .set('Authorization', memberToken);

        expect(response.statusCode).toBe(401);
    });
});