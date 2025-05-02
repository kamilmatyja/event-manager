const db = require('../db/knex');

const TABLE_NAME = 'caterings';

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

const create = (cateringData) => {
    return db(TABLE_NAME)
        .insert(cateringData)
        .returning('*')
        .then(rows => rows[0]);
};

const update = (id, cateringData) => {
    return db(TABLE_NAME)
        .where({id})
        .update(cateringData)
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