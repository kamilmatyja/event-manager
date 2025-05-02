const db = require('../db/knex');

const TABLE_NAME = 'event_sponsors';

const countBySponsorId = async (sponsorId) => {
    const result = await db(TABLE_NAME)
        .where({sponsor_id: sponsorId})
        .count('id as count')
        .first();

    return parseInt(result.count, 10);
};

const deleteByEventId = (eventId, trx = db) => {
    return trx(TABLE_NAME).where({event_id: eventId}).del();
};

const create = (eventSponsorData, trx = db) => {
    return trx(TABLE_NAME).insert(eventSponsorData).returning('id');
};

const findByEventId = (eventId) => {
    return db(TABLE_NAME).where({event_id: eventId}).select('sponsor_id');
}

module.exports = {
    countBySponsorId,
    deleteByEventId,
    create,
    findByEventId,
};