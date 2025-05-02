const {body, param} = require('express-validator');
const ResourceModel = require('../models/resourceModel');

const createResourceValidator = [
    body('name')
        .trim()
        .notEmpty().withMessage('Resource name is required.')
        .isLength({min: 2, max: 100}).withMessage('Resource name must be between 2 and 100 characters.')
        .custom(async (value) => {
            const resource = await ResourceModel.findByName(value);
            if (resource) {
                return Promise.reject('Resource name already exists.');
            }
        }),

    body('description')
        .trim()
        .notEmpty().withMessage('Resource description is required.')
        .custom(async (value) => {
            const resource = await ResourceModel.findByDescription(value);
            if (resource) {
                return Promise.reject('Resource description already exists.');
            }
        }),
];

const updateResourceValidator = [
    param('id').isInt({gt: 0}).withMessage('Invalid resource ID.'),

    body('name')
        .trim()
        .notEmpty().withMessage('Resource name is required.')
        .isLength({min: 2, max: 100}).withMessage('Resource name must be between 2 and 100 characters.')
        .custom(async (value, {req}) => {
            const resource = await ResourceModel.findByName(value);
            if (resource && resource.id !== parseInt(req.params.id, 10)) {
                return Promise.reject('Resource name already exists.');
            }
        }),

    body('description')
        .trim()
        .notEmpty().withMessage('Resource description is required.')
        .custom(async (value, {req}) => {
            const resource = await ResourceModel.findByDescription(value);
            if (resource && resource.id !== parseInt(req.params.id, 10)) {
                return Promise.reject('Resource description already exists.');
            }
        }),
];

module.exports = {
    createResourceValidator,
    updateResourceValidator,
};