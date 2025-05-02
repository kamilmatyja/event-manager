const db = require('../db/knex');

const TABLE_NAME = 'resources';

const findAll = () => {
    return db(TABLE_NAME).select('*').orderBy('name');
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

const create = (resourceData) => {
    return db(TABLE_NAME)
        .insert(resourceData)
        .returning('*')
        .then(rows => rows[0]);
};

const update = (id, resourceData) => {
    return db(TABLE_NAME)
        .where({id})
        .update(resourceData)
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
    findByDescription,
    create,
    update,
    deleteById,
};