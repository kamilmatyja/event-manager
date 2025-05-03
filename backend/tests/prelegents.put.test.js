const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

const createFullUpdatePrelegentData = (currentPrelegentData, updates) => {

    const {id, created_at, updated_at, user_nick, user_email, ...baseData} = currentPrelegentData;
    return {
        ...baseData,
        ...updates,
    };
};

describe('PUT /api/v1/prelegents/{id}', () => {
    let adminToken;
    let memberToken;
    let prelegentToUpdateRecord;
    let userOfPrelegentToUpdate;
    let otherPrelegentRecord;
    let userOfOtherPrelegent;
    let userNotPrelegent;

    beforeEach(async () => {

        const adminCredentials = {
            email: `put.prel.admin@test.com`,
            plainPassword: 'PasswordAdminPutPrel!',
            role: ROLES.ADMINISTRATOR
        };
        const memberCredentials = {
            email: `put.prel.member@test.com`,
            plainPassword: 'PasswordMemberPutPrel!',
            role: ROLES.MEMBER
        };
        const userToUpdateCredentials = {
            email: `put.prel.targetuser@test.com`,
            nick: `target_user_put_${Date.now()}`,
            plainPassword: 'PasswordTargetUserPut!',
            role: ROLES.MEMBER
        };
        const otherPrelegentUserCredentials = {
            email: `put.prel.otheruser@test.com`,
            nick: `other_user_put_${Date.now()}`,
            plainPassword: 'PasswordOtherUserPut!',
            role: ROLES.MEMBER
        };
        const notPrelegentCredentials = {
            email: `put.prel.notprel@test.com`,
            nick: `not_prel_put_${Date.now()}`,
            plainPassword: 'PasswordNotPrelPut!',
            role: ROLES.MEMBER
        };

        const saltRounds = 10;
        const passwords = await Promise.all([
            bcrypt.hash(adminCredentials.plainPassword, saltRounds),
            bcrypt.hash(memberCredentials.plainPassword, saltRounds),
            bcrypt.hash(userToUpdateCredentials.plainPassword, saltRounds),
            bcrypt.hash(otherPrelegentUserCredentials.plainPassword, saltRounds),
            bcrypt.hash(notPrelegentCredentials.plainPassword, saltRounds),
        ]);

        const [adminUser] = await db('users').insert({
            first_name: 'Admin',
            last_name: 'PrelPutter',
            nick: `admin_prel_putter_${Date.now()}`,
            email: adminCredentials.email,
            password: passwords[0],
            role: adminCredentials.role
        }).returning('*');
        const [memberUser] = await db('users').insert({
            first_name: 'Member',
            last_name: 'PrelPutter',
            nick: `member_prel_putter_${Date.now()}`,
            email: memberCredentials.email,
            password: passwords[1],
            role: memberCredentials.role
        }).returning('*');
        [userOfPrelegentToUpdate] = await db('users').insert({
            first_name: 'Target',
            last_name: 'PrelUserPut',
            nick: userToUpdateCredentials.nick,
            email: userToUpdateCredentials.email,
            password: passwords[2],
            role: userToUpdateCredentials.role
        }).returning('*');
        [userOfOtherPrelegent] = await db('users').insert({
            first_name: 'Other',
            last_name: 'PrelUserPut',
            nick: otherPrelegentUserCredentials.nick,
            email: otherPrelegentUserCredentials.email,
            password: passwords[3],
            role: otherPrelegentUserCredentials.role
        }).returning('*');
        [userNotPrelegent] = await db('users').insert({
            first_name: 'NotAPrelegent',
            last_name: 'Put',
            nick: notPrelegentCredentials.nick,
            email: notPrelegentCredentials.email,
            password: passwords[4],
            role: notPrelegentCredentials.role
        }).returning('*');

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const memberPayload = {id: memberUser.id, nick: memberUser.nick, role: memberUser.role, jti: uuidv4()};
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        [prelegentToUpdateRecord] = await db('prelegents').insert({
            user_id: userOfPrelegentToUpdate.id,
            name: `Prelegent To Update ${Date.now()}`,
            description: `Desc To Update ${Date.now()}`
        }).returning('*');
        [otherPrelegentRecord] = await db('prelegents').insert({
            user_id: userOfOtherPrelegent.id,
            name: `Other Prelegent ${Date.now()}`,
            description: `Other prelegent description ${Date.now()}`
        }).returning('*');
    });

    it('should update an existing prelegent (name and description) successfully (200)', async () => {
        const updates = {
            name: 'Updated Prelegent Name',
            description: 'Updated prelegent description.',

        };

        const currentPrelegentData = await db('prelegents').where({id: prelegentToUpdateRecord.id}).first();
        const fullUpdateData = createFullUpdatePrelegentData(currentPrelegentData, updates);

        const response = await request(app)
            .put(`/api/v1/prelegents/${prelegentToUpdateRecord.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);

        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBe(prelegentToUpdateRecord.id);
        expect(response.body.name).toBe(updates.name);
        expect(response.body.description).toBe(updates.description);
        expect(response.body.user_id).toBe(userOfPrelegentToUpdate.id);
    });

    it('should update an existing prelegent\'s associated user_id successfully (200)', async () => {
        const updates = {
            user_id: userNotPrelegent.id,
        };
        const currentPrelegentData = await db('prelegents').where({id: prelegentToUpdateRecord.id}).first();
        const fullUpdateData = createFullUpdatePrelegentData(currentPrelegentData, updates);

        const response = await request(app)
            .put(`/api/v1/prelegents/${prelegentToUpdateRecord.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);

        expect(response.statusCode).toBe(200);
        expect(response.body.id).toBe(prelegentToUpdateRecord.id);
        expect(response.body.user_id).toBe(userNotPrelegent.id);
        expect(response.body.name).toBe(currentPrelegentData.name);
    });

    it('should return 401 if no token is provided', async () => {
        const updates = {name: 'UpdateAttempt'};
        const currentPrelegentData = await db('prelegents').where({id: prelegentToUpdateRecord.id}).first();
        const fullUpdateData = createFullUpdatePrelegentData(currentPrelegentData, updates);
        const response = await request(app)
            .put(`/api/v1/prelegents/${prelegentToUpdateRecord.id}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const updates = {name: 'UpdateAttempt'};
        const currentPrelegentData = await db('prelegents').where({id: prelegentToUpdateRecord.id}).first();
        const fullUpdateData = createFullUpdatePrelegentData(currentPrelegentData, updates);
        const response = await request(app)
            .put(`/api/v1/prelegents/${prelegentToUpdateRecord.id}`)
            .set('Authorization', 'Bearer invalidtoken123')
            .send(fullUpdateData);
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin (member token)', async () => {
        const updates = {name: 'UpdateAttempt'};
        const currentPrelegentData = await db('prelegents').where({id: prelegentToUpdateRecord.id}).first();
        const fullUpdateData = createFullUpdatePrelegentData(currentPrelegentData, updates);
        const response = await request(app)
            .put(`/api/v1/prelegents/${prelegentToUpdateRecord.id}`)
            .set('Authorization', `Bearer ${memberToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(403);
    });

    it('should return 404 if prelegent ID does not exist', async () => {
        const nonExistentId = prelegentToUpdateRecord.id + 999;
        const dummyUpdateData = createFullUpdatePrelegentData({
            user_id: userNotPrelegent.id,
            name: 'NotFound',
            description: 'UpdateDesc'
        }, {});
        const response = await request(app)
            .put(`/api/v1/prelegents/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(dummyUpdateData);
        expect(response.statusCode).toBe(404);
    });

    it('should return 400 if prelegent ID format is invalid', async () => {
        const invalidId = 'abc';
        const dummyUpdateData = createFullUpdatePrelegentData({
            user_id: userNotPrelegent.id,
            name: 'InvalidId',
            description: 'UpdateDesc'
        }, {});
        const response = await request(app)
            .put(`/api/v1/prelegents/${invalidId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(dummyUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'id' && err.msg.includes('Invalid prelegent ID.'))).toBe(true);
    });

    it('should return 400 if updated user_id does not exist in users table', async () => {
        const nonExistentUserId = userNotPrelegent.id + 999;
        const updates = {user_id: nonExistentUserId};
        const currentPrelegentData = await db('prelegents').where({id: prelegentToUpdateRecord.id}).first();
        const fullUpdateData = createFullUpdatePrelegentData(currentPrelegentData, updates);

        const response = await request(app)
            .put(`/api/v1/prelegents/${prelegentToUpdateRecord.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);

        expect(response.body.errors.some(err => err.path === 'user_id' && err.msg.includes('User with the provided ID does not exist.'))).toBe(true);
    });

    it('should return 400 if updated name is empty', async () => {
        const updates = {name: ""};
        const currentPrelegentData = await db('prelegents').where({id: prelegentToUpdateRecord.id}).first();
        const fullUpdateData = createFullUpdatePrelegentData(currentPrelegentData, updates);
        const response = await request(app)
            .put(`/api/v1/prelegents/${prelegentToUpdateRecord.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'name' && err.msg.includes('is required'))).toBe(true);
    });

    it('should return 400 if updated name is too short/long', async () => {
        const updatesShort = {name: "A"};
        const currentPrelegentData = await db('prelegents').where({id: prelegentToUpdateRecord.id}).first();
        const fullDataShort = createFullUpdatePrelegentData(currentPrelegentData, updatesShort);

        const responseShort = await request(app)
            .put(`/api/v1/prelegents/${prelegentToUpdateRecord.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullDataShort);

        expect(responseShort.statusCode).toBe(400);
        expect(responseShort.body.errors.some(err => err.path === 'name' && err.msg.includes('characters'))).toBe(true);
    });

    it('should return 400 if updated user_id format is invalid', async () => {
        const updates = {user_id: "invalid"};
        const currentPrelegentData = await db('prelegents').where({id: prelegentToUpdateRecord.id}).first();
        const fullUpdateData = createFullUpdatePrelegentData(currentPrelegentData, updates);
        const response = await request(app)
            .put(`/api/v1/prelegents/${prelegentToUpdateRecord.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'user_id' && err.msg.includes('Invalid User ID format'))).toBe(true);
    });

    it('should return 400 if updated name already exists for another prelegent', async () => {
        const updates = {name: otherPrelegentRecord.name};
        const currentPrelegentData = await db('prelegents').where({id: prelegentToUpdateRecord.id}).first();
        const fullUpdateData = createFullUpdatePrelegentData(currentPrelegentData, updates);
        const response = await request(app)
            .put(`/api/v1/prelegents/${prelegentToUpdateRecord.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'name' && err.msg.includes('Prelegent name already exists.'))).toBe(true);
    });

    it('should return 400 if updated description already exists for another prelegent', async () => {
        const updates = {description: otherPrelegentRecord.description};
        const currentPrelegentData = await db('prelegents').where({id: prelegentToUpdateRecord.id}).first();
        const fullUpdateData = createFullUpdatePrelegentData(currentPrelegentData, updates);
        const response = await request(app)
            .put(`/api/v1/prelegents/${prelegentToUpdateRecord.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);
        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'description' && err.msg.includes('Prelegent description already exists.'))).toBe(true);
    });

    it('should return 400 if updated user_id is already assigned to another prelegent', async () => {
        const updates = {user_id: userOfOtherPrelegent.id};
        const currentPrelegentData = await db('prelegents').where({id: prelegentToUpdateRecord.id}).first();
        const fullUpdateData = createFullUpdatePrelegentData(currentPrelegentData, updates);

        const response = await request(app)
            .put(`/api/v1/prelegents/${prelegentToUpdateRecord.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);

        expect(response.statusCode).toBe(400);
        expect(response.body.errors.some(err => err.path === 'user_id' && err.msg.includes('This user is already assigned to a prelegent.'))).toBe(true);
    });

    it('should ALLOW updating a prelegent with its own existing name/description/user_id (200)', async () => {
        const updates = {
            name: prelegentToUpdateRecord.name,
            description: prelegentToUpdateRecord.description,
            user_id: prelegentToUpdateRecord.user_id
        };
        const currentPrelegentData = await db('prelegents').where({id: prelegentToUpdateRecord.id}).first();
        const fullUpdateData = createFullUpdatePrelegentData(currentPrelegentData, updates);

        const response = await request(app)
            .put(`/api/v1/prelegents/${prelegentToUpdateRecord.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(fullUpdateData);

        expect(response.statusCode).toBe(200);
    });
});