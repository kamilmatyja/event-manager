const {body, param} = require('express-validator');
const CategoryModel = require('../models/categoryModel');

const createCategoryValidator = [
    body('name')
        .trim()
        .notEmpty().withMessage('Category name is required.')
        .isLength({min: 2, max: 100}).withMessage('Category name must be between 2 and 100 characters.')

        .custom(async (value) => {
            const category = await CategoryModel.findByName(value);
            if (category) {
                return Promise.reject('Category name already exists.');
            }
        }),
    body('description')
        .trim()
        .notEmpty().withMessage('Category description is required.')

        .custom(async (value) => {
            const category = await CategoryModel.findByDescription(value);
            if (category) {
                return Promise.reject('Category description already exists.');
            }
        })
];

const updateCategoryValidator = [
    param('id').isInt({gt: 0}).withMessage('Invalid category ID.'),
    body('name')
        .trim()
        .notEmpty().withMessage('Category name is required.')
        .isLength({min: 2, max: 100}).withMessage('Category name must be between 2 and 100 characters.')

        .custom(async (value, {req}) => {
            const category = await CategoryModel.findByName(value);

            if (category && category.id !== parseInt(req.params.id, 10)) {
                return Promise.reject('Category name already exists.');
            }
        }),
    body('description')
        .trim()
        .notEmpty().withMessage('Category description is required.')

        .custom(async (value, {req}) => {
            const category = await CategoryModel.findByDescription(value);
            if (category && category.id !== parseInt(req.params.id, 10)) {
                return Promise.reject('Category description already exists.');
            }
        })
];

module.exports = {
    createCategoryValidator,
    updateCategoryValidator,
};