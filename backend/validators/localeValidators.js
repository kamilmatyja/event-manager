const {body, param} = require('express-validator');
const LocaleModel = require('../models/localeModel');

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
        }),
];

const updateLocaleValidator = [
    param('id').isInt({gt: 0}).withMessage('Invalid locale ID.'),

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
        }),
];

module.exports = {
    createLocaleValidator,
    updateLocaleValidator,
};