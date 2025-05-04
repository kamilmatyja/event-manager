const {body, param} = require('express-validator');
const CateringModel = require('../models/cateringModel');

const validateId = [
    param('id')
        .isInt({gt: 0}).withMessage('Invalid catering ID. ID must be a positive integer.')
];

const cateringIdValidator = [
    ...validateId
];

const createCateringValidator = [
    body('name')
        .trim()
        .notEmpty().withMessage('Catering name is required.')
        .isLength({min: 5, max: 100}).withMessage('Catering name must be between 5 and 100 characters.')
        .custom(async (value) => {
            const catering = await CateringModel.findByName(value);
            if (catering) {
                return Promise.reject('Catering name already exists.');
            }
            return true;
        }),

    body('description')
        .trim()
        .notEmpty().withMessage('Catering description is required.')
        .custom(async (value) => {
            const catering = await CateringModel.findByDescription(value);
            if (catering) {
                return Promise.reject('Catering description already exists.');
            }
            return true;
        }),
];

const updateCateringValidator = [
    ...validateId,

    body('name')
        .trim()
        .notEmpty().withMessage('Catering name is required.')
        .isLength({min: 5, max: 100}).withMessage('Catering name must be between 5 and 100 characters.')
        .custom(async (value, {req}) => {
            const catering = await CateringModel.findByName(value);
            if (catering && catering.id !== parseInt(req.params.id, 10)) {
                return Promise.reject('Catering name already exists.');
            }
            return true;
        }),

    body('description')
        .trim()
        .notEmpty().withMessage('Catering description is required.')
        .custom(async (value, {req}) => {
            const catering = await CateringModel.findByDescription(value);
            if (catering && catering.id !== parseInt(req.params.id, 10)) {
                return Promise.reject('Catering description already exists.');
            }
            return true;
        }),
];

module.exports = {
    cateringIdValidator,
    createCateringValidator,
    updateCateringValidator,
};