const localeService = require('../services/localeService');
const NotFoundError = require("../errors/NotFoundError");

const getAllLocales = async (req, res) => {
    const locales = await localeService.findAllLocales();

    res.status(200).json(locales);
};

const getLocaleById = async (req, res) => {
    const locale = await localeService.findLocaleById(req.params.id);

    if (!locale) {
        throw new NotFoundError('Locale not found');
    }

    res.status(200).json(locale);
};

const createLocale = async (req, res) => {
    const newLocale = await localeService.createLocale(req.body);

    res.status(201).json(newLocale);
};

const updateLocale = async (req, res) => {
    const updatedLocale = await localeService.updateLocale(req.params.id, req.body);

    if (!updatedLocale) {
        throw new NotFoundError('Locale not found');
    }

    res.status(200).json(updatedLocale);
};

const deleteLocale = async (req, res) => {
    const success = await localeService.deleteLocale(req.params.id);

    if (!success) {
        throw new NotFoundError('Locale not found');
    }

    res.status(204).send();
};

module.exports = {
    getAllLocales,
    getLocaleById,
    createLocale,
    updateLocale,
    deleteLocale,
};