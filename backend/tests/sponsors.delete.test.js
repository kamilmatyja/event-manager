const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');
const app = require('../server');
const db = require('../db/knex');
const {ROLES} = require('../config/roles');
const config = require('../config');

describe('DELETE /api/v1/sponsors/{id}', () => {
    let adminToken;
    let memberToken;
    let sponsorToDelete;
    let sponsorInUse;
    let eventUsingSponsor;

    beforeEach(async () => {

        const adminCredentials = {
            email: `delete.spon.admin@test.com`,
            plainPassword: 'PasswordAdminDeleteSpon!',
            role: ROLES.ADMINISTRATOR
        };
        const memberCredentials = {
            email: `delete.spon.member@test.com`,
            plainPassword: 'PasswordMemberDeleteSpon!',
            role: ROLES.MEMBER
        };
        const saltRounds = 10;
        const adminHashedPassword = await bcrypt.hash(adminCredentials.plainPassword, saltRounds);
        const memberHashedPassword = await bcrypt.hash(memberCredentials.plainPassword, saltRounds);

        const [adminUser] = await db('users').insert({
            first_name: 'Admin', last_name: 'SponDeleter', nick: `admin_spon_deleter_${Date.now()}`,
            email: adminCredentials.email, password: adminHashedPassword, role: adminCredentials.role
        }).returning('*');
        const [memberUser] = await db('users').insert({
            first_name: 'Member', last_name: 'SponDeleter', nick: `member_spon_deleter_${Date.now()}`,
            email: memberCredentials.email, password: memberHashedPassword, role: memberCredentials.role
        }).returning('*');

        const adminPayload = {id: adminUser.id, nick: adminUser.nick, role: adminUser.role, jti: uuidv4()};
        adminToken = jwt.sign(adminPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});
        const memberPayload = {id: memberUser.id, nick: memberUser.nick, role: memberUser.role, jti: uuidv4()};
        memberToken = jwt.sign(memberPayload, config.jwt.secret, {expiresIn: config.jwt.expiresIn});

        [sponsorToDelete] = await db('sponsors').insert({
            name: `Sponsor To Delete ${Date.now()}`,
            description: `Desc To Delete ${Date.now()}`
        }).returning('*');
        [sponsorInUse] = await db('sponsors').insert({
            name: `Sponsor In Use ${Date.now()}`,
            description: `Desc In Use ${Date.now()}`
        }).returning('*');

        const [locale] = await db('locales').insert({
            city: `DeleteSponTestCity_${Date.now()}`,
            name: `DeleteSponTestVenue_${Date.now()}`
        }).returning('*');
        const [category] = await db('categories').insert({
            name: `DeleteSponTestCat_${Date.now()}`,
            description: 'Cat for delete spon test'
        }).returning('*');
        [eventUsingSponsor] = await db('events').insert({
            locale_id: locale.id, category_id: category.id, name: `Event Using Sponsor ${Date.now()}`,
            description: 'This event uses a sponsor', price: 30.00,
            started_at: new Date(Date.now() + 86400000), ended_at: new Date(Date.now() + 2 * 86400000)
        }).returning('*');

        await db('event_sponsors').insert({
            event_id: eventUsingSponsor.id,
            sponsor_id: sponsorInUse.id
        });
    });

    it('should delete a sponsor successfully if it is not in use (204)', async () => {
        const response = await request(app)
            .delete(`/api/v1/sponsors/${sponsorToDelete.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(204);

        const deletedSponsor = await db('sponsors').where({id: sponsorToDelete.id}).first();
        expect(deletedSponsor).toBeUndefined();
    });

    it('should return 401 if no token is provided', async () => {
        const response = await request(app)
            .delete(`/api/v1/sponsors/${sponsorToDelete.id}`);
        expect(response.statusCode).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
        const response = await request(app)
            .delete(`/api/v1/sponsors/${sponsorToDelete.id}`)
            .set('Authorization', 'Bearer invalidtoken123');
        expect(response.statusCode).toBe(401);
    });

    it('should return 403 if user is not an admin (member token)', async () => {
        const response = await request(app)
            .delete(`/api/v1/sponsors/${sponsorToDelete.id}`)
            .set('Authorization', `Bearer ${memberToken}`);
        expect(response.statusCode).toBe(403);
    });

    it('should return 404 if sponsor ID does not exist', async () => {
        const nonExistentId = sponsorToDelete.id + 999;
        const response = await request(app)
            .delete(`/api/v1/sponsors/${nonExistentId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(404);
    });

    it('should return 400 if sponsor ID format is invalid', async () => {
        const invalidId = 'abc';
        const response = await request(app)
            .delete(`/api/v1/sponsors/${invalidId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(response.statusCode).toBe(400);
        expect(response.body).toHaveProperty('message');
    });

    it('should return 409 if trying to delete a sponsor that is assigned to an event', async () => {
        const response = await request(app)
            .delete(`/api/v1/sponsors/${sponsorInUse.id}`)
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.statusCode).toBe(409);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('Cannot delete sponsor: It is assigned to');

        const notDeletedSponsor = await db('sponsors').where({id: sponsorInUse.id}).first();
        expect(notDeletedSponsor).toBeDefined();

        const relatedEvent = await db('events').where({id: eventUsingSponsor.id}).first();
        expect(relatedEvent).toBeDefined();

        const eventSponsorLink = await db('event_sponsors').where({sponsor_id: sponsorInUse.id}).first();
        expect(eventSponsorLink).toBeDefined();
    });
});