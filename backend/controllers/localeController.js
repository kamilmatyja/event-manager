const localeService = require('../services/localeService');
const BadRequestError = require("../errors/BadRequestError");
const NotFoundError = require("../errors/NotFoundError");

const getAllLocales = async (req, res) => {
    const locales = await localeService.findAllLocales();
    res.status(200).json(locales);
};

const getLocaleById = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        throw new BadRequestError('Invalid locale ID format.');
    }
    const locale = await localeService.findLocaleById(id);
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
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        throw new BadRequestError('Invalid locale ID format.');
    }

    const updatedLocale = await localeService.updateLocale(id, req.body);
    if (!updatedLocale) {
        throw new NotFoundError('Locale not found');
    }
    res.status(200).json(updatedLocale);
};

const deleteLocale = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        throw new BadRequestError('Invalid locale ID format.');
    }
    const success = await localeService.deleteLocale(id);
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