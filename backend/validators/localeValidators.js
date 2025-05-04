const {body, param} = require('express-validator');
const LocaleModel = require('../models/localeModel');

const validateId = [
    param('id')
        .isInt({gt: 0}).withMessage('Invalid locale ID. ID must be a positive integer.')
];

const localeIdValidator = [
    ...validateId
];

const createLocaleValidator = [
    body('city')
        .trim()
        .notEmpty().withMessage('City name is required.')
        .isLength({min: 5, max: 100}).withMessage('City name must be between 5 and 100 characters.'),

    body('name')
        .trim()
        .notEmpty().withMessage('Locale name is required.')
        .isLength({min: 5, max: 100}).withMessage('Locale name must be between 5 and 100 characters.')
        .custom(async (value) => {
            const locale = await LocaleModel.findByName(value);
            if (locale) {
                return Promise.reject('Locale name already exists.');
            }
            return true;
        }),
];

const updateLocaleValidator = [
    ...validateId,

    body('city')
        .trim()
        .notEmpty().withMessage('City name is required.')
        .isLength({min: 5, max: 100}).withMessage('City name must be between 5 and 100 characters.'),

    body('name')
        .trim()
        .notEmpty().withMessage('Locale name is required.')
        .isLength({min: 5, max: 100}).withMessage('Locale name must be between 5 and 100 characters.')
        .custom(async (value, {req}) => {
            const locale = await LocaleModel.findByName(value);
            if (locale && locale.id !== parseInt(req.params.id, 10)) {
                return Promise.reject('Locale name already exists.');
            }
            return true;
        }),
];

module.exports = {
    localeIdValidator,
    createLocaleValidator,
    updateLocaleValidator,
};