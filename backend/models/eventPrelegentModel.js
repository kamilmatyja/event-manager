const db = require('../db/knex');

const TABLE_NAME = 'event_prelegents';

const countByPrelegentId = async (prelegentId) => {
    const result = await db(TABLE_NAME)
        .where({prelegent_id: prelegentId})
        .count('id as count')
        .first();

    return parseInt(result.count, 10);
};

const deleteByEventId = (eventId, trx = db) => {
    return trx(TABLE_NAME).where({event_id: eventId}).del();
};

const create = (eventPrelegentData, trx = db) => {
    return trx(TABLE_NAME).insert(eventPrelegentData).returning('id');
};

const findByEventId = (eventId) => {
    return db(TABLE_NAME).where({event_id: eventId}).select('prelegent_id');
}

module.exports = {
    countByPrelegentId,
    deleteByEventId,
    create,
    findByEventId,
};