const prelegentModel = require('../models/prelegentModel');
const eventPrelegentModel = require('../models/eventPrelegentModel');
const userModel = require('../models/userModel');
const NotFoundError = require('../errors/NotFoundError');
const ConflictError = require('../errors/ConflictError');

const findAllPrelegents = async () => {
    return await prelegentModel.findAll();
};

const findPrelegentById = async (id) => {
    const prelegent = await prelegentModel.findById(id);

    if (!prelegent) {
        throw new NotFoundError(`Prelegent with ID ${id} not found.`);
    }

    return prelegent;
};

const createPrelegent = async (prelegentData) => {
    return await prelegentModel.create(prelegentData);
};

const updatePrelegent = async (id, prelegentData) => {
    const prelegent = await prelegentModel.findById(id);

    if (!prelegent) {
        throw new NotFoundError(`Prelegent with ID ${id} not found.`);
    }

    return await prelegentModel.update(id, prelegentData);
};

const deletePrelegent = async (id) => {
    const prelegent = await prelegentModel.findById(id);

    if (!prelegent) {
        throw new NotFoundError(`Prelegent with ID ${id} not found.`);
    }

    const usageCount = await eventPrelegentModel.countByPrelegentId(id);

    if (usageCount > 0) {
        throw new ConflictError(`Cannot delete prelegent: They are assigned to ${usageCount} event(s).`);
    }

    return await prelegentModel.deleteById(id) > 0;
};

module.exports = {
    findAllPrelegents,
    findPrelegentById,
    createPrelegent,
    updatePrelegent,
    deletePrelegent,
};