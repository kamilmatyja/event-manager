const prelegentModel = require('../models/prelegentModel');
const eventPrelegentModel = require('../models/eventPrelegentModel');
const userModel = require('../models/userModel');
const NotFoundError = require("../errors/NotFoundError");
const ConflictError = require("../errors/ConflictError");

const findAllPrelegents = async () => {
    return await prelegentModel.findAll();
};

const findPrelegentById = async (id) => {
    const prelegent = await prelegentModel.findById(id);
    if (!prelegent) {
        throw new NotFoundError('Prelegent not found.');
    }
    return prelegent;
};

const findPrelegentByUserId = async (userId) => {
    return await prelegentModel.findByUserId(userId);
};

const createPrelegent = async (prelegentData) => {
    const userExists = await userModel.findById(prelegentData.user_id);
    if (!userExists) {
        throw new NotFoundError('User with the provided ID does not exist.');
    }

    const existingName = await prelegentModel.findByName(prelegentData.name);
    if (existingName) {
        throw new ConflictError('Prelegent name already exists.');
    }
    const existingDesc = await prelegentModel.findByDescription(prelegentData.description);
    if (existingDesc) {
        throw new ConflictError('Prelegent description already exists.');
    }

    return await prelegentModel.create(prelegentData);
};

const updatePrelegent = async (id, prelegentData) => {
    const currentPrelegent = await findPrelegentById(id);

    if (prelegentData.user_id && prelegentData.user_id !== currentPrelegent.user_id) {
        const userExists = await userModel.findById(prelegentData.user_id);
        if (!userExists) {
            throw new NotFoundError('User with the provided ID does not exist.');
        }
    }

    if (prelegentData.name && prelegentData.name !== currentPrelegent.name) {
        const existingName = await prelegentModel.findByName(prelegentData.name);
        if (existingName) {
            throw new ConflictError('Prelegent name already exists.');
        }
    }
    if (prelegentData.description && prelegentData.description !== currentPrelegent.description) {
        const existingDesc = await prelegentModel.findByDescription(prelegentData.description);
        if (existingDesc) {
            throw new ConflictError('Prelegent description already exists.');
        }
    }

    const dataToUpdate = {};
    if (prelegentData.user_id !== undefined) dataToUpdate.user_id = prelegentData.user_id;
    if (prelegentData.name !== undefined) dataToUpdate.name = prelegentData.name;
    if (prelegentData.description !== undefined) dataToUpdate.description = prelegentData.description;

    if (Object.keys(dataToUpdate).length === 0) {
        return currentPrelegent;
    }

    const updatedPrelegent = await prelegentModel.update(id, dataToUpdate);
    if (!updatedPrelegent) {
        throw new NotFoundError('Prelegent not found during update.');
    }

    return updatedPrelegent;
};

const deletePrelegent = async (id) => {
    await findPrelegentById(id);

    const usageCount = await eventPrelegentModel.countByPrelegentId(id);
    if (usageCount > 0) {
        throw new ConflictError(`Cannot delete prelegent: They are assigned to ${usageCount} event(s).`);
    }

    const deletedCount = await prelegentModel.deleteById(id);
    return deletedCount > 0;
};

module.exports = {
    findAllPrelegents,
    findPrelegentById,
    findPrelegentByUserId,
    createPrelegent,
    updatePrelegent,
    deletePrelegent,
};