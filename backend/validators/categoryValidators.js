const {body, param} = require('express-validator');
const CategoryModel = require('../models/categoryModel');

const validateId = [
    param('id')
        .isInt({gt: 0}).withMessage('Invalid category ID. ID must be a positive integer.')
];

const categoryIdValidator = [
    ...validateId
];

const createCategoryValidator = [
    body('name')
        .trim()
        .notEmpty().withMessage('Category name is required.')
        .isLength({min: 5, max: 100}).withMessage('Category name must be between 5 and 100 characters.')
        .custom(async (value) => {
            const category = await CategoryModel.findByName(value);
            if (category) {
                return Promise.reject('Category name already exists.');
            }
            return true;
        }),

    body('description')
        .trim()
        .notEmpty().withMessage('Category description is required.')
        .custom(async (value) => {
            const category = await CategoryModel.findByDescription(value);
            if (category) {
                return Promise.reject('Category description already exists.');
            }
            return true;
        })
];

const updateCategoryValidator = [
    ...validateId,

    body('name')
        .trim()
        .notEmpty().withMessage('Category name is required.')
        .isLength({min: 5, max: 100}).withMessage('Category name must be between 5 and 100 characters.')
        .custom(async (value, {req}) => {
            const category = await CategoryModel.findByName(value);
            if (category && category.id !== parseInt(req.params.id, 10)) {
                return Promise.reject('Category name already exists.');
            }
            return true;
        }),

    body('description')
        .trim()
        .notEmpty().withMessage('Category description is required.')
        .custom(async (value, {req}) => {
            const category = await CategoryModel.findByDescription(value);
            if (category && category.id !== parseInt(req.params.id, 10)) {
                return Promise.reject('Category description already exists.');
            }
            return true;
        })
];

module.exports = {
    categoryIdValidator,
    createCategoryValidator,
    updateCategoryValidator,
};