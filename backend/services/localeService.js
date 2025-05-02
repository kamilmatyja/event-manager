const localeModel = require('../models/localeModel');
const eventModel = require('../models/eventModel');
const NotFoundError = require("../errors/NotFoundError");
const ConflictError = require("../errors/ConflictError");

const findAllLocales = async () => {
    return await localeModel.findAll();
};

const findLocaleById = async (id) => {
    const locale = await localeModel.findById(id);
    if (!locale) {
        throw new NotFoundError('Locale not found.');
    }
    return locale;
};

const createLocale = async (localeData) => {
    const existingName = await localeModel.findByName(localeData.name);
    if (existingName) {
        throw new ConflictError('Locale name already exists.');
    }
    return await localeModel.create(localeData);
};

const updateLocale = async (id, localeData) => {
    const currentLocale = await findLocaleById(id);

    if (localeData.name && localeData.name !== currentLocale.name) {
        const existingName = await localeModel.findByName(localeData.name);
        if (existingName) {
            throw new ConflictError('Locale name already exists.');
        }
    }

    const dataToUpdate = {};
    if (localeData.city !== undefined) dataToUpdate.city = localeData.city;
    if (localeData.name !== undefined) dataToUpdate.name = localeData.name;

    if (Object.keys(dataToUpdate).length === 0) {
        return currentLocale;
    }

    const updatedLocale = await localeModel.update(id, dataToUpdate);
    if (!updatedLocale) {

        throw new NotFoundError('Locale not found during update.');
    }
    return updatedLocale;
};

const deleteLocale = async (id) => {
    await findLocaleById(id);

    const usageCount = await eventModel.countByLocaleId(id);
    if (usageCount > 0) {

        throw new ConflictError(`Cannot delete locale: It is used by ${usageCount} event(s).`);
    }

    const deletedCount = await localeModel.deleteById(id);
    return deletedCount > 0;
};

module.exports = {
    findAllLocales,
    findLocaleById,
    createLocale,
    updateLocale,
    deleteLocale,
};