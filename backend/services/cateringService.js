const cateringModel = require('../models/cateringModel');
const eventCateringModel = require('../models/eventCateringModel');
const NotFoundError = require('../errors/NotFoundError');
const ConflictError = require('../errors/ConflictError');

const findAllCaterings = async () => {
    return await cateringModel.findAll();
};

const findCateringById = async (id) => {
    const catering = await cateringModel.findById(id);

    if (!catering) {
        throw new NotFoundError(`Catering with ID ${id} not found.`);
    }

    return catering;
};

const createCatering = async (cateringData) => {
    return await cateringModel.create(cateringData);
};

const updateCatering = async (id, cateringData) => {
    const catering = await findCateringById(id);

    if (!catering) {
        throw new NotFoundError(`Catering with ID ${id} not found.`);
    }

    return await cateringModel.update(id, cateringData);
};

const deleteCatering = async (id) => {
    const catering = await findCateringById(id);

    if (!catering) {
        throw new NotFoundError(`Catering with ID ${id} not found.`);
    }

    const usageCount = await eventCateringModel.countByCateringId(id);

    if (usageCount > 0) {
        throw new ConflictError(`Cannot delete catering: It is used by ${usageCount} event(s).`);
    }

    return await cateringModel.deleteById(id) > 0;
};

module.exports = {
    findAllCaterings,
    findCateringById,
    createCatering,
    updateCatering,
    deleteCatering,
};