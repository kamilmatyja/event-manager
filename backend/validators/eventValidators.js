const {body, param} = require('express-validator');
const EventModel = require('../models/eventModel');
const LocaleModel = require('../models/localeModel');
const CategoryModel = require('../models/categoryModel');
const PrelegentModel = require('../models/prelegentModel');
const ResourceModel = require('../models/resourceModel');
const SponsorModel = require('../models/sponsorModel');
const CateringModel = require('../models/cateringModel');
const BadRequestError = require("../errors/BadRequestError");
const NotFoundError = require("../errors/NotFoundError");

const validateRelatedIds = (field, model, messageName) => {
    return body(field)
        .optional({nullable: true})
        .isArray().withMessage(`${messageName} must be an array (or null).`)
        .custom(async (ids) => {
            if (!ids || ids.length === 0) return true;

            for (const id of ids) {
                if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
                    throw new BadRequestError(`Invalid ID format in ${messageName}: ${id}. Must be a positive integer.`);
                }
                const record = await model.findById(id);
                if (!record) {
                    throw new NotFoundError(`${messageName} with ID ${id} not found.`);
                }
            }

            if (new Set(ids).size !== ids.length) {
                throw new BadRequestError(`Duplicate IDs found in ${messageName} array.`);
            }
            return true;
        });
};

const eventBaseValidator = [
    body('name')
        .trim()
        .notEmpty().withMessage('Event name is required.')
        .isLength({min: 5, max: 100}).withMessage('Event name must be between 5 and 100 characters.'),
    body('description')
        .trim()
        .notEmpty().withMessage('Event description is required.'),
    body('price')
        .notEmpty().withMessage('Price is required.')
        .isNumeric().withMessage('Price must be a number.')
        .isFloat({gt: -0.01}).withMessage('Price cannot be negative.'),
    body('locale_id')
        .notEmpty().withMessage('Locale ID is required.')
        .isInt({gt: 0}).withMessage('Invalid Locale ID.')
        .custom(async (value) => {
            const locale = await LocaleModel.findById(value);
            if (!locale) return Promise.reject('Locale with the provided ID does not exist.');
        }),
    body('category_id')
        .notEmpty().withMessage('Category ID is required.')
        .isInt({gt: 0}).withMessage('Invalid Category ID.')
        .custom(async (value) => {
            const category = await CategoryModel.findById(value);
            if (!category) return Promise.reject('Category with the provided ID does not exist.');
        }),
    body('started_at')
        .notEmpty().withMessage('Start date is required.')
        .isISO8601().withMessage('Invalid start date format (should be ISO8601).')
        .toDate(),
    body('ended_at')
        .notEmpty().withMessage('End date is required.')
        .isISO8601().withMessage('Invalid end date format (should be ISO8601).')
        .toDate()
        .custom((value, {req}) => {
            if (value <= req.body.started_at) {
                throw new BadRequestError('End date must be after start date.');
            }
            return true;
        }),

    validateRelatedIds('prelegent_ids', PrelegentModel, 'Prelegent IDs'),
    validateRelatedIds('resource_ids', ResourceModel, 'Resource IDs'),
    validateRelatedIds('sponsor_ids', SponsorModel, 'Sponsor IDs'),
    validateRelatedIds('catering_ids', CateringModel, 'Catering IDs'),
];

const createEventValidator = [
    ...eventBaseValidator,

    body('name').custom(async (value) => {
        const event = await EventModel.findByName(value);
        if (event) return Promise.reject('Event name already exists.');
    }),
    body('description').custom(async (value) => {
        const event = await EventModel.findByDescription(value);
        if (event) return Promise.reject('Event description already exists.');
    }),
];

const updateEventValidator = [
    param('id').isInt({gt: 0}).withMessage('Invalid event ID.'),
    ...eventBaseValidator,

    body('name').custom(async (value, {req}) => {
        const event = await EventModel.findByName(value);
        if (event && event.id !== parseInt(req.params.id, 10)) {
            return Promise.reject('Event name already exists.');
        }
    }),
    body('description').custom(async (value, {req}) => {
        const event = await EventModel.findByDescription(value);
        if (event && event.id !== parseInt(req.params.id, 10)) {
            return Promise.reject('Event description already exists.');
        }
    }),
];

module.exports = {
    createEventValidator,
    updateEventValidator,
};