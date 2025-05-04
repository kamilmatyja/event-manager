const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');
const prelegentModel = require('../models/prelegentModel');
const eventTicketModel = require('../models/eventTicketModel');
const {sanitizeUser} = require('./authService');
const NotFoundError = require('../errors/NotFoundError');
const ConflictError = require('../errors/ConflictError');

const findAllUsers = async () => {
    return await userModel.findAll();
};

const findUserById = async (id) => {
    const user = await userModel.findById(id);

    if (!user) {
        throw new NotFoundError(`User with ID ${id} not found.`);
    }

    return sanitizeUser(user);
};

const createUser = async (userData) => {
    userData.password = await bcrypt.hash(userData.password, 10);

    return sanitizeUser(await userModel.create(userData));
};

const updateUser = async (id, userData) => {
    const user = await userModel.findById(id);

    if (!user) {
        throw new NotFoundError(`User with ID ${id} not found.`);
    }

    userData.password = await bcrypt.hash(userData.password, 10);

    return sanitizeUser(await userModel.update(id, userData));
};

const deleteUser = async (id) => {
    const user = await userModel.findById(id);

    if (!user) {
        throw new NotFoundError(`User with ID ${id} not found.`);
    }

    const isPrelegent = await prelegentModel.findByUserId(id);

    if (isPrelegent) {
        throw new ConflictError(`Cannot delete user: User (ID: ${id}) is registered as a prelegent (ID: ${isPrelegent.id}).`);
    }

    const ticketCount = await eventTicketModel.countByUserId(id);

    if (ticketCount > 0) {
        throw new ConflictError(`Cannot delete user: User (ID: ${id}) has ${ticketCount} event ticket(s).`);
    }

    return await userModel.deleteById(id) > 0;
};

module.exports = {
    findAllUsers,
    findUserById,
    createUser,
    updateUser,
    deleteUser,
};