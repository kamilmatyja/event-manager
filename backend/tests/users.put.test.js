const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

const createFullUpdateData = (currentUserData, updates) => {

    const {id, created_at, updated_at, ...baseData} = currentUserData;
    return {
        ...baseData,
        ...updates,
    };
};

describe('PUT /api/v1/users/{id}', () => {
    let adminToken;
    let memberToken;
    let adminUser;
    let userToUpdate;
    let otherUser;

    const adminCredentials = {
        email: 'put.all.users.admin@test.com',
        plainPassword: 'PasswordAdminPutAll!',
        role: ROLES.ADMINISTRATOR
    };
    const memberCredentials = {
        email: 'put.all.users.member@test.com',
        plainPassword: 'PasswordMemberPutAll!',
        role: ROLES.MEMBER
    };
    const userToUpdateCredentials = {
        email: 'put.all.users.target@test.com',
        nick: 'target_put_all_user',
        plainPassword: 'PasswordTargetPutAll!',
        role: ROLES.MEMBER
    };
    const otherUserCredentials = {
        email: 'put.all.users.other@test.com',
        nick: 'other_put_all_user',
        plainPassword: 'PasswordOtherPutAll!',
        role: ROLES.MEMBER
    };

    beforeEach(async () => {
        const saltRounds = 10;
        const passwords = await Promise.all([
            bcrypt.hash(adminCredentials.plainPassword, saltRounds),
            bcrypt.hash(memberCredentials.plainPassword, saltRounds),
            bcrypt.hash(userToUpdateCredentials.plainPassword, saltRounds),
            bcrypt.hash(otherUserCredentials.plainPassword, saltRounds),
        ]);

        [adminUser] = await db('users').insert({
            first_name: 'Admin', last_name: 'PutterAll', nick: 'admin_putter_all',
            email: adminCredentials.email, password: passwords[0], role: adminCredentials.role
        }).returning('*');

        const [accessingMember] = await db('users').insert({
            first_name: 'Member', last_name: 'PutterAll', nick: 'member_putter_all',
            email: memberCredentials.email, password: passwords[1], role: memberCredentials.role
        }).returning('*');

        [userToUpdate] = await db('users').insert({
            first_name: 'Target', last_name: 'PutUserAll', nick: userToUpdateCredentials.nick,
            email: userToUpdateCredentials.email, password: passwords[2], role: userToUpdateCredentials.role
        }).returning('*');

        [otherUser] = await db('users').insert({
            first_name: 'Other', last_name: 'PutUserAll', nick: otherUserCredentials.nick,
            email: otherUserCredentials.email, password: passwords[3], role: otherUserCredentials.role
        }).returning('*');

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        const memberPayload = {
            id: accessingMember.id,
            nick: accessingMember.nick,
            role: accessingMember.role,
            jti: uuidv4()
        };
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
    });

    it('should update user data (name and role) successfully (200)', async () => {
        const updates = {
            first_name: 'UpdatedFirstNameAll',
            last_name: 'UpdatedLastNameAll',
            role: ROLES.PRELEGENT,
        };

        const fullUpdateData = createFullUpdateData(userToUpdate, updates);

        const response = await request(app)
            .put(`/api/v1/users/${userToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);

        expect(response.statusCode).toBe(200);
        expect(response.body.first_name).toBe(updates.first_name);
        expect(response.body.last_name).toBe(updates.last_name);
        expect(response.body.role).toBe(updates.role);
        expect(response.body.email).toBe(userToUpdate.email);
    });

    it('should update user password successfully (indirect check) (200)', async () => {
        const newPassword = 'NewSecurePasswordPutAll2!';
        const updates = {
            password: newPassword,
        };

        const fullUpdateData = createFullUpdateData(userToUpdate, updates);

        const response = await request(app)
            .put(`/api/v1/users/${userToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);

        expect(response.statusCode).toBe(200);

        const updatedUserFromDb = await db('users').where({id: userToUpdate.id}).first();
        const isNewPasswordCorrect = await bcrypt.compare(newPassword, updatedUserFromDb.password);
        expect(isNewPasswordCorrect).toBe(true);
    });

    it('should return 400 if required fields are missing in PUT request', async () => {

        const updateData = {};

        const response = await request(app)
            .put(`/api/v1/users/${userToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(updateData);

        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'first_name' && err.msg.includes('is required'))).toBe(true);
        expect(response.body.errors.some(err => err.path === 'last_name' && err.msg.includes('is required'))).toBe(true);
        expect(response.body.errors.some(err => err.path === 'nick' && err.msg.includes('is required'))).toBe(true);
        expect(response.body.errors.some(err => err.path === 'email' && err.msg.includes('is required'))).toBe(true);
        expect(response.body.errors.some(err => err.path === 'role' && err.msg.includes('is required'))).toBe(true);
    });

    it('should return 401 if no token is provided', async () => {
        const fullUpdateData = createFullUpdateData(userToUpdate, {first_name: 'UpdateAttempt'});
        const response = await request(app)
            .put(`/api/v1/users/${userToUpdate.id}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const fullUpdateData = createFullUpdateData(userToUpdate, {first_name: 'UpdateAttempt'});
        const response = await request(app)
            .put(`/api/v1/users/${userToUpdate.id}`)
            .set('Authorization', 'Bearer invalidtoken123')
            .send(fullUpdateData);
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin (member token)', async () => {
        const fullUpdateData = createFullUpdateData(userToUpdate, {first_name: 'UpdateAttempt'});
        const response = await request(app)
            .put(`/api/v1/users/${userToUpdate.id}`)
            .set('Authorization', `Bearer ${memberToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(403);
    });

    it('should return 404 if user ID does not exist', async () => {
        const nonExistentId = userToUpdate.id + 999;

        const dummyUpdateData = createFullUpdateData({
            first_name: 'NotFound', last_name: 'Update', nick: 'notfound_nick',
            email: 'notfound@test.com', password: 'zaq1@WSX', role: ROLES.MEMBER
        }, {});

        const response = await request(app)
            .put(`/api/v1/users/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(dummyUpdateData);

        expect(response.statusCode).toBe(404);
    });

    it('should return 400 if user ID format is invalid', async () => {
        const invalidId = 'abc';
        const dummyUpdateData = createFullUpdateData({ /* jak wyżej */}, {});
        const response = await request(app)
            .put(`/api/v1/users/${invalidId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(dummyUpdateData);
        expect(response.statusCode).toBe(400)
        expect(response.body.errors.some(err => err.path === 'id' && err.msg.includes('Invalid user ID.'))).toBe(true);
    });

    it('should return 400 if updated email format is invalid', async () => {
        const updates = {email: "invalid-email"};
        const fullUpdateData = createFullUpdateData(userToUpdate, updates);
        const response = await request(app)
            .put(`/api/v1/users/${userToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'email' && err.msg.includes('Invalid email format'))).toBe(true);
    });

    it('should return 400 if updated role is invalid (out of range)', async () => {
        const updates = {role: 99};
        const fullUpdateData = createFullUpdateData(userToUpdate, updates);
        const response = await request(app)
            .put(`/api/v1/users/${userToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'role' && err.msg.includes('must be one of'))).toBe(true);
    });

    it('should return 400 if updated password is provided but too short', async () => {
        const updates = {password: "short"};
        const fullUpdateData = createFullUpdateData(userToUpdate, updates);
        const response = await request(app)
            .put(`/api/v1/users/${userToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'password' && err.msg.includes('at least 8 characters'))).toBe(true);
    });

    it('should return 400 if updated email already exists for another user', async () => {
        const updates = {email: otherUser.email};
        const fullUpdateData = createFullUpdateData(userToUpdate, updates);
        const response = await request(app)
            .put(`/api/v1/users/${userToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'email' && err.msg.includes('Email already exists.'))).toBe(true);
    });

    it('should return 400 if updated nick already exists for another user', async () => {
        const updates = {nick: otherUser.nick};
        const fullUpdateData = createFullUpdateData(userToUpdate, updates);
        const response = await request(app)
            .put(`/api/v1/users/${userToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'nick' && err.msg.includes('Nick already exists.'))).toBe(true);
    });

    it('should ALLOW updating other fields when email/nick are sent but not changed (200)', async () => {
        const updates = {first_name: 'Allowed Update Again'};

        const fullUpdateData = createFullUpdateData(userToUpdate, updates);

        const response = await request(app)
            .put(`/api/v1/users/${userToUpdate.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);

        expect(response.statusCode).toBe(200);
        expect(response.body.first_name).toBe('Allowed Update Again');
        expect(response.body.email).toBe(userToUpdate.email);
        expect(response.body.nick).toBe(userToUpdate.nick);
    });
});