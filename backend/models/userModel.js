const db = require('../db/knex');

const TABLE_NAME = 'users';

const findById = (id) => {
    return db(TABLE_NAME).where({id}).first();
};

const findByEmail = (email) => {
    return db(TABLE_NAME).where({email}).first();
};

const findByNick = (nick) => {
    return db(TABLE_NAME).where({nick}).first();
};

const create = (userData) => {
    return db(TABLE_NAME)
        .insert(userData)
        .returning('*')
        .then(rows => rows[0]);
};

const findAll = () => {
    return db(TABLE_NAME).select('id', 'first_name', 'last_name', 'nick', 'email', 'role', 'created_at', 'updated_at');
};

const update = (id, userData) => {
    return db(TABLE_NAME)
        .where({id})
        .update(userData)
        .returning('*')
        .then(rows => rows.length ? rows[0] : null);
};

const deleteById = (id) => {
    return db(TABLE_NAME)
        .where({id})
        .del();
};

module.exports = {
    findById,
    findByEmail,
    findByNick,
    create,
    findAll,
    update,
    deleteById,

};