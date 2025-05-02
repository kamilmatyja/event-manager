const db = require('../db/knex');

const TABLE_NAME = 'categories';

const findAll = () => {
    return db(TABLE_NAME).select('*');
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

const create = (categoryData) => {
    return db(TABLE_NAME)
        .insert(categoryData)
        .returning('*')
        .then(rows => rows[0]);
};

const update = (id, categoryData) => {
    return db(TABLE_NAME)
        .where({id})
        .update(categoryData)
        .returning('*')
        .then(rows => rows[0]);
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