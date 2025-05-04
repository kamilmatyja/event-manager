const localeModel = require('../models/localeModel');
const eventModel = require('../models/eventModel');
const NotFoundError = require('../errors/NotFoundError');
const ConflictError = require('../errors/ConflictError');

const findAllLocales = async () => {
    return await localeModel.findAll();
};

const findLocaleById = async (id) => {
    const locale = await localeModel.findById(id);

    if (!locale) {
        throw new NotFoundError(`Locale with ID ${id} not found.`);
    }

    return locale;
};

const createLocale = async (localeData) => {
    return await localeModel.create(localeData);
};

const updateLocale = async (id, localeData) => {
    const locale = await localeModel.findById(id);

    if (!locale) {
        throw new NotFoundError(`Locale with ID ${id} not found.`);
    }

    return await localeModel.update(id, localeData);
};

const deleteLocale = async (id) => {
    const locale = await localeModel.findById(id);

    if (!locale) {
        throw new NotFoundError(`Locale with ID ${id} not found.`);
    }

    const usageCount = await eventModel.countByLocaleId(id);

    if (usageCount > 0) {
        throw new ConflictError(`Cannot delete locale: It is used by ${usageCount} event(s).`);
    }

    return await localeModel.deleteById(id) > 0;
};

module.exports = {
    findAllLocales,
    findLocaleById,
    createLocale,
    updateLocale,
    deleteLocale,
};