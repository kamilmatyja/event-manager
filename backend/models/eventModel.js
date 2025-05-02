const db = require('../db/knex');

const TABLE_NAME = 'events';

const findAll = () => {
    return db(TABLE_NAME)
        .select(
            'events.*',
            'locales.name as locale_name',
            'locales.city as locale_city',
            'categories.name as category_name'
        )
        .leftJoin('locales', 'events.locale_id', 'locales.id')
        .leftJoin('categories', 'events.category_id', 'categories.id')
        .orderBy('events.started_at', 'desc');
};

const findByIdDetails = (id) => {
    return db(TABLE_NAME)
        .select(
            'events.*',
            'locales.name as locale_name',
            'locales.city as locale_city',
            'categories.name as category_name'
        )
        .leftJoin('locales', 'events.locale_id', 'locales.id')
        .leftJoin('categories', 'events.category_id', 'categories.id')
        .where('events.id', id)
        .first();
};

const findById = (id) => {
    return db(TABLE_NAME).where({id}).first();
};

const findByName = (name) => {
    return db(TABLE_NAME).where({name}).first();
};

const findByDescription = (description) => {
    return db(TABLE_NAME).where({description}).first();
};

const create = (eventData, trx) => {
    return trx(TABLE_NAME)
        .insert(eventData)
        .returning('*')
        .then(rows => rows[0]);
};

const update = (id, eventData, trx) => {
    return trx(TABLE_NAME)
        .where({id})
        .update(eventData)
        .returning('*')
        .then(rows => rows.length ? rows[0] : null);
};

const deleteById = (id) => {
    return db(TABLE_NAME)
        .where({id})
        .del();
};

const findConflictingPrelegentEvents = async (prelegentId, startTime, endTime, excludeEventId = null, trx = db) => {
    const query = trx('events as e')
        .join('event_prelegents as ep', 'e.id', '=', 'ep.event_id')
        .where('ep.prelegent_id', prelegentId)
        .andWhere((builder) => {
            builder.where('e.started_at', '<', endTime);
            builder.andWhere('e.ended_at', '>', startTime);
        });
    if (excludeEventId) query.andWhere('e.id', '!=', excludeEventId);
    return query.select('e.id', 'e.name', 'e.started_at', 'e.ended_at');
};

const findConflictingResourceEvents = async (resourceId, startTime, endTime, excludeEventId = null, trx = db) => {
    const query = trx('events as e')
        .join('event_resources as er', 'e.id', '=', 'er.event_id')
        .where('er.resource_id', resourceId)
        .andWhere((builder) => {
            builder.where('e.started_at', '<', endTime);
            builder.andWhere('e.ended_at', '>', startTime);
        });
    if (excludeEventId) query.andWhere('e.id', '!=', excludeEventId);
    return query.select('e.id', 'e.name', 'e.started_at', 'e.ended_at');
};

const countByCategoryId = async (categoryId) => {
    const result = await db(TABLE_NAME).where({category_id: categoryId}).count('id as count').first();
    return parseInt(result.count, 10);
};

const countByLocaleId = async (localeId) => {
    const result = await db(TABLE_NAME).where({locale_id: localeId}).count('id as count').first();
    return parseInt(result.count, 10);
};

module.exports = {
    findAll,
    findById,
    findByIdDetails,
    findByName,
    findByDescription,
    create,
    update,
    deleteById,
    findConflictingPrelegentEvents,
    findConflictingResourceEvents,
    countByCategoryId,
    countByLocaleId,
};