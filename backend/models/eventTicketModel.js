const db = require('../db/knex');

const TABLE_NAME = 'event_tickets';

const findById = (id) => {
    return db(TABLE_NAME).where({id}).first();
};

const findByUser = (userId) => {
    return db(TABLE_NAME).where({user_id: userId}).select('*');
};

const countByUserId = async (userId) => {
    const result = await db(TABLE_NAME)
        .where({user_id: userId})
        .count('id as count')
        .first();
    return parseInt(result.count, 10);
};

const countByEventId = async (eventId) => {
    const result = await db(TABLE_NAME)
        .where({event_id: eventId})
        .count('id as count')
        .first();
    return parseInt(result.count, 10);
};

const findByEventAndUser = (eventId, userId) => {
    return db(TABLE_NAME).where({event_id: eventId, user_id: userId}).first();
};

const create = (ticketData) => {
    return db(TABLE_NAME)
        .insert(ticketData)
        .returning('*')
        .then(rows => rows[0]);
};

const deleteById = (id) => {
    return db(TABLE_NAME).where({id}).del();
};

const findConflictingUserTickets = async (userId, startTime, endTime, excludeEventId = null) => {
    const query = db(TABLE_NAME + ' as et')
        .join('events as e', 'et.event_id', 'e.id')
        .where('et.user_id', userId)
        .andWhere((builder) => {
            builder.where('e.started_at', '<', endTime);
            builder.andWhere('e.ended_at', '>', startTime);
        });

    if (excludeEventId) {
        query.andWhere('e.id', '!=', excludeEventId);
    }

    return query.select('e.id', 'e.name', 'e.started_at', 'e.ended_at');
};

const findAllWithEventDetailsByUser = (userId) => {
    return db(TABLE_NAME + ' as et')
        .select(
            'et.id as id',
            'et.price as purchase_price',
            'et.created_at as purchased_at',
            'et.event_id',
            'e.name as event_name',
            'e.started_at as event_started_at',
            'e.ended_at as event_ended_at',
            'l.name as locale_name',
            'l.city as locale_city'
        )
        .leftJoin('events as e', 'et.event_id', 'e.id')
        .leftJoin('locales as l', 'e.locale_id', 'l.id')
        .where('et.user_id', userId)
        .orderBy('e.started_at', 'desc');
};

module.exports = {
    findById,
    findByUser,
    countByUserId,
    countByEventId,
    findByEventAndUser,
    create,
    deleteById,
    findConflictingUserTickets,
    findAllWithEventDetailsByUser,
};