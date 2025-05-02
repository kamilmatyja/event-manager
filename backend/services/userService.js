const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');
const prelegentModel = require('../models/prelegentModel');
const eventTicketModel = require('../models/eventTicketModel');
const {sanitizeUser} = require('./authService');
const {ROLES} = require('../config/roles');
const NotFoundError = require("../errors/NotFoundError");
const ConflictError = require("../errors/ConflictError");

const findAllUsers = async () => {
    return await userModel.findAll();
};

const findUserById = async (id) => {
    const user = await userModel.findById(id);
    if (!user) {
        throw new NotFoundError('User not found.');
    }
    return sanitizeUser(user);
};

const createUser = async (userData) => {
    const {first_name, last_name, nick, email, password, role} = userData;

    const existingEmail = await userModel.findByEmail(email);
    if (existingEmail) throw new ConflictError('Email already exists.');
    const existingNick = await userModel.findByNick(nick);
    if (existingNick) throw new ConflictError('Nick already exists.');

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUserInput = {
        first_name,
        last_name,
        nick,
        email,
        password: hashedPassword,
        role
    };

    const newUser = await userModel.create(newUserInput);
    return sanitizeUser(newUser);
};

const updateUser = async (id, userData) => {
    const currentUser = await userModel.findById(id);
    if (!currentUser) {
        throw new NotFoundError('User not found.');
    }

    const dataToUpdate = {};
    if (userData.first_name !== undefined) dataToUpdate.first_name = userData.first_name;
    if (userData.last_name !== undefined) dataToUpdate.last_name = userData.last_name;
    if (userData.role !== undefined) dataToUpdate.role = userData.role;

    if (userData.nick !== undefined && userData.nick !== currentUser.nick) {
        const existingNick = await userModel.findByNick(userData.nick);
        if (existingNick) throw new ConflictError('Nick already exists.');
        dataToUpdate.nick = userData.nick;
    }

    if (userData.email !== undefined && userData.email !== currentUser.email) {
        const existingEmail = await userModel.findByEmail(userData.email);
        if (existingEmail) throw new ConflictError('Email already exists.');
        dataToUpdate.email = userData.email;
    }

    if (userData.password) {
        const saltRounds = 10;
        dataToUpdate.password = await bcrypt.hash(userData.password, saltRounds);
    }

    if (Object.keys(dataToUpdate).length === 0) {

        return sanitizeUser(currentUser);
    }

    const updatedUserRaw = await userModel.update(id, dataToUpdate);
    if (!updatedUserRaw) {

        throw new NotFoundError('User not found during update.');
    }
    return sanitizeUser(updatedUserRaw);
};

const deleteUser = async (id) => {
    const user = await userModel.findById(id);
    if (!user) {
        throw new NotFoundError('User not found.');
    }

    const isPrelegent = await prelegentModel.findByUserId(id);
    if (isPrelegent) {
        throw new ConflictError(`Cannot delete user: User (ID: ${id}) is registered as a prelegent (ID: ${isPrelegent.id}).`);
    }

    const ticketCount = await eventTicketModel.countByUserId(id);
    if (ticketCount > 0) {
        throw new ConflictError(`Cannot delete user: User (ID: ${id}) has ${ticketCount} event ticket(s).`);
    }

    const deletedCount = await userModel.deleteById(id);
    return deletedCount > 0;
};

module.exports = {
    findAllUsers,
    findUserById,
    createUser,
    updateUser,
    deleteUser,
};