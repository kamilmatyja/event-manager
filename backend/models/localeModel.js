const db = require('../db/knex');

const TABLE_NAME = 'locales';

const findAll = () => {
    return db(TABLE_NAME).select('*').orderBy('city').orderBy('name');
};

const findById = (id) => {
    return db(TABLE_NAME).where({id}).first();
};

const findByName = (name) => {
    return db(TABLE_NAME).where({name}).first();
};

const create = (localeData) => {
    return db(TABLE_NAME)
        .insert(localeData)
        .returning('*')
        .then(rows => rows[0]);
};

const update = (id, localeData) => {

    return db(TABLE_NAME)
        .where({id})
        .update(localeData)
        .returning('*')
        .then(rows => rows.length ? rows[0] : null);
};

const deleteById = (id) => {
    return db(TABLE_NAME)
        .where({id})
        .del();
};

module.exports = {
    findAll,
    findById,
    findByName,
    create,
    update,
    deleteById,
};