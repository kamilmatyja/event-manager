const cateringModel = require('../models/cateringModel');
const eventCateringModel = require('../models/eventCateringModel');
const NotFoundError = require("../errors/NotFoundError");
const ConflictError = require("../errors/ConflictError");

const findAllCaterings = async () => {
    return await cateringModel.findAll();
};

const findCateringById = async (id) => {
    const catering = await cateringModel.findById(id);
    if (!catering) {
        throw new NotFoundError('Catering not found.');
    }
    return catering;
};

const createCatering = async (cateringData) => {
    const existingName = await cateringModel.findByName(cateringData.name);
    if (existingName) {
        throw new ConflictError('Catering name already exists.');
    }
    const existingDesc = await cateringModel.findByDescription(cateringData.description);
    if (existingDesc) {
        throw new ConflictError('Catering description already exists.');
    }
    return await cateringModel.create(cateringData);
};

const updateCatering = async (id, cateringData) => {
    const currentCatering = await findCateringById(id);

    if (cateringData.name && cateringData.name !== currentCatering.name) {
        const existingName = await cateringModel.findByName(cateringData.name);
        if (existingName) {
            throw new ConflictError('Catering name already exists.');
        }
    }
    if (cateringData.description && cateringData.description !== currentCatering.description) {
        const existingDesc = await cateringModel.findByDescription(cateringData.description);
        if (existingDesc) {
            throw new ConflictError('Catering description already exists.');
        }
    }

    const dataToUpdate = {};
    if (cateringData.name !== undefined) dataToUpdate.name = cateringData.name;
    if (cateringData.description !== undefined) dataToUpdate.description = cateringData.description;

    if (Object.keys(dataToUpdate).length === 0) {
        return currentCatering;
    }

    const updatedCatering = await cateringModel.update(id, dataToUpdate);
    if (!updatedCatering) {
        throw new NotFoundError('Catering not found during update.');
    }
    return updatedCatering;
};

const deleteCatering = async (id) => {
    await findCateringById(id);

    const usageCount = await eventCateringModel.countByCateringId(id);
    if (usageCount > 0) {

        throw new ConflictError(`Cannot delete catering: It is used by ${usageCount} event(s).`);
    }

    const deletedCount = await cateringModel.deleteById(id);
    return deletedCount > 0;
};

module.exports = {
    findAllCaterings,
    findCateringById,
    createCatering,
    updateCatering,
    deleteCatering,
};