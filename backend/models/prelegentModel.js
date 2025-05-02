const db = require('../db/knex');

const TABLE_NAME = 'prelegents';

const findAll = () => {
    return db(TABLE_NAME)
        .select(
            'prelegents.id',
            'prelegents.user_id',
            'prelegents.name',
            'prelegents.description',
            'users.nick as user_nick',
            'users.email as user_email',
            'prelegents.created_at',
            'prelegents.updated_at'
        )
        .leftJoin('users', 'prelegents.user_id', 'users.id')
        .orderBy('prelegents.name');
};

const findById = (id) => {
    return db(TABLE_NAME)
        .select(
            'prelegents.id',
            'prelegents.user_id',
            'prelegents.name',
            'prelegents.description',
            'users.nick as user_nick',
            'users.email as user_email',
            'prelegents.created_at',
            'prelegents.updated_at'
        )
        .leftJoin('users', 'prelegents.user_id', 'users.id')
        .where('prelegents.id', id)
        .first();
};

const findByName = (name) => {
    return db(TABLE_NAME).where({name}).first();
};

const findByDescription = (description) => {
    return db(TABLE_NAME).where({description}).first();
};

const findByUserId = (userId) => {
    return db(TABLE_NAME).where({user_id: userId}).first();
}

const create = (prelegentData) => {
    return db(TABLE_NAME)
        .insert(prelegentData)
        .returning('*')
        .then(rows => rows[0]);
};

const update = (id, prelegentData) => {
    return db(TABLE_NAME)
        .where({id})
        .update(prelegentData)
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
    findByUserId,
    create,
    update,
    deleteById,
};