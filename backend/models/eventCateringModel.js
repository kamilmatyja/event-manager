const db = require('../db/knex');

const TABLE_NAME = 'event_caterings';

const countByCateringId = async (cateringId) => {
    const result = await db(TABLE_NAME)
        .where({catering_id: cateringId})
        .count('id as count')
        .first();

    return parseInt(result.count, 10);
};

const deleteByEventId = (eventId, trx = db) => {
    return trx(TABLE_NAME).where({event_id: eventId}).del();
};

const create = (eventCateringData, trx = db) => {
    return trx(TABLE_NAME).insert(eventCateringData).returning('id');
};

const findByEventId = (eventId) => {
    return db(TABLE_NAME).where({event_id: eventId}).select('catering_id');
}

module.exports = {
    countByCateringId,
    deleteByEventId,
    create,
    findByEventId,
};