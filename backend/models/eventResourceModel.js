const db = require('../db/knex');

const TABLE_NAME = 'event_resources';

const countByResourceId = async (resourceId) => {
    const result = await db(TABLE_NAME)
        .where({resource_id: resourceId})
        .count('id as count')
        .first();

    return parseInt(result.count, 10);
};

const deleteByEventId = (eventId, trx = db) => {
    return trx(TABLE_NAME).where({event_id: eventId}).del();
};

const create = (eventResourceData, trx = db) => {
    return trx(TABLE_NAME).insert(eventResourceData).returning('id');
};

const findByEventId = (eventId) => {
    return db(TABLE_NAME).where({event_id: eventId}).select('resource_id');
}

module.exports = {
    countByResourceId,
    deleteByEventId,
    create,
    findByEventId,
};