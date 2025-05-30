const {body, param} = require('express-validator');
const PrelegentModel = require('../models/prelegentModel');
const UserModel = require('../models/userModel');

const validateId = [
    param('id')
        .isInt({gt: 0}).withMessage('Invalid prelegent ID. ID must be a positive integer.')
];

const prelegentIdValidator = [
    ...validateId
];

const createPrelegentValidator = [
    body('user_id')
        .notEmpty().withMessage('User ID is required.')
        .isInt({gt: 0}).withMessage('Invalid User ID format.')

        .custom(async (value) => {
            const user = await UserModel.findById(value);
            if (!user) {
                return Promise.reject('User with the provided ID does not exist.');
            }

            const existingPrelegent = await PrelegentModel.findByUserId(value);
            if (existingPrelegent) {
                return Promise.reject('This user is already assigned to a prelegent.');
            }
            return true;
        }),

    body('name')
        .trim()
        .notEmpty().withMessage('Prelegent name is required.')
        .isLength({min: 5, max: 100}).withMessage('Prelegent name must be between 5 and 100 characters.')
        .custom(async (value) => {
            const prelegent = await PrelegentModel.findByName(value);
            if (prelegent) {
                return Promise.reject('Prelegent name already exists.');
            }
            return true;
        }),

    body('description')
        .trim()
        .notEmpty().withMessage('Prelegent description is required.')
        .custom(async (value) => {
            const prelegent = await PrelegentModel.findByDescription(value);
            if (prelegent) {
                return Promise.reject('Prelegent description already exists.');
            }
            return true;
        }),
];

const updatePrelegentValidator = [
    ...validateId,

    body('user_id')
        .notEmpty()
        .isInt({gt: 0}).withMessage('Invalid User ID format.')
        .custom(async (value, {req}) => {
            const user = await UserModel.findById(value);
            if (!user) {
                return Promise.reject('User with the provided ID does not exist.');
            }

            const existingPrelegent = await PrelegentModel.findByUserId(value);
            if (existingPrelegent && existingPrelegent.id !== parseInt(req.params.id, 10)) {
                return Promise.reject('This user is already assigned to a prelegent.');
            }
            return true;
        }),

    body('name')
        .trim()
        .notEmpty().withMessage('Prelegent name is required.')
        .isLength({min: 5, max: 100}).withMessage('Prelegent name must be between 5 and 100 characters.')
        .custom(async (value, {req}) => {
            const prelegent = await PrelegentModel.findByName(value);
            if (prelegent && prelegent.id !== parseInt(req.params.id, 10)) {
                return Promise.reject('Prelegent name already exists.');
            }
            return true;
        }),

    body('description')
        .trim()
        .notEmpty().withMessage('Prelegent description is required.')
        .custom(async (value, {req}) => {
            const prelegent = await PrelegentModel.findByDescription(value);
            if (prelegent && prelegent.id !== parseInt(req.params.id, 10)) {
                return Promise.reject('Prelegent description already exists.');
            }
            return true;
        }),
];

module.exports = {
    prelegentIdValidator,
    createPrelegentValidator,
    updatePrelegentValidator,
};